import {
  CheckCircle2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { GoalEditor } from '../components/goals/GoalEditor'
import { TaskEditor } from '../components/goals/TaskEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAppStore } from '../store/AppStoreContext'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Goal,
  type Task,
  type TaskStatus,
} from '../types/models'
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

  const handleCompleteTask = (task: Task) => {
    if (
      !window.confirm(
        `完成“${task.name}”并立即结算奖励吗？此操作不能重复结算。`,
      )
    ) {
      return
    }
    void completeTask(task.id).catch(() => undefined)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="目标与任务"
        description="把长期方向拆成可执行任务，并在完成时结算成长奖励。"
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

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">目标路线</h2>
            <p className="mt-1 text-sm text-muted">{data.goals.length} 个目标</p>
          </div>
        </div>
        {goalRows.length === 0 ? (
          <EmptyState
            title="还没有目标"
            description="先创建一个大目标，再逐步拆分成小目标。"
            action={<Button onClick={openNewGoal}>创建第一个目标</Button>}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {goalRows.map(({ goal, depth }) => (
              <Panel key={goal.id} className="p-4 sm:p-5">
                <div style={{ paddingLeft: `${Math.min(depth, 3) * 14}px` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-ink">{goal.name}</h3>
                        <span className="rounded-md bg-primary-soft px-2 py-1 text-xs text-primary">
                          {goal.type === 'major' ? '大目标' : '小目标'}
                        </span>
                        <StatusBadge value={goal.status} />
                      </div>
                      {goal.parentId !== null ? (
                        <p className="mt-1 text-xs text-muted">
                          上级：{goalNames.get(goal.parentId) ?? '未知目标'}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        className="px-2"
                        aria-label={`编辑目标：${goal.name}`}
                        onClick={() => openGoal(goal)}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 text-danger"
                        aria-label={`删除目标：${goal.name}`}
                        onClick={() => void handleDeleteGoal(goal).catch(() => undefined)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                  {goal.description ? (
                    <p className="mt-3 text-sm text-muted">{goal.description}</p>
                  ) : null}
                  <div className="mt-4">
                    <ProgressBar value={goal.progress} label={`进度 · ${goal.progress}%`} />
                  </div>
                  <p className="mt-3 text-xs text-muted">截止：{formatDate(goal.deadline)}</p>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">任务列表</h2>
            <p className="mt-1 text-sm text-muted">
              显示 {filteredTasks.length} / {data.tasks.length} 项
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            状态筛选
            <select
              aria-label="任务状态筛选"
              value={settings.taskFilter}
              className="min-h-10 rounded-[10px] border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              onChange={(event) =>
                updateSettings({
                  taskFilter: event.target.value as typeof settings.taskFilter,
                })
              }
            >
              <option value="all">全部</option>
              <option value="todo">待开始</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </label>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            title="当前筛选下没有任务"
            description="创建任务，或切换状态筛选查看其他任务。"
            action={<Button onClick={openNewTask}>创建任务</Button>}
          />
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const rewards = taskRewardSummary(task, skillNames, bossNames)
              return (
                <Panel key={task.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-ink">{task.name}</h3>
                        <StatusBadge value={task.status} />
                        {task.type ? (
                          <span className="text-xs text-muted">{task.type}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {task.goalId === null
                          ? '未关联目标'
                          : `目标：${goalNames.get(task.goalId) ?? '未知目标'}`}
                        {' · '}截止：{formatDate(task.dueDate)}
                      </p>
                      {task.description ? (
                        <p className="mt-3 text-sm text-muted">{task.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rewards.length > 0 ? (
                          rewards.map((reward) => (
                            <span
                              key={reward}
                              className="rounded-md bg-[#fff6e8] px-2 py-1 text-xs font-medium text-exp"
                            >
                              {reward}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted">未设置奖励</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-[390px] lg:justify-end">
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
                      {task.status !== 'completed' ? (
                        <Button
                          icon={<CheckCircle2 size={15} />}
                          onClick={() => handleCompleteTask(task)}
                        >
                          完成任务
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="px-2"
                        aria-label={`编辑任务：${task.name}`}
                        onClick={() => openTask(task)}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 text-danger"
                        aria-label={`删除任务：${task.name}`}
                        onClick={() => handleDeleteTask(task)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </Panel>
              )
            })}
          </div>
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
    </div>
  )
}
