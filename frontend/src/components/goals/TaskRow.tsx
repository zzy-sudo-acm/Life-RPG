import { Check, Trash2 } from 'lucide-react'
import { TASK_DIFFICULTY_LABELS, type Task } from '../../types/models'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/format'
import { StatusBadge } from '../ui/StatusBadge'
import { DIFFICULTY_HEX } from '../ui/statTheme'

interface TaskRowProps {
  task: Task
  categoryName: string
  /** 目标页传入关联目标名；今日页不传，保持行高紧凑。 */
  goalName?: string | undefined
  onComplete: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

/** 今日页与目标页共用的任务行：符文圆环完成钮 + 难度色点 + 常驻 EXP 金徽章。 */
export function TaskRow({ task, categoryName, goalName, onComplete, onEdit, onDelete }: TaskRowProps) {
  const completed = task.status === 'completed'
  return (
    <li className={cn('group flex items-center gap-3 px-3 py-4 sm:px-4', completed && 'opacity-60')}>
      {completed ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[#241a04] shadow-[0_0_12px_rgb(245_184_61/0.4)]">
          <Check size={18} strokeWidth={3} />
        </span>
      ) : (
        <button
          type="button"
          aria-label={`完成任务：${task.name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/15 text-transparent transition-all hover:border-primary hover:bg-primary-soft hover:text-primary hover:shadow-[0_0_14px_rgb(245_184_61/0.4)]"
          onClick={() => onComplete(task)}
        >
          <Check size={18} strokeWidth={3} />
        </button>
      )}
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(task)}>
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('font-medium text-ink', completed && 'line-through')}>{task.name}</p>
          {goalName !== undefined ? <StatusBadge value={task.status} /> : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: DIFFICULTY_HEX[task.difficulty] }} />
            {TASK_DIFFICULTY_LABELS[task.difficulty]}
          </span>
          {goalName ? <><span aria-hidden="true">·</span><span>{goalName}</span></> : null}
          {task.dueDate ? <><span aria-hidden="true">·</span><span>{formatDate(task.dueDate)}</span></> : null}
        </p>
      </button>
      <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">+{task.rewards.exp} EXP</span>
      <button
        type="button"
        aria-label={`删除任务：${task.name}`}
        className="rounded-full p-2 text-faint opacity-100 transition-colors hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
        onClick={() => onDelete(task)}
      >
        <Trash2 size={16} />
      </button>
    </li>
  )
}
