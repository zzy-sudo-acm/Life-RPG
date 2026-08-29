import { CalendarDays, Check, ChevronRight, MoreHorizontal, Plus, Sparkles, Target, Trash2, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { TaskEditor } from '../components/goals/TaskEditor'
import { LevelSeal } from '../components/ui/LevelSeal'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAppStore } from '../store/AppStoreContext'
import {
  EMPTY_REWARDS,
  STAT_KEYS,
  STAT_LABELS,
  TASK_DIFFICULTY_LABELS,
  type Task,
  type TaskDifficulty,
} from '../types/models'
import { formatDate, formatNumber, localDateString } from '../utils/format'
import { createId, nowIso } from '../utils/id'

export function TodayPage() {
  const { data, saveEntity, deleteEntity, completeTask } = useAppStore()
  const [quickName, setQuickName] = useState('')
  const [quickCategory, setQuickCategory] = useState('')
  const [quickDifficulty, setQuickDifficulty] = useState<TaskDifficulty>('medium')
  const [savingQuickTask, setSavingQuickTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null | 'new'>(null)
  const { celebration, present, dismiss } = useRewardCelebration()

  const categoryNames = useMemo(
    () => new Map(data?.skillCategories.map((category) => [category.id, category.name]) ?? []),
    [data?.skillCategories],
  )

  if (!data) return null

  const today = localDateString()
  const pendingTasks = data.tasks
    .filter((task) => task.status !== 'completed' && (task.dueDate === null || task.dueDate.slice(0, 10) <= today))
    .toSorted((left, right) => (left.dueDate ?? today).localeCompare(right.dueDate ?? today) || left.createdAt.localeCompare(right.createdAt))
  const recentCompleted = data.tasks
    .filter((task) => task.status === 'completed' && task.completedAt !== null)
    .toSorted((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? ''))
    .slice(0, 3)
  const primaryGoal = data.goals.find(
    (goal) => goal.id === data.character.primaryGoalId && goal.status !== 'completed',
  )
    ?? data.goals.find((goal) => goal.displayMode === 'boss' && goal.status === 'active')
    ?? data.goals.find((goal) => goal.status === 'active')

  const addQuickTask = async (name: string, categoryId: string, difficulty: TaskDifficulty) => {
    const timestamp = nowIso()
    const task: Task = {
      id: createId('task'),
      name,
      categoryId: categoryId || null,
      goalId: primaryGoal?.id ?? null,
      difficulty,
      description: '',
      dueDate: today,
      status: 'todo',
      rewards: EMPTY_REWARDS,
      completedAt: null,
      rewardApplied: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await saveEntity('tasks', task)
  }

  const handleQuickAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = quickName.trim()
    if (!name) return
    setSavingQuickTask(true)
    try {
      await addQuickTask(name, quickCategory, quickDifficulty)
      setQuickName('')
    } finally {
      setSavingQuickTask(false)
    }
  }

  const handleComplete = async (task: Task) => {
    const baseLevel = data.character.level
    try {
      await completeTask(task.id)
      present({ title: task.name, rewards: task.rewards, baseLevel })
    } catch {
      // Store 的全局错误提示负责展示写入失败。
    }
  }

  const handleDelete = async (task: Task) => {
    if (window.confirm(`删除任务“${task.name}”吗？`)) await deleteEntity('tasks', task.id)
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* 等级条：移动端吸顶，随时看得到 EXP 反馈 */}
      <section className="sticky top-14 z-20 -mx-4 bg-canvas/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="flex items-center gap-3 lg:gap-4">
          <LevelSeal level={data.character.level} size="sm" className="lg:size-14 lg:text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-sm font-semibold text-ink lg:text-2xl lg:tracking-tight">Lv. {data.character.level}</h1>
              <span className="text-[11px] text-muted lg:text-sm">{data.character.lifeStage}</span>
            </div>
            <div className="mt-1.5 lg:mt-2"><ProgressBar value={data.character.exp} max={data.character.expToNextLevel} size="sm" label={`EXP ${formatNumber(data.character.exp)} / ${formatNumber(data.character.expToNextLevel)}`} /></div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] lg:items-start">
        <div className="space-y-5 lg:space-y-6">
          {/* 桌面端：问候语 + 完整快速添加表单（移动端用底部输入条替代） */}
          <section className="hidden lg:block">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">今天，继续前进</h2>
            <form className="mt-4 rounded-2xl bg-surface p-2 shadow-[0_1px_4px_rgb(0_0_0/0.04)]" onSubmit={handleQuickAdd}>
              <div className="flex gap-2">
                <input
                  value={quickName}
                  onChange={(event) => setQuickName(event.currentTarget.value)}
                  aria-label="快速添加任务"
                  enterKeyHint="done"
                  placeholder="添加今天要做的事…"
                  className="min-h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-base text-ink outline-none placeholder:text-faint focus:bg-primary-soft/40"
                />
                <button type="submit" aria-label="添加任务" disabled={savingQuickTask || !quickName.trim()} className="flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-45">
                  <Plus size={18} /><span>添加</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-2 pt-2 text-xs text-muted">
                <select aria-label="快速任务分类" value={quickCategory} onChange={(event) => setQuickCategory(event.currentTarget.value)} className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 outline-none hover:bg-raised focus:border-primary/40">
                  <option value="">未分类</option>
                  {data.skillCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <span className="text-faint">·</span>
                <select aria-label="快速任务难度" value={quickDifficulty} onChange={(event) => setQuickDifficulty(event.currentTarget.value as TaskDifficulty)} className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 outline-none hover:bg-raised focus:border-primary/40">
                  {Object.entries(TASK_DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 hover:bg-raised" onClick={() => setEditingTask('new')}><MoreHorizontal size={14} /> 更多</button>
              </div>
            </form>
          </section>

          {/* 移动端：主要目标收成一行横幅，点击进目标页 */}
          {primaryGoal ? (
            <Link to="/goals" className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_1px_4px_rgb(0_0_0/0.04)] lg:hidden">
              <Target size={16} className="shrink-0 text-primary" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{primaryGoal.name}</p>
              <span className="shrink-0 text-xs tabular-nums text-muted">{primaryGoal.progress}%</span>
              <ChevronRight size={14} className="shrink-0 text-faint" />
            </Link>
          ) : null}

          <section aria-labelledby="today-tasks-heading">
            <div className="flex items-end justify-between gap-3 pb-3">
              <div>
                <h2 id="today-tasks-heading" className="text-lg font-semibold tracking-tight text-ink lg:text-xl">今日待办</h2>
                <p className="mt-1 text-xs text-faint">{pendingTasks.length > 0 ? `还有 ${pendingTasks.length} 件事` : '今天的任务已经完成'}</p>
              </div>
              <Link to="/goals" className="flex items-center gap-1 text-xs font-medium text-primary">全部任务 <ChevronRight size={14} /></Link>
            </div>
            {pendingTasks.length > 0 ? (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-[0_1px_4px_rgb(0_0_0/0.04)]">
                {pendingTasks.map((task) => (
                  <li key={task.id} className="group flex items-center gap-3 px-3 py-4 sm:px-4">
                    <button type="button" className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/15 text-transparent transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary" aria-label={`完成任务：${task.name}`} onClick={() => void handleComplete(task)}><Check size={18} strokeWidth={3} /></button>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditingTask(task)}>
                      <p className="truncate font-medium text-ink">{task.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span>{categoryNames.get(task.categoryId ?? '') ?? '未分类'}</span><span>·</span>
                        <span>{TASK_DIFFICULTY_LABELS[task.difficulty]}</span>
                        {task.dueDate ? <><span>·</span><span>{formatDate(task.dueDate)}</span></> : null}
                      </p>
                    </button>
                    <span className="hidden shrink-0 text-xs font-medium text-muted sm:inline">+{task.rewards.exp} EXP</span>
                    <button type="button" aria-label={`删除任务：${task.name}`} className="rounded-full p-2 text-faint opacity-100 transition-colors hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100" onClick={() => void handleDelete(task)}><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-surface py-10 text-center shadow-[0_1px_4px_rgb(0_0_0/0.04)]">
                <Check className="mx-auto text-primary" size={28} />
                <p className="mt-3 font-semibold text-ink">今日清单已完成</p>
                <p className="mt-1 text-sm text-muted">休息一下，或添加下一件值得做的事。</p>
              </div>
            )}
          </section>
        </div>

        {/* 右侧面板仅桌面端展示；移动端的奖励反馈由 toast 承担 */}
        <aside className="hidden space-y-5 lg:block">
          <Panel className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink"><Target size={18} className="text-primary" /> 主要目标</h2>
              <Link to="/goals" className="text-xs text-primary">查看</Link>
            </div>
            {primaryGoal ? (
              <div className="mt-5">
                <p className="text-xs font-medium text-muted">{primaryGoal.displayMode === 'boss' ? 'Boss 模式' : '当前目标'}</p>
                <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-ink">{primaryGoal.name}</h3>
                <div className="mt-5"><ProgressBar value={primaryGoal.progress} tone={primaryGoal.displayMode === 'boss' ? 'danger' : 'primary'} size="lg" label={primaryGoal.displayMode === 'boss' ? `已推进 ${primaryGoal.progress}% · 剩余 HP ${100 - primaryGoal.progress}` : `进度 ${primaryGoal.progress}%`} /></div>
                {primaryGoal.description ? <p className="mt-4 text-sm leading-6 text-muted">{primaryGoal.description}</p> : null}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted">还没有进行中的主要目标。</p>
            )}
          </Panel>

          <Panel className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink"><Sparkles size={18} className="text-primary" /> 刚刚获得</h2>
            {recentCompleted.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {recentCompleted.map((task) => {
                  const statKey = STAT_KEYS.find((key) => (task.rewards.stats[key] ?? 0) > 0)
                  return (
                    <li key={task.id} className="border-l-2 border-ink/10 pl-3">
                      <p className="truncate text-sm font-medium text-ink">{task.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <Zap size={12} className="text-primary" /> +{task.rewards.exp} EXP
                        {statKey ? <>· {STAT_LABELS[statKey]} +{task.rewards.stats[statKey]}</> : null}
                      </p>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">完成一个任务后，这里会显示轻量奖励反馈。</p>
            )}
          </Panel>

          <p className="flex items-center gap-2 px-1 text-xs text-faint"><CalendarDays size={14} /> 普通任务不会写入成长足迹，保持时间线干净。</p>
        </aside>
      </div>

      <MobileQuickAddBar onAdd={(name) => addQuickTask(name, '', 'medium')} onMore={() => setEditingTask('new')} />

      {editingTask !== null ? (
        <TaskEditor
          task={editingTask === 'new' ? null : editingTask}
          goals={data.goals}
          categories={data.skillCategories}
          skills={data.skills}
          onClose={() => setEditingTask(null)}
          onSave={(task) => saveEntity('tasks', task)}
        />
      ) : null}
      <RewardCelebration celebration={celebration} onClose={dismiss} />
    </div>
  )
}

/**
 * 移动端专用的底部快速添加条：固定在底部导航之上（拇指区），
 * 键盘弹出时跟随可视区域上移，不被遮挡。
 */
function MobileQuickAddBar({ onAdd, onMore }: { onAdd: (name: string) => Promise<void>; onMore: () => void }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = window.visualViewport
    const container = containerRef.current
    if (!viewport || !container) return undefined
    const pin = () => {
      container.style.height = `${viewport.height}px`
      container.style.transform = `translateY(${viewport.offsetTop}px)`
      setKeyboardOpen(viewport.height < window.innerHeight * 0.75)
    }
    pin()
    viewport.addEventListener('resize', pin)
    viewport.addEventListener('scroll', pin)
    return () => {
      viewport.removeEventListener('resize', pin)
      viewport.removeEventListener('scroll', pin)
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await onAdd(trimmed)
      setName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-40 lg:hidden">
      <form
        className="pointer-events-auto absolute inset-x-0 px-3"
        style={{ bottom: keyboardOpen ? 8 : 'calc(64px + env(safe-area-inset-bottom))' }}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex items-center gap-1 rounded-full bg-surface p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.12)] ring-1 ring-ink/5">
          <input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            aria-label="快速添加任务"
            enterKeyHint="done"
            placeholder="添加今天要做的事…"
            className="min-h-10 min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-faint"
          />
          <button type="button" aria-label="更多任务选项" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5" onClick={onMore}>
            <MoreHorizontal size={18} />
          </button>
          <button type="submit" aria-label="添加任务" disabled={saving || !name.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-deep disabled:opacity-45">
            <Plus size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}
