import { Edit3, Flag, Shield } from 'lucide-react'
import type { Character, Goal } from '../../types/models'
import { daysUntil, formatDate, formatNumber } from '../../utils/format'
import { LevelSeal } from '../ui/LevelSeal'
import { ProgressBar } from '../ui/ProgressBar'

interface CharacterHeroProps {
  character: Character
  primaryGoal: Goal | undefined
  onEdit: () => void
}

/** 首页顶部的角色名帖：双框纸卡 + 朱文等级印 + 刻度经验尺。 */
export function CharacterHero({ character, primaryGoal, onEdit }: CharacterHeroProps) {
  return (
    <section
      aria-label="角色卡"
      className="rounded-xl border border-[#c6b898] bg-surface p-1.5 shadow-[0_1px_2px_rgb(44_38_32/0.05),0_14px_36px_rgb(44_38_32/0.09)]"
    >
      {/* 内框：名帖的双层框线 */}
      <div className="relative rounded-lg border border-line px-5 py-6 sm:px-7">
        <button
          type="button"
          onClick={onEdit}
          aria-label="编辑角色"
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-line bg-canvas/70 px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Edit3 size={13} />
          编辑
        </button>

        <div className="flex items-center gap-5">
          {/* 纹章与等级印 */}
          <div className="relative shrink-0">
            <span className="flex size-20 items-center justify-center rounded-xl border-2 border-ink/20 bg-raised/70 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] sm:size-24">
              <Shield size={34} strokeWidth={1.8} />
            </span>
            <LevelSeal
              level={character.level}
              size="sm"
              className="absolute -bottom-2 -right-2"
            />
          </div>

          {/* 身份信息 */}
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="truncate font-display text-3xl font-bold tracking-tight text-ink">
              {character.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
              <span className="rounded border border-primary/45 bg-primary-soft px-2 py-0.5 font-medium text-primary-deep">
                {character.profession || '未设定职业'}
              </span>
              <span className="rounded border border-line bg-ink/4 px-2 py-0.5 text-muted">
                {character.lifeStage || '未知阶段'}
              </span>
            </p>
            <div className="mt-4 max-w-md">
              <ProgressBar
                value={character.exp}
                max={character.expToNextLevel}
                tone="exp"
                size="lg"
                label={`EXP ${formatNumber(character.exp)} / ${formatNumber(character.expToNextLevel)}`}
              />
              <p className="mt-1.5 font-kai text-xs text-faint">
                至今累计修为 {formatNumber(character.totalExp)} 点
              </p>
            </div>
          </div>
        </div>

        {/* 当前志向 */}
        <div className="mt-6 rounded-lg border border-line/90 bg-raised/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.24em] text-danger">
              <Flag size={13} /> 当前志向
            </p>
            <span aria-hidden className="font-kai text-xs text-faint">落笔为证</span>
          </div>
          {primaryGoal ? (
            <div className="mt-2.5">
              <p className="font-display text-lg font-bold text-ink">{primaryGoal.name}</p>
              <div className="mt-2.5">
                <ProgressBar value={primaryGoal.progress} label={`目标进度 · ${primaryGoal.progress}%`} />
              </div>
              {(() => {
                const daysLeft = daysUntil(primaryGoal.deadline)
                if (daysLeft === null || primaryGoal.status === 'completed') return null
                return (
                  <p className="mt-1.5 text-xs text-faint">
                    截止 {formatDate(primaryGoal.deadline)}
                    <span className={daysLeft <= 60 ? 'ml-1.5 font-semibold text-danger' : 'ml-1.5 font-semibold text-exp'}>
                      {daysLeft >= 0 ? `· 还剩 ${daysLeft} 天` : `· 已逾 ${-daysLeft} 天`}
                    </span>
                  </p>
                )
              })()}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              尚未立下志向 —— 点击右上角「编辑」选定此刻的人生方向。
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
