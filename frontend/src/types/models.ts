export const STAT_KEYS = [
  'technical',
  'intelligence',
  'creativity',
  'execution',
  'health',
] as const

export type StatKey = (typeof STAT_KEYS)[number]

export const STAT_LABELS: Record<StatKey, string> = {
  technical: '技术力',
  intelligence: '智力',
  creativity: '创造力',
  execution: '执行力',
  health: '健康',
}

export type ISODateString = string

export interface EntityBase {
  id: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Character extends EntityBase {
  id: 'character'
  name: string
  profession: string
  level: number
  exp: number
  expToNextLevel: number
  totalExp: number
  lifeStage: string
  primaryGoalId: string | null
}

export type StatValues = Record<StatKey, number>

export interface StatSnapshot {
  id: string
  recordedAt: ISODateString
  values: StatValues
  source: 'seed' | 'manual' | 'task' | 'event' | 'import'
  note: string
}

export interface StatsState {
  id: 'stats'
  values: StatValues
  history: StatSnapshot[]
  updatedAt: ISODateString
}

export interface SkillCategory extends EntityBase {
  name: string
  description: string
  order: number
}

export interface Skill extends EntityBase {
  categoryId: string
  parentId: string | null
  name: string
  level: number
  exp: number
  expToNextLevel: number
  description: string
}

export type GoalStatus = 'planned' | 'active' | 'completed' | 'paused'
export type GoalDisplayMode = 'standard' | 'boss'

export interface Goal extends EntityBase {
  parentId: string | null
  name: string
  type: 'major' | 'minor'
  displayMode: GoalDisplayMode
  description: string
  deadline: ISODateString | null
  status: GoalStatus
  progress: number
}

export interface SkillReward {
  skillId: string
  amount: number
}

/** 自动计算后随任务保存的奖励快照，保证任务完成时结算结果稳定。 */
export interface RewardBundle {
  exp: number
  stats: Partial<Record<StatKey, number>>
  skills: SkillReward[]
  goalProgress: number
}

export const EMPTY_REWARDS: RewardBundle = {
  exp: 0,
  stats: {},
  skills: [],
  goalProgress: 0,
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskDifficulty = 'easy' | 'medium' | 'hard'

export const TASK_DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export interface Task extends EntityBase {
  goalId: string | null
  categoryId: string | null
  name: string
  description: string
  dueDate: ISODateString | null
  difficulty: TaskDifficulty
  status: TaskStatus
  rewards: RewardBundle
  completedAt: ISODateString | null
  rewardApplied: boolean
}

export interface AchievementTrigger {
  event: string
  threshold: number
}

export interface AchievementSignal {
  event: string
  value: number
  occurredAt: ISODateString
}

export interface Achievement extends EntityBase {
  name: string
  icon: string
  description: string
  unlockType: 'manual' | 'automatic'
  unlockedAt: ISODateString | null
  trigger: AchievementTrigger | null
}

export type LifeEventSource = 'manual' | 'achievement' | 'goal' | 'stage'

/** 成长足迹只保存重要节点，普通任务完成不会写入。 */
export interface LifeEvent extends EntityBase {
  date: ISODateString
  title: string
  description: string
  sourceType: LifeEventSource
  sourceId: string | null
}

export interface AppData {
  character: Character
  stats: StatsState
  skillCategories: SkillCategory[]
  skills: Skill[]
  goals: Goal[]
  tasks: Task[]
  achievements: Achievement[]
  events: LifeEvent[]
}

export interface SaveFile extends AppData {
  schemaVersion: number
  app: 'life-rpg'
  exportedAt: ISODateString
}

export interface LocalSettings {
  sidebarCollapsed: boolean
  taskFilter: 'all' | TaskStatus
}

export const ENTITY_COLLECTIONS = [
  'skillCategories',
  'skills',
  'goals',
  'tasks',
  'achievements',
  'events',
] as const

export type EntityCollection = (typeof ENTITY_COLLECTIONS)[number]

export interface CollectionEntityMap {
  skillCategories: SkillCategory
  skills: Skill
  goals: Goal
  tasks: Task
  achievements: Achievement
  events: LifeEvent
}
