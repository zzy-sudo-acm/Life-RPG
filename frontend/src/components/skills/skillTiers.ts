import type { Skill } from '../../types/models'

/**
 * 技能段位：纯展示层映射，按等级（与是否投入经验）划分成长阶段。
 * 刻度按个人成长速度校准：技能每升一级约需数倍努力，等级天花板低，
 * 因此大师从 8 级起算，而不是大型网游的几十级。
 */
export interface SkillTier {
  id: 'untouched' | 'entry' | 'adept' | 'master' | 'grandmaster'
  label: string
  color: string
}

export function skillTier(skill: Skill): SkillTier {
  if (skill.level >= 8) return { id: 'grandmaster', label: '大师', color: '#a97c1f' }
  if (skill.level >= 5) return { id: 'master', label: '精通', color: '#6a5a8a' }
  if (skill.level >= 3) return { id: 'adept', label: '熟练', color: '#4a6a8a' }
  if (skill.level <= 1 && skill.exp === 0) {
    return { id: 'untouched', label: '未点亮', color: '#9a8d7a' }
  }
  return { id: 'entry', label: '入门', color: '#4a7a5e' }
}

/** 环图图例的固定展示顺序（从低到高）。 */
export const SKILL_TIER_ORDER: SkillTier['id'][] = [
  'untouched',
  'entry',
  'adept',
  'master',
  'grandmaster',
]
