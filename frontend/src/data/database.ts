import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type {
  Achievement,
  AppData,
  Boss,
  Character,
  CollectionEntityMap,
  EntityCollection,
  Equipment,
  Goal,
  LifeEvent,
  Skill,
  SkillCategory,
  StatsState,
  Task,
  TimelineNode,
} from '../types/models'
import defaultDataJson from './defaultData.json'
import { APP_NAME, SCHEMA_VERSION } from './constants'

interface LifeRpgDatabase extends DBSchema {
  character: {
    key: string
    value: Character
  }
  stats: {
    key: string
    value: StatsState
  }
  skillCategories: {
    key: string
    value: SkillCategory
  }
  skills: {
    key: string
    value: Skill
  }
  goals: {
    key: string
    value: Goal
  }
  tasks: {
    key: string
    value: Task
  }
  achievements: {
    key: string
    value: Achievement
  }
  equipment: {
    key: string
    value: Equipment
  }
  events: {
    key: string
    value: LifeEvent
  }
  bosses: {
    key: string
    value: Boss
  }
  timeline: {
    key: string
    value: TimelineNode
  }
}

const STORE_NAMES = [
  'character',
  'stats',
  'skillCategories',
  'skills',
  'goals',
  'tasks',
  'achievements',
  'equipment',
  'events',
  'bosses',
  'timeline',
] as const satisfies readonly (keyof LifeRpgDatabase)[]

let databasePromise: Promise<IDBPDatabase<LifeRpgDatabase>> | undefined

function createDefaultAppData(): AppData {
  return structuredClone(defaultDataJson) as AppData
}

function createDatabase(): Promise<IDBPDatabase<LifeRpgDatabase>> {
  return openDB<LifeRpgDatabase>(APP_NAME, SCHEMA_VERSION, {
    upgrade(database) {
      const defaults = createDefaultAppData()

      if (!database.objectStoreNames.contains('character')) {
        database
          .createObjectStore('character', { keyPath: 'id' })
          .put(defaults.character)
      }

      if (!database.objectStoreNames.contains('stats')) {
        database
          .createObjectStore('stats', { keyPath: 'id' })
          .put(defaults.stats)
      }

      if (!database.objectStoreNames.contains('skillCategories')) {
        const store = database.createObjectStore('skillCategories', {
          keyPath: 'id',
        })
        for (const entity of defaults.skillCategories) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('skills')) {
        const store = database.createObjectStore('skills', { keyPath: 'id' })
        for (const entity of defaults.skills) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('goals')) {
        const store = database.createObjectStore('goals', { keyPath: 'id' })
        for (const entity of defaults.goals) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('tasks')) {
        const store = database.createObjectStore('tasks', { keyPath: 'id' })
        for (const entity of defaults.tasks) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('achievements')) {
        const store = database.createObjectStore('achievements', {
          keyPath: 'id',
        })
        for (const entity of defaults.achievements) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('equipment')) {
        const store = database.createObjectStore('equipment', {
          keyPath: 'id',
        })
        for (const entity of defaults.equipment) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('events')) {
        const store = database.createObjectStore('events', { keyPath: 'id' })
        for (const entity of defaults.events) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('bosses')) {
        const store = database.createObjectStore('bosses', { keyPath: 'id' })
        for (const entity of defaults.bosses) {
          store.put(entity)
        }
      }

      if (!database.objectStoreNames.contains('timeline')) {
        const store = database.createObjectStore('timeline', {
          keyPath: 'id',
        })
        for (const entity of defaults.timeline) {
          store.put(entity)
        }
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

async function ensureSingletonRecords(
  database: IDBPDatabase<LifeRpgDatabase>,
): Promise<void> {
  const [character, stats] = await Promise.all([
    database.get('character', 'character'),
    database.get('stats', 'stats'),
  ])

  if (character !== undefined && stats !== undefined) {
    return
  }

  const defaults = createDefaultAppData()
  const transaction = database.transaction(['character', 'stats'], 'readwrite')

  if (character === undefined) {
    transaction.objectStore('character').put(defaults.character)
  }
  if (stats === undefined) {
    transaction.objectStore('stats').put(defaults.stats)
  }

  await transaction.done
}

export async function loadAppData(): Promise<AppData> {
  const database = await getDatabase()
  await ensureSingletonRecords(database)

  const transaction = database.transaction(STORE_NAMES, 'readonly')
  const characterRequest = transaction.objectStore('character').get('character')
  const statsRequest = transaction.objectStore('stats').get('stats')
  const skillCategoriesRequest = transaction
    .objectStore('skillCategories')
    .getAll()
  const skillsRequest = transaction.objectStore('skills').getAll()
  const goalsRequest = transaction.objectStore('goals').getAll()
  const tasksRequest = transaction.objectStore('tasks').getAll()
  const achievementsRequest = transaction.objectStore('achievements').getAll()
  const equipmentRequest = transaction.objectStore('equipment').getAll()
  const eventsRequest = transaction.objectStore('events').getAll()
  const bossesRequest = transaction.objectStore('bosses').getAll()
  const timelineRequest = transaction.objectStore('timeline').getAll()

  const [
    character,
    stats,
    skillCategories,
    skills,
    goals,
    tasks,
    achievements,
    equipment,
    events,
    bosses,
    timeline,
  ] = await Promise.all([
    characterRequest,
    statsRequest,
    skillCategoriesRequest,
    skillsRequest,
    goalsRequest,
    tasksRequest,
    achievementsRequest,
    equipmentRequest,
    eventsRequest,
    bossesRequest,
    timelineRequest,
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
    equipment,
    events,
    bosses,
    timeline: timeline.toSorted((left, right) =>
      left.order === right.order
        ? left.createdAt.localeCompare(right.createdAt)
        : left.order - right.order,
    ),
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
  const database = (await getDatabase()) as IDBPDatabase
  await database.put(collection, entity)
}

export async function deleteEntity(
  collection: EntityCollection,
  id: string,
): Promise<void> {
  const database = await getDatabase()
  await database.delete(collection, id)
}

export async function replaceAppData(data: AppData): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(STORE_NAMES, 'readwrite')
  const requests: Promise<unknown>[] = []

  for (const storeName of STORE_NAMES) {
    requests.push(transaction.objectStore(storeName).clear())
  }

  requests.push(transaction.objectStore('character').put(data.character))
  requests.push(transaction.objectStore('stats').put(data.stats))

  for (const entity of data.skillCategories) {
    requests.push(transaction.objectStore('skillCategories').put(entity))
  }
  for (const entity of data.skills) {
    requests.push(transaction.objectStore('skills').put(entity))
  }
  for (const entity of data.goals) {
    requests.push(transaction.objectStore('goals').put(entity))
  }
  for (const entity of data.tasks) {
    requests.push(transaction.objectStore('tasks').put(entity))
  }
  for (const entity of data.achievements) {
    requests.push(transaction.objectStore('achievements').put(entity))
  }
  for (const entity of data.equipment) {
    requests.push(transaction.objectStore('equipment').put(entity))
  }
  for (const entity of data.events) {
    requests.push(transaction.objectStore('events').put(entity))
  }
  for (const entity of data.bosses) {
    requests.push(transaction.objectStore('bosses').put(entity))
  }
  for (const entity of data.timeline) {
    requests.push(transaction.objectStore('timeline').put(entity))
  }

  await Promise.all([...requests, transaction.done])
}

export async function resetDatabase(): Promise<AppData> {
  const defaults = createDefaultAppData()
  await replaceAppData(defaults)
  return defaults
}
