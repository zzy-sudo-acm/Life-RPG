import {
  STAT_KEYS,
  STAT_LABELS,
  type Boss,
  type RewardBundle,
  type Skill,
} from '../../types/models'

interface RewardSummaryProps {
  rewards: RewardBundle
  skills: Skill[]
  bosses: Boss[]
}

export function RewardSummary({ rewards, skills, bosses }: RewardSummaryProps) {
  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]))
  const bossNames = new Map(bosses.map((boss) => [boss.id, boss.name]))
  const labels: string[] = []

  if (rewards.exp > 0) labels.push(`EXP +${rewards.exp}`)
  for (const key of STAT_KEYS) {
    const amount = rewards.stats[key]
    if (amount !== undefined && amount > 0) labels.push(`${STAT_LABELS[key]} +${amount}`)
  }
  for (const reward of rewards.skills) {
    labels.push(`${skillNames.get(reward.skillId) ?? '技能'} +${reward.amount} EXP`)
  }
  for (const reward of rewards.bosses) {
    labels.push(`${bossNames.get(reward.bossId) ?? 'Boss'} -${reward.damage} HP`)
  }

  if (labels.length === 0) {
    return <p className="text-xs text-muted">无奖励记录</p>
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="奖励记录">
      {labels.map((label, index) => (
        <span key={`${label}-${index}`} className="rounded-md bg-primary-soft px-2 py-1 text-xs text-primary">
          {label}
        </span>
      ))}
    </div>
  )
}
