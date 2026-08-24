import type { LifeEvent } from '../../types/models'
import { formatDate } from '../../utils/format'

interface BossDamageSparkProps {
  bossId: string
  events: LifeEvent[]
}

interface Hit {
  id: string
  date: string
  damage: number
}

/** 讨伐记录：某个 Boss 最近几次伤害的小型柱状图（数据来自讨伐事件）。 */
export function BossDamageSpark({ bossId, events }: BossDamageSparkProps) {
  const hits: Hit[] = events
    .filter((event) => event.sourceType === 'boss' && event.sourceId === bossId)
    .map((event) => ({
      id: event.id,
      date: event.date,
      damage:
        event.rewards.bosses.find((reward) => reward.bossId === bossId)?.damage ?? 0,
    }))
    .filter((hit) => hit.damage > 0)
    .toSorted((left, right) => left.date.localeCompare(right.date))
    .slice(-8)

  if (hits.length === 0) return null

  const maxDamage = Math.max(...hits.map((hit) => hit.damage))

  return (
    <div className="mt-4 rounded-lg border border-line/80 bg-raised/40 px-3 py-2.5">
      <p className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        近期讨伐
        <span className="normal-case tracking-normal">共 {hits.length} 击</span>
      </p>
      <div className="mt-2 flex h-10 items-end gap-1" role="img" aria-label="近期讨伐伤害柱状图">
        {hits.map((hit) => (
          <span
            key={hit.id}
            title={`${formatDate(hit.date)} · 造成 ${hit.damage} 点伤害`}
            className="flex-1 rounded-t-sm bg-danger/80"
            style={{ height: `${Math.max(12, (hit.damage / maxDamage) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}
