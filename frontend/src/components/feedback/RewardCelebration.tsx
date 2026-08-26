import { Flag, Sparkles, TrendingUp, Trophy, Zap } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useAppStore } from '../../store/AppStoreContext'
import { STAT_KEYS, STAT_LABELS } from '../../types/models'
import { formatNumber } from '../../utils/format'
import type { Celebration } from './useRewardCelebration'

const PARTICLES = ['✦', '❋', '✧', '✦', '❋', '✧', '✦', '❋']

interface RewardCelebrationProps {
  celebration: Celebration | null
  onClose: () => void
}

/** 任务结算后的庆祝浮层：朱红「成」字印盖下，列出全部收获。 */
export function RewardCelebration({ celebration, onClose }: RewardCelebrationProps) {
  const { data } = useAppStore()

  useEffect(() => {
    if (celebration === null) return undefined
    const timer = window.setTimeout(onClose, 4200)
    return () => window.clearTimeout(timer)
  }, [celebration, onClose])

  const rewardLines = useMemo(() => {
    if (celebration === null || data === null) return []
    const { rewards } = celebration
    const skillNames = new Map(data.skills.map((skill) => [skill.id, skill.name]))
    const lines: Array<{ icon: typeof Zap; text: string; className: string }> = []

    if (rewards.exp > 0) {
      lines.push({
        icon: Zap,
        text: `EXP +${formatNumber(rewards.exp)}`,
        className: 'border-exp/45 bg-exp-soft text-exp',
      })
    }
    for (const key of STAT_KEYS) {
      const amount = rewards.stats[key] ?? 0
      if (amount > 0) {
        lines.push({
          icon: TrendingUp,
          text: `${STAT_LABELS[key]} +${amount}`,
          className: 'border-primary/40 bg-primary-soft text-primary-deep',
        })
      }
    }
    for (const reward of rewards.skills) {
      lines.push({
        icon: Sparkles,
        text: `${skillNames.get(reward.skillId) ?? '技能'} 经验 +${reward.amount}`,
        className: 'border-info/40 bg-info-soft text-info',
      })
    }
    if (rewards.goalProgress > 0) {
      lines.push({
        icon: Flag,
        text: `目标进度 +${rewards.goalProgress}%`,
        className: 'border-danger/40 bg-danger-soft text-danger',
      })
    }
    return lines
  }, [celebration, data])

  if (celebration === null || data === null) return null

  const leveledUp = data.character.level > celebration.baseLevel

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label="任务完成奖励"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {/* 漂浮墨点 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((text, index) => (
          <span
            key={`${text}-${index}`}
            className="absolute bottom-[28%] animate-float-up text-sm text-exp"
            style={{
              left: `${12 + index * 10}%`,
              animationDelay: `${index * 0.14}s`,
            }}
          >
            {text}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-sm animate-pop-in rounded-xl border border-[#c6b898] bg-surface p-6 text-center shadow-[0_24px_70px_rgb(44_38_32/0.4)]">
        {/* 朱红「成」字印，盖下来 */}
        <div className="relative mx-auto w-fit animate-stamp">
          <span className="seal flex size-20 items-center justify-center rounded-xl font-display text-4xl font-bold">
            成
          </span>
        </div>

        <h2 className="mt-4 font-display text-xl font-bold text-ink">任务完成</h2>
        <p className="mt-1 truncate font-kai text-sm text-muted">{celebration.title}</p>

        {leveledUp ? (
          <p className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-lg border border-exp/50 bg-exp-soft px-4 py-1.5 font-display text-sm font-bold tracking-wide text-exp">
            <Trophy size={16} />
            升级！Lv.{celebration.baseLevel} → Lv.{data.character.level}
          </p>
        ) : null}

        {rewardLines.length > 0 ? (
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {rewardLines.map(({ icon: Icon, text, className }) => (
              <li
                key={text}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${className}`}
              >
                <Icon size={14} />
                {text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 font-kai text-sm text-muted">奖励已自动结算</p>
        )}

        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-lg border border-[#8a6316] bg-exp text-sm font-bold text-[#fdf8ec] shadow-[0_2px_0_rgb(122_88_16/0.9)] transition-all hover:bg-[#96690f] active:translate-y-px active:shadow-none"
          onClick={onClose}
        >
          收下奖励
        </button>
      </div>
    </div>
  )
}
