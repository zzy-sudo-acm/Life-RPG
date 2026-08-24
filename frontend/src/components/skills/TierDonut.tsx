import type { Skill } from '../../types/models'
import { SKILL_TIER_ORDER, skillTier, type SkillTier } from './skillTiers'

const SIZE = 120
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface TierDonutProps {
  skills: Skill[]
}

interface Segment {
  tier: SkillTier
  count: number
  /** 该段弧在圆周上的起始偏移 */
  offset: number
}

/** 技能段位分布环图：一眼看清自己的技能都修到了什么境界。 */
export function TierDonut({ skills }: TierDonutProps) {
  const counts = new Map<SkillTier['id'], { tier: SkillTier; count: number }>()
  for (const skill of skills) {
    const tier = skillTier(skill)
    const entry = counts.get(tier.id) ?? { tier, count: 0 }
    entry.count += 1
    counts.set(tier.id, entry)
  }
  const total = skills.length

  // 预计算每段弧长与起始偏移，渲染时纯读取
  let cursor = 0
  const segments: Segment[] = []
  for (const id of SKILL_TIER_ORDER) {
    const entry = counts.get(id)
    if (!entry || entry.count === 0 || total === 0) continue
    const dash = (entry.count / total) * CIRCUMFERENCE
    segments.push({ tier: entry.tier, count: entry.count, offset: cursor })
    cursor += dash
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
          role="img"
          aria-label={`技能段位分布，共 ${total} 项技能`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e4dac3"
            strokeWidth={STROKE}
          />
          {segments.map(({ tier, count, offset }) => (
            <circle
              key={tier.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={tier.color}
              strokeWidth={STROKE}
              strokeDasharray={`${(count / total) * CIRCUMFERENCE} ${CIRCUMFERENCE - (count / total) * CIRCUMFERENCE}`}
              strokeDashoffset={-offset}
            >
              <title>{`${tier.label} ${count} 项`}</title>
            </circle>
          ))}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold tabular-nums text-ink">{total}</span>
          <span className="text-[10px] text-faint">技能</span>
        </span>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {SKILL_TIER_ORDER.map((id) => {
          const entry = counts.get(id)
          if (!entry) return null
          return (
            <li key={id} className="flex items-center gap-2 text-xs">
              <span className="size-2 rotate-45" style={{ backgroundColor: entry.tier.color }} />
              <span className="flex-1 text-muted">{entry.tier.label}</span>
              <span className="font-semibold tabular-nums text-ink">{entry.count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
