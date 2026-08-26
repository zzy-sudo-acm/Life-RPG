import { STAT_KEYS } from '../types/models'
import type {
  AppData,
  Character,
  Goal,
  LifeEvent,
  RewardBundle,
  Skill,
  SkillReward,
  StatKey,
  StatSnapshot,
  StatValues,
  Task,
} from '../types/models'
import { evaluateAchievementTriggers } from './achievements'

const CHARACTER_EXP_GROWTH = 1.2
const SKILL_EXP_GROWTH = 1.25

export type ProgressionTimestamp = string | Date

function toIsoTimestamp(value: ProgressionTimestamp): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('结算时间无效')
  return date.toISOString()
}

function requireNonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label}必须是大于等于 0 的有限数字`)
  }
  return value
}

function requirePositiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label}必须是大于 0 的有限数字`)
  }
  return value
}

function safeAdd(left: number, right: number, label: string): number {
  const result = left + right
  if (!Number.isFinite(result)) throw new Error(`${label}超出可保存的数值范围`)
  return result
}

function nextRequirement(current: number, growth: number): number {
  const next = Math.max(current + 1, Math.ceil(current * growth))
  if (!Number.isSafeInteger(next)) throw new Error('升级所需经验超出可保存的数值范围')
  return next
}

function applyLevels(
  level: number,
  exp: number,
  expToNextLevel: number,
  reward: number,
  growth: number,
  label: string,
): Pick<Character, 'level' | 'exp' | 'expToNextLevel'> {
  if (!Number.isSafeInteger(level) || level < 1) throw new Error(`${label}等级数据无效`)
  requireNonNegativeFinite(exp, `${label}当前经验`)
  requirePositiveFinite(expToNextLevel, `${label}升级经验`)
  requireNonNegativeFinite(reward, `${label}奖励经验`)

  let nextLevel = level
  let nextExp = safeAdd(exp, reward, `${label}经验`)
  let nextExpToNextLevel = expToNextLevel

  while (nextExp >= nextExpToNextLevel) {
    nextExp -= nextExpToNextLevel
    nextLevel += 1
    if (!Number.isSafeInteger(nextLevel)) throw new Error(`${label}等级超出可保存的数值范围`)
    nextExpToNextLevel = nextRequirement(nextExpToNextLevel, growth)
  }

  return { level: nextLevel, exp: nextExp, expToNextLevel: nextExpToNextLevel }
}

function makeUniqueId(base: string, usedIds: Iterable<string>): string {
  const used = new Set(usedIds)
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

function addCharacterExp(character: Character, reward: number, updatedAt: string): Character {
  requireNonNegativeFinite(reward, '角色奖励经验')
  if (reward === 0) return character
  return {
    ...character,
    ...applyLevels(
      character.level,
      character.exp,
      character.expToNextLevel,
      reward,
      CHARACTER_EXP_GROWTH,
      '角色',
    ),
    totalExp: safeAdd(character.totalExp, reward, '角色总经验'),
    updatedAt,
  }
}

function addSkillRewards(skills: Skill[], rewards: readonly SkillReward[], updatedAt: string): Skill[] {
  const totals = new Map<string, number>()
  for (const reward of rewards) {
    requireNonNegativeFinite(reward.amount, '技能奖励经验')
    totals.set(
      reward.skillId,
      safeAdd(totals.get(reward.skillId) ?? 0, reward.amount, '技能奖励经验'),
    )
  }
  for (const skillId of totals.keys()) {
    if (!skills.some((skill) => skill.id === skillId)) throw new Error(`找不到技能：${skillId}`)
  }

  return skills.map((skill) => {
    const reward = totals.get(skill.id) ?? 0
    return reward === 0
      ? skill
      : {
          ...skill,
          ...applyLevels(
            skill.level,
            skill.exp,
            skill.expToNextLevel,
            reward,
            SKILL_EXP_GROWTH,
            `技能「${skill.name}」`,
          ),
          updatedAt,
        }
  })
}

function addStatRewards(
  data: AppData,
  rewards: RewardBundle['stats'],
  taskName: string,
  recordedAt: string,
): AppData['stats'] {
  const nextValues: StatValues = { ...data.stats.values }
  let changed = false

  for (const key of STAT_KEYS) {
    const amount = rewards[key]
    if (amount === undefined) continue
    requireNonNegativeFinite(amount, `${key} 属性奖励`)
    if (amount > 0) {
      nextValues[key] = safeAdd(nextValues[key], amount, `${key} 属性值`)
      changed = true
    }
  }
  if (!changed) return data.stats

  const snapshot: StatSnapshot = {
    id: makeUniqueId(`stats-task-${recordedAt}`, data.stats.history.map((item) => item.id)),
    recordedAt,
    values: { ...nextValues },
    source: 'task',
    note: `完成任务：${taskName}`,
  }
  return {
    ...data.stats,
    values: nextValues,
    history: [...data.stats.history, snapshot],
    updatedAt: recordedAt,
  }
}

interface GoalProgressResult {
  goals: Goal[]
  completedGoal: Goal | null
}

function advanceGoal(
  goals: Goal[],
  goalId: string | null,
  amount: number,
  updatedAt: string,
): GoalProgressResult {
  if (goalId === null || amount === 0) return { goals, completedGoal: null }
  requireNonNegativeFinite(amount, '目标进度奖励')
  const goal = goals.find((item) => item.id === goalId)
  if (goal === undefined) throw new Error(`找不到目标：${goalId}`)
  if (goal.status === 'completed') return { goals, completedGoal: null }

  const progress = Math.min(100, goal.progress + amount)
  const completedNow = progress === 100
  const nextGoal: Goal = {
    ...goal,
    progress,
    status: completedNow ? 'completed' : goal.status === 'planned' ? 'active' : goal.status,
    updatedAt,
  }
  return {
    goals: goals.map((item) => item.id === goalId ? nextGoal : item),
    completedGoal: completedNow ? nextGoal : null,
  }
}

function makeEvent(
  data: AppData,
  event: Omit<LifeEvent, 'id' | 'createdAt' | 'updatedAt'>,
  occurredAt: string,
): LifeEvent {
  return {
    ...event,
    id: makeUniqueId(
      `event-${event.sourceType}-${event.sourceId ?? occurredAt}`,
      data.events.map((item) => item.id),
    ),
    createdAt: occurredAt,
    updatedAt: occurredAt,
  }
}

function completionStreak(tasks: readonly Task[]): number {
  const days = [...new Set(
    tasks.flatMap((task) => task.completedAt === null ? [] : [task.completedAt.slice(0, 10)]),
  )].toSorted((left, right) => right.localeCompare(left))
  if (days.length === 0) return 0

  let streak = 1
  let cursor = new Date(`${days[0]}T00:00:00Z`)
  for (const day of days.slice(1)) {
    cursor = new Date(cursor.getTime() - 86_400_000)
    if (day !== cursor.toISOString().slice(0, 10)) break
    streak += 1
  }
  return streak
}

function unlockAutomaticAchievements(data: AppData, occurredAt: string): AppData {
  const signals = [
    { event: 'task.completed', value: data.tasks.filter((task) => task.status === 'completed').length },
    { event: 'goal.completed', value: data.goals.filter((goal) => goal.status === 'completed').length },
    { event: 'skill.level', value: data.skills.reduce((maximum, skill) => Math.max(maximum, skill.level), 0) },
    { event: 'streak.days', value: completionStreak(data.tasks) },
  ]
  let achievements = data.achievements
  const unlockedIds: string[] = []

  for (const signal of signals) {
    const evaluation = evaluateAchievementTriggers(achievements, { ...signal, occurredAt })
    achievements = evaluation.achievements
    unlockedIds.push(...evaluation.unlockedIds)
  }

  if (unlockedIds.length === 0) return { ...data, achievements }
  const unlocked = achievements.filter((achievement) => unlockedIds.includes(achievement.id))
  let nextData = { ...data, achievements }

  for (const achievement of unlocked) {
    const event = makeEvent(nextData, {
      date: occurredAt,
      title: `获得成就：${achievement.name}`,
      description: achievement.description,
      sourceType: 'achievement',
      sourceId: achievement.id,
    }, occurredAt)
    nextData = { ...nextData, events: [...nextData.events, event] }
  }
  return nextData
}

/** 完成任务并原子结算自动奖励；普通任务不会写入成长足迹。 */
export function completeTaskRewards(
  data: AppData,
  taskId: string,
  now: ProgressionTimestamp = new Date(),
): AppData {
  const task = data.tasks.find((item) => item.id === taskId)
  if (task === undefined) throw new Error(`找不到任务：${taskId}`)
  if (task.rewardApplied) return data

  const completedAt = toIsoTimestamp(now)
  const completedTask: Task = {
    ...task,
    status: 'completed',
    completedAt,
    rewardApplied: true,
    updatedAt: completedAt,
  }
  const goalResult = advanceGoal(data.goals, task.goalId, task.rewards.goalProgress, completedAt)
  let next: AppData = {
    ...data,
    character: addCharacterExp(data.character, task.rewards.exp, completedAt),
    stats: addStatRewards(data, task.rewards.stats, task.name, completedAt),
    skills: addSkillRewards(data.skills, task.rewards.skills, completedAt),
    goals: goalResult.goals,
    tasks: data.tasks.map((item) => item.id === taskId ? completedTask : item),
  }

  if (goalResult.completedGoal !== null) {
    const goal = goalResult.completedGoal
    const event = makeEvent(next, {
      date: completedAt,
      title: goal.displayMode === 'boss' ? `击败目标：${goal.name}` : `完成目标：${goal.name}`,
      description: goal.description || '长期目标已经完成。',
      sourceType: 'goal',
      sourceId: goal.id,
    }, completedAt)
    next = { ...next, events: [...next.events, event] }
  }

  return unlockAutomaticAchievements(next, completedAt)
}

export const applyTaskCompletion = completeTaskRewards

export function getNextCharacterExpRequirement(current: number): number {
  return nextRequirement(requirePositiveFinite(current, '角色升级经验'), CHARACTER_EXP_GROWTH)
}

export function getNextSkillExpRequirement(current: number): number {
  return nextRequirement(requirePositiveFinite(current, '技能升级经验'), SKILL_EXP_GROWTH)
}

export function hasStatReward(rewards: Partial<Record<StatKey, number>>): boolean {
  return STAT_KEYS.some((key) => (rewards[key] ?? 0) > 0)
}
