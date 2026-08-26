import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase, IDBPTransaction } from 'idb'
import type {
  Achievement,
  AppData,
  Character,
  CollectionEntityMap,
  EntityCollection,
  Goal,
  LifeEvent,
  Skill,
  SkillCategory,
  StatsState,
  Task,
} from '../types/models'
import { migrateLegacyAppData } from '../systems/migrations'
import defaultDataJson from './defaultData.json'
import { APP_NAME, SCHEMA_VERSION } from './constants'

interface LifeRpgDatabase extends DBSchema {
  character: { key: string; value: Character }
  stats: { key: string; value: StatsState }
  skillCategories: { key: string; value: SkillCategory }
  skills: { key: string; value: Skill }
  goals: { key: string; value: Goal }
  tasks: { key: string; value: Task }
  achievements: { key: string; value: Achievement }
  events: { key: string; value: LifeEvent }
  /** 仅用于 v1 -> v2 升级事务，升级完成后会删除。 */
  equipment: { key: string; value: Record<string, unknown> }
  bosses: { key: string; value: Record<string, unknown> }
  timeline: { key: string; value: Record<string, unknown> }
}

const STORE_NAMES = [
  'character',
  'stats',
  'skillCategories',
  'skills',
  'goals',
  'tasks',
  'achievements',
  'events',
] as const satisfies readonly (keyof LifeRpgDatabase)[]

const COLLECTION_STORES = [
  'skillCategories',
  'skills',
  'goals',
  'tasks',
  'achievements',
  'events',
] as const

type UpgradeTransaction = IDBPTransaction<
  LifeRpgDatabase,
  ArrayLike<
    | 'character'
    | 'stats'
    | 'skillCategories'
    | 'skills'
    | 'goals'
    | 'tasks'
    | 'achievements'
    | 'events'
    | 'equipment'
    | 'bosses'
    | 'timeline'
  >,
  'versionchange'
>

let databasePromise: Promise<IDBPDatabase<LifeRpgDatabase>> | undefined

function createDefaultAppData(): AppData {
  return structuredClone(defaultDataJson) as AppData
}

function seedNewDatabase(
  database: IDBPDatabase<LifeRpgDatabase>,
  defaults: AppData,
): void {
  database.createObjectStore('character', { keyPath: 'id' }).put(defaults.character)
  database.createObjectStore('stats', { keyPath: 'id' }).put(defaults.stats)

  for (const storeName of COLLECTION_STORES) {
    const store = database.createObjectStore(storeName, { keyPath: 'id' })
    for (const entity of defaults[storeName]) {
      store.put(entity as never)
    }
  }
}

async function migrateVersionOne(
  database: IDBPDatabase<LifeRpgDatabase>,
  transaction: UpgradeTransaction,
): Promise<void> {
  const [character, stats, skillCategories, skills, goals, tasks, achievements, events, bosses, timeline] =
    await Promise.all([
      transaction.objectStore('character').get('character'),
      transaction.objectStore('stats').get('stats'),
      transaction.objectStore('skillCategories').getAll(),
      transaction.objectStore('skills').getAll(),
      transaction.objectStore('goals').getAll(),
      transaction.objectStore('tasks').getAll(),
      transaction.objectStore('achievements').getAll(),
      transaction.objectStore('events').getAll(),
      transaction.objectStore('bosses').getAll(),
      transaction.objectStore('timeline').getAll(),
    ])

  const migrated = migrateLegacyAppData({
    character,
    stats,
    skillCategories,
    skills,
    goals,
    tasks,
    achievements,
    events,
    bosses,
    timeline,
  })

  for (const storeName of STORE_NAMES) {
    transaction.objectStore(storeName).clear()
  }
  transaction.objectStore('character').put(migrated.character)
  transaction.objectStore('stats').put(migrated.stats)
  for (const storeName of COLLECTION_STORES) {
    for (const entity of migrated[storeName]) {
      transaction.objectStore(storeName).put(entity as never)
    }
  }

  if (database.objectStoreNames.contains('equipment')) database.deleteObjectStore('equipment')
  if (database.objectStoreNames.contains('bosses')) database.deleteObjectStore('bosses')
  if (database.objectStoreNames.contains('timeline')) database.deleteObjectStore('timeline')
}

function createDatabase(): Promise<IDBPDatabase<LifeRpgDatabase>> {
  return openDB<LifeRpgDatabase>(APP_NAME, SCHEMA_VERSION, {
    async upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion === 0) {
        seedNewDatabase(database, createDefaultAppData())
        return
      }
      if (oldVersion < 2) {
        await migrateVersionOne(database, transaction)
      }
    },
    blocking() {
      databasePromise?.then((database) => database.close()).catch(() => undefined)
      databasePromise = undefined
    },
    terminated() {
      databasePromise = undefined
    },
  })
}

function getDatabase(): Promise<IDBPDatabase<LifeRpgDatabase>> {
  databasePromise ??= createDatabase().catch((error: unknown) => {
    databasePromise = undefined
    throw error
  })
  return databasePromise
}

async function ensureSingletonRecords(database: IDBPDatabase<LifeRpgDatabase>): Promise<void> {
  const [character, stats] = await Promise.all([
    database.get('character', 'character'),
    database.get('stats', 'stats'),
  ])
  if (character !== undefined && stats !== undefined) return

  const defaults = createDefaultAppData()
  const transaction = database.transaction(['character', 'stats'], 'readwrite')
  if (character === undefined) transaction.objectStore('character').put(defaults.character)
  if (stats === undefined) transaction.objectStore('stats').put(defaults.stats)
  await transaction.done
}

export async function loadAppData(): Promise<AppData> {
  const database = await getDatabase()
  await ensureSingletonRecords(database)
  const transaction = database.transaction(STORE_NAMES, 'readonly')
  const [character, stats, skillCategories, skills, goals, tasks, achievements, events] =
    await Promise.all([
      transaction.objectStore('character').get('character'),
      transaction.objectStore('stats').get('stats'),
      transaction.objectStore('skillCategories').getAll(),
      transaction.objectStore('skills').getAll(),
      transaction.objectStore('goals').getAll(),
      transaction.objectStore('tasks').getAll(),
      transaction.objectStore('achievements').getAll(),
      transaction.objectStore('events').getAll(),
    ])
  await transaction.done

  if (character === undefined || stats === undefined) {
    throw new Error('Life RPG 数据库缺少必需的单例记录')
  }

  return {
    character,
    stats,
    skillCategories: skillCategories.toSorted((left, right) =>
      left.order === right.order
        ? left.createdAt.localeCompare(right.createdAt)
        : left.order - right.order,
    ),
    skills,
    goals,
    tasks,
    achievements,
    events,
  }
}

export async function saveCharacter(character: Character): Promise<void> {
  const database = await getDatabase()
  await database.put('character', character)
}

export async function saveStats(stats: StatsState): Promise<void> {
  const database = await getDatabase()
  await database.put('stats', stats)
}

export async function saveEntity<K extends EntityCollection>(
  collection: K,
  entity: CollectionEntityMap[K],
): Promise<void> {
  const database = await getDatabase() as IDBPDatabase
  await database.put(collection, entity)
}

export async function deleteEntity(collection: EntityCollection, id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete(collection, id)
}

export async function replaceAppData(data: AppData): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(STORE_NAMES, 'readwrite')
  const requests: Promise<unknown>[] = []

  for (const storeName of STORE_NAMES) requests.push(transaction.objectStore(storeName).clear())
  requests.push(transaction.objectStore('character').put(data.character))
  requests.push(transaction.objectStore('stats').put(data.stats))
  for (const storeName of COLLECTION_STORES) {
    for (const entity of data[storeName]) {
      requests.push(transaction.objectStore(storeName).put(entity as never))
    }
  }
  await Promise.all([...requests, transaction.done])
}

export async function resetDatabase(): Promise<AppData> {
  const defaults = createDefaultAppData()
  await replaceAppData(defaults)
  return defaults
}
