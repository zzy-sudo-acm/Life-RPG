import { EMPTY_REWARDS, STAT_KEYS } from '../types/models'
import type {
  AppData,
  Boss,
  BossReward,
  Character,
  LifeEvent,
  RewardBundle,
  Skill,
  SkillReward,
  StatKey,
  StatSnapshot,
  StatValues,
} from '../types/models'

const CHARACTER_EXP_GROWTH = 1.2
const SKILL_EXP_GROWTH = 1.25

export type ProgressionTimestamp = string | Date

function toIsoTimestamp(value: ProgressionTimestamp): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('结算时间无效')
  }

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

  if (!Number.isFinite(result)) {
    throw new Error(`${label}超出可保存的数值范围`)
  }

  return result
}

function nextRequirement(current: number, growth: number): number {
  const next = Math.max(current + 1, Math.ceil(current * growth))

  if (!Number.isSafeInteger(next)) {
    throw new Error('升级所需经验超出可保存的数值范围')
  }

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
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new Error(`${label}等级数据无效`)
  }

  requireNonNegativeFinite(exp, `${label}当前经验`)
  requirePositiveFinite(expToNextLevel, `${label}升级经验`)
  requireNonNegativeFinite(reward, `${label}奖励经验`)

  let nextLevel = level
  let nextExp = safeAdd(exp, reward, `${label}经验`)
  let nextExpToNextLevel = expToNextLevel

  while (nextExp >= nextExpToNextLevel) {
    nextExp -= nextExpToNextLevel
    nextLevel += 1

    if (!Number.isSafeInteger(nextLevel)) {
      throw new Error(`${label}等级超出可保存的数值范围`)
    }

    nextExpToNextLevel = nextRequirement(nextExpToNextLevel, growth)
  }

  return {
    level: nextLevel,
    exp: nextExp,
    expToNextLevel: nextExpToNextLevel,
  }
}

function cloneRewards(rewards: RewardBundle): RewardBundle {
  return {
    exp: rewards.exp,
    stats: { ...rewards.stats },
    skills: rewards.skills.map((reward) => ({ ...reward })),
    bosses: rewards.bosses.map((reward) => ({ ...reward })),
  }
}

function aggregateRewards<T extends SkillReward | BossReward>(
  rewards: readonly T[],
  idKey: 'skillId' | 'bossId',
  amountKey: 'amount' | 'damage',
  label: string,
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const reward of rewards) {
    const id = reward[idKey as keyof T]
    const amount = reward[amountKey as keyof T]

    if (typeof id !== 'string' || id.length === 0 || typeof amount !== 'number') {
      throw new Error(`${label}结构无效`)
    }

    requireNonNegativeFinite(amount, label)
    totals.set(id, safeAdd(totals.get(id) ?? 0, amount, label))
  }

  return totals
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

function addCharacterExp(
  character: Character,
  reward: number,
  updatedAt: string,
): Character {
  requireNonNegativeFinite(reward, '角色奖励经验')

  if (reward === 0) {
    return character
  }

  const progression = applyLevels(
    character.level,
    character.exp,
    character.expToNextLevel,
    reward,
    CHARACTER_EXP_GROWTH,
    '角色',
  )

  return {
    ...character,
    ...progression,
    totalExp: safeAdd(character.totalExp, reward, '角色总经验'),
    updatedAt,
  }
}

function addSkillRewards(
  skills: Skill[],
  rewards: readonly SkillReward[],
  updatedAt: string,
): Skill[] {
  const totals = aggregateRewards(rewards, 'skillId', 'amount', '技能奖励经验')

  for (const skillId of totals.keys()) {
    if (!skills.some((skill) => skill.id === skillId)) {
      throw new Error(`找不到技能：${skillId}`)
    }
  }

  if ([...totals.values()].every((amount) => amount === 0)) {
    return [...skills]
  }

  return skills.map((skill) => {
    const reward = totals.get(skill.id) ?? 0
    if (reward === 0) {
      return skill
    }

    return {
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
  let hasChange = false

  for (const key of STAT_KEYS) {
    const amount = rewards[key]
    if (amount === undefined) {
      continue
    }

    requireNonNegativeFinite(amount, `${key} 属性奖励`)
    if (amount > 0) {
      nextValues[key] = safeAdd(nextValues[key], amount, `${key} 属性值`)
      hasChange = true
    }
  }

  if (!hasChange) {
    return data.stats
  }

  const snapshot: StatSnapshot = {
    id: makeUniqueId(
      `stats-task-${recordedAt}`,
      data.stats.history.map((item) => item.id),
    ),
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

interface BossDamageResult {
  bosses: Boss[]
  actualDamage: number
  defeatedNow: boolean
}

function addBossDamage(
  bosses: Boss[],
  bossId: string,
  requestedDamage: number,
  updatedAt: string,
): BossDamageResult {
  requireNonNegativeFinite(requestedDamage, 'Boss 伤害值')

  const boss = bosses.find((item) => item.id === bossId)
  if (boss === undefined) {
    throw new Error(`找不到 Boss：${bossId}`)
  }

  requirePositiveFinite(boss.maxHp, `Boss「${boss.name}」最大生命值`)
  requireNonNegativeFinite(boss.currentHp, `Boss「${boss.name}」当前生命值`)

  if (requestedDamage === 0 || boss.currentHp === 0) {
    return {
      bosses: [...bosses],
      actualDamage: 0,
      defeatedNow: false,
    }
  }

  const nextHp = Math.max(0, boss.currentHp - requestedDamage)
  const defeatedNow = nextHp === 0 && boss.currentHp > 0
  const nextBoss: Boss = {
    ...boss,
    currentHp: nextHp,
    status: defeatedNow ? 'defeated' : 'active',
    updatedAt,
  }

  return {
    bosses: bosses.map((item) => (item.id === bossId ? nextBoss : item)),
    actualDamage: boss.currentHp - nextHp,
    defeatedNow,
  }
}

function addBossRewards(
  bosses: Boss[],
  rewards: readonly BossReward[],
  updatedAt: string,
): Boss[] {
  const totals = aggregateRewards(rewards, 'bossId', 'damage', 'Boss 奖励伤害')
  let result = [...bosses]

  for (const [bossId, damage] of totals) {
    result = addBossDamage(result, bossId, damage, updatedAt).bosses
  }

  return result
}

function createTaskEvent(
  data: AppData,
  taskId: string,
  taskName: string,
  rewards: RewardBundle,
  occurredAt: string,
): LifeEvent {
  return {
    id: makeUniqueId(
      `event-task-${taskId}-${occurredAt}`,
      data.events.map((event) => event.id),
    ),
    createdAt: occurredAt,
    updatedAt: occurredAt,
    date: occurredAt,
    title: `完成任务：${taskName}`,
    description: '任务已完成，奖励已自动结算。',
    rewards: cloneRewards(rewards),
    sourceType: 'task',
    sourceId: taskId,
  }
}

/**
 * 完成任务并一次性结算全部奖励。rewardApplied 是幂等边界；已结算任务原样返回。
 */
export function completeTaskRewards(
  data: AppData,
  taskId: string,
  now: ProgressionTimestamp = new Date(),
): AppData {
  const task = data.tasks.find((item) => item.id === taskId)
  if (task === undefined) {
    throw new Error(`找不到任务：${taskId}`)
  }

  if (task.rewardApplied) {
    return data
  }

  const completedAt = toIsoTimestamp(now)
  const character = addCharacterExp(data.character, task.rewards.exp, completedAt)
  const stats = addStatRewards(data, task.rewards.stats, task.name, completedAt)
  const skills = addSkillRewards(data.skills, task.rewards.skills, completedAt)
  const bosses = addBossRewards(data.bosses, task.rewards.bosses, completedAt)
  const completedTask = {
    ...task,
    status: 'completed' as const,
    completedAt,
    rewardApplied: true,
    updatedAt: completedAt,
  }

  return {
    ...data,
    character,
    stats,
    skills,
    bosses,
    tasks: data.tasks.map((item) => (item.id === taskId ? completedTask : item)),
    events: [
      ...data.events,
      createTaskEvent(data, task.id, task.name, task.rewards, completedAt),
    ],
  }
}

/** 便于调用方按动作语义命名。 */
export const applyTaskCompletion = completeTaskRewards

/**
 * 直接记录一次 Boss 挑战。生命值不会低于 0，首次降至 0 时状态变为 defeated。
 */
export function damageBossProgress(
  data: AppData,
  bossId: string,
  damage: number,
  note = '',
  now: ProgressionTimestamp = new Date(),
): AppData {
  requirePositiveFinite(damage, 'Boss 伤害值')
  const occurredAt = toIsoTimestamp(now)
  const target = data.bosses.find((boss) => boss.id === bossId)

  if (target === undefined) {
    throw new Error(`找不到 Boss：${bossId}`)
  }

  const result = addBossDamage(data.bosses, bossId, damage, occurredAt)
  if (result.actualDamage === 0) {
    return data
  }

  const title = result.defeatedNow
    ? `击败 Boss：${target.name}`
    : `挑战 Boss：${target.name}`
  const trimmedNote = note.trim()
  const event: LifeEvent = {
    id: makeUniqueId(
      `event-boss-${bossId}-${occurredAt}`,
      data.events.map((item) => item.id),
    ),
    createdAt: occurredAt,
    updatedAt: occurredAt,
    date: occurredAt,
    title,
    description:
      trimmedNote.length > 0
        ? `${trimmedNote}（造成 ${result.actualDamage} 点伤害）`
        : `对 ${target.name} 造成 ${result.actualDamage} 点伤害。`,
    rewards: {
      ...cloneRewards(EMPTY_REWARDS),
      bosses: [{ bossId, damage: result.actualDamage }],
    },
    sourceType: 'boss',
    sourceId: bossId,
  }

  return {
    ...data,
    bosses: result.bosses,
    events: [...data.events, event],
  }
}

/** 便于调用方按动作语义命名。 */
export const applyBossDamage = damageBossProgress

export function getNextCharacterExpRequirement(current: number): number {
  return nextRequirement(
    requirePositiveFinite(current, '角色升级经验'),
    CHARACTER_EXP_GROWTH,
  )
}

export function getNextSkillExpRequirement(current: number): number {
  return nextRequirement(
    requirePositiveFinite(current, '技能升级经验'),
    SKILL_EXP_GROWTH,
  )
}

export function hasStatReward(rewards: Partial<Record<StatKey, number>>): boolean {
  return STAT_KEYS.some((key) => (rewards[key] ?? 0) > 0)
}
