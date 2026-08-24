import {
  CheckCircle2,
  Crown,
  Flag,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { GoalEditor } from '../components/goals/GoalEditor'
import { TaskEditor } from '../components/goals/TaskEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { ProgressRing } from '../components/ui/ProgressRing'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAppStore } from '../store/AppStoreContext'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Goal,
  type Task,
  type TaskStatus,
} from '../types/models'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'
import { nowIso } from '../utils/id'

interface GoalRow {
  goal: Goal
  depth: number
}

function compareGoals(left: Goal, right: Goal): number {
  if (left.type !== right.type) {
    return left.type === 'major' ? -1 : 1
  }
  return left.createdAt.localeCompare(right.createdAt)
}

function flattenGoals(goals: Goal[]): GoalRow[] {
  const goalIds = new Set(goals.map((goal) => goal.id))
  const children = new Map<string | null, Goal[]>()

  for (const goal of goals) {
    const parentId =
      goal.parentId !== null && goalIds.has(goal.parentId) ? goal.parentId : null
    const siblings = children.get(parentId) ?? []
    siblings.push(goal)
    children.set(parentId, siblings)
  }

  for (const siblings of children.values()) {
    siblings.sort(compareGoals)
  }

  const rows: GoalRow[] = []
  const visited = new Set<string>()
  const visit = (goal: Goal, depth: number) => {
    if (visited.has(goal.id)) {
      return
    }
    visited.add(goal.id)
    rows.push({ goal, depth })
    for (const child of children.get(goal.id) ?? []) {
      visit(child, depth + 1)
    }
  }

  for (const root of children.get(null) ?? []) {
    visit(root, 0)
  }
  for (const goal of goals.toSorted(compareGoals)) {
    visit(goal, 0)
  }

  return rows
}

function taskRewardSummary(
  task: Task,
  skillNames: ReadonlyMap<string, string>,
  bossNames: ReadonlyMap<string, string>,
): string[] {
  const parts: string[] = []
  if (task.rewards.exp > 0) {
    parts.push(`+${task.rewards.exp} EXP`)
  }
  for (const key of STAT_KEYS) {
    const amount = task.rewards.stats[key] ?? 0
    if (amount > 0) {
      parts.push(`${STAT_LABELS[key]} +${amount}`)
    }
  }
  for (const reward of task.rewards.skills) {
    parts.push(`${skillNames.get(reward.skillId) ?? '未知技能'} +${reward.amount}`)
  }
  for (const reward of task.rewards.bosses) {
    parts.push(`${bossNames.get(reward.bossId) ?? '未知 Boss'} -${reward.damage} HP`)
  }
  return parts
}

const FILTER_OPTIONS: Array<{ value: 'all' | TaskStatus; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
]

export function GoalsTasksPage() {
  const {
    data,
    settings,
    saveEntity,
    deleteEntity,
    completeTask,
    updateSettings,
  } = useAppStore()
  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [taskEditorOpen, setTaskEditorOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const { celebration, present, dismiss } = useRewardCelebration()

  if (data === null) {
    return null
  }

  const goalNames = new Map(data.goals.map((goal) => [goal.id, goal.name]))
  const skillNames = new Map(data.skills.map((skill) => [skill.id, skill.name]))
  const bossNames = new Map(data.bosses.map((boss) => [boss.id, boss.name]))
  const goalRows = flattenGoals(data.goals)
  const filteredTasks = data.tasks
    .filter(
      (task) =>
        settings.taskFilter === 'all' || task.status === settings.taskFilter,
    )
    .toSorted((left, right) => {
      if (left.status === 'completed' && right.status !== 'completed') return 1
      if (left.status !== 'completed' && right.status === 'completed') return -1
      return (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999')
    })

  const openNewGoal = () => {
    setEditingGoal(null)
    setGoalEditorOpen(true)
  }
  const openGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalEditorOpen(true)
  }
  const openNewTask = () => {
    setEditingTask(null)
    setTaskEditorOpen(true)
  }
  const openTask = (task: Task) => {
    setEditingTask(task)
    setTaskEditorOpen(true)
  }

  const handleDeleteGoal = async (goal: Goal): Promise<void> => {
    const childCount = data.goals.filter((item) => item.parentId === goal.id).length
    const taskCount = data.tasks.filter((task) => task.goalId === goal.id).length
    const confirmed = window.confirm(
      `确定删除目标“${goal.name}”吗？${childCount + taskCount > 0 ? `\n${childCount} 个子目标和 ${taskCount} 个任务会保留，但解除关联。` : ''}`,
    )
    if (!confirmed) return

    await deleteEntity('goals', goal.id)
  }

  const handleDeleteTask = (task: Task) => {
    if (!window.confirm(`确定删除任务“${task.name}”吗？`)) {
      return
    }
    void deleteEntity('tasks', task.id).catch(() => undefined)
  }

  const setTaskStatus = (task: Task, status: TaskStatus) => {
    void saveEntity('tasks', { ...task, status, updatedAt: nowIso() }).catch(
      () => undefined,
    )
  }

  const handleCompleteTask = async (task: Task): Promise<void> => {
    const baseLevel = data.character.level
    try {
      await completeTask(task.id)
      present({ title: task.name, rewards: task.rewards, baseLevel })
    } catch {
      // 写入失败时错误由全局提示展示
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quest Log"
        title="目标与任务"
        description="把长期方向拆成可执行任务，完成时立即结算成长奖励。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Plus size={16} />} onClick={openNewGoal}>
              新建目标
            </Button>
            <Button icon={<Plus size={16} />} onClick={openNewTask}>
              新建任务
            </Button>
          </div>
        }
      />

      {/* 目标路线 */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Flag size={17} className="text-primary" /> 目标路线
            </h2>
            <p className="mt-1 text-sm text-muted">{data.goals.length} 个目标</p>
          </div>
        </div>
        {goalRows.length === 0 ? (
          <EmptyState
            icon={<Flag size={22} />}
            title="还没有目标"
            description="先创建一个大目标，再逐步拆分成小目标。"
            action={<Button onClick={openNewGoal}>创建第一个目标</Button>}
          />
        ) : (
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {goalRows.map(({ goal, depth }) => {
              const isMajor = goal.type === 'major'
              return (
                <Panel
                  key={goal.id}
                  className={cn(
                    'relative overflow-hidden p-4 sm:p-5',
                    isMajor && 'border-exp/30',
                  )}
                  style={{ marginLeft: `${Math.min(depth, 3) * 14}px` }}
                >
                  {isMajor ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-exp/70 to-transparent"
                    />
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isMajor ? (
                          <Crown size={15} className="shrink-0 text-exp" aria-label="大目标" />
                        ) : null}
                        <h3 className="font-medium text-ink">{goal.name}</h3>
                        <StatusBadge value={goal.status} />
                      </div>
                      {goal.parentId !== null ? (
                        <p className="mt-1 text-xs text-faint">
                          上级：{goalNames.get(goal.parentId) ?? '未知目标'}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      {isMajor ? (
                        <ProgressRing
                          value={goal.progress}
                          size={64}
                          tone={goal.status === 'completed' ? 'primary' : 'exp'}
                          ariaLabel={`${goal.name} 进度 ${goal.progress}%`}
                        >
                          <span className="font-display text-sm font-bold tabular-nums text-ink">
                            {goal.progress}%
                          </span>
                        </ProgressRing>
                      ) : null}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          className="min-h-9 px-2"
                          aria-label={`编辑目标：${goal.name}`}
                          onClick={() => openGoal(goal)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-9 px-2 text-danger hover:bg-danger-soft hover:text-danger"
                          aria-label={`删除目标：${goal.name}`}
                          onClick={() => void handleDeleteGoal(goal).catch(() => undefined)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {goal.description ? (
                    <p className="mt-3 text-sm leading-6 text-muted">{goal.description}</p>
                  ) : null}
                  {isMajor ? (
                    <p className="mt-3 text-xs text-faint">截止：{formatDate(goal.deadline)}</p>
                  ) : (
                    <>
                      <div className="mt-4">
                        <ProgressBar
                          value={goal.progress}
                          tone={goal.status === 'completed' ? 'primary' : 'exp'}
                          label={`进度 · ${goal.progress}%`}
                        />
                      </div>
                      <p className="mt-3 text-xs text-faint">截止：{formatDate(goal.deadline)}</p>
                    </>
                  )}
                </Panel>
              )
            })}
          </div>
        )}
      </section>

      {/* 任务列表 */}
      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 size={17} className="text-exp" /> 任务列表
            </h2>
            <p className="mt-1 text-sm text-muted">
              显示 {filteredTasks.length} / {data.tasks.length} 项
            </p>
          </div>
          <div className="flex gap-1.5 rounded-xl border border-line bg-surface/70 p-1" role="group" aria-label="任务状态筛选">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={settings.taskFilter === option.value}
                className={cn(
                  'min-h-8 rounded-lg px-3 text-xs font-medium transition-colors',
                  settings.taskFilter === option.value
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted hover:text-ink',
                )}
                onClick={() => updateSettings({ taskFilter: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={22} />}
            title="当前筛选下没有任务"
            description="创建任务，或切换状态筛选查看其他任务。"
            action={<Button onClick={openNewTask}>创建任务</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {filteredTasks.map((task) => {
              const rewards = taskRewardSummary(task, skillNames, bossNames)
              const completed = task.status === 'completed'
              return (
                <li key={task.id}>
                  <Panel
                    className={cn(
                      'p-4 transition-colors sm:p-5',
                      completed && 'opacity-70',
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              'font-medium text-ink',
                              completed && 'text-muted line-through decoration-faint',
                            )}
                          >
                            {task.name}
                          </h3>
                          <StatusBadge value={task.status} />
                          {task.type ? (
                            <span className="rounded border border-line bg-ink/4 px-2 py-0.5 text-xs text-muted">
                              {task.type}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs text-faint">
                          {task.goalId === null
                            ? '未关联目标'
                            : `目标：${goalNames.get(task.goalId) ?? '未知目标'}`}
                          {' · '}截止：{formatDate(task.dueDate)}
                          {completed && task.completedAt
                            ? ` · 完成于 ${formatDate(task.completedAt)}`
                            : ''}
                        </p>
                        {task.description ? (
                          <p className="mt-3 text-sm leading-6 text-muted">{task.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {rewards.length > 0 ? (
                            rewards.map((reward) => (
                              <span
                                key={reward}
                                className="rounded-full border border-exp/25 bg-exp-soft px-2.5 py-1 text-xs font-medium text-exp"
                              >
                                {reward}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-faint">未设置奖励</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:max-w-[390px] lg:justify-end">
                        {task.status === 'todo' ? (
                          <Button
                            variant="secondary"
                            icon={<Play size={15} />}
                            onClick={() => setTaskStatus(task, 'in_progress')}
                          >
                            开始
                          </Button>
                        ) : null}
                        {task.status === 'in_progress' ? (
                          <Button
                            variant="secondary"
                            icon={<RotateCcw size={15} />}
                            onClick={() => setTaskStatus(task, 'todo')}
                          >
                            退回待办
                          </Button>
                        ) : null}
                        {!completed ? (
                          <Button
                            variant="gold"
                            icon={<CheckCircle2 size={15} />}
                            onClick={() => void handleCompleteTask(task)}
                          >
                            完成任务
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          className="min-h-9 px-2"
                          aria-label={`编辑任务：${task.name}`}
                          onClick={() => openTask(task)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-9 px-2 text-danger hover:bg-danger-soft hover:text-danger"
                          aria-label={`删除任务：${task.name}`}
                          onClick={() => handleDeleteTask(task)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  </Panel>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {goalEditorOpen ? (
        <GoalEditor
          goal={editingGoal}
          goals={data.goals}
          onClose={() => setGoalEditorOpen(false)}
          onSave={(goal) => saveEntity('goals', goal)}
        />
      ) : null}
      {taskEditorOpen ? (
        <TaskEditor
          task={editingTask}
          goals={data.goals}
          skills={data.skills}
          bosses={data.bosses}
          onClose={() => setTaskEditorOpen(false)}
          onSave={(task) => saveEntity('tasks', task)}
        />
      ) : null}
      <RewardCelebration celebration={celebration} onClose={dismiss} />
    </div>
  )
}
