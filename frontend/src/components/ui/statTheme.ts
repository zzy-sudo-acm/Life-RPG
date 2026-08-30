import type { StatKey, TaskDifficulty } from '../../types/models'

/** 五维属性专属色：健康翡翠 / 智力冰蓝 / 创造力秘紫 / 技术力青金 / 执行力炽橙。 */
export const STAT_HEX: Record<StatKey, string> = {
  health: '#34d399',
  intelligence: '#5eb1ef',
  creativity: '#8b7cf6',
  technical: '#2dd4bf',
  execution: '#fb923c',
}

/** 任务难度指示色：简单翡翠 / 中等熔金 / 困难绯红。 */
export const DIFFICULTY_HEX: Record<TaskDifficulty, string> = {
  easy: '#34d399',
  medium: '#f5b83d',
  hard: '#ff5468',
}
