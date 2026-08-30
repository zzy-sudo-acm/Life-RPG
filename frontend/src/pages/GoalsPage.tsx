import { CheckCircle2, Crown, Flag, Pencil, Plus, Skull, Target, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GoalEditor } from '../components/goals/GoalEditor'
import { TaskEditor } from '../components/goals/TaskEditor'
import { TaskRow } from '../components/goals/TaskRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { useAppStore } from '../store/AppStoreContext'
import { type Goal, type Task } from '../types/models'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
] as const

type TaskFilterValue = (typeof FILTERS)[number]['value']

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
  const allRoots = [...rootGoals, ...orphanGoals]
  const activeBosses = allRoots.filter((goal) => goal.displayMode === 'boss' && goal.status === 'active')
  const regularGoals = allRoots.filter((goal) => !activeBosses.includes(goal))
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

  const changeFilter = (next: TaskFilterValue) => updateSettings({ taskFilter: next })

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">目标</h1>
          <p className="mt-2 hidden text-sm text-muted lg:block">长期目标、子目标与 Boss 模式都使用同一套进度。</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="min-h-9 px-3 lg:min-h-10 lg:px-4" icon={<Plus size={16} />} onClick={() => setTaskEditor('new')}>添加任务</Button>
          <Button className="min-h-9 px-3 lg:min-h-10 lg:px-4" icon={<Target size={16} />} onClick={() => setGoalEditor('new')}>添加目标</Button>
        </div>
      </header>

      {activeBosses.length > 0 ? (
        <section aria-label="Boss 讨伐战" className="space-y-4">
          {activeBosses.map((boss) => (
            <BossBanner
              key={boss.id}
              goal={boss}
              childGoals={data.goals.filter((item) => item.parentId === boss.id)}
              primaryGoalId={data.character.primaryGoalId}
              onEdit={(goal) => setGoalEditor(goal)}
              onDelete={(goal) => void handleDeleteGoal(goal)}
              onMakePrimary={(goal) => void updateCharacter({ primaryGoalId: goal.id })}
            />
          ))}
        </section>
      ) : null}

      <section aria-labelledby="goals-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="goals-heading" className="text-lg font-semibold tracking-tight text-ink lg:text-xl">长期方向</h2><p className="mt-1 hidden text-xs text-faint lg:block">只保留父目标与子目标两层</p></div>
          <span className="text-xs text-muted">{data.goals.filter((goal) => goal.status === 'active').length} 个进行中</span>
        </div>
        {data.goals.length === 0 ? (
          <EmptyState icon={<Flag size={22} />} title="还没有目标" description="添加一个值得持续推进的方向。" action={<Button onClick={() => setGoalEditor('new')}>添加目标</Button>} />
        ) : (
          <div className="space-y-4">
            {regularGoals.map((goal) => {
              const children = data.goals.filter((item) => item.parentId === goal.id)
              const boss = goal.displayMode === 'boss'
              return (
                <Panel
                  key={goal.id}
                  className={cn(
                    'overflow-hidden',
                    goal.id === data.character.primaryGoalId && 'ring-2 ring-primary/40 shadow-[0_0_36px_rgb(245_184_61/0.1)]',
                    boss && 'ring-1 ring-danger/40 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_0_36px_rgb(255_84_104/0.08)]',
                  )}
                >
                  <GoalRow
                    goal={goal}
                    primary={goal.id === data.character.primaryGoalId}
                    onEdit={() => setGoalEditor(goal)}
                    onDelete={() => void handleDeleteGoal(goal)}
                    onMakePrimary={() => void updateCharacter({ primaryGoalId: goal.id })}
                  />
                  {children.length > 0 ? (
                    <div className="bg-raised/50 px-4 py-2 sm:px-5">
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
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="tasks-heading" className="text-lg font-semibold tracking-tight text-ink lg:text-xl">任务</h2><p className="mt-1 hidden text-xs text-faint lg:block">完成后自动结算并推进关联目标</p></div>
          <div className="hidden lg:block"><TaskFilter value={settings.taskFilter} onChange={changeFilter} /></div>
        </div>
        {/* 移动端：筛选器吸顶，长列表滚动时随手可切 */}
        <div className="sticky top-14 z-20 -mx-4 mb-3 bg-canvas/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
          <TaskFilter value={settings.taskFilter} onChange={changeFilter} />
        </div>
        {filteredTasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={22} />} title="当前没有任务" description="添加下一件要做的事。" action={<Button onClick={() => setTaskEditor('new')}>添加任务</Button>} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-white/8">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                categoryName={categoryNames.get(task.categoryId ?? '') ?? '未分类'}
                goalName={task.goalId ? data.goals.find((goal) => goal.id === task.goalId)?.name ?? '未知目标' : '未关联目标'}
                onComplete={(target) => void handleComplete(target)}
                onEdit={setTaskEditor}
                onDelete={(target) => void handleDeleteTask(target)}
              />
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

function TaskFilter({ value, onChange }: { value: string; onChange: (next: TaskFilterValue) => void }) {
  return (
    <div className="flex w-fit gap-0.5 rounded-full bg-raised p-1 ring-1 ring-white/8" aria-label="任务筛选">
      {FILTERS.map((filter) => (
        <button key={filter.value} type="button" aria-pressed={value === filter.value} className={cn('min-h-8 rounded-full px-3.5 text-xs text-muted transition-colors', value === filter.value && 'bg-primary font-semibold text-[#241a04] shadow-[0_0_12px_rgb(245_184_61/0.3)]')} onClick={() => onChange(filter.value)}>{filter.label}</button>
      ))}
    </div>
  )
}

function BossBanner({ goal, childGoals, primaryGoalId, onEdit, onDelete, onMakePrimary }: { goal: Goal; childGoals: Goal[]; primaryGoalId: string | null; onEdit: (goal: Goal) => void; onDelete: (goal: Goal) => void; onMakePrimary: (goal: Goal) => void }) {
  const primary = goal.id === primaryGoalId
  return (
    <Panel className="relative overflow-hidden ring-1 ring-danger/40 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_0_44px_rgb(255_84_104/0.1)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_88%_8%,rgb(255_84_104/0.15),transparent_65%)]" />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:gap-5">
          <span className="flex size-12 shrink-0 animate-pulse-glow items-center justify-center rounded-2xl bg-danger-soft text-danger ring-1 ring-danger/40 sm:size-14">
            <Skull className="size-6 sm:size-7" />
          </span>
          <div className="min-w-0 flex-1 basis-52">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold tracking-[0.2em] text-danger">BOSS 讨伐战</p>
              {primary ? <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary"><Crown size={12} /> 主要</span> : null}
            </div>
            <h3 className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">{goal.name}</h3>
            {goal.description ? <p className="mt-2 text-sm leading-6 text-muted">{goal.description}</p> : null}
          </div>
          <div className="flex shrink-0 gap-1 max-sm:ml-auto">
            {!primary ? <Button variant="ghost" className="min-h-9 px-2" aria-label={`设为主要目标：${goal.name}`} onClick={() => onMakePrimary(goal)}><Crown size={15} /></Button> : null}
            <Button variant="ghost" className="min-h-9 px-2" aria-label={`编辑目标：${goal.name}`} onClick={() => onEdit(goal)}><Pencil size={15} /></Button>
            <Button variant="ghost" className="min-h-9 px-2 hover:bg-danger-soft hover:text-danger" aria-label={`删除目标：${goal.name}`} onClick={() => onDelete(goal)}><Trash2 size={15} /></Button>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">已推进 <strong className="tabular-nums text-ink">{goal.progress}%</strong></span>
            <span className="text-sm font-bold tabular-nums text-danger">剩余 HP {100 - goal.progress}</span>
          </div>
          <ProgressBar className="mt-2" value={goal.progress} tone="danger" size="lg" />
          <p className="mt-2 text-xs text-faint">完成关联任务即可削减 HP · 截止：{formatDate(goal.deadline)}</p>
        </div>
      </div>
      {childGoals.length > 0 ? (
        <div className="relative border-t border-danger/20 bg-raised/50 px-4 py-2 sm:px-5">
          {childGoals.map((child) => (
            <GoalRow key={child.id} goal={child} child primary={child.id === primaryGoalId} onEdit={() => onEdit(child)} onDelete={() => onDelete(child)} onMakePrimary={() => onMakePrimary(child)} />
          ))}
        </div>
      ) : null}
    </Panel>
  )
}

function GoalRow({ goal, child = false, primary, onEdit, onDelete, onMakePrimary }: { goal: Goal; child?: boolean; primary: boolean; onEdit: () => void; onDelete: () => void; onMakePrimary: () => void }) {
  const boss = goal.displayMode === 'boss'
  return (
    <div className={cn('p-4 sm:p-5', child && 'border-b border-line px-0 last:border-b-0')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {child ? <span className="text-faint">↳</span> : null}
            {boss ? <Skull size={child ? 16 : 19} className="shrink-0 text-danger" /> : null}
            <h3 className={cn('font-semibold tracking-tight text-ink', child ? 'text-base' : 'text-lg')}>{goal.name}</h3>
            {boss ? <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Boss</span> : null}
            {primary ? <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary"><Crown size={12} /> 主要</span> : null}
          </div>
          {goal.description ? <p className="mt-2 text-sm leading-6 text-muted">{goal.description}</p> : null}
          <div className="mt-4 max-w-2xl"><ProgressBar value={goal.progress} tone={boss ? 'danger' : 'primary'} size="lg" label={boss ? `已推进 ${goal.progress}% · 剩余 HP ${100 - goal.progress}` : `进度 ${goal.progress}%`} /></div>
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
