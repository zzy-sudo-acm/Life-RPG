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

export interface Goal extends EntityBase {
  parentId: string | null
  name: string
  type: 'major' | 'minor'
  description: string
  deadline: ISODateString | null
  status: GoalStatus
  progress: number
}

export interface SkillReward {
  skillId: string
  amount: number
}

export interface BossReward {
  bossId: string
  damage: number
}

export interface RewardBundle {
  exp: number
  stats: Partial<Record<StatKey, number>>
  skills: SkillReward[]
  bosses: BossReward[]
}

export const EMPTY_REWARDS: RewardBundle = {
  exp: 0,
  stats: {},
  skills: [],
  bosses: [],
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed'

export interface Task extends EntityBase {
  goalId: string | null
  name: string
  type: string
  description: string
  dueDate: ISODateString | null
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

export type EquipmentQuality = 'common' | 'fine' | 'rare' | 'epic' | 'legendary'

export interface Equipment extends EntityBase {
  name: string
  quality: EquipmentQuality
  description: string
  statBonuses: Partial<Record<StatKey, number>>
}

export interface LifeEvent extends EntityBase {
  date: ISODateString
  title: string
  description: string
  rewards: RewardBundle
  sourceType: 'manual' | 'task' | 'achievement' | 'boss'
  sourceId: string | null
}

export type BossStatus = 'planned' | 'active' | 'defeated'

export interface Boss extends EntityBase {
  goalId: string | null
  name: string
  description: string
  maxHp: number
  currentHp: number
  deadline: ISODateString | null
  status: BossStatus
}

export type TimelineStatus = 'past' | 'current' | 'future'

export interface TimelineNode extends EntityBase {
  parentId: string | null
  title: string
  description: string
  stageType: string
  status: TimelineStatus
  startDate: ISODateString | null
  endDate: ISODateString | null
  order: number
}

export interface AppData {
  character: Character
  stats: StatsState
  skillCategories: SkillCategory[]
  skills: Skill[]
  goals: Goal[]
  tasks: Task[]
  achievements: Achievement[]
  equipment: Equipment[]
  events: LifeEvent[]
  bosses: Boss[]
  timeline: TimelineNode[]
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
  'equipment',
  'events',
  'bosses',
  'timeline',
] as const

export type EntityCollection = (typeof ENTITY_COLLECTIONS)[number]

export interface CollectionEntityMap {
  skillCategories: SkillCategory
  skills: Skill
  goals: Goal
  tasks: Task
  achievements: Achievement
  equipment: Equipment
  events: LifeEvent
  bosses: Boss
  timeline: TimelineNode
}
