import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { APP_NAME, SCHEMA_VERSION } from '../data/constants'
import { loadAppData, replaceAppData, resetDatabase } from '../data/database'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../data/settings'
import { evaluateAchievementTriggers } from '../systems/achievements'
import { completeTaskRewards } from '../systems/progression'
import { calculateTaskRewards } from '../systems/rewardRules'
import { parseSaveFile } from '../systems/saveValidation'
import type {
  AppData,
  Achievement,
  AchievementSignal,
  Character,
  CollectionEntityMap,
  EntityCollection,
  LifeEvent,
  LocalSettings,
  SaveFile,
  Skill,
  StatKey,
  StatSnapshot,
  Task,
} from '../types/models'
import type { AppStoreValue } from '../types/store'
import { AppStoreContext } from './AppStoreContext'

const DATA_CHANNEL_NAME = `${APP_NAME}:data-changes`
const DATA_LOCK_NAME = `${APP_NAME}:data-write`

type DataMutation = (current: AppData) => AppData

async function withDataWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks !== undefined) {
    return navigator.locks.request(DATA_LOCK_NAME, operation)
  }
  return operation()
}

function cloneData(data: AppData): AppData {
  return structuredClone(data)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误'
}

function makeSnapshot(
  values: AppData['stats']['values'],
  note: string,
  recordedAt: string,
): StatSnapshot {
  return {
    id: crypto.randomUUID(),
    recordedAt,
    values: { ...values },
    source: 'manual',
    note,
  }
}

function makeFootprint(
  sourceType: LifeEvent['sourceType'],
  sourceId: string | null,
  title: string,
  description: string,
  date: string,
): LifeEvent {
  return {
    id: `event-${sourceType}-${sourceId ?? crypto.randomUUID()}-${date}`,
    sourceType,
    sourceId,
    title,
    description,
    date,
    createdAt: date,
    updatedAt: date,
  }
}

function prepareTask(data: AppData, incoming: Task, current?: Task): Task {
  if (current?.rewardApplied === true) {
    return {
      ...incoming,
      status: 'completed',
      completedAt: current.completedAt,
      rewardApplied: true,
      rewards: structuredClone(current.rewards),
    }
  }

  return {
    ...incoming,
    status: incoming.status === 'completed' ? 'todo' : incoming.status,
    completedAt: null,
    rewardApplied: false,
    rewards: calculateTaskRewards(incoming, data),
  }
}

function upsertCollectionEntity<K extends EntityCollection>(
  data: AppData,
  collection: K,
  entity: CollectionEntityMap[K],
): AppData {
  const draft = cloneData(data)
  const entities = draft[collection] as CollectionEntityMap[K][]
  const index = entities.findIndex((item) => item.id === entity.id)
  let nextEntity = structuredClone(entity)

  if (collection === 'tasks') {
    nextEntity = prepareTask(
      draft,
      nextEntity as Task,
      index === -1 ? undefined : entities[index] as Task,
    ) as CollectionEntityMap[K]
  }

  if (collection === 'skills') {
    const incomingSkill = nextEntity as Skill
    const parent = draft.skills.find((skill) => skill.id === incomingSkill.parentId)
    if (
      incomingSkill.parentId === incomingSkill.id ||
      (incomingSkill.parentId !== null &&
        (parent === undefined || parent.categoryId !== incomingSkill.categoryId))
    ) {
      incomingSkill.parentId = null
    }
  }

  if (collection === 'goals') {
    const incomingGoal = nextEntity as AppData['goals'][number]
    incomingGoal.progress = Math.min(100, Math.max(0, incomingGoal.progress))
    if (incomingGoal.status === 'completed') incomingGoal.progress = 100
  }

  if (index === -1) entities.push(nextEntity)
  else entities[index] = nextEntity

  if (collection === 'skills') {
    const incomingSkill = nextEntity as Skill
    const updatedAt = new Date().toISOString()
    draft.skills = draft.skills.map((skill) =>
      skill.id !== incomingSkill.id &&
      skill.parentId === incomingSkill.id &&
      skill.categoryId !== incomingSkill.categoryId
        ? { ...skill, parentId: null, updatedAt }
        : skill,
    )
  }

  if (collection === 'tasks' || collection === 'skills' || collection === 'goals') {
    draft.tasks = draft.tasks.map((task) =>
      task.rewardApplied ? task : { ...task, rewards: calculateTaskRewards(task, draft) },
    )
  }

  if (collection === 'achievements') {
    const achievement = nextEntity as Achievement
    const previous = index === -1 ? undefined : data.achievements[index]
    if (achievement.unlockedAt !== null && previous?.unlockedAt !== achievement.unlockedAt) {
      draft.events.push(makeFootprint(
        'achievement',
        achievement.id,
        `获得成就：${achievement.name}`,
        achievement.description,
        achievement.unlockedAt,
      ))
    }
  }

  return draft
}

function removeCollectionEntity(data: AppData, collection: EntityCollection, id: string): AppData {
  const draft = cloneData(data)
  const updatedAt = new Date().toISOString()

  switch (collection) {
    case 'goals':
      draft.goals = draft.goals
        .filter((goal) => goal.id !== id)
        .map((goal) => goal.parentId === id ? { ...goal, parentId: null, updatedAt } : goal)
      draft.tasks = draft.tasks.map((task) =>
        task.goalId === id
          ? { ...task, goalId: null, rewards: calculateTaskRewards({ ...task, goalId: null }, draft), updatedAt }
          : task,
      )
      if (draft.character.primaryGoalId === id) {
        draft.character = { ...draft.character, primaryGoalId: null, updatedAt }
      }
      break
    case 'skillCategories': {
      const removedSkillIds = new Set(
        draft.skills.filter((skill) => skill.categoryId === id).map((skill) => skill.id),
      )
      draft.skillCategories = draft.skillCategories.filter((category) => category.id !== id)
      draft.skills = draft.skills.filter((skill) => !removedSkillIds.has(skill.id))
      draft.tasks = draft.tasks.map((task) => {
        if (task.categoryId !== id || task.rewardApplied) return task
        const next = { ...task, categoryId: null, updatedAt }
        return { ...next, rewards: calculateTaskRewards(next, draft) }
      })
      break
    }
    case 'skills':
      draft.skills = draft.skills
        .filter((skill) => skill.id !== id)
        .map((skill) => skill.parentId === id ? { ...skill, parentId: null, updatedAt } : skill)
      draft.tasks = draft.tasks.map((task) =>
        task.rewardApplied ? task : { ...task, rewards: calculateTaskRewards(task, draft) },
      )
      break
    case 'tasks':
    case 'achievements':
    case 'events': {
      const entities = draft[collection] as Array<{ id: string }>
      const index = entities.findIndex((item) => item.id === id)
      if (index !== -1) entities.splice(index, 1)
      break
    }
  }

  return draft
}

function appDataFromSaveFile(saveFile: SaveFile): AppData {
  const { schemaVersion: _schemaVersion, app: _app, exportedAt: _exportedAt, ...data } = saveFile
  return data
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null)
  const [settings, setSettings] = useState<LocalSettings>(() => loadSettings())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef<AppData | null>(null)
  const settingsRef = useRef(settings)
  const mountedRef = useRef(false)
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const dataChannelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    void loadAppData()
      .then((loaded) => {
        if (cancelled) return
        dataRef.current = loaded
        setData(loaded)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(`无法读取本地存档：${errorMessage(reason)}`)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(DATA_CHANNEL_NAME)
    dataChannelRef.current = channel
    channel.onmessage = () => {
      const refresh = mutationQueueRef.current.catch(() => undefined).then(async () => {
        const latest = await loadAppData()
        dataRef.current = latest
        if (mountedRef.current) {
          setData(latest)
          setError(null)
        }
      })
      mutationQueueRef.current = refresh.catch(() => undefined)
    }
    return () => {
      channel.close()
      if (dataChannelRef.current === channel) dataChannelRef.current = null
    }
  }, [])

  const commitMutation = useCallback((mutation: DataMutation): Promise<void> => {
    const run = mutationQueueRef.current.catch(() => undefined).then(() =>
      withDataWriteLock(async () => {
        const current = await loadAppData()
        const next = mutation(current)
        await replaceAppData(next)
        dataRef.current = next
        dataChannelRef.current?.postMessage('changed')
        if (mountedRef.current) {
          setData(next)
          setError(null)
        }
      }),
    )
    mutationQueueRef.current = run.catch(() => undefined)
    return run.catch((reason: unknown) => {
      if (mountedRef.current) setError(errorMessage(reason))
      throw reason
    })
  }, [])

  const updateCharacter = useCallback(
    (patch: Partial<Omit<Character, 'id' | 'createdAt'>>) => commitMutation((current) => {
      const updatedAt = new Date().toISOString()
      const next = {
        ...current,
        character: { ...current.character, ...patch, id: 'character' as const, updatedAt },
      }
      if (patch.lifeStage !== undefined && patch.lifeStage !== current.character.lifeStage) {
        next.events = [
          ...next.events,
          makeFootprint('stage', null, `进入${patch.lifeStage}`, '人生阶段已更新。', updatedAt),
        ]
      }
      return next
    }),
    [commitMutation],
  )

  const changeStat = useCallback((key: StatKey, amount: number, note: string) => {
    if (!Number.isFinite(amount)) return Promise.reject(new Error('属性变化值必须是有限数字'))
    return commitMutation((current) => {
      const recordedAt = new Date().toISOString()
      const values = { ...current.stats.values, [key]: Math.max(0, current.stats.values[key] + amount) }
      return {
        ...current,
        stats: {
          ...current.stats,
          values,
          history: [...current.stats.history, makeSnapshot(values, note.trim(), recordedAt)],
          updatedAt: recordedAt,
        },
      }
    })
  }, [commitMutation])

  const saveEntity = useCallback(
    <K extends EntityCollection>(collection: K, entity: CollectionEntityMap[K]) =>
      commitMutation((current) => upsertCollectionEntity(current, collection, entity)),
    [commitMutation],
  )

  const deleteEntity = useCallback(
    (collection: EntityCollection, id: string) =>
      commitMutation((current) => removeCollectionEntity(current, collection, id)),
    [commitMutation],
  )

  const completeTask = useCallback(
    (taskId: string) => commitMutation((current) => completeTaskRewards(current, taskId)),
    [commitMutation],
  )

  const evaluateAchievements = useCallback((signal: AchievementSignal) =>
    commitMutation((current) => {
      const result = evaluateAchievementTriggers(current.achievements, signal)
      const unlocked = result.achievements.filter((item) => result.unlockedIds.includes(item.id))
      return {
        ...current,
        achievements: result.achievements,
        events: [
          ...current.events,
          ...unlocked.map((achievement) => makeFootprint(
            'achievement', achievement.id, `获得成就：${achievement.name}`,
            achievement.description, signal.occurredAt,
          )),
        ],
      }
    }), [commitMutation])

  const updateSettings = useCallback((patch: Partial<LocalSettings>) => {
    const next = { ...settingsRef.current, ...patch }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }, [])

  const createSaveFile = useCallback(async (): Promise<SaveFile> => {
    await mutationQueueRef.current.catch(() => undefined)
    const current = await loadAppData()
    return {
      ...cloneData(current),
      schemaVersion: SCHEMA_VERSION,
      app: APP_NAME,
      exportedAt: new Date().toISOString(),
    }
  }, [])

  const importSaveFile = useCallback(async (input: unknown): Promise<void> => {
    const importedData = cloneData(appDataFromSaveFile(parseSaveFile(input)))
    const run = mutationQueueRef.current.catch(() => undefined).then(() =>
      withDataWriteLock(async () => {
        await replaceAppData(importedData)
        dataRef.current = importedData
        dataChannelRef.current?.postMessage('changed')
        if (mountedRef.current) {
          setData(importedData)
          setError(null)
        }
      }),
    )
    mutationQueueRef.current = run.catch(() => undefined)
    return run.catch((reason: unknown) => {
      if (mountedRef.current) setError(errorMessage(reason))
      throw reason
    })
  }, [])

  const resetToDefaults = useCallback(async (): Promise<void> => {
    const run = mutationQueueRef.current.catch(() => undefined).then(() =>
      withDataWriteLock(async () => {
        const defaults = await resetDatabase()
        dataRef.current = defaults
        saveSettings(DEFAULT_SETTINGS)
        settingsRef.current = DEFAULT_SETTINGS
        dataChannelRef.current?.postMessage('changed')
        if (mountedRef.current) {
          setData(defaults)
          setSettings(DEFAULT_SETTINGS)
          setError(null)
        }
      }),
    )
    mutationQueueRef.current = run.catch(() => undefined)
    return run.catch((reason: unknown) => {
      if (mountedRef.current) setError(errorMessage(reason))
      throw reason
    })
  }, [])

  const value = useMemo<AppStoreValue>(() => ({
    data,
    settings,
    isLoading,
    error,
    updateCharacter,
    changeStat,
    saveEntity,
    deleteEntity,
    completeTask,
    evaluateAchievements,
    updateSettings,
    createSaveFile,
    importSaveFile,
    resetToDefaults,
  }), [
    data, settings, isLoading, error, updateCharacter, changeStat, saveEntity,
    deleteEntity, completeTask, evaluateAchievements, updateSettings,
    createSaveFile, importSaveFile, resetToDefaults,
  ])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}
