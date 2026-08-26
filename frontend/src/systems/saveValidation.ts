import { APP_NAME, SCHEMA_VERSION } from '../data/constants'
import {
  STAT_KEYS,
  type Achievement,
  type AppData,
  type Goal,
  type SaveFile,
  type Skill,
  type SkillCategory,
  type Task,
} from '../types/models'
import { migrateSaveFile } from './migrations'

type UnknownRecord = Record<string, unknown>

export class SaveValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SaveValidationError'
  }
}

function fail(path: string, message: string): never {
  throw new SaveValidationError(`${path} ${message}`)
}

function record(value: unknown, path: string): asserts value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, '必须是对象')
  }
}

function exactKeys(value: UnknownRecord, keys: readonly string[], path: string): void {
  const expected = new Set(keys)
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) fail(`${path}.${key}`, '不是支持的字段')
  }
  for (const key of keys) {
    if (!(key in value)) fail(`${path}.${key}`, '缺少必需字段')
  }
}

function array(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(path, '必须是数组')
}

function string(value: unknown, path: string, nonEmpty = false): asserts value is string {
  if (typeof value !== 'string' || (nonEmpty && value.length === 0)) {
    fail(path, nonEmpty ? '必须是非空字符串' : '必须是字符串')
  }
}

function nullableString(value: unknown, path: string): asserts value is string | null {
  if (value !== null && typeof value !== 'string') fail(path, '必须是字符串或 null')
}

function number(
  value: unknown,
  path: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, '必须是有限数字')
  if (options.integer === true && !Number.isInteger(value)) fail(path, '必须是整数')
  if (options.min !== undefined && value < options.min) fail(path, `不能小于 ${options.min}`)
  if (options.max !== undefined && value > options.max) fail(path, `不能大于 ${options.max}`)
}

function boolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== 'boolean') fail(path, '必须是布尔值')
}

function isoDate(value: unknown, path: string): asserts value is string {
  string(value, path, true)
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value)
  if (match === null || !Number.isFinite(Date.parse(value))) fail(path, '必须是有效 ISO 日期')
  const normalized = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`)
    .toISOString()
    .slice(0, 10)
  if (normalized !== `${match[1]}-${match[2]}-${match[3]}`) fail(path, '必须是有效 ISO 日期')
}

function nullableDate(value: unknown, path: string): asserts value is string | null {
  if (value !== null) isoDate(value, path)
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(path, `必须是 ${allowed.join('、')} 之一`)
  }
}

const BASE_KEYS = ['id', 'createdAt', 'updatedAt'] as const

function entityBase(value: UnknownRecord, path: string): void {
  string(value.id, `${path}.id`, true)
  isoDate(value.createdAt, `${path}.createdAt`)
  isoDate(value.updatedAt, `${path}.updatedAt`)
}

function collection<T extends { id: string }>(
  value: unknown,
  path: string,
  validator: (item: unknown, itemPath: string) => asserts item is T,
): asserts value is T[] {
  array(value, path)
  const ids = new Set<string>()
  value.forEach((item, index) => {
    validator(item, `${path}[${index}]`)
    if (ids.has(item.id)) fail(`${path}[${index}].id`, '不能重复')
    ids.add(item.id)
  })
}

function validateCharacter(value: unknown, path: string): void {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'name', 'profession', 'level', 'exp', 'expToNextLevel', 'totalExp', 'lifeStage', 'primaryGoalId'], path)
  entityBase(value, path)
  if (value.id !== 'character') fail(`${path}.id`, '必须是 character')
  string(value.name, `${path}.name`)
  string(value.profession, `${path}.profession`)
  number(value.level, `${path}.level`, { min: 1, integer: true })
  number(value.exp, `${path}.exp`, { min: 0 })
  number(value.expToNextLevel, `${path}.expToNextLevel`, { min: 1 })
  number(value.totalExp, `${path}.totalExp`, { min: 0 })
  string(value.lifeStage, `${path}.lifeStage`)
  nullableString(value.primaryGoalId, `${path}.primaryGoalId`)
}

function validateStatValues(value: unknown, path: string): void {
  record(value, path)
  exactKeys(value, STAT_KEYS, path)
  for (const key of STAT_KEYS) number(value[key], `${path}.${key}`, { min: 0 })
}

function validateStats(value: unknown, path: string): void {
  record(value, path)
  exactKeys(value, ['id', 'values', 'history', 'updatedAt'], path)
  if (value.id !== 'stats') fail(`${path}.id`, '必须是 stats')
  validateStatValues(value.values, `${path}.values`)
  isoDate(value.updatedAt, `${path}.updatedAt`)
  array(value.history, `${path}.history`)
  value.history.forEach((snapshot, index) => {
    const itemPath = `${path}.history[${index}]`
    record(snapshot, itemPath)
    exactKeys(snapshot, ['id', 'recordedAt', 'values', 'source', 'note'], itemPath)
    string(snapshot.id, `${itemPath}.id`, true)
    isoDate(snapshot.recordedAt, `${itemPath}.recordedAt`)
    validateStatValues(snapshot.values, `${itemPath}.values`)
    oneOf(snapshot.source, ['seed', 'manual', 'task', 'event', 'import'], `${itemPath}.source`)
    string(snapshot.note, `${itemPath}.note`)
  })
}

function validateCategory(value: unknown, path: string): asserts value is SkillCategory {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'name', 'description', 'order'], path)
  entityBase(value, path)
  string(value.name, `${path}.name`)
  string(value.description, `${path}.description`)
  number(value.order, `${path}.order`, { integer: true })
}

function validateSkill(value: unknown, path: string): asserts value is Skill {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'categoryId', 'parentId', 'name', 'level', 'exp', 'expToNextLevel', 'description'], path)
  entityBase(value, path)
  string(value.categoryId, `${path}.categoryId`, true)
  nullableString(value.parentId, `${path}.parentId`)
  string(value.name, `${path}.name`)
  number(value.level, `${path}.level`, { min: 1, integer: true })
  number(value.exp, `${path}.exp`, { min: 0 })
  number(value.expToNextLevel, `${path}.expToNextLevel`, { min: 1 })
  string(value.description, `${path}.description`)
}

function validateGoal(value: unknown, path: string): asserts value is Goal {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'parentId', 'name', 'type', 'displayMode', 'description', 'deadline', 'status', 'progress'], path)
  entityBase(value, path)
  nullableString(value.parentId, `${path}.parentId`)
  string(value.name, `${path}.name`)
  oneOf(value.type, ['major', 'minor'], `${path}.type`)
  oneOf(value.displayMode, ['standard', 'boss'], `${path}.displayMode`)
  string(value.description, `${path}.description`)
  nullableDate(value.deadline, `${path}.deadline`)
  oneOf(value.status, ['planned', 'active', 'completed', 'paused'], `${path}.status`)
  number(value.progress, `${path}.progress`, { min: 0, max: 100 })
  if (value.status === 'completed' && value.progress !== 100) fail(`${path}.progress`, '完成目标必须是 100')
}

function validateRewards(value: unknown, path: string): void {
  record(value, path)
  exactKeys(value, ['exp', 'stats', 'skills', 'goalProgress'], path)
  number(value.exp, `${path}.exp`, { min: 0 })
  record(value.stats, `${path}.stats`)
  for (const [key, amount] of Object.entries(value.stats)) {
    if (!STAT_KEYS.includes(key as (typeof STAT_KEYS)[number])) fail(`${path}.stats.${key}`, '不是支持的属性')
    number(amount, `${path}.stats.${key}`, { min: 0 })
  }
  array(value.skills, `${path}.skills`)
  value.skills.forEach((reward, index) => {
    const itemPath = `${path}.skills[${index}]`
    record(reward, itemPath)
    exactKeys(reward, ['skillId', 'amount'], itemPath)
    string(reward.skillId, `${itemPath}.skillId`, true)
    number(reward.amount, `${itemPath}.amount`, { min: 0 })
  })
  number(value.goalProgress, `${path}.goalProgress`, { min: 0, max: 100 })
}

function validateTask(value: unknown, path: string): asserts value is Task {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'goalId', 'categoryId', 'name', 'description', 'dueDate', 'difficulty', 'status', 'rewards', 'completedAt', 'rewardApplied'], path)
  entityBase(value, path)
  nullableString(value.goalId, `${path}.goalId`)
  nullableString(value.categoryId, `${path}.categoryId`)
  string(value.name, `${path}.name`)
  string(value.description, `${path}.description`)
  nullableDate(value.dueDate, `${path}.dueDate`)
  oneOf(value.difficulty, ['easy', 'medium', 'hard'], `${path}.difficulty`)
  oneOf(value.status, ['todo', 'in_progress', 'completed'], `${path}.status`)
  validateRewards(value.rewards, `${path}.rewards`)
  nullableDate(value.completedAt, `${path}.completedAt`)
  boolean(value.rewardApplied, `${path}.rewardApplied`)
  if ((value.status === 'completed') !== value.rewardApplied) fail(`${path}.rewardApplied`, '必须与完成状态一致')
  if ((value.status === 'completed') !== (value.completedAt !== null)) fail(`${path}.completedAt`, '必须与完成状态一致')
}

function validateAchievement(value: unknown, path: string): asserts value is Achievement {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'name', 'icon', 'description', 'unlockType', 'unlockedAt', 'trigger'], path)
  entityBase(value, path)
  string(value.name, `${path}.name`)
  string(value.icon, `${path}.icon`)
  string(value.description, `${path}.description`)
  oneOf(value.unlockType, ['manual', 'automatic'], `${path}.unlockType`)
  nullableDate(value.unlockedAt, `${path}.unlockedAt`)
  if (value.trigger !== null) {
    record(value.trigger, `${path}.trigger`)
    exactKeys(value.trigger, ['event', 'threshold'], `${path}.trigger`)
    string(value.trigger.event, `${path}.trigger.event`, true)
    number(value.trigger.threshold, `${path}.trigger.threshold`, { min: 0 })
  }
  if (value.unlockType === 'manual' && value.unlockedAt === null) fail(`${path}.unlockedAt`, '手动成就必须有解锁日期')
}

function validateEvent(value: unknown, path: string): void {
  record(value, path)
  exactKeys(value, [...BASE_KEYS, 'date', 'title', 'description', 'sourceType', 'sourceId'], path)
  entityBase(value, path)
  isoDate(value.date, `${path}.date`)
  string(value.title, `${path}.title`)
  string(value.description, `${path}.description`)
  oneOf(value.sourceType, ['manual', 'achievement', 'goal', 'stage'], `${path}.sourceType`)
  nullableString(value.sourceId, `${path}.sourceId`)
}

function assertReferences(saveFile: SaveFile): void {
  const categoryIds = new Set(saveFile.skillCategories.map((item) => item.id))
  const skillIds = new Set(saveFile.skills.map((item) => item.id))
  const goalIds = new Set(saveFile.goals.map((item) => item.id))
  if (saveFile.character.primaryGoalId !== null && !goalIds.has(saveFile.character.primaryGoalId)) {
    fail('$.character.primaryGoalId', '引用了不存在的目标')
  }
  saveFile.skills.forEach((skill, index) => {
    if (!categoryIds.has(skill.categoryId)) fail(`$.skills[${index}].categoryId`, '引用了不存在的分类')
    if (skill.parentId !== null && !skillIds.has(skill.parentId)) fail(`$.skills[${index}].parentId`, '引用了不存在的技能')
    const parent = saveFile.skills.find((candidate) => candidate.id === skill.parentId)
    if (parent !== undefined && parent.categoryId !== skill.categoryId) {
      fail(`$.skills[${index}].parentId`, '上级技能必须属于同一分类')
    }
  })
  saveFile.goals.forEach((goal, index) => {
    if (goal.parentId !== null && !goalIds.has(goal.parentId)) fail(`$.goals[${index}].parentId`, '引用了不存在的目标')
    const parent = saveFile.goals.find((candidate) => candidate.id === goal.parentId)
    if (parent?.parentId !== null && parent !== undefined) {
      fail(`$.goals[${index}].parentId`, '目标只支持父子两层')
    }
  })
  saveFile.tasks.forEach((task, index) => {
    if (task.goalId !== null && !goalIds.has(task.goalId)) fail(`$.tasks[${index}].goalId`, '引用了不存在的目标')
    if (task.categoryId !== null && !categoryIds.has(task.categoryId)) fail(`$.tasks[${index}].categoryId`, '引用了不存在的分类')
    task.rewards.skills.forEach((reward, rewardIndex) => {
      if (!skillIds.has(reward.skillId)) fail(`$.tasks[${index}].rewards.skills[${rewardIndex}].skillId`, '引用了不存在的技能')
    })
  })

  const assertAcyclic = (
    values: ReadonlyArray<{ id: string; parentId: string | null }>,
    path: string,
  ) => {
    const byId = new Map(values.map((value) => [value.id, value]))
    values.forEach((value, index) => {
      const visited = new Set([value.id])
      let parentId = value.parentId
      while (parentId !== null) {
        if (visited.has(parentId)) fail(`${path}[${index}].parentId`, '不能形成循环引用')
        visited.add(parentId)
        parentId = byId.get(parentId)?.parentId ?? null
      }
    })
  }
  assertAcyclic(saveFile.skills, '$.skills')
  assertAcyclic(saveFile.goals, '$.goals')
}

/** 严格校验当前 v2 存档；v1 存档请通过 parseSaveFile 自动迁移。 */
export function assertSaveFile(input: unknown): asserts input is SaveFile {
  record(input, '$')
  exactKeys(input, ['schemaVersion', 'app', 'exportedAt', 'character', 'stats', 'skillCategories', 'skills', 'goals', 'tasks', 'achievements', 'events'], '$')
  if (input.app !== APP_NAME) fail('$.app', `必须是 ${APP_NAME}`)
  if (input.schemaVersion !== SCHEMA_VERSION) fail('$.schemaVersion', `不受支持（当前为 ${SCHEMA_VERSION}）`)
  isoDate(input.exportedAt, '$.exportedAt')
  validateCharacter(input.character, '$.character')
  validateStats(input.stats, '$.stats')
  collection(input.skillCategories, '$.skillCategories', validateCategory)
  collection(input.skills, '$.skills', validateSkill)
  collection(input.goals, '$.goals', validateGoal)
  collection(input.tasks, '$.tasks', validateTask)
  collection(input.achievements, '$.achievements', validateAchievement)
  array(input.events, '$.events')
  const eventIds = new Set<string>()
  input.events.forEach((event, index) => {
    validateEvent(event, `$.events[${index}]`)
    const eventId = (event as { id: string }).id
    if (eventIds.has(eventId)) fail(`$.events[${index}].id`, '不能重复')
    eventIds.add(eventId)
  })
  assertReferences(input as unknown as SaveFile)
}

export function validateSaveFile(input: unknown): input is SaveFile {
  try {
    assertSaveFile(input)
    return true
  } catch {
    return false
  }
}

export function parseSaveFile(input: unknown): SaveFile {
  let candidate = input
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input) as unknown
    } catch {
      throw new SaveValidationError('输入不是有效 JSON')
    }
  }
  candidate = migrateSaveFile(candidate)
  assertSaveFile(candidate)
  return structuredClone(candidate)
}

export function appDataFromSaveFile(saveFile: SaveFile): AppData {
  const { schemaVersion: _schemaVersion, app: _app, exportedAt: _exportedAt, ...data } = saveFile
  return structuredClone(data)
}
