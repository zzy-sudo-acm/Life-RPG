import type { StatKey } from '../../types/models'

/** 五维属性的全局展示配色（雷达图、趋势图、装备加成共用）。 */
export const STAT_COLORS: Record<StatKey, string> = {
  technical: '#4cc2ff',
  intelligence: '#9b8cf8',
  creativity: '#f472b6',
  execution: '#f2b23e',
  health: '#3ecf8e',
}
