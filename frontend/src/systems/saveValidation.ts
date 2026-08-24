import { STAT_KEYS } from '../types/models'
import type {
  Achievement,
  AchievementTrigger,
  AppData,
  Boss,
  BossReward,
  Character,
  Equipment,
  Goal,
  LifeEvent,
  RewardBundle,
  SaveFile,
  Skill,
  SkillCategory,
  SkillReward,
  StatSnapshot,
  StatsState,
  TimelineNode,
  Task,
} from '../types/models'

export const SUPPORTED_SCHEMA_VERSION = 1
export const SAVE_FILE_APP = 'life-rpg' as const

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/
const STAT_KEY_SET = new Set<string>(STAT_KEYS)

const SAVE_FILE_KEYS = [
  'schemaVersion',
  'app',
  'exportedAt',
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
] as const

const CHARACTER_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'profession',
  'level',
  'exp',
  'expToNextLevel',
  'totalExp',
  'lifeStage',
  'primaryGoalId',
] as const

const STATS_KEYS = ['id', 'values', 'history', 'updatedAt'] as const
const SNAPSHOT_KEYS = ['id', 'recordedAt', 'values', 'source', 'note'] as const
const CATEGORY_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'description',
  'order',
] as const
const SKILL_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'categoryId',
  'parentId',
  'name',
  'level',
  'exp',
  'expToNextLevel',
  'description',
] as const
const GOAL_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'parentId',
  'name',
  'type',
  'description',
  'deadline',
  'status',
  'progress',
] as const
const TASK_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'goalId',
  'name',
  'type',
  'description',
  'dueDate',
  'status',
  'rewards',
  'completedAt',
  'rewardApplied',
] as const
const REWARD_KEYS = ['exp', 'stats', 'skills', 'bosses'] as const
const SKILL_REWARD_KEYS = ['skillId', 'amount'] as const
const BOSS_REWARD_KEYS = ['bossId', 'damage'] as const
const ACHIEVEMENT_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'icon',
  'description',
  'unlockType',
  'unlockedAt',
  'trigger',
] as const
const TRIGGER_KEYS = ['event', 'threshold'] as const
const EQUIPMENT_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'quality',
  'description',
  'statBonuses',
] as const
const EVENT_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'date',
  'title',
  'description',
  'rewards',
  'sourceType',
  'sourceId',
] as const
const BOSS_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'goalId',
  'name',
  'description',
  'maxHp',
  'currentHp',
  'deadline',
  'status',
] as const
const TIMELINE_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'parentId',
  'title',
  'description',
  'stageType',
  'status',
  'startDate',
  'endDate',
  'order',
] as const

export class SaveValidationError extends Error {
  constructor(message: string) {
    super(`存档校验失败：${message}`)
    this.name = 'SaveValidationError'
  }
}

function fail(path: string, message: string): never {
  throw new SaveValidationError(`${path}${message}`)
}

function assertObject(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, '必须是对象')
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, '必须是普通对象')
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  const expected = new Set(keys)

  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      fail(`${path}.${key}`, '是不支持的字段')
    }
  }

  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      fail(`${path}.${key}`, '缺失')
    }
  }
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) {
      fail(`${path}.${key}`, '是不支持的字段')
    }
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    fail(path, '必须是数组')
  }
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string') {
    fail(path, '必须是字符串')
  }
}

function assertNonEmptyString(
  value: unknown,
  path: string,
): asserts value is string {
  assertString(value, path)
  if (value.trim().length === 0) {
    fail(path, '不能为空')
  }
}

function assertNullableString(
  value: unknown,
  path: string,
): asserts value is string | null {
  if (value !== null) {
    assertNonEmptyString(value, path)
  }
}

interface NumberRules {
  integer?: boolean
  min?: number
  max?: number
  exclusiveMin?: number
}

function assertNumber(
  value: unknown,
  path: string,
  rules: NumberRules = {},
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, '必须是有限数字')
  }

  if (rules.integer === true && !Number.isSafeInteger(value)) {
    fail(path, '必须是安全整数')
  }
  if (rules.min !== undefined && value < rules.min) {
    fail(path, `不能小于 ${rules.min}`)
  }
  if (rules.max !== undefined && value > rules.max) {
    fail(path, `不能大于 ${rules.max}`)
  }
  if (rules.exclusiveMin !== undefined && value <= rules.exclusiveMin) {
    fail(path, `必须大于 ${rules.exclusiveMin}`)
  }
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    fail(path, '必须是布尔值')
  }
}

function assertOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): asserts value is T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    fail(path, `必须是以下值之一：${values.join('、')}`)
  }
}

function assertIsoDate(value: unknown, path: string): asserts value is string {
  assertString(value, path)

  if (!DATE_ONLY_PATTERN.test(value) && !DATE_TIME_PATTERN.test(value)) {
    fail(path, '必须是 ISO 日期或日期时间')
  }

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    fail(path, '不是有效日期')
  }

  const [yearText, monthText, dayText] = value.slice(0, 10).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1]

  if (daysInMonth === undefined || day < 1 || day > daysInMonth) {
    fail(path, '不是有效日期')
  }
}

function assertNullableIsoDate(
  value: unknown,
  path: string,
): asserts value is string | null {
  if (value !== null) {
    assertIsoDate(value, path)
  }
}

function assertEntityBase(value: Record<string, unknown>, path: string): void {
  assertNonEmptyString(value.id, `${path}.id`)
  assertIsoDate(value.createdAt, `${path}.createdAt`)
  assertIsoDate(value.updatedAt, `${path}.updatedAt`)
}

function assertStatValues(value: unknown, path: string): void {
  assertObject(value, path)
  assertExactKeys(value, STAT_KEYS, path)

  for (const key of STAT_KEYS) {
    assertNumber(value[key], `${path}.${key}`, { min: 0 })
  }
}

function assertPartialStatValues(value: unknown, path: string): void {
  assertObject(value, path)
  assertAllowedKeys(value, STAT_KEY_SET, path)

  for (const [key, amount] of Object.entries(value)) {
    assertNumber(amount, `${path}.${key}`, { min: 0 })
  }
}

function assertCharacter(value: unknown, path: string): asserts value is Character {
  assertObject(value, path)
  assertExactKeys(value, CHARACTER_KEYS, path)
  assertEntityBase(value, path)

  if (value.id !== 'character') {
    fail(`${path}.id`, '必须是 character')
  }
  assertString(value.name, `${path}.name`)
  assertString(value.profession, `${path}.profession`)
  assertNumber(value.level, `${path}.level`, { integer: true, min: 1 })
  assertNumber(value.exp, `${path}.exp`, { min: 0 })
  assertNumber(value.expToNextLevel, `${path}.expToNextLevel`, {
    exclusiveMin: 0,
  })
  assertNumber(value.totalExp, `${path}.totalExp`, { min: 0 })
  assertString(value.lifeStage, `${path}.lifeStage`)
  assertNullableString(value.primaryGoalId, `${path}.primaryGoalId`)
}

function assertSnapshot(
  value: unknown,
  path: string,
): asserts value is StatSnapshot {
  assertObject(value, path)
  assertExactKeys(value, SNAPSHOT_KEYS, path)
  assertNonEmptyString(value.id, `${path}.id`)
  assertIsoDate(value.recordedAt, `${path}.recordedAt`)
  assertStatValues(value.values, `${path}.values`)
  assertOneOf(
    value.source,
    ['seed', 'manual', 'task', 'event', 'import'] as const,
    `${path}.source`,
  )
  assertString(value.note, `${path}.note`)
}

function assertStats(value: unknown, path: string): asserts value is StatsState {
  assertObject(value, path)
  assertExactKeys(value, STATS_KEYS, path)

  if (value.id !== 'stats') {
    fail(`${path}.id`, '必须是 stats')
  }
  assertStatValues(value.values, `${path}.values`)
  assertArray(value.history, `${path}.history`)
  for (const [index, snapshot] of value.history.entries()) {
    assertSnapshot(snapshot, `${path}.history[${index}]`)
  }
  assertUniqueIds(value.history as StatSnapshot[], `${path}.history`)
  assertIsoDate(value.updatedAt, `${path}.updatedAt`)
}

function assertCategory(
  value: unknown,
  path: string,
): asserts value is SkillCategory {
  assertObject(value, path)
  assertExactKeys(value, CATEGORY_KEYS, path)
  assertEntityBase(value, path)
  assertString(value.name, `${path}.name`)
  assertString(value.description, `${path}.description`)
  assertNumber(value.order, `${path}.order`, { integer: true })
}

function assertSkill(value: unknown, path: string): asserts value is Skill {
  assertObject(value, path)
  assertExactKeys(value, SKILL_KEYS, path)
  assertEntityBase(value, path)
  assertNonEmptyString(value.categoryId, `${path}.categoryId`)
  assertNullableString(value.parentId, `${path}.parentId`)
  assertString(value.name, `${path}.name`)
  assertNumber(value.level, `${path}.level`, { integer: true, min: 1 })
  assertNumber(value.exp, `${path}.exp`, { min: 0 })
  assertNumber(value.expToNextLevel, `${path}.expToNextLevel`, {
    exclusiveMin: 0,
  })
  assertString(value.description, `${path}.description`)
}

function assertGoal(value: unknown, path: string): asserts value is Goal {
  assertObject(value, path)
  assertExactKeys(value, GOAL_KEYS, path)
  assertEntityBase(value, path)
  assertNullableString(value.parentId, `${path}.parentId`)
  assertString(value.name, `${path}.name`)
  assertOneOf(value.type, ['major', 'minor'] as const, `${path}.type`)
  assertString(value.description, `${path}.description`)
  assertNullableIsoDate(value.deadline, `${path}.deadline`)
  assertOneOf(
    value.status,
    ['planned', 'active', 'completed', 'paused'] as const,
    `${path}.status`,
  )
  assertNumber(value.progress, `${path}.progress`, { min: 0, max: 100 })
}

function assertSkillReward(
  value: unknown,
  path: string,
): asserts value is SkillReward {
  assertObject(value, path)
  assertExactKeys(value, SKILL_REWARD_KEYS, path)
  assertNonEmptyString(value.skillId, `${path}.skillId`)
  assertNumber(value.amount, `${path}.amount`, { min: 0 })
}

function assertBossReward(
  value: unknown,
  path: string,
): asserts value is BossReward {
  assertObject(value, path)
  assertExactKeys(value, BOSS_REWARD_KEYS, path)
  assertNonEmptyString(value.bossId, `${path}.bossId`)
  assertNumber(value.damage, `${path}.damage`, { min: 0 })
}

function assertRewards(
  value: unknown,
  path: string,
): asserts value is RewardBundle {
  assertObject(value, path)
  assertExactKeys(value, REWARD_KEYS, path)
  assertNumber(value.exp, `${path}.exp`, { min: 0 })
  assertPartialStatValues(value.stats, `${path}.stats`)

  assertArray(value.skills, `${path}.skills`)
  for (const [index, reward] of value.skills.entries()) {
    assertSkillReward(reward, `${path}.skills[${index}]`)
  }

  assertArray(value.bosses, `${path}.bosses`)
  for (const [index, reward] of value.bosses.entries()) {
    assertBossReward(reward, `${path}.bosses[${index}]`)
  }
}

function assertTask(value: unknown, path: string): asserts value is Task {
  assertObject(value, path)
  assertExactKeys(value, TASK_KEYS, path)
  assertEntityBase(value, path)
  assertNullableString(value.goalId, `${path}.goalId`)
  assertString(value.name, `${path}.name`)
  assertString(value.type, `${path}.type`)
  assertString(value.description, `${path}.description`)
  assertNullableIsoDate(value.dueDate, `${path}.dueDate`)
  assertOneOf(
    value.status,
    ['todo', 'in_progress', 'completed'] as const,
    `${path}.status`,
  )
  assertRewards(value.rewards, `${path}.rewards`)
  assertNullableIsoDate(value.completedAt, `${path}.completedAt`)
  assertBoolean(value.rewardApplied, `${path}.rewardApplied`)
}

function assertTrigger(
  value: unknown,
  path: string,
): asserts value is AchievementTrigger {
  assertObject(value, path)
  assertExactKeys(value, TRIGGER_KEYS, path)
  assertNonEmptyString(value.event, `${path}.event`)
  assertNumber(value.threshold, `${path}.threshold`, { min: 0 })
}

function assertAchievement(
  value: unknown,
  path: string,
): asserts value is Achievement {
  assertObject(value, path)
  assertExactKeys(value, ACHIEVEMENT_KEYS, path)
  assertEntityBase(value, path)
  assertString(value.name, `${path}.name`)
  assertString(value.icon, `${path}.icon`)
  assertString(value.description, `${path}.description`)
  assertOneOf(
    value.unlockType,
    ['manual', 'automatic'] as const,
    `${path}.unlockType`,
  )
  assertNullableIsoDate(value.unlockedAt, `${path}.unlockedAt`)
  if (value.trigger !== null) {
    assertTrigger(value.trigger, `${path}.trigger`)
  }
  if (value.unlockType === 'manual' && value.unlockedAt === null) {
    fail(`${path}.unlockedAt`, '手动成就必须包含解锁日期')
  }
}

function assertEquipment(
  value: unknown,
  path: string,
): asserts value is Equipment {
  assertObject(value, path)
  assertExactKeys(value, EQUIPMENT_KEYS, path)
  assertEntityBase(value, path)
  assertString(value.name, `${path}.name`)
  assertOneOf(
    value.quality,
    ['common', 'fine', 'rare', 'epic', 'legendary'] as const,
    `${path}.quality`,
  )
  assertString(value.description, `${path}.description`)
  assertPartialStatValues(value.statBonuses, `${path}.statBonuses`)
}

function assertLifeEvent(
  value: unknown,
  path: string,
): asserts value is LifeEvent {
  assertObject(value, path)
  assertExactKeys(value, EVENT_KEYS, path)
  assertEntityBase(value, path)
  assertIsoDate(value.date, `${path}.date`)
  assertString(value.title, `${path}.title`)
  assertString(value.description, `${path}.description`)
  assertRewards(value.rewards, `${path}.rewards`)
  assertOneOf(
    value.sourceType,
    ['manual', 'task', 'achievement', 'boss'] as const,
    `${path}.sourceType`,
  )
  assertNullableString(value.sourceId, `${path}.sourceId`)
}

function assertBoss(value: unknown, path: string): asserts value is Boss {
  assertObject(value, path)
  assertExactKeys(value, BOSS_KEYS, path)
  assertEntityBase(value, path)
  assertNullableString(value.goalId, `${path}.goalId`)
  assertString(value.name, `${path}.name`)
  assertString(value.description, `${path}.description`)
  assertNumber(value.maxHp, `${path}.maxHp`, { exclusiveMin: 0 })
  assertNumber(value.currentHp, `${path}.currentHp`, { min: 0 })
  if (
    typeof value.currentHp === 'number' &&
    typeof value.maxHp === 'number' &&
    value.currentHp > value.maxHp
  ) {
    fail(`${path}.currentHp`, '不能大于 maxHp')
  }
  assertNullableIsoDate(value.deadline, `${path}.deadline`)
  assertOneOf(
    value.status,
    ['planned', 'active', 'defeated'] as const,
    `${path}.status`,
  )
}

function assertTimelineNode(
  value: unknown,
  path: string,
): asserts value is TimelineNode {
  assertObject(value, path)
  assertExactKeys(value, TIMELINE_KEYS, path)
  assertEntityBase(value, path)
  assertNullableString(value.parentId, `${path}.parentId`)
  assertString(value.title, `${path}.title`)
  assertString(value.description, `${path}.description`)
  assertString(value.stageType, `${path}.stageType`)
  assertOneOf(
    value.status,
    ['past', 'current', 'future'] as const,
    `${path}.status`,
  )
  assertNullableIsoDate(value.startDate, `${path}.startDate`)
  assertNullableIsoDate(value.endDate, `${path}.endDate`)
  assertNumber(value.order, `${path}.order`, { integer: true })
}

function assertUniqueIds(
  values: ReadonlyArray<{ id: string }>,
  path: string,
): void {
  const ids = new Set<string>()

  for (const [index, value] of values.entries()) {
    if (ids.has(value.id)) {
      fail(`${path}[${index}].id`, `与同集合中的 ${value.id} 重复`)
    }
    ids.add(value.id)
  }
}

function assertCollection<T extends { id: string }>(
  value: unknown,
  path: string,
  validator: (item: unknown, itemPath: string) => asserts item is T,
): asserts value is T[] {
  assertArray(value, path)

  for (const [index, item] of value.entries()) {
    validator(item, `${path}[${index}]`)
  }

  assertUniqueIds(value as T[], path)
}

function assertExistingReference(
  id: string | null,
  ids: ReadonlySet<string>,
  path: string,
): void {
  if (id !== null && !ids.has(id)) {
    fail(path, `引用了不存在的 ID：${id}`)
  }
}

function idsOf(values: ReadonlyArray<{ id: string }>): Set<string> {
  return new Set(values.map((value) => value.id))
}

function assertAcyclicParents(
  values: ReadonlyArray<{ id: string; parentId: string | null }>,
  path: string,
): void {
  const byId = new Map(values.map((value) => [value.id, value]))

  for (const [index, value] of values.entries()) {
    const visited = new Set([value.id])
    let parentId = value.parentId

    while (parentId !== null) {
      if (visited.has(parentId)) {
        fail(`${path}[${index}].parentId`, '不能形成循环引用')
      }
      visited.add(parentId)
      parentId = byId.get(parentId)?.parentId ?? null
    }
  }
}

function assertReferenceIntegrity(saveFile: SaveFile): void {
  const categoryIds = idsOf(saveFile.skillCategories)
  const skillIds = idsOf(saveFile.skills)
  const skillsById = new Map(saveFile.skills.map((skill) => [skill.id, skill]))
  const goalIds = idsOf(saveFile.goals)
  const bossIds = idsOf(saveFile.bosses)
  const timelineIds = idsOf(saveFile.timeline)

  assertExistingReference(
    saveFile.character.primaryGoalId,
    goalIds,
    '$.character.primaryGoalId',
  )

  for (const [index, skill] of saveFile.skills.entries()) {
    assertExistingReference(
      skill.categoryId,
      categoryIds,
      `$.skills[${index}].categoryId`,
    )
    assertExistingReference(
      skill.parentId,
      skillIds,
      `$.skills[${index}].parentId`,
    )
    if (skill.parentId === skill.id) {
      fail(`$.skills[${index}].parentId`, '不能引用自身')
    }
    if (
      skill.parentId !== null &&
      skillsById.get(skill.parentId)?.categoryId !== skill.categoryId
    ) {
      fail(`$.skills[${index}].parentId`, '上级技能必须属于同一分类')
    }
  }

  for (const [index, goal] of saveFile.goals.entries()) {
    assertExistingReference(goal.parentId, goalIds, `$.goals[${index}].parentId`)
    if (goal.parentId === goal.id) {
      fail(`$.goals[${index}].parentId`, '不能引用自身')
    }
  }

  for (const [index, task] of saveFile.tasks.entries()) {
    assertExistingReference(task.goalId, goalIds, `$.tasks[${index}].goalId`)

    for (const [rewardIndex, reward] of task.rewards.skills.entries()) {
      assertExistingReference(
        reward.skillId,
        skillIds,
        `$.tasks[${index}].rewards.skills[${rewardIndex}].skillId`,
      )
    }
    for (const [rewardIndex, reward] of task.rewards.bosses.entries()) {
      assertExistingReference(
        reward.bossId,
        bossIds,
        `$.tasks[${index}].rewards.bosses[${rewardIndex}].bossId`,
      )
    }

    if ((task.status === 'completed') !== task.rewardApplied) {
      fail(
        `$.tasks[${index}].rewardApplied`,
        '必须与 completed 状态一致',
      )
    }
    if ((task.status === 'completed') !== (task.completedAt !== null)) {
      fail(
        `$.tasks[${index}].completedAt`,
        '必须与 completed 状态一致',
      )
    }
  }

  for (const [index, boss] of saveFile.bosses.entries()) {
    assertExistingReference(boss.goalId, goalIds, `$.bosses[${index}].goalId`)

    if ((boss.status === 'defeated') !== (boss.currentHp === 0)) {
      fail(
        `$.bosses[${index}].status`,
        '必须与 currentHp 一致（HP 为 0 时且仅此时应为 defeated）',
      )
    }
  }

  for (const [index, node] of saveFile.timeline.entries()) {
    assertExistingReference(
      node.parentId,
      timelineIds,
      `$.timeline[${index}].parentId`,
    )
    if (node.parentId === node.id) {
      fail(`$.timeline[${index}].parentId`, '不能引用自身')
    }
  }

  assertAcyclicParents(saveFile.skills, '$.skills')
  assertAcyclicParents(saveFile.goals, '$.goals')
  assertAcyclicParents(saveFile.timeline, '$.timeline')
}

/** 抛错式校验，适合需要保留具体错误路径的导入流程。 */
export function assertSaveFile(input: unknown): asserts input is SaveFile {
  assertObject(input, '$')
  assertExactKeys(input, SAVE_FILE_KEYS, '$')

  assertNumber(input.schemaVersion, '$.schemaVersion', { integer: true })
  if (input.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    fail(
      '$.schemaVersion',
      `不受支持（当前仅支持 ${SUPPORTED_SCHEMA_VERSION}）`,
    )
  }
  if (input.app !== SAVE_FILE_APP) {
    fail('$.app', `必须是 ${SAVE_FILE_APP}`)
  }
  assertIsoDate(input.exportedAt, '$.exportedAt')
  assertCharacter(input.character, '$.character')
  assertStats(input.stats, '$.stats')
  assertCollection(input.skillCategories, '$.skillCategories', assertCategory)
  assertCollection(input.skills, '$.skills', assertSkill)
  assertCollection(input.goals, '$.goals', assertGoal)
  assertCollection(input.tasks, '$.tasks', assertTask)
  assertCollection(input.achievements, '$.achievements', assertAchievement)
  assertCollection(input.equipment, '$.equipment', assertEquipment)
  assertCollection(input.events, '$.events', assertLifeEvent)
  assertCollection(input.bosses, '$.bosses', assertBoss)
  assertCollection(input.timeline, '$.timeline', assertTimelineNode)

  assertReferenceIntegrity({
    schemaVersion: input.schemaVersion,
    app: input.app,
    exportedAt: input.exportedAt,
    character: input.character,
    stats: input.stats,
    skillCategories: input.skillCategories,
    skills: input.skills,
    goals: input.goals,
    tasks: input.tasks,
    achievements: input.achievements,
    equipment: input.equipment,
    events: input.events,
    bosses: input.bosses,
    timeline: input.timeline,
  })
}

/** 不抛错的类型守卫；字符串输入请使用 parseSaveFile。 */
export function validateSaveFile(input: unknown): input is SaveFile {
  try {
    assertSaveFile(input)
    return true
  } catch {
    return false
  }
}

/**
 * 解析 JSON 文本或校验已解析对象，并返回与调用方解耦的存档副本。
 */
export function parseSaveFile(input: unknown): SaveFile {
  let candidate = input

  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input) as unknown
    } catch {
      throw new SaveValidationError('输入不是有效 JSON')
    }
  }

  assertSaveFile(candidate)
  return structuredClone(candidate)
}

/** 从合法存档提取仅供应用运行的数据段。 */
export function appDataFromSaveFile(saveFile: SaveFile): AppData {
  const {
    schemaVersion: _schemaVersion,
    app: _app,
    exportedAt: _exportedAt,
    ...appData
  } = saveFile

  return structuredClone(appData)
}
