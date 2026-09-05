import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  CornerDownLeft,
  Flame,
  Plus,
  SlidersHorizontal,
  Star,
  Target,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { TaskEditor } from '../components/goals/TaskEditor'
import { TaskRow } from '../components/goals/TaskRow'
import { DailyReflection } from '../components/today/DailyReflection'
import { FocusTimer } from '../components/today/FocusTimer'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAppStore } from '../store/AppStoreContext'
import { EMPTY_REWARDS, type Task } from '../types/models'
import { cn } from '../utils/cn'
import { formatNumber, localDateString } from '../utils/format'
import { createId, nowIso } from '../utils/id'
import { calcCompletionStreak } from '../utils/streak'

type Filter = 'all' | 'pending' | 'completed'
export function TodayPage() {
  const { data, saveEntity, deleteEntity, completeTask } = useAppStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState<Task | 'new' | null>(null)
  const [today, setToday] = useState(localDateString)
  const { celebration, present, dismiss } = useRewardCelebration()
  useEffect(() => {
    const interval = window.setInterval(
      () => setToday(localDateString()),
      30_000,
    )
    return () => window.clearInterval(interval)
  }, [])
  if (!data) return null
  const pending = data.tasks
    .filter(
      (task) =>
        task.status !== 'completed' &&
        (!task.dueDate || task.dueDate.slice(0, 10) <= today),
    )
    .toSorted(
      (a, b) =>
        (a.dueDate ?? today).localeCompare(b.dueDate ?? today) ||
        a.createdAt.localeCompare(b.createdAt),
    )
  const completed = data.tasks
    .filter(
      (task) =>
        task.status === 'completed' &&
        task.completedAt &&
        localDateString(new Date(task.completedAt)) === today,
    )
    .toSorted((a, b) =>
      (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
    )
  const list = (
    filter === 'pending'
      ? pending
      : filter === 'completed'
        ? completed
        : [...pending, ...completed]
  ).filter((task) => !category || task.categoryId === category)
  const activeGoals = data.goals.filter(
    (goal) => goal.status === 'active' && !goal.parentId,
  )
  const primary =
    data.goals.find(
      (goal) =>
        goal.id === data.character.primaryGoalId && goal.status === 'active',
    ) ?? activeGoals[0]
  const milestones = primary
    ? data.goals.filter((goal) => goal.parentId === primary.id)
    : []
  const goalTasks = primary
    ? data.tasks.filter(
        (task) =>
          task.goalId === primary.id ||
          milestones.some((goal) => goal.id === task.goalId),
      )
    : []
  const categories = new Map(
    data.skillCategories.map((item) => [item.id, item.name]),
  )
  const goalNames = new Map(data.goals.map((item) => [item.id, item.name]))
  const streak = calcCompletionStreak(
    data.tasks.map((task) => task.completedAt),
  )
  const handleComplete = async (task: Task) => {
    try {
      await completeTask(task.id)
      present({
        title: task.name,
        rewards: task.rewards,
        baseLevel: data.character.level,
      })
    } catch {
      /* Store 展示写入错误。 */
    }
  }
  const remove = async (task: Task) => {
    if (window.confirm(`删除任务“${task.name}”吗？`)) {
      try {
        await deleteEntity('tasks', task.id)
      } catch {
        /* Store 展示错误。 */
      }
    }
  }
  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!quickName.trim() || saving) return
    setSaving(true)
    try {
      const timestamp = nowIso()
      await saveEntity('tasks', {
        id: createId('task'),
        name: quickName.trim(),
        categoryId: category || null,
        goalId: null,
        difficulty: 'medium',
        description: '',
        dueDate: today,
        status: 'todo',
        rewards: EMPTY_REWARDS,
        completedAt: null,
        rewardApplied: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      setQuickName('')
      setFilter('all')
    } catch {
      /* 保留输入以便重试。 */
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="today-page">
      <header className="today-heading">
        <div>
          <h1>
            今天，也向理想的自己<span className="mobile-break">靠近一点。</span>
          </h1>
          <p>
            <span className="desktop-copy">不必一下子走很远，</span>
            今天的一小步就很好。
          </p>
        </div>
        <Button
          className="desktop-new-task"
          icon={<Plus size={19} />}
          onClick={() => setEditor('new')}
        >
          新建任务
        </Button>
      </header>
      <section className="journey-hero" aria-label="角色成长概览">
        <img
          src={`${import.meta.env.BASE_URL}images/growth-journey.webp`}
          alt="蜿蜒的小路穿过青山，通向山顶的旗帜"
        />
        <div className="hero-content">
          <h2>你的人生，正在升级。</h2>
          <p className="hero-description">每一次行动，都在塑造独一无二的你。</p>
          <Link to="/character" className="hero-character">
            <span>Lv.{data.character.level}</span>
            <span>{data.character.name}</span>
            <ChevronRight size={14} />
          </Link>
          <div className="hero-experience">
            <ProgressBar
              value={data.character.exp}
              max={data.character.expToNextLevel}
              size="sm"
            />
            <span>
              {formatNumber(data.character.exp)} /{' '}
              {formatNumber(data.character.expToNextLevel)} EXP
            </span>
          </div>
        </div>
      </section>
      <dl className="today-stats">
        <div>
          <dt>
            <CheckCircle2 size={19} />
            <span>今日完成</span>
          </dt>
          <dd>
            {completed.length}
            <small> / {pending.length + completed.length}</small>
          </dd>
        </div>
        <div>
          <dt>
            <Flame size={19} className="text-[#b58b45]" />
            <span>连续行动</span>
          </dt>
          <dd>
            {streak}
            <small> 天</small>
          </dd>
        </div>
        <div>
          <dt>
            <Target size={19} />
            <span>正在进行</span>
          </dt>
          <dd>
            {activeGoals.length}
            <small>
              <span className="desktop-copy"> 个目标</span>
              <span className="mobile-copy"> 个</span>
            </small>
          </dd>
        </div>
        <div>
          <dt>
            <Star size={19} className="text-[#b58b45]" />
            <span>已获成就</span>
          </dt>
          <dd>
            {data.achievements.filter((item) => item.unlockedAt).length}
            <small> 枚</small>
          </dd>
        </div>
      </dl>
      <div className="today-grid">
        <section
          className="today-actions paper-panel"
          aria-labelledby="actions-title"
        >
          <div className="section-title-row">
            <h2 id="actions-title">今日行动</h2>
            <p className="desktop-copy">把大目标，变成今天的小事。</p>
            <button
              type="button"
              aria-label="新建任务"
              className="small-add"
              onClick={() => setEditor('new')}
            >
              <Plus size={17} />
              <span>新建</span>
            </button>
          </div>
          <div className="action-toolbar">
            <div className="action-tabs" aria-label="今日任务筛选">
              {(
                [
                  {
                    value: 'all',
                    label: '全部',
                    count: pending.length + completed.length,
                  },
                  { value: 'pending', label: '待完成', count: pending.length },
                  {
                    value: 'completed',
                    label: '已完成',
                    count: completed.length,
                  },
                ] as const
              ).map((item) => (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={filter === item.value}
                  className={cn(filter === item.value && 'is-active')}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="按分类筛选"
              aria-expanded={showFilter}
              className={cn('icon-button', category && 'text-primary')}
              onClick={() => setShowFilter(!showFilter)}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
          {showFilter ? (
            <select
              aria-label="任务分类筛选"
              className="category-filter"
              value={category}
              onChange={(event) => setCategory(event.currentTarget.value)}
            >
              <option value="">所有分类</option>
              {data.skillCategories.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : null}
          {list.length ? (
            <ul className="action-list">
              {list.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  categoryName={categories.get(task.categoryId ?? '') ?? '日常'}
                  goalName={goalNames.get(task.goalId ?? '')}
                  onComplete={handleComplete}
                  onEdit={setEditor}
                  onDelete={remove}
                />
              ))}
            </ul>
          ) : (
            <div className="today-empty">
              <CheckCircle2 size={29} strokeWidth={1.3} />
              <h3>
                {filter === 'completed'
                  ? '今天的进步，即将在这里留下。'
                  : category
                    ? '这个分类下，暂时没有行动。'
                    : completed.length
                      ? '今天的行动，都完成了。'
                      : '从一件小事开始吧。'}
              </h3>
              <p>
                {completed.length && filter !== 'completed'
                  ? '让自己休息一下，也是一种成长。'
                  : '读几页书、走一段路，都算向前。'}
              </p>
            </div>
          )}
          <form className="quick-add" onSubmit={(event) => void add(event)}>
            <Plus size={19} />
            <input
              aria-label="快速添加任务"
              placeholder="添加一个小行动…"
              value={quickName}
              maxLength={200}
              enterKeyHint="done"
              onChange={(event) => setQuickName(event.currentTarget.value)}
            />
            <button
              type="submit"
              disabled={saving || !quickName.trim()}
              aria-label="添加任务"
            >
              <span className="desktop-copy">
                {saving ? '保存中' : 'Enter'}
              </span>
              <CornerDownLeft size={16} />
            </button>
          </form>
        </section>
        <section
          className="primary-goal paper-panel"
          aria-labelledby="primary-title"
        >
          <div className="section-title-row">
            <h2 id="primary-title">正在攀登</h2>
            <Link to="/goals">
              查看全部
              <ChevronRight size={14} />
            </Link>
          </div>
          {primary ? (
            <>
              <Link to="/goals" className="primary-goal-main">
                <span className="compass-emblem">
                  <Compass size={60} strokeWidth={1} />
                </span>
                <div>
                  <h3>{primary.name}</h3>
                  <p>{primary.description || '让每一次积累都有方向。'}</p>
                  <div className="goal-progress">
                    <ProgressBar value={primary.progress} size="sm" />
                    <span>{primary.progress}%</span>
                  </div>
                </div>
              </Link>
              {milestones.length ? (
                <ol className="goal-milestones">
                  {milestones.slice(0, 3).map((goal, index) => (
                    <li key={goal.id}>
                      <span
                        className={cn(
                          goal.status === 'completed' && 'is-complete',
                        )}
                      >
                        {goal.status === 'completed' ? (
                          <Check size={14} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <p>{goal.name}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <Link className="goal-next-step" to="/goals">
                  <span>
                    {goalTasks.length
                      ? `${goalTasks.filter((task) => task.status === 'completed').length} / ${goalTasks.length} 个关联行动已完成`
                      : '为这个目标，安排下一个小行动'}
                  </span>
                  <ArrowRight size={15} />
                </Link>
              )}
            </>
          ) : (
            <Link to="/goals" className="goal-empty">
              <Compass size={40} strokeWidth={1} />
              <h3>下一个山顶，由你决定。</h3>
              <p>为未来的自己，设定一个值得期待的目标。</p>
              <span>
                开启一段旅程 <ArrowRight size={14} />
              </span>
            </Link>
          )}
        </section>
        <div className="today-focus">
          <FocusTimer />
        </div>
        <div className="today-reflection">
          <DailyReflection key={today} />
        </div>
      </div>
      <p className="today-footnote">成长不是一场竞速，而是一次次出发。</p>
      {editor !== null ? (
        <TaskEditor
          task={editor === 'new' ? null : editor}
          goals={data.goals}
          categories={data.skillCategories}
          skills={data.skills}
          onClose={() => setEditor(null)}
          onSave={(task) => saveEntity('tasks', task)}
        />
      ) : null}
      <RewardCelebration celebration={celebration} onClose={dismiss} />
    </div>
  )
}
