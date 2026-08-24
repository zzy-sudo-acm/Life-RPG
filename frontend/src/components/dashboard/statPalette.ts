import type { StatKey } from '../../types/models'

/** 五维属性的全局展示配色（星图、趋势线、装备加成共用），与纸面协调的沉稳色。 */
export const STAT_COLORS: Record<StatKey, string> = {
  technical: '#4a6a8a',
  intelligence: '#6a5a8a',
  creativity: '#b5644a',
  execution: '#a97c1f',
  health: '#4a7a5e',
}
