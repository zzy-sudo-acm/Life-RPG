import { APP_NAME, SCHEMA_VERSION } from '../data/constants'
import type {
  Achievement,
  AppData,
  Goal,
  LifeEvent,
  RewardBundle,
  SaveFile,
  SkillCategory,
  Task,
} from '../types/models'
import { inferDifficulty, TASK_REWARD_RULES } from './rewardRules'

interface LegacyBoss {
  id: string
  goalId: string | null
  name: string
  description: string
  maxHp: number
  currentHp: number
  deadline: string | null
  status: 'planned' | 'active' | 'defeated'
  createdAt: string
  updatedAt: string
}

interface LegacyTimelineNode {
  id: string
  title: string
  description: string
  status: 'past' | 'current' | 'future'
  startDate: string | null
  createdAt: string
  updatedAt: string
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function legacyBosses(value: unknown): LegacyBoss[] {
  return records(value).map((boss) => ({
    id: stringValue(boss.id),
    goalId: nullableString(boss.goalId),
    name: stringValue(boss.name, '未命名 Boss'),
    description: stringValue(boss.description),
    maxHp: Math.max(1, finiteNumber(boss.maxHp, 100)),
    currentHp: Math.max(0, finiteNumber(boss.currentHp, 100)),
    deadline: nullableString(boss.deadline),
    status: boss.status === 'defeated' ? 'defeated' : boss.status === 'planned' ? 'planned' : 'active',
    createdAt: stringValue(boss.createdAt, new Date(0).toISOString()),
    updatedAt: stringValue(boss.updatedAt, new Date(0).toISOString()),
  }))
}

function legacyTimeline(value: unknown): LegacyTimelineNode[] {
  return records(value).map((node) => ({
    id: stringValue(node.id),
    title: stringValue(node.title, '成长阶段'),
    description: stringValue(node.description),
    status: node.status === 'past' ? 'past' : node.status === 'current' ? 'current' : 'future',
    startDate: nullableString(node.startDate),
    createdAt: stringValue(node.createdAt, new Date(0).toISOString()),
    updatedAt: stringValue(node.updatedAt, new Date(0).toISOString()),
  }))
}

function migrateGoals(input: unknown, bosses: LegacyBoss[]): Goal[] {
  const goals = records(input).map((goal) => ({
    ...goal,
    displayMode: goal.displayMode === 'boss' ? 'boss' as const : 'standard' as const,
  })) as unknown as Goal[]
  const byId = new Map(goals.map((goal) => [goal.id, goal]))

  for (const boss of bosses) {
    const completedProgress = Math.round(
      Math.min(100, Math.max(0, ((boss.maxHp - boss.currentHp) / boss.maxHp) * 100)),
    )
    const existing = boss.goalId === null ? undefined : byId.get(boss.goalId)

    if (existing !== undefined) {
      existing.displayMode = 'boss'
      existing.progress = Math.max(existing.progress, completedProgress)
      existing.status = boss.status === 'defeated' ? 'completed' : existing.status
      existing.updatedAt = existing.updatedAt > boss.updatedAt ? existing.updatedAt : boss.updatedAt
      continue
    }

    const id = `goal-from-${boss.id}`
    const goal: Goal = {
      id,
      parentId: null,
      name: boss.name,
      type: 'major',
      displayMode: 'boss',
      description: boss.description,
      deadline: boss.deadline,
      status: boss.status === 'defeated' ? 'completed' : boss.status === 'planned' ? 'planned' : 'active',
      progress: boss.status === 'defeated' ? 100 : completedProgress,
      createdAt: boss.createdAt,
      updatedAt: boss.updatedAt,
    }
    goals.push(goal)
    byId.set(goal.id, goal)
    boss.goalId = goal.id
  }

  // v2 只保留父目标 + 子目标两层。旧存档更深的层级折叠到根目标下。
  for (const goal of goals) {
    if (goal.parentId === null) continue
    const visited = new Set([goal.id])
    let parent = byId.get(goal.parentId)
    while (parent?.parentId !== null && parent !== undefined) {
      if (visited.has(parent.id)) {
        goal.parentId = null
        parent = undefined
        break
      }
      visited.add(parent.id)
      const next = byId.get(parent.parentId)
      if (next === undefined) break
      parent = next
    }
    if (parent !== undefined) goal.parentId = parent.id
  }

  return goals
}

function findCategoryId(type: string, categories: SkillCategory[]): string | null {
  const normalized = type.trim()
  if (normalized.length === 0) return null

  return categories.find(
    (category) => category.name === normalized || normalized.includes(category.name),
  )?.id ?? null
}

function migrateRewards(
  input: unknown,
  goalId: string | null,
  bosses: LegacyBoss[],
): RewardBundle {
  const rewards = isRecord(input) ? input : {}
  const exp = Math.max(0, finiteNumber(rewards.exp))
  const difficulty = inferDifficulty(exp)
  const legacyBossRewards = records(rewards.bosses)
  const goalProgressFromBoss = legacyBossRewards.reduce((maximum, reward) => {
    const boss = bosses.find((item) => item.id === reward.bossId)
    const damage = Math.max(0, finiteNumber(reward.damage))
    if (boss === undefined) return maximum
    return Math.max(maximum, Math.round((damage / boss.maxHp) * 100))
  }, 0)

  return {
    exp,
    stats: isRecord(rewards.stats) ? rewards.stats : {},
    skills: records(rewards.skills).map((reward) => ({
      skillId: stringValue(reward.skillId),
      amount: Math.max(0, finiteNumber(reward.amount)),
    })),
    goalProgress:
      goalId === null
        ? 0
        : goalProgressFromBoss || TASK_REWARD_RULES[difficulty].goalProgress,
  }
}

function migrateTasks(
  input: unknown,
  categories: SkillCategory[],
  bosses: LegacyBoss[],
): Task[] {
  return records(input).map((task) => {
    const type = stringValue(task.type)
    let goalId = nullableString(task.goalId)
    const legacyBossReward = records(isRecord(task.rewards) ? task.rewards.bosses : undefined)[0]
    if (goalId === null && legacyBossReward !== undefined) {
      goalId = bosses.find((boss) => boss.id === legacyBossReward.bossId)?.goalId ?? null
    }
    const rewards = migrateRewards(task.rewards, goalId, bosses)

    return {
      id: stringValue(task.id),
      goalId,
      categoryId: nullableString(task.categoryId) ?? findCategoryId(type, categories),
      name: stringValue(task.name),
      description: stringValue(task.description),
      dueDate: nullableString(task.dueDate),
      difficulty:
        task.difficulty === 'easy' || task.difficulty === 'hard' || task.difficulty === 'medium'
          ? task.difficulty
          : inferDifficulty(rewards.exp),
      status: task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'todo',
      rewards,
      completedAt: nullableString(task.completedAt),
      rewardApplied: task.rewardApplied === true,
      createdAt: stringValue(task.createdAt),
      updatedAt: stringValue(task.updatedAt),
    }
  })
}

function migrateEvents(
  input: unknown,
  timeline: LegacyTimelineNode[],
  bosses: LegacyBoss[],
): LifeEvent[] {
  const result: LifeEvent[] = []

  for (const event of records(input)) {
    const sourceType = stringValue(event.sourceType)
    if (sourceType === 'task') continue
    if (sourceType === 'boss' && !stringValue(event.title).includes('击败')) continue

    const boss = bosses.find((item) => item.id === event.sourceId)
    result.push({
      id: stringValue(event.id),
      date: stringValue(event.date),
      title: stringValue(event.title),
      description: stringValue(event.description),
      sourceType:
        sourceType === 'achievement'
          ? 'achievement'
          : sourceType === 'boss'
            ? 'goal'
            : sourceType === 'goal' || sourceType === 'stage'
              ? sourceType
              : 'manual',
      sourceId: sourceType === 'boss' ? boss?.goalId ?? null : nullableString(event.sourceId),
      createdAt: stringValue(event.createdAt),
      updatedAt: stringValue(event.updatedAt),
    })
  }

  for (const node of timeline.filter((item) => item.status !== 'future')) {
    result.push({
      id: `event-from-${node.id}`,
      date: node.startDate ?? node.createdAt,
      title: node.status === 'current' ? `进入${node.title}` : node.title,
      description: node.description,
      sourceType: 'stage',
      sourceId: node.id,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    })
  }

  return result.filter(
    (event, index) => result.findIndex((candidate) => candidate.id === event.id) === index,
  )
}

const STANDARD_ACHIEVEMENTS: ReadonlyArray<Pick<Achievement, 'id' | 'name' | 'icon' | 'description' | 'trigger'>> = [
  { id: 'achievement-seven-tasks', name: '渐入佳境', icon: '🔥', description: '累计完成 7 个任务', trigger: { event: 'task.completed', threshold: 7 } },
  { id: 'achievement-goal-completed', name: '长路抵达', icon: '🏁', description: '完成第一个长期目标', trigger: { event: 'goal.completed', threshold: 1 } },
  { id: 'achievement-skill-level-five', name: '技能初成', icon: '✨', description: '任意技能达到 5 级', trigger: { event: 'skill.level', threshold: 5 } },
  { id: 'achievement-seven-day-streak', name: '七日坚持', icon: '📅', description: '连续 7 天完成任务', trigger: { event: 'streak.days', threshold: 7 } },
]

function migrateAchievements(input: unknown, timestamp: string): Achievement[] {
  const achievements = records(input) as unknown as Achievement[]

  for (const standard of STANDARD_ACHIEVEMENTS) {
    const standardTrigger = standard.trigger
    const alreadyConfigured = achievements.some(
      (achievement) => achievement.id === standard.id ||
        (standardTrigger !== null &&
          achievement.trigger?.event === standardTrigger.event &&
          achievement.trigger.threshold === standardTrigger.threshold),
    )
    if (!alreadyConfigured) {
      achievements.push({
        ...standard,
        unlockType: 'automatic',
        unlockedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
  }

  return achievements
}

/** 将 IndexedDB v1 数据或 v1 导出存档收敛为新的精简运行时模型。 */
export function migrateLegacyAppData(input: unknown): AppData {
  if (!isRecord(input)) throw new Error('旧存档根节点无效')
  const bosses = legacyBosses(input.bosses)
  const timeline = legacyTimeline(input.timeline)
  const categories = records(input.skillCategories) as unknown as SkillCategory[]
  const timestamp = stringValue(
    isRecord(input.character) ? input.character.updatedAt : undefined,
    new Date(0).toISOString(),
  )

  return {
    character: structuredClone(input.character) as AppData['character'],
    stats: structuredClone(input.stats) as AppData['stats'],
    skillCategories: structuredClone(categories),
    skills: structuredClone(records(input.skills)) as unknown as AppData['skills'],
    goals: migrateGoals(input.goals, bosses),
    tasks: migrateTasks(input.tasks, categories, bosses),
    achievements: migrateAchievements(input.achievements, timestamp),
    events: migrateEvents(input.events, timeline, bosses),
  }
}

export function migrateSaveFile(input: unknown): unknown {
  if (!isRecord(input)) return input
  if (input.app !== APP_NAME) return input
  if (input.schemaVersion === SCHEMA_VERSION) return structuredClone(input)
  if (input.schemaVersion !== 1) return input

  const data = migrateLegacyAppData(input)
  return {
    ...data,
    schemaVersion: SCHEMA_VERSION,
    app: APP_NAME,
    exportedAt: stringValue(input.exportedAt, new Date().toISOString()),
  } satisfies SaveFile
}
