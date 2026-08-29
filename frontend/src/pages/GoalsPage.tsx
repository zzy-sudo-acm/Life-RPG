import { Check, CheckCircle2, Crown, Flag, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GoalEditor } from '../components/goals/GoalEditor'
import { TaskEditor } from '../components/goals/TaskEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { useAppStore } from '../store/AppStoreContext'
import { TASK_DIFFICULTY_LABELS, type Goal, type Task } from '../types/models'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
] as const

export function GoalsPage() {
  const {
    data,
    settings,
    updateSettings,
    updateCharacter,
    saveEntity,
    deleteEntity,
    completeTask,
  } = useAppStore()
  const [goalEditor, setGoalEditor] = useState<Goal | null | 'new'>(null)
  const [taskEditor, setTaskEditor] = useState<Task | null | 'new'>(null)
  const { celebration, present, dismiss } = useRewardCelebration()

  const categoryNames = useMemo(
    () => new Map(data?.skillCategories.map((category) => [category.id, category.name]) ?? []),
    [data?.skillCategories],
  )
  if (!data) return null

  const rootGoals = data.goals.filter((goal) => goal.parentId === null)
  const orphanGoals = data.goals.filter(
    (goal) => goal.parentId !== null && !data.goals.some((candidate) => candidate.id === goal.parentId),
  )
  const filteredTasks = data.tasks
    .filter((task) => settings.taskFilter === 'all' || task.status === settings.taskFilter)
    .toSorted((left, right) => {
      if (left.status === 'completed' && right.status !== 'completed') return 1
      if (left.status !== 'completed' && right.status === 'completed') return -1
      return (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999')
    })

  const handleDeleteGoal = async (goal: Goal) => {
    const relatedTasks = data.tasks.filter((task) => task.goalId === goal.id).length
    if (window.confirm(`删除目标“${goal.name}”吗？${relatedTasks > 0 ? `\n${relatedTasks} 个关联任务会保留，但不再关联目标。` : ''}`)) {
      await deleteEntity('goals', goal.id)
    }
  }
  const handleDeleteTask = async (task: Task) => {
    if (window.confirm(`删除任务“${task.name}”吗？`)) await deleteEntity('tasks', task.id)
  }
  const handleComplete = async (task: Task) => {
    const baseLevel = data.character.level
    try {
      await completeTask(task.id)
      present({ title: task.name, rewards: task.rewards, baseLevel })
    } catch {
      // 全局错误提示负责反馈。
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">目标</h1>
          <p className="mt-2 text-sm text-muted">长期目标、子目标与 Boss 模式都使用同一套进度。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setTaskEditor('new')}>添加任务</Button>
          <Button icon={<Target size={16} />} onClick={() => setGoalEditor('new')}>添加目标</Button>
        </div>
      </header>

      <section aria-labelledby="goals-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="goals-heading" className="text-xl font-semibold tracking-tight text-ink">长期方向</h2><p className="mt-1 text-xs text-faint">只保留父目标与子目标两层</p></div>
          <span className="text-xs text-muted">{data.goals.filter((goal) => goal.status === 'active').length} 个进行中</span>
        </div>
        {data.goals.length === 0 ? (
          <EmptyState icon={<Flag size={22} />} title="还没有目标" description="添加一个值得持续推进的方向。" action={<Button onClick={() => setGoalEditor('new')}>添加目标</Button>} />
        ) : (
          <div className="space-y-4">
            {[...rootGoals, ...orphanGoals].map((goal) => {
              const children = data.goals.filter((item) => item.parentId === goal.id)
              return (
                <Panel key={goal.id} className={cn('overflow-hidden', goal.id === data.character.primaryGoalId && 'ring-2 ring-primary/25')}>
                  <GoalRow
                    goal={goal}
                    primary={goal.id === data.character.primaryGoalId}
                    onEdit={() => setGoalEditor(goal)}
                    onDelete={() => void handleDeleteGoal(goal)}
                    onMakePrimary={() => void updateCharacter({ primaryGoalId: goal.id })}
                  />
                  {children.length > 0 ? (
                    <div className="bg-canvas/60 px-4 py-2 sm:px-5">
                      {children.map((child) => (
                        <GoalRow key={child.id} goal={child} child primary={child.id === data.character.primaryGoalId} onEdit={() => setGoalEditor(child)} onDelete={() => void handleDeleteGoal(child)} onMakePrimary={() => void updateCharacter({ primaryGoalId: child.id })} />
                      ))}
                    </div>
                  ) : null}
                </Panel>
              )
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="tasks-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="tasks-heading" className="text-xl font-semibold tracking-tight text-ink">任务</h2><p className="mt-1 text-xs text-faint">完成后自动结算并推进关联目标</p></div>
          <div className="flex w-fit gap-0.5 rounded-full bg-ink/[0.06] p-1" aria-label="任务筛选">
            {FILTERS.map((filter) => (
              <button key={filter.value} type="button" aria-pressed={settings.taskFilter === filter.value} className={cn('min-h-8 rounded-full px-3.5 text-xs text-muted transition-colors', settings.taskFilter === filter.value && 'bg-surface font-medium text-ink shadow-[0_1px_3px_rgb(0_0_0/0.1)]')} onClick={() => updateSettings({ taskFilter: filter.value })}>{filter.label}</button>
            ))}
          </div>
        </div>
        {filteredTasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={22} />} title="当前没有任务" description="添加下一件要做的事。" action={<Button onClick={() => setTaskEditor('new')}>添加任务</Button>} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-[0_1px_4px_rgb(0_0_0/0.04)]">
            {filteredTasks.map((task) => (
              <li key={task.id} className={cn('group flex items-center gap-3 px-3 py-4 sm:px-4', task.status === 'completed' && 'opacity-60')}>
                {task.status !== 'completed' ? (
                  <button type="button" aria-label={`完成任务：${task.name}`} className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/15 text-transparent transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary" onClick={() => void handleComplete(task)}><Check size={18} strokeWidth={3} /></button>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Check size={18} strokeWidth={3} /></span>
                )}
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setTaskEditor(task)}>
                  <div className="flex flex-wrap items-center gap-2"><p className={cn('font-medium text-ink', task.status === 'completed' && 'line-through')}>{task.name}</p><StatusBadge value={task.status} /></div>
                  <p className="mt-1 text-xs text-muted">{categoryNames.get(task.categoryId ?? '') ?? '未分类'} · {TASK_DIFFICULTY_LABELS[task.difficulty]} · {task.goalId ? data.goals.find((goal) => goal.id === task.goalId)?.name ?? '未知目标' : '未关联目标'} · {formatDate(task.dueDate)}</p>
                </button>
                <span className="hidden shrink-0 text-xs font-medium text-muted md:inline">+{task.rewards.exp} EXP</span>
                <button type="button" aria-label={`删除任务：${task.name}`} className="rounded-full p-2 text-faint opacity-100 transition-colors hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100" onClick={() => void handleDeleteTask(task)}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {goalEditor !== null ? <GoalEditor goal={goalEditor === 'new' ? null : goalEditor} goals={data.goals} onClose={() => setGoalEditor(null)} onSave={(goal) => saveEntity('goals', goal)} /> : null}
      {taskEditor !== null ? <TaskEditor task={taskEditor === 'new' ? null : taskEditor} goals={data.goals} categories={data.skillCategories} skills={data.skills} onClose={() => setTaskEditor(null)} onSave={(task) => saveEntity('tasks', task)} /> : null}
      <RewardCelebration celebration={celebration} onClose={dismiss} />
    </div>
  )
}

function GoalRow({ goal, child = false, primary, onEdit, onDelete, onMakePrimary }: { goal: Goal; child?: boolean; primary: boolean; onEdit: () => void; onDelete: () => void; onMakePrimary: () => void }) {
  return (
    <div className={cn('p-4 sm:p-5', child && 'border-b border-line px-0 last:border-b-0')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {child ? <span className="text-faint">↳</span> : null}
            <h3 className={cn('font-semibold tracking-tight text-ink', child ? 'text-base' : 'text-lg')}>{goal.name}</h3>
            {goal.displayMode === 'boss' ? <span className="text-xs font-semibold text-danger">Boss</span> : null}
            {primary ? <span className="flex items-center gap-1 text-xs font-medium text-primary"><Crown size={12} /> 主要</span> : null}
          </div>
          {goal.description ? <p className="mt-2 text-sm leading-6 text-muted">{goal.description}</p> : null}
          <div className="mt-4 max-w-2xl"><ProgressBar value={goal.progress} tone={goal.displayMode === 'boss' ? 'danger' : 'primary'} label={goal.displayMode === 'boss' ? `进度 ${goal.progress}% · 剩余 HP ${100 - goal.progress}` : `进度 ${goal.progress}%`} /></div>
          <p className="mt-2 text-xs text-faint">截止：{formatDate(goal.deadline)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {!primary && goal.status !== 'completed' ? <Button variant="ghost" className="min-h-9 px-2" aria-label={`设为主要目标：${goal.name}`} onClick={onMakePrimary}><Crown size={15} /></Button> : null}
          <Button variant="ghost" className="min-h-9 px-2" aria-label={`编辑目标：${goal.name}`} onClick={onEdit}><Pencil size={15} /></Button>
          <Button variant="ghost" className="min-h-9 px-2 hover:bg-danger-soft hover:text-danger" aria-label={`删除目标：${goal.name}`} onClick={onDelete}><Trash2 size={15} /></Button>
        </div>
      </div>
    </div>
  )
}
