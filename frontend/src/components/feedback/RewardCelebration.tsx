import { CheckCircle2, Sparkles, Swords, TrendingUp, Trophy, Zap } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useAppStore } from '../../store/AppStoreContext'
import { STAT_KEYS, STAT_LABELS } from '../../types/models'
import { formatNumber } from '../../utils/format'
import type { Celebration } from './useRewardCelebration'

const PARTICLES = ['+EXP', '★', '+成长', '✦', '+EXP', '★', '✦', '+1']

interface RewardCelebrationProps {
  celebration: Celebration | null
  onClose: () => void
}

/** 任务结算后的全屏庆祝浮层：金色光晕、奖励清单与升级提示。 */
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
    const bossNames = new Map(data.bosses.map((boss) => [boss.id, boss.name]))
    const lines: Array<{ icon: typeof Zap; text: string; className: string }> = []

    if (rewards.exp > 0) {
      lines.push({
        icon: Zap,
        text: `EXP +${formatNumber(rewards.exp)}`,
        className: 'border-exp/40 bg-exp-soft text-exp',
      })
    }
    for (const key of STAT_KEYS) {
      const amount = rewards.stats[key] ?? 0
      if (amount > 0) {
        lines.push({
          icon: TrendingUp,
          text: `${STAT_LABELS[key]} +${amount}`,
          className: 'border-primary/40 bg-primary-soft text-primary',
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
    for (const reward of rewards.bosses) {
      lines.push({
        icon: Swords,
        text: `${bossNames.get(reward.bossId) ?? 'Boss'} -${reward.damage} HP`,
        className: 'border-danger/40 bg-danger-soft text-danger',
      })
    }
    return lines
  }, [celebration, data])

  if (celebration === null || data === null) return null

  const leveledUp = data.character.level > celebration.baseLevel

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="任务完成奖励"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {/* 漂浮粒子 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((text, index) => (
          <span
            key={`${text}-${index}`}
            className="absolute bottom-[28%] animate-float-up text-sm font-bold text-exp/90"
            style={{
              left: `${12 + index * 10}%`,
              animationDelay: `${index * 0.14}s`,
            }}
          >
            {text}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-sm animate-pop-in rounded-3xl border border-exp/30 bg-surface p-6 text-center shadow-[0_0_80px_rgb(242_178_62/0.22)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-exp/15 blur-3xl" />
        </div>

        <span className="relative mx-auto flex size-16 items-center justify-center rounded-full border border-primary/45 bg-primary-soft text-primary shadow-[0_0_28px_rgb(62_207_142/0.4)]">
          <CheckCircle2 size={32} />
        </span>

        <h2 className="relative mt-4 text-xl font-bold text-ink">任务完成</h2>
        <p className="relative mt-1 truncate text-sm text-muted">{celebration.title}</p>

        {leveledUp ? (
          <p className="relative mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-exp/50 bg-exp-soft px-4 py-1.5 text-sm font-black tracking-wide text-exp shadow-[0_0_20px_rgb(242_178_62/0.35)]">
            <Trophy size={16} />
            LEVEL UP！Lv.{celebration.baseLevel} → Lv.{data.character.level}
          </p>
        ) : null}

        {rewardLines.length > 0 ? (
          <ul className="relative mt-5 flex flex-wrap justify-center gap-2">
            {rewardLines.map(({ icon: Icon, text, className }) => (
              <li
                key={text}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${className}`}
              >
                <Icon size={14} />
                {text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="relative mt-5 text-sm text-muted">这个任务没有设置奖励</p>
        )}

        <button
          type="button"
          className="relative mt-6 min-h-11 w-full rounded-xl border border-exp/60 bg-gradient-to-b from-exp to-[#c8871d] text-sm font-bold text-[#241600] shadow-[0_6px_20px_rgb(242_178_62/0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
          onClick={onClose}
        >
          收下奖励
        </button>
      </div>
    </div>
  )
}
