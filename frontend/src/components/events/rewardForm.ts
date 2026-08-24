import {
  STAT_KEYS,
  type RewardBundle,
  type StatKey,
} from '../../types/models'
import { toNumber } from '../../utils/format'

export function readRewardBundle(form: FormData): RewardBundle {
  const stats: Partial<Record<StatKey, number>> = {}
  const skills: RewardBundle['skills'] = []
  const bosses: RewardBundle['bosses'] = []

  for (const key of STAT_KEYS) {
    const amount = Math.max(0, toNumber(form.get(`reward-stat-${key}`)))
    if (amount > 0) stats[key] = amount
  }

  for (const [name, rawValue] of form.entries()) {
    const amount = Math.max(0, toNumber(rawValue))
    if (amount === 0) continue

    if (name.startsWith('reward-skill:')) {
      skills.push({ skillId: name.slice('reward-skill:'.length), amount })
    } else if (name.startsWith('reward-boss:')) {
      bosses.push({ bossId: name.slice('reward-boss:'.length), damage: amount })
    }
  }

  return {
    exp: Math.max(0, toNumber(form.get('reward-exp'))),
    stats,
    skills,
    bosses,
  }
}
