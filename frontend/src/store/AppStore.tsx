import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { APP_NAME, SCHEMA_VERSION } from '../data/constants'
import {
  loadAppData,
  replaceAppData,
  resetDatabase,
} from '../data/database'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../data/settings'
import {
  completeTaskRewards,
  damageBossProgress,
} from '../systems/progression'
import { evaluateAchievementTriggers } from '../systems/achievements'
import { parseSaveFile } from '../systems/saveValidation'
import type {
  AppData,
  AchievementSignal,
  Character,
  CollectionEntityMap,
  EntityCollection,
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

interface AppStoreProviderProps {
  children: ReactNode
}

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

function requireFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label}必须是有限数字`)
  }
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

function upsertCollectionEntity<K extends EntityCollection>(
  data: AppData,
  collection: K,
  entity: CollectionEntityMap[K],
): AppData {
  const draft = cloneData(data)
  const entities = draft[collection] as CollectionEntityMap[K][]
  const index = entities.findIndex((item) => item.id === entity.id)
  const nextEntity = structuredClone(entity)

  // 任务奖励一旦结算，结算标记必须保持单调。这样即使界面在完成任务后
  // 又排入了一个基于旧快照的保存操作，也不会把任务恢复成可重复领奖状态。
  if (collection === 'tasks' && index !== -1) {
    const currentTask = entities[index] as Task
    const incomingTask = nextEntity as Task

    if (currentTask.rewardApplied) {
      incomingTask.status = 'completed'
      incomingTask.rewardApplied = true
      incomingTask.completedAt = currentTask.completedAt
      incomingTask.rewards = structuredClone(currentTask.rewards)
    }
  }

  // 父子技能只允许存在于同一分类。移动技能分类时，清理已经失效的
  // 上级关系，并将仍留在旧分类的直接子技能提升为根技能。
  if (collection === 'skills') {
    const incomingSkill = nextEntity as Skill
    const parent = draft.skills.find(
      (skill) => skill.id === incomingSkill.parentId,
    )

    if (
      incomingSkill.parentId === incomingSkill.id ||
      (incomingSkill.parentId !== null &&
        (parent === undefined || parent.categoryId !== incomingSkill.categoryId))
    ) {
      incomingSkill.parentId = null
    }
  }

  if (index === -1) {
    entities.push(nextEntity)
  } else {
    entities[index] = nextEntity
  }

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

  return draft
}

function removeCollectionEntity(
  data: AppData,
  collection: EntityCollection,
  id: string,
): AppData {
  const draft = cloneData(data)
  const updatedAt = new Date().toISOString()

  switch (collection) {
    case 'goals': {
      draft.goals = draft.goals
        .filter((goal) => goal.id !== id)
        .map((goal) =>
          goal.parentId === id ? { ...goal, parentId: null, updatedAt } : goal,
        )
      draft.tasks = draft.tasks.map((task) =>
        task.goalId === id ? { ...task, goalId: null, updatedAt } : task,
      )
      draft.bosses = draft.bosses.map((boss) =>
        boss.goalId === id ? { ...boss, goalId: null, updatedAt } : boss,
      )
      if (draft.character.primaryGoalId === id) {
        draft.character = {
          ...draft.character,
          primaryGoalId: null,
          updatedAt,
        }
      }
      break
    }
    case 'skillCategories': {
      const removedSkillIds = new Set(
        draft.skills
          .filter((skill) => skill.categoryId === id)
          .map((skill) => skill.id),
      )

      draft.skillCategories = draft.skillCategories.filter(
        (category) => category.id !== id,
      )
      draft.skills = draft.skills
        .filter((skill) => !removedSkillIds.has(skill.id))
        .map((skill) =>
          skill.parentId !== null && removedSkillIds.has(skill.parentId)
            ? { ...skill, parentId: null, updatedAt }
            : skill,
        )
      draft.tasks = draft.tasks.map((task) => {
        const skills = task.rewards.skills.filter(
          (reward) => !removedSkillIds.has(reward.skillId),
        )
        return skills.length === task.rewards.skills.length
          ? task
          : {
              ...task,
              rewards: { ...task.rewards, skills },
              updatedAt,
            }
      })
      break
    }
    case 'skills': {
      draft.skills = draft.skills
        .filter((skill) => skill.id !== id)
        .map((skill) =>
          skill.parentId === id
            ? { ...skill, parentId: null, updatedAt }
            : skill,
        )
      draft.tasks = draft.tasks.map((task) => {
        const skills = task.rewards.skills.filter(
          (reward) => reward.skillId !== id,
        )
        return skills.length === task.rewards.skills.length
          ? task
          : {
              ...task,
              rewards: { ...task.rewards, skills },
              updatedAt,
            }
      })
      break
    }
    case 'bosses': {
      draft.bosses = draft.bosses.filter((boss) => boss.id !== id)
      draft.tasks = draft.tasks.map((task) => {
        const bosses = task.rewards.bosses.filter(
          (reward) => reward.bossId !== id,
        )
        return bosses.length === task.rewards.bosses.length
          ? task
          : {
              ...task,
              rewards: { ...task.rewards, bosses },
              updatedAt,
            }
      })
      break
    }
    case 'timeline': {
      const parentId = draft.timeline.find((node) => node.id === id)?.parentId ?? null
      draft.timeline = draft.timeline
        .filter((node) => node.id !== id)
        .map((node) =>
          node.parentId === id ? { ...node, parentId, updatedAt } : node,
        )
      break
    }
    case 'tasks':
    case 'achievements':
    case 'equipment':
    case 'events': {
      const entities = draft[collection] as Array<{ id: string }>
      const index = entities.findIndex((item) => item.id === id)
      if (index !== -1) {
        entities.splice(index, 1)
      }
      break
    }
  }

  return draft
}

function appDataFromSaveFile(saveFile: SaveFile): AppData {
  return {
    character: saveFile.character,
    stats: saveFile.stats,
    skillCategories: saveFile.skillCategories,
    skills: saveFile.skills,
    goals: saveFile.goals,
    tasks: saveFile.tasks,
    achievements: saveFile.achievements,
    equipment: saveFile.equipment,
    events: saveFile.events,
    bosses: saveFile.bosses,
    timeline: saveFile.timeline,
  }
}

export function AppStoreProvider({ children }: AppStoreProviderProps) {
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
      .then((loadedData) => {
        if (cancelled) {
          return
        }

        dataRef.current = loadedData
        setData(loadedData)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(`无法读取本地存档：${errorMessage(loadError)}`)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return
    }

    const channel = new BroadcastChannel(DATA_CHANNEL_NAME)
    dataChannelRef.current = channel
    channel.onmessage = () => {
      const refresh = mutationQueueRef.current
        .catch(() => undefined)
        .then(async () => {
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
      if (dataChannelRef.current === channel) {
        dataChannelRef.current = null
      }
    }
  }, [])

  const commitMutation = useCallback((mutation: DataMutation): Promise<void> => {
    const run = mutationQueueRef.current
      .catch(() => undefined)
      .then(() =>
        withDataWriteLock(async () => {
          // 每次写入都从 IndexedDB 的最新快照开始，避免其他标签页已经
          // 写入的数据被当前标签页的旧内存快照整体覆盖。
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

    return run.catch((mutationError: unknown) => {
      if (mountedRef.current) {
        setError(errorMessage(mutationError))
      }
      throw mutationError
    })
  }, [])

  const updateCharacter = useCallback(
    (patch: Partial<Omit<Character, 'id' | 'createdAt'>>) =>
      commitMutation((current) => {
        const updatedAt = new Date().toISOString()
        return {
          ...current,
          character: {
            ...current.character,
            ...patch,
            id: 'character',
            updatedAt,
          },
        }
      }),
    [commitMutation],
  )

  const changeStat = useCallback(
    (key: StatKey, amount: number, note: string) => {
      requireFiniteNumber(amount, '属性变化值')

      return commitMutation((current) => {
        const recordedAt = new Date().toISOString()
        const values = {
          ...current.stats.values,
          [key]: Math.max(0, current.stats.values[key] + amount),
        }

        return {
          ...current,
          stats: {
            ...current.stats,
            values,
            history: [
              ...current.stats.history,
              makeSnapshot(values, note.trim(), recordedAt),
            ],
            updatedAt: recordedAt,
          },
        }
      })
    },
    [commitMutation],
  )

  const saveEntity = useCallback(
    <K extends EntityCollection>(
      collection: K,
      entity: CollectionEntityMap[K],
    ) => commitMutation((current) => upsertCollectionEntity(current, collection, entity)),
    [commitMutation],
  )

  const deleteEntity = useCallback(
    (collection: EntityCollection, id: string) =>
      commitMutation((current) => removeCollectionEntity(current, collection, id)),
    [commitMutation],
  )

  const completeTask = useCallback(
    (taskId: string) =>
      commitMutation((current) =>
        completeTaskRewards(current, taskId, new Date().toISOString()),
      ),
    [commitMutation],
  )

  const damageBoss = useCallback(
    (bossId: string, damage: number, note: string) => {
      requireFiniteNumber(damage, 'Boss 伤害值')
      if (damage <= 0) {
        return Promise.reject(new Error('Boss 伤害值必须大于 0'))
      }

      return commitMutation((current) =>
        damageBossProgress(
          current,
          bossId,
          damage,
          note.trim(),
          new Date().toISOString(),
        ),
      )
    },
    [commitMutation],
  )

  const evaluateAchievements = useCallback(
    (signal: AchievementSignal) =>
      commitMutation((current) => ({
        ...current,
        achievements: evaluateAchievementTriggers(
          current.achievements,
          signal,
        ).achievements,
      })),
    [commitMutation],
  )

  const updateSettings = useCallback((patch: Partial<LocalSettings>) => {
    const next = { ...settingsRef.current, ...patch }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }, [])

  const createSaveFile = useCallback(async (): Promise<SaveFile> => {
    // 导出必须排在调用时已经提交的写操作之后，避免刚完成任务就导出到旧快照。
    await mutationQueueRef.current.catch(() => undefined)
    const current = await loadAppData()

    return {
      ...cloneData(current),
      schemaVersion: SCHEMA_VERSION,
      app: APP_NAME,
      exportedAt: new Date().toISOString(),
    }
  }, [])

  const importSaveFile = useCallback(
    async (input: unknown): Promise<void> => {
      const saveFile = parseSaveFile(input)
      const importedData = cloneData(appDataFromSaveFile(saveFile))

      const run = mutationQueueRef.current
        .catch(() => undefined)
        .then(() =>
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

      return run.catch((importError: unknown) => {
        if (mountedRef.current) {
          setError(errorMessage(importError))
        }
        throw importError
      })
    },
    [],
  )

  const resetToDefaults = useCallback(async (): Promise<void> => {
    const run = mutationQueueRef.current
      .catch(() => undefined)
      .then(() =>
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

    return run.catch((resetError: unknown) => {
      if (mountedRef.current) {
        setError(errorMessage(resetError))
      }
      throw resetError
    })
  }, [])

  const value = useMemo<AppStoreValue>(
    () => ({
      data,
      settings,
      isLoading,
      error,
      updateCharacter,
      changeStat,
      saveEntity,
      deleteEntity,
      completeTask,
      damageBoss,
      evaluateAchievements,
      updateSettings,
      createSaveFile,
      importSaveFile,
      resetToDefaults,
    }),
    [
      data,
      settings,
      isLoading,
      error,
      updateCharacter,
      changeStat,
      saveEntity,
      deleteEntity,
      completeTask,
      damageBoss,
      evaluateAchievements,
      updateSettings,
      createSaveFile,
      importSaveFile,
      resetToDefaults,
    ],
  )

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  )
}
