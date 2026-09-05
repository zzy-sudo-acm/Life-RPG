import { useState } from 'react'
import {
  Award,
  BookOpen,
  CalendarDays,
  Check,
  Flag,
  Flame,
  Leaf,
  Medal,
  Pencil,
  Plus,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react'
import { AchievementEditor } from '../components/collection/AchievementEditor'
import { displayDay } from '../components/growth/growthData'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { useAppStore } from '../store/AppStoreContext'
import type { Achievement, AppData } from '../types/models'
import { nowIso } from '../utils/id'
import { calcCompletionStreak } from '../utils/streak'
import '../components/growth/growth.css'

const FILTERS = [
  { value: 'all', label: '全部成就' },
  { value: 'unlocked', label: '已获得' },
  { value: 'locked', label: '待解锁' },
] as const
const ICONS = {
  '🏆': Trophy,
  '🔥': Flame,
  '🏁': Flag,
  '✨': Sparkles,
  '📅': CalendarDays,
  '🌱': Sprout,
  '🎯': Target,
  '📚': BookOpen,
  '🏅': Medal,
  '⭐': Award,
} as const
const PROGRESS_LABELS: Record<string, string> = {
  'task.completed': '累计完成行动',
  'goal.completed': '完成目标',
  'skill.level': '最高技能等级',
  'streak.days': '当前连续行动',
}

function achievementSignals(data: AppData): Record<string, number> {
  return {
    'task.completed': data.tasks.filter((task) => task.status === 'completed')
      .length,
    'goal.completed': data.goals.filter((goal) => goal.status === 'completed')
      .length,
    'skill.level': data.skills.reduce(
      (maximum, skill) => Math.max(maximum, skill.level),
      0,
    ),
    'streak.days': calcCompletionStreak(
      data.tasks.map((task) =>
        task.status === 'completed' ? task.completedAt : null,
      ),
    ),
  }
}

function AchievementIcon({ icon }: { icon: string }) {
  const Icon = ICONS[icon as keyof typeof ICONS]
  return Icon ? (
    <Icon size={31} strokeWidth={1.45} />
  ) : icon.trim() ? (
    <span className="growth-custom-badge">{icon}</span>
  ) : (
    <Award size={31} strokeWidth={1.45} />
  )
}

export function AchievementsPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
  const [editor, setEditor] = useState<Achievement | 'new' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!data) return null

  const unlocked = data.achievements.filter(
    (achievement) => achievement.unlockedAt !== null,
  )
  const unlockedCount = unlocked.length
  const total = data.achievements.length
  const percentage = total > 0 ? Math.round((unlockedCount / total) * 100) : 0
  const signals = achievementSignals(data)
  const achievements = data.achievements
    .filter(
      (achievement) =>
        filter === 'all' ||
        (filter === 'unlocked'
          ? achievement.unlockedAt !== null
          : achievement.unlockedAt === null),
    )
    .toSorted(
      (left, right) =>
        Number(right.unlockedAt !== null) - Number(left.unlockedAt !== null) ||
        (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? ''),
    )
  const latest = unlocked.toSorted((left, right) =>
    (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? ''),
  )[0]

  async function unlock(achievement: Achievement) {
    setBusy(achievement.id)
    setError(null)
    const timestamp = nowIso()
    try {
      await saveEntity('achievements', {
        ...achievement,
        unlockedAt: timestamp,
        updatedAt: timestamp,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '解锁失败，请重试。')
    } finally {
      setBusy(null)
    }
  }

  async function remove(achievement: Achievement) {
    if (!window.confirm(`确定删除成就“${achievement.name}”吗？`)) return
    setBusy(achievement.id)
    setError(null)
    try {
      await deleteEntity('achievements', achievement.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败，请重试。')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="growth-page">
      <header className="growth-page-heading">
        <div>
          <h1>成就馆</h1>
          <p className="growth-subtitle">收藏你的高光，也期待下一次突破。</p>
        </div>
        <Button icon={<Plus size={17} />} onClick={() => setEditor('new')}>
          添加成就
        </Button>
      </header>

      <Panel className="growth-achievement-hero">
        <div className="growth-hero-medal" aria-hidden="true">
          <Leaf className="growth-medal-leaf" size={24} />
          <Trophy size={51} strokeWidth={1.2} />
          <Sparkles className="growth-medal-sparkle" size={17} />
        </div>
        <div className="growth-achievement-hero-copy">
          <h2>一点一滴，值得珍藏。</h2>
          <p>
            {latest
              ? `最近获得「${latest.name}」，继续书写你的故事。`
              : '不必等到很厉害，迈出第一步就值得庆祝。'}
          </p>
          <div className="growth-collection-progress">
            <span>收藏进度</span>
            <div
              role="progressbar"
              aria-label="成就收藏进度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <i style={{ width: `${percentage}%` }} />
            </div>
            <strong>{percentage}%</strong>
          </div>
        </div>
        <div className="growth-collection-count">
          <strong>
            {unlockedCount}
            <span> / {total}</span>
          </strong>
          <span>枚成就已获得</span>
        </div>
      </Panel>

      <section aria-labelledby="achievement-collection-heading">
        <div className="growth-section-heading growth-timeline-heading">
          <h2 id="achievement-collection-heading">
            <Award size={20} /> 我的成就收藏
          </h2>
          <span className="growth-count">{total} 枚成就</span>
        </div>
        <div className="growth-filter-scroll">
          <div className="growth-filter-tabs" aria-label="成就状态筛选">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                className={filter === item.value ? 'is-active' : ''}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                <span>
                  {item.value === 'all'
                    ? total
                    : item.value === 'unlocked'
                      ? unlockedCount
                      : total - unlockedCount}
                </span>
              </button>
            ))}
          </div>
        </div>
        {error ? (
          <p className="growth-error" role="alert">
            {error}
          </p>
        ) : null}
        {achievements.length > 0 ? (
          <div className="growth-achievement-grid">
            {achievements.map((achievement) => {
              const obtained = achievement.unlockedAt !== null
              const trigger =
                achievement.unlockType === 'automatic'
                  ? achievement.trigger
                  : null
              const current = trigger ? signals[trigger.event] : undefined
              const threshold = trigger?.threshold ?? 0
              const progress = obtained
                ? 100
                : current === undefined
                  ? 0
                  : threshold <= 0
                    ? 100
                    : Math.min(100, (current / threshold) * 100)
              return (
                <Panel
                  key={achievement.id}
                  className={`growth-achievement-card${obtained ? ' is-obtained' : ''}`}
                >
                  <div className="growth-achievement-card-top">
                    <span
                      className={`growth-achievement-state${obtained ? ' is-obtained' : ''}`}
                    >
                      {obtained ? (
                        <>
                          <Check size={12} />
                          已获得
                        </>
                      ) : (
                        '待解锁'
                      )}
                    </span>
                    <div className="growth-achievement-actions">
                      <button
                        type="button"
                        className="growth-icon-button"
                        aria-label={`编辑成就：${achievement.name}`}
                        onClick={() => setEditor(achievement)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="growth-icon-button growth-delete-button"
                        disabled={busy === achievement.id}
                        aria-label={`删除成就：${achievement.name}`}
                        onClick={() => void remove(achievement)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="growth-badge">
                    <AchievementIcon icon={achievement.icon} />
                  </div>
                  <h3>{achievement.name}</h3>
                  <p className="growth-achievement-description">
                    {achievement.description || '为自己的成长，留下一枚纪念。'}
                  </p>
                  <div className="growth-achievement-bottom">
                    {obtained ? (
                      <p className="growth-achievement-date">
                        <Sparkles size={13} />
                        {displayDay(achievement.unlockedAt!)}
                      </p>
                    ) : trigger && current !== undefined ? (
                      <>
                        <div className="growth-achievement-progress-label">
                          <span>{PROGRESS_LABELS[trigger.event]}</span>
                          <strong>
                            {current} / {threshold}
                          </strong>
                        </div>
                        <div
                          className="growth-achievement-progress"
                          role="progressbar"
                          aria-label={`${achievement.name}解锁进度`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(progress)}
                        >
                          <i style={{ width: `${progress}%` }} />
                        </div>
                      </>
                    ) : achievement.unlockType === 'manual' ? (
                      <Button
                        variant="secondary"
                        disabled={busy === achievement.id}
                        onClick={() => void unlock(achievement)}
                      >
                        {busy === achievement.id
                          ? '保存中…'
                          : '我做到了，点亮成就'}
                      </Button>
                    ) : (
                      <p className="growth-achievement-waiting">
                        等待触发成长规则
                      </p>
                    )}
                  </div>
                </Panel>
              )
            })}
          </div>
        ) : (
          <Panel className="growth-empty">
            <span className="growth-empty-icon">
              <Award size={30} />
            </span>
            <h3>
              {filter === 'unlocked'
                ? '下一枚成就，正在路上'
                : filter === 'locked'
                  ? '每一枚都已被你点亮'
                  : '为你的成长，收藏第一枚成就'}
            </h3>
            <p>
              {filter === 'unlocked'
                ? '完成日常行动与目标，成就会在努力中自然解锁。'
                : '你也可以为生活中的重要突破，添加专属成就。'}
            </p>
            <Button
              variant="secondary"
              icon={<Plus size={15} />}
              onClick={() => setEditor('new')}
            >
              添加专属成就
            </Button>
          </Panel>
        )}
      </section>
      <p className="growth-page-footnote">
        <Sprout size={17} /> 成就不是终点，是一路成长的纪念。
      </p>
      {editor !== null ? (
        <AchievementEditor
          achievement={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSave={(achievement) => saveEntity('achievements', achievement)}
        />
      ) : null}
    </div>
  )
}
