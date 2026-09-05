import {
  CheckCircle2,
  Flag,
  ListFilter,
  Plus,
  Search,
  Sprout,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { GoalEditor } from '../components/goals/GoalEditor'
import { GoalJourneyCard } from '../components/goals/GoalJourneyCard'
import { TaskEditor } from '../components/goals/TaskEditor'
import { TaskRow } from '../components/goals/TaskRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { useAppStore } from '../store/AppStoreContext'
import { type Goal, type Task } from '../types/models'
import { cn } from '../utils/cn'

const TASK_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
] as const

const GOAL_FILTERS = [
  { value: 'all', label: '全部目标' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已抵达' },
] as const

type TaskFilterValue = (typeof TASK_FILTERS)[number]['value']
type GoalFilterValue = (typeof GOAL_FILTERS)[number]['value']

function collectJourneyIds(
  goalId: string,
  childrenByParent: Map<string, Goal[]>,
): Set<string> {
  const result = new Set<string>([goalId])
  const pending = [goalId]
  while (pending.length > 0) {
    for (const child of childrenByParent.get(pending.pop()!) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id)
        pending.push(child.id)
      }
    }
  }
  return result
}

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
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null)
  const [goalFilter, setGoalFilter] = useState<GoalFilterValue>('all')
  const [selectedGoalId, setSelectedGoalId] = useState('all')
  const [taskSearch, setTaskSearch] = useState('')
  const tasksSection = useRef<HTMLElement>(null)
  const { celebration, present, dismiss } = useRewardCelebration()

  const categoryNames = useMemo(
    () =>
      new Map(
        data?.skillCategories.map((category) => [category.id, category.name]) ??
          [],
      ),
    [data?.skillCategories],
  )
  const { goalsById, childrenByParent, journeyIds, pendingByGoal } =
    useMemo(() => {
      const goalsById = new Map(
        data?.goals.map((goal) => [goal.id, goal]) ?? [],
      )
      const childrenByParent = new Map<string, Goal[]>()
      for (const goal of data?.goals ?? []) {
        if (goal.parentId) {
          const siblings = childrenByParent.get(goal.parentId) ?? []
          siblings.push(goal)
          childrenByParent.set(goal.parentId, siblings)
        }
      }
      const journeyIds = new Map<string, Set<string>>()
      const directPending = new Map<string, number>()
      for (const task of data?.tasks ?? []) {
        if (task.goalId && task.status !== 'completed') {
          directPending.set(
            task.goalId,
            (directPending.get(task.goalId) ?? 0) + 1,
          )
        }
      }
      const pendingByGoal = new Map<string, number>()
      for (const goal of data?.goals ?? []) {
        const ids = collectJourneyIds(goal.id, childrenByParent)
        journeyIds.set(goal.id, ids)
        let pending = 0
        for (const id of ids) pending += directPending.get(id) ?? 0
        pendingByGoal.set(goal.id, pending)
      }
      return { goalsById, childrenByParent, journeyIds, pendingByGoal }
    }, [data?.goals, data?.tasks])

  if (!data) return null

  const allRoots = data.goals.filter(
    (goal) => goal.parentId === null || !goalsById.has(goal.parentId),
  )
  const visibleRoots = allRoots.filter(
    (goal) =>
      goalFilter === 'all' ||
      goal.status === goalFilter ||
      [...(journeyIds.get(goal.id) ?? [])].some(
        (id) => goalsById.get(id)?.status === goalFilter,
      ),
  )
  const primaryRoot = allRoots.find((goal) =>
    journeyIds.get(goal.id)?.has(data.character.primaryGoalId ?? ''),
  )
  const featuredGoal =
    visibleRoots.find((goal) => goal.id === primaryRoot?.id) ??
    visibleRoots.find((goal) => goal.status === 'active')
  const otherGoals = visibleRoots.filter((goal) => goal.id !== featuredGoal?.id)
  const activeSelectedGoalId =
    selectedGoalId === 'unlinked' || goalsById.has(selectedGoalId)
      ? selectedGoalId
      : 'all'
  const selectedGoal = goalsById.get(activeSelectedGoalId)
  const selectedJourneyIds = journeyIds.get(activeSelectedGoalId)
  const query = taskSearch.trim().toLocaleLowerCase()
  const journeyTasks = data.tasks.filter((task) => {
    if (activeSelectedGoalId === 'unlinked') return task.goalId === null
    return (
      activeSelectedGoalId === 'all' ||
      selectedJourneyIds?.has(task.goalId ?? '')
    )
  })
  const filteredTasks = journeyTasks
    .filter(
      (task) =>
        (settings.taskFilter === 'all' ||
          task.status === settings.taskFilter) &&
        (!query ||
          `${task.name} ${task.description} ${goalsById.get(task.goalId ?? '')?.name ?? ''}`
            .toLocaleLowerCase()
            .includes(query)),
    )
    .toSorted((left, right) => {
      if (left.status === 'completed' && right.status !== 'completed') return 1
      if (left.status !== 'completed' && right.status === 'completed') return -1
      return (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999')
    })

  const openNewTask = (goalId: string | null = selectedGoal?.id ?? null) => {
    setNewTaskGoalId(
      goalId && goalsById.get(goalId)?.status !== 'completed' ? goalId : null,
    )
    setTaskEditor('new')
  }
  const selectGoalTasks = (goal: Goal) => {
    setSelectedGoalId(goal.id)
    setTaskSearch('')
    updateSettings({ taskFilter: 'all' })
    tasksSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const handleDeleteGoal = async (goal: Goal) => {
    const relatedTasks = data.tasks.filter(
      (task) => task.goalId === goal.id,
    ).length
    if (
      !window.confirm(
        `删除目标“${goal.name}”吗？${relatedTasks > 0 ? `\n${relatedTasks} 个关联任务会保留，但不再关联目标。` : ''}`,
      )
    )
      return
    try {
      await deleteEntity('goals', goal.id)
      if (selectedGoalId === goal.id) setSelectedGoalId('all')
    } catch {
      // 全局错误提示负责反馈。
    }
  }
  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`删除任务“${task.name}”吗？`)) return
    try {
      await deleteEntity('tasks', task.id)
    } catch {
      // 全局错误提示负责反馈。
    }
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
  const makePrimary = async (goal: Goal) => {
    try {
      await updateCharacter({ primaryGoalId: goal.id })
    } catch {
      // 全局错误提示负责反馈。
    }
  }
  const saveTask = async (task: Task) => {
    await saveEntity('tasks', task)
    if (taskEditor === 'new') {
      setSelectedGoalId(task.goalId ?? 'all')
      setTaskSearch('')
      updateSettings({ taskFilter: 'all' })
      tasksSection.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const cardProps = {
    primaryGoalId: data.character.primaryGoalId,
    selectedGoalId: activeSelectedGoalId,
    pendingByGoal,
    onEdit: setGoalEditor,
    onDelete: (goal: Goal) => void handleDeleteGoal(goal),
    onMakePrimary: (goal: Goal) => void makePrimary(goal),
    onSelect: selectGoalTasks,
    onAddTask: (goal: Goal) => openNewTask(goal.id),
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-[28px]">
            目标旅程
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            心里有远方，脚下有下一步。
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0 max-sm:px-3"
          icon={<Plus size={17} />}
          onClick={() => setGoalEditor('new')}
        >
          新建目标
        </Button>
      </header>

      <section aria-label="目标旅程" className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-line">
          <div
            className="flex min-w-0 gap-5 overflow-x-auto sm:gap-7"
            aria-label="目标状态筛选"
          >
            {GOAL_FILTERS.map((filter) => {
              const count =
                filter.value === 'all'
                  ? data.goals.length
                  : data.goals.filter((goal) => goal.status === filter.value)
                      .length
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={goalFilter === filter.value}
                  className={cn(
                    'relative flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent pb-3 text-sm text-muted transition-colors hover:text-primary',
                    goalFilter === filter.value &&
                      'border-primary font-semibold text-primary',
                  )}
                  onClick={() => setGoalFilter(filter.value)}
                >
                  {filter.label}
                  <span className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <span className="hidden items-center gap-1.5 pb-3 text-xs text-faint xl:flex">
            <Sprout size={14} /> 慢慢来，持续生长
          </span>
        </div>

        {data.goals.length === 0 ? (
          <EmptyState
            icon={<Flag size={25} />}
            title="给未来的自己，一个方向"
            description="想学会的技能、想去的地方，或想养成的习惯，都可以从这里开始。"
            action={
              <Button
                icon={<Plus size={16} />}
                onClick={() => setGoalEditor('new')}
              >
                写下第一个目标
              </Button>
            }
          />
        ) : visibleRoots.length === 0 ? (
          <EmptyState
            icon={<Flag size={24} />}
            title={
              goalFilter === 'completed'
                ? '沿途的努力，终会带你抵达'
                : '新的旅程，随时可以出发'
            }
            description={
              goalFilter === 'completed'
                ? '完成目标后，它会留在这里，成为成长的见证。'
                : '从计划中选择一个方向，或开启一个新目标。'
            }
            action={
              <Button variant="secondary" onClick={() => setGoalFilter('all')}>
                查看全部目标
              </Button>
            }
          />
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {featuredGoal ? (
              <GoalJourneyCard
                {...cardProps}
                goal={featuredGoal}
                childGoals={childrenByParent.get(featuredGoal.id) ?? []}
                featured
              />
            ) : null}
            {otherGoals.length > 0 ? (
              <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-2">
                {otherGoals.map((goal) => (
                  <GoalJourneyCard
                    key={goal.id}
                    {...cardProps}
                    goal={goal}
                    childGoals={childrenByParent.get(goal.id) ?? []}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section
        ref={tasksSection}
        aria-labelledby="tasks-heading"
        className="scroll-mt-24 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              id="tasks-heading"
              className="text-lg font-semibold tracking-tight text-ink sm:text-xl"
            >
              把目标，走成每一天
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              每完成一件小事，都更靠近远方。
            </p>
          </div>
          <Button
            variant="secondary"
            className="min-h-11 shrink-0 max-sm:px-3"
            icon={<Plus size={16} />}
            onClick={() => openNewTask()}
          >
            添加任务
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex flex-col gap-3 border-b border-line px-3 py-3 sm:px-5 sm:py-4 xl:flex-row xl:items-center xl:justify-between">
            <TaskFilter
              value={settings.taskFilter}
              tasks={journeyTasks}
              onChange={(next) => updateSettings({ taskFilter: next })}
            />
            <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 flex-1 sm:max-w-56">
                <ListFilter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <select
                  aria-label="按关联目标筛选任务"
                  value={activeSelectedGoalId}
                  onChange={(event) =>
                    setSelectedGoalId(event.currentTarget.value)
                  }
                  className="min-h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-7 text-base text-ink focus-visible:outline-2 focus-visible:outline-primary sm:text-xs"
                >
                  <option value="all">全部方向</option>
                  <option value="unlinked">未关联目标</option>
                  {data.goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.parentId ? '↳ ' : ''}
                      {goal.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  aria-label="搜索任务"
                  type="search"
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.currentTarget.value)}
                  placeholder="搜索行动…"
                  className="min-h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-base text-ink placeholder:text-faint focus-visible:outline-2 focus-visible:outline-primary sm:text-xs"
                />
              </div>
            </div>
          </div>

          {activeSelectedGoalId !== 'all' ? (
            <div className="flex items-center justify-between gap-3 border-b border-line bg-primary-soft/50 px-4 sm:px-5">
              <p className="min-w-0 py-2 text-xs leading-5 text-primary">
                {selectedGoal ? (
                  <>
                    <span className="font-semibold">{selectedGoal.name}</span>{' '}
                    的行动
                    {(selectedJourneyIds?.size ?? 0) > 1 ? ' · 包含子目标' : ''}
                  </>
                ) : (
                  '尚未关联目标的行动'
                )}
              </p>
              <button
                type="button"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 text-xs text-muted hover:text-ink"
                onClick={() => setSelectedGoalId('all')}
                aria-label="清除目标筛选"
              >
                <X size={14} /> 清除
              </button>
            </div>
          ) : null}

          {filteredTasks.length === 0 ? (
            <div className="px-3 py-4 sm:px-6 sm:py-5">
              <EmptyState
                icon={<CheckCircle2 size={24} />}
                title={
                  query
                    ? '没有找到这个行动'
                    : settings.taskFilter === 'completed'
                      ? '每一次完成，都值得记下'
                      : '为这个方向，迈出下一小步'
                }
                description={
                  query
                    ? '试试其他关键词，或清除筛选查看全部任务。'
                    : settings.taskFilter === 'completed'
                      ? '完成任务后，就能在这里看到自己的积累。'
                      : '把大目标拆成今天能做的一件事。'
                }
                action={
                  query ? (
                    <Button
                      variant="secondary"
                      onClick={() => setTaskSearch('')}
                    >
                      清除搜索
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={<Plus size={15} />}
                      onClick={() => openNewTask()}
                    >
                      添加任务
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  categoryName={
                    categoryNames.get(task.categoryId ?? '') ?? '未分类'
                  }
                  goalName={
                    task.goalId
                      ? (goalsById.get(task.goalId)?.name ?? '未知目标')
                      : '未关联目标'
                  }
                  onComplete={(target) => void handleComplete(target)}
                  onEdit={setTaskEditor}
                  onDelete={(target) => void handleDeleteTask(target)}
                />
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 sm:px-5">
            <span className="text-[11px] text-faint">
              {filteredTasks.length} 个行动 · 每一步都算数
            </span>
            <button
              type="button"
              onClick={() => openNewTask()}
              className="flex min-h-12 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={15} /> 再加一步
            </button>
          </div>
        </div>
      </section>

      {goalEditor !== null ? (
        <GoalEditor
          goal={goalEditor === 'new' ? null : goalEditor}
          goals={data.goals}
          onClose={() => setGoalEditor(null)}
          onSave={(goal) => saveEntity('goals', goal)}
        />
      ) : null}
      {taskEditor !== null ? (
        <TaskEditor
          task={taskEditor === 'new' ? null : taskEditor}
          defaultGoalId={taskEditor === 'new' ? newTaskGoalId : null}
          goals={data.goals}
          categories={data.skillCategories}
          skills={data.skills}
          onClose={() => setTaskEditor(null)}
          onSave={saveTask}
        />
      ) : null}
      <RewardCelebration celebration={celebration} onClose={dismiss} />
    </div>
  )
}

function TaskFilter({
  value,
  tasks,
  onChange,
}: {
  value: string
  tasks: Task[]
  onChange: (next: TaskFilterValue) => void
}) {
  return (
    <div className="flex min-w-0 gap-0.5 overflow-x-auto" aria-label="任务筛选">
      {TASK_FILTERS.map((filter) => {
        const count =
          filter.value === 'all'
            ? tasks.length
            : tasks.filter((task) => task.status === filter.value).length
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={value === filter.value}
            className={cn(
              'min-h-11 shrink-0 rounded-lg px-2.5 text-xs text-muted transition-colors hover:bg-raised',
              value === filter.value &&
                'bg-primary-soft font-semibold text-primary',
            )}
            onClick={() => onChange(filter.value)}
          >
            {filter.label}
            <span className="ml-1 text-[11px] tabular-nums opacity-70">
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
