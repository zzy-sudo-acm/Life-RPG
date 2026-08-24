import { Edit3, Flag, Shield } from 'lucide-react'
import type { Character, Goal } from '../../types/models'
import { clamp, formatNumber } from '../../utils/format'
import { ProgressBar } from '../ui/ProgressBar'

interface CharacterHeroProps {
  character: Character
  primaryGoal: Goal | undefined
  onEdit: () => void
}

/** 首页顶部的角色英雄卡：徽记 + 经验环 + 等级 + 当前主目标。 */
export function CharacterHero({ character, primaryGoal, onEdit }: CharacterHeroProps) {
  const expRatio = character.expToNextLevel > 0
    ? clamp(character.exp / character.expToNextLevel, 0, 1)
    : 0
  const ringRadius = 47
  const ringLength = 2 * Math.PI * ringRadius

  return (
    <section
      aria-label="角色卡"
      className="relative overflow-hidden rounded-3xl border border-line bg-surface/85 shadow-[0_16px_48px_rgb(0_0_0/0.35)] backdrop-blur-sm"
    >
      {/* 装饰光晕 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-24 size-64 rounded-full bg-primary/14 blur-3xl" />
        <div className="absolute -bottom-28 -right-10 size-72 rounded-full bg-exp/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </div>

      <div className="relative p-5 sm:p-7">
        <button
          type="button"
          onClick={onEdit}
          aria-label="编辑角色"
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-line bg-canvas/50 px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Edit3 size={13} />
          编辑
        </button>

        <div className="flex items-center gap-5">
          {/* 徽记与经验环 */}
          <div className="relative shrink-0">
            <svg viewBox="0 0 108 108" className="size-[104px] -rotate-90 sm:size-[116px]">
              <circle
                cx="54"
                cy="54"
                r={ringRadius}
                fill="none"
                stroke="rgb(255 255 255 / 0.08)"
                strokeWidth="5"
              />
              <circle
                cx="54"
                cy="54"
                r={ringRadius}
                fill="none"
                stroke="url(#exp-ring)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ringLength}
                strokeDashoffset={ringLength * (1 - expRatio)}
                className="transition-[stroke-dashoffset] duration-700"
              />
              <defs>
                <linearGradient id="exp-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f2b23e" />
                  <stop offset="100%" stopColor="#f6d47c" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-b from-raised to-canvas text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_20px_rgb(62_207_142/0.2)] sm:size-16">
                <Shield size={28} />
              </span>
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-exp/50 bg-[#241a05] px-2.5 py-0.5 text-xs font-black text-exp shadow-[0_0_14px_rgb(242_178_62/0.35)]">
              Lv.{character.level}
            </span>
          </div>

          {/* 身份信息 */}
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {character.name}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
              <span className="rounded-full border border-primary/35 bg-primary-soft px-2.5 py-0.5 font-medium text-primary">
                {character.profession || '未设定职业'}
              </span>
              <span className="rounded-full border border-line bg-white/5 px-2.5 py-0.5 text-muted">
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
              <p className="mt-1.5 text-[11px] text-faint">
                累计获得 EXP {formatNumber(character.totalExp)}
              </p>
            </div>
          </div>
        </div>

        {/* 当前主要目标 */}
        <div className="mt-6 rounded-2xl border border-line/80 bg-canvas/45 p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Flag size={13} /> 当前主要目标
          </p>
          {primaryGoal ? (
            <div className="mt-2.5">
              <p className="font-medium text-ink">{primaryGoal.name}</p>
              <div className="mt-2.5">
                <ProgressBar value={primaryGoal.progress} label={`目标进度 · ${primaryGoal.progress}%`} />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              尚未设置主要目标 —— 点击右上角「编辑角色」选定当前的人生方向。
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
