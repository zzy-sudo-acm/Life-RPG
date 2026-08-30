import { Check, Flag, Sparkles, TrendingUp, Trophy, X, Zap } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useAppStore } from '../../store/AppStoreContext'
import { STAT_KEYS, STAT_LABELS } from '../../types/models'
import { formatNumber } from '../../utils/format'
import type { Celebration } from './useRewardCelebration'

interface RewardCelebrationProps {
  celebration: Celebration | null
  onClose: () => void
}

/**
 * 任务结算后的轻量 toast：浮在底部导航之上，不遮挡页面、不打断连续操作，
 * 片刻后自动消失，点按任意位置可立即关闭。
 */
export function RewardCelebration({ celebration, onClose }: RewardCelebrationProps) {
  const { data } = useAppStore()

  useEffect(() => {
    if (celebration === null) return undefined
    const timer = window.setTimeout(onClose, 3600)
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
    <>
      {/* 全屏金光一闪：完成动作的瞬间反馈，不阻断操作 */}
      <div className="pointer-events-none fixed inset-0 z-[55] animate-flash-out bg-[radial-gradient(60%_50%_at_50%_62%,rgb(245_184_61/0.22),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(132px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-8">
        <div
          role="status"
          className="pointer-events-auto w-full max-w-md animate-pop-in overflow-hidden rounded-2xl bg-surface shadow-[0_16px_48px_rgb(0_0_0/0.55),0_0_32px_rgb(245_184_61/0.12)] ring-1 ring-primary/30"
        >
          <div className="h-0.5 w-full bg-[linear-gradient(90deg,#d99a1f,#f5b83d,#ffd97a,#f5b83d,#d99a1f)] bg-[length:200%_100%] animate-shimmer" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[#241a04] shadow-[0_0_16px_rgb(245_184_61/0.5)]">
                {leveledUp ? <Trophy size={18} strokeWidth={2.5} /> : <Check size={18} strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{leveledUp ? '等级提升！' : '任务完成'}</p>
                <p className="truncate text-xs text-muted">{celebration.title}</p>
              </div>
              {leveledUp ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-[#241a04] shadow-[0_0_18px_rgb(245_184_61/0.55)]">
                  Lv.{celebration.baseLevel} → {data.character.level}
                </span>
              ) : null}
              <button
                type="button"
                aria-label="关闭奖励提示"
                className="shrink-0 rounded-full p-1.5 text-faint transition-colors hover:bg-white/5 hover:text-ink"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
            {rewardLines.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {rewardLines.map(({ icon: Icon, text }, index) => (
                  <li
                    key={text}
                    className={
                      index === 0
                        ? 'flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary'
                        : 'flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-1 text-xs font-medium text-ink'
                    }
                  >
                    <Icon size={12} className={index === 0 ? 'text-primary' : 'text-muted'} />
                    {text}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
