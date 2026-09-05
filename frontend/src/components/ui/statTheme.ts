import type { StatKey, TaskDifficulty } from '../../types/models'

/** 自然色系保持五维属性可区分，并适配浅色卡片。 */
export const STAT_HEX: Record<StatKey, string> = {
  health: '#47845f',
  intelligence: '#5b7f96',
  creativity: '#83739b',
  technical: '#398b85',
  execution: '#b08550',
}

/** 任务难度指示色：叶绿、赭黄与陶红。 */
export const DIFFICULTY_HEX: Record<TaskDifficulty, string> = {
  easy: '#47845f',
  medium: '#ae874e',
  hard: '#b6584d',
}
