import { Check, Flag, Sparkles, TrendingUp, Trophy, Zap } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useAppStore } from '../../store/AppStoreContext'
import { STAT_KEYS, STAT_LABELS } from '../../types/models'
import { formatNumber } from '../../utils/format'
import type { Celebration } from './useRewardCelebration'

interface RewardCelebrationProps {
  celebration: Celebration | null
  onClose: () => void
}

/** 任务结算后的轻量反馈浮层：一个干净的白卡片，列出全部收获。 */
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
    const lines: Array<{ icon: typeof Zap; text: string }> = []

    if (rewards.exp > 0) {
      lines.push({ icon: Zap, text: `EXP +${formatNumber(rewards.exp)}` })
    }
    for (const key of STAT_KEYS) {
      const amount = rewards.stats[key] ?? 0
      if (amount > 0) {
        lines.push({ icon: TrendingUp, text: `${STAT_LABELS[key]} +${amount}` })
      }
    }
    for (const reward of rewards.skills) {
      lines.push({ icon: Sparkles, text: `${skillNames.get(reward.skillId) ?? '技能'} 经验 +${reward.amount}` })
    }
    if (rewards.goalProgress > 0) {
      lines.push({ icon: Flag, text: `目标进度 +${rewards.goalProgress}%` })
    }
    return lines
  }, [celebration, data])

  if (celebration === null || data === null) return null

  const leveledUp = data.character.level > celebration.baseLevel

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label="任务完成奖励"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm animate-pop-in rounded-2xl bg-surface p-6 text-center shadow-[0_24px_70px_rgb(0_0_0/0.25)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-white">
          <Check size={28} strokeWidth={2.5} />
        </span>

        <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">任务完成</h2>
        <p className="mt-1 truncate text-sm text-muted">{celebration.title}</p>

        {leveledUp ? (
          <p className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary">
            <Trophy size={16} />
            升级！Lv.{celebration.baseLevel} → Lv.{data.character.level}
          </p>
        ) : null}

        {rewardLines.length > 0 ? (
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {rewardLines.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1.5 text-sm font-medium text-ink"
              >
                <Icon size={14} className="text-muted" />
                {text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-muted">奖励已自动结算</p>
        )}

        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-deep active:opacity-80"
          onClick={onClose}
        >
          收下奖励
        </button>
      </div>
    </div>
  )
}
