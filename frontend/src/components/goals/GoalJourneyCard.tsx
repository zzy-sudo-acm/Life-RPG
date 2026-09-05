import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  Crown,
  Flag,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Goal } from '../../types/models'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/format'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'

const STATUS_LABELS: Record<Goal['status'], string> = {
  active: '进行中',
  planned: '准备出发',
  paused: '稍作停留',
  completed: '已抵达',
}

interface GoalJourneyCardProps {
  goal: Goal
  childGoals: Goal[]
  primaryGoalId: string | null
  selectedGoalId: string
  pendingByGoal: Map<string, number>
  featured?: boolean
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onMakePrimary: (goal: Goal) => void
  onSelect: (goal: Goal) => void
  onAddTask: (goal: Goal) => void
}

export function GoalJourneyCard({
  goal,
  childGoals,
  primaryGoalId,
  selectedGoalId,
  pendingByGoal,
  featured = false,
  onEdit,
  onDelete,
  onMakePrimary,
  onSelect,
  onAddTask,
}: GoalJourneyCardProps) {
  const primary = goal.id === primaryGoalId
  const completed = goal.status === 'completed'
  const actions = { onEdit, onDelete, onMakePrimary }
  return (
    <article
      className={cn(
        'relative min-w-0 overflow-hidden rounded-2xl border border-line bg-surface',
        featured && 'border-[#dbe5d5] bg-[#f0f4eb]',
        selectedGoalId === goal.id && 'ring-2 ring-primary/20',
      )}
      aria-label={`目标：${goal.name}`}
    >
      {featured ? (
        <Compass
          aria-hidden="true"
          size={220}
          strokeWidth={0.65}
          className="pointer-events-none absolute -right-8 -top-9 rotate-12 text-primary/[0.045]"
        />
      ) : null}
      <div
        className={cn('relative px-4 pb-4 pt-3 sm:p-5', featured && 'sm:p-7')}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-semibold tracking-wider',
                featured ? 'text-primary' : 'text-muted',
              )}
            >
              {primary ? <Crown size={13} /> : <Flag size={13} />}
              {primary
                ? '当前主线'
                : featured
                  ? '正在攀登'
                  : goal.type === 'minor'
                    ? '小目标'
                    : '成长方向'}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px]',
                completed
                  ? 'bg-primary-soft text-primary'
                  : 'bg-white/70 text-muted',
              )}
            >
              {STATUS_LABELS[goal.status]}
            </span>
            {goal.displayMode === 'boss' ? (
              <span className="rounded-full bg-[#f2e8d5] px-2 py-0.5 text-[10px] text-[#98752f]">
                挑战目标
              </span>
            ) : null}
          </div>
          <GoalActions goal={goal} primary={primary} {...actions} />
        </div>

        <div
          className={cn(
            'mt-2 sm:mt-4',
            featured && 'flex items-center gap-5 sm:gap-7',
          )}
        >
          {featured ? (
            <span className="hidden size-[90px] shrink-0 items-center justify-center rounded-full border border-primary/15 bg-white/50 text-primary sm:flex">
              <Compass size={66} strokeWidth={1.05} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'break-words text-lg font-semibold tracking-tight text-ink',
                featured && 'text-[23px] sm:text-[26px]',
              )}
            >
              {goal.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {goal.description ||
                (completed
                  ? '这一程的坚持，已经成为你的一部分。'
                  : '把期待变成行动，把行动变成自己的成长。')}
            </p>
            <div className={cn('mt-5', featured && 'max-w-3xl')}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
                <span>{completed ? '已经抵达' : '已走过的路'}</span>
                <span className="font-semibold tabular-nums text-primary">
                  {Math.round(goal.progress)}
                  <span className="ml-0.5 text-[10px] font-normal">%</span>
                </span>
              </div>
              <ProgressBar
                value={goal.progress}
                size={featured ? 'md' : 'sm'}
              />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted',
            featured && 'sm:ml-[118px]',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />{' '}
            {goal.deadline
              ? `${formatDate(goal.deadline)} 前`
              : '按自己的节奏前进'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListTodo size={13} /> {pendingByGoal.get(goal.id) ?? 0} 个待办行动
          </span>
          {goal.displayMode === 'boss' ? (
            <span>
              剩余挑战值 {Math.max(0, Math.round(100 - goal.progress))}
            </span>
          ) : null}
        </div>

        {childGoals.length > 0 ? (
          <details className="group/route mt-4 border-t border-primary/10 pt-1 sm:mt-6">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-xs text-muted">
              <span className="font-medium text-ink">沿途的小目标</span>
              <span className="ml-auto text-[11px] tabular-nums">
                {
                  childGoals.filter((child) => child.status === 'completed')
                    .length
                }{' '}
                / {childGoals.length} 已抵达
              </span>
              <ChevronDown
                size={15}
                className="shrink-0 transition-transform group-open/route:rotate-180"
              />
            </summary>
            <div
              className={cn(
                'grid gap-3 pb-1',
                featured && 'md:grid-cols-2 2xl:grid-cols-3',
              )}
            >
              {childGoals.map((child, index) => (
                <div
                  key={child.id}
                  className={cn(
                    'rounded-xl border border-line/80 bg-white/70 px-3 pb-2 pt-2',
                    selectedGoalId === child.id && 'border-primary/50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(child)}
                    aria-label={`查看子目标行动：${child.name}`}
                    className="flex min-h-12 w-full items-center gap-2.5 text-left"
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-surface text-xs font-medium tabular-nums text-primary',
                        child.status === 'completed' &&
                          'border-primary bg-primary text-white',
                      )}
                    >
                      {child.status === 'completed' ? (
                        <Check size={14} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-5 text-ink">
                        {child.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted">
                        {STATUS_LABELS[child.status]}
                        {child.id === primaryGoalId ? ' · 当前主线' : ''} ·{' '}
                        {pendingByGoal.get(child.id) ?? 0} 个待办
                      </span>
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-muted" />
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar
                      className="min-w-0 flex-1"
                      value={child.progress}
                      size="sm"
                    />
                    <span className="text-[10px] tabular-nums text-muted">
                      {Math.round(child.progress)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {child.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => onAddTask(child)}
                        className="flex min-h-11 items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus size={14} /> 添加行动
                      </button>
                    ) : (
                      <span className="text-[11px] text-primary">
                        这一站，完成了
                      </span>
                    )}
                    <GoalActions
                      goal={child}
                      primary={child.id === primaryGoalId}
                      {...actions}
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <div
        className={cn(
          'relative flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 sm:px-5',
          featured && 'border-primary/10 bg-white/30 sm:px-7',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(goal)}
          className="flex min-h-11 items-center gap-2 text-xs font-medium text-primary hover:underline"
        >
          查看关联行动 <ArrowRight size={15} />
        </button>
        {!completed ? (
          <Button
            variant={featured ? 'primary' : 'secondary'}
            className="min-h-11 px-3 text-xs"
            icon={<Plus size={15} />}
            onClick={() => onAddTask(goal)}
          >
            添加下一步
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <Check size={14} /> 好好珍藏这一程
          </span>
        )}
      </div>
    </article>
  )
}

function GoalActions({
  goal,
  primary,
  onEdit,
  onDelete,
  onMakePrimary,
}: {
  goal: Goal
  primary: boolean
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onMakePrimary: (goal: Goal) => void
}) {
  const className =
    'flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary'
  return (
    <div className="flex shrink-0 items-center">
      {!primary && goal.status !== 'completed' ? (
        <button
          type="button"
          aria-label={`设为主要目标：${goal.name}`}
          title="设为当前主线"
          className={className}
          onClick={() => onMakePrimary(goal)}
        >
          <Crown size={15} />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`编辑目标：${goal.name}`}
        title="编辑目标"
        className={className}
        onClick={() => onEdit(goal)}
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        aria-label={`删除目标：${goal.name}`}
        title="删除目标"
        className={cn(className, 'hover:bg-danger-soft hover:text-danger')}
        onClick={() => onDelete(goal)}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
