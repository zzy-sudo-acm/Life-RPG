import { BookOpen, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { TASK_DIFFICULTY_LABELS, type Task } from '../../types/models'
import { cn } from '../../utils/cn'
import { localDateString } from '../../utils/format'

interface TaskRowProps {
  task: Task
  categoryName: string
  goalName?: string | undefined
  onComplete: (task: Task) => void | Promise<void>
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void | Promise<void>
}

export function TaskRow({
  task,
  categoryName,
  goalName,
  onComplete,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const completed = task.status === 'completed'
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const overdue =
    !completed && task.dueDate && task.dueDate.slice(0, 10) < localDateString()
  const handleComplete = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onComplete(task)
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className={cn('action-row', completed && 'is-complete')}>
      <button
        type="button"
        disabled={completed || busy}
        aria-label={
          completed ? `已完成：${task.name}` : `完成任务：${task.name}`
        }
        className="action-check"
        onClick={() => void handleComplete()}
      >
        <span>
          {completed ? (
            <Check size={15} strokeWidth={2.5} />
          ) : busy ? (
            <span className="check-loading" />
          ) : null}
        </span>
      </button>
      <button
        type="button"
        className="action-content"
        onClick={() => onEdit(task)}
        aria-label={`编辑任务：${task.name}`}
      >
        <span className="action-title">{task.name}</span>
        <span className="action-meta">
          <BookOpen size={12} />
          <span>{categoryName}</span>
          <span>·</span>
          <span className="action-goal">
            {goalName || TASK_DIFFICULTY_LABELS[task.difficulty]}
          </span>
          {overdue ? <span className="overdue-label">已逾期</span> : null}
        </span>
      </button>
      <span className="action-reward">
        +{task.rewards.exp}
        <span> EXP</span>
      </span>
      <div className="action-menu-wrap">
        <button
          type="button"
          aria-label={`任务选项：${task.name}`}
          aria-expanded={menuOpen}
          className="icon-button"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen ? (
          <>
            <button
              className="menu-dismiss"
              aria-label="关闭任务选项"
              onClick={() => setMenuOpen(false)}
            />
            <div className="action-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(task)
                }}
              >
                <Pencil size={15} />
                编辑任务
              </button>
              <button
                type="button"
                className="text-danger"
                onClick={() => {
                  setMenuOpen(false)
                  void onDelete(task)
                }}
              >
                <Trash2 size={15} />
                删除任务
              </button>
            </div>
          </>
        ) : null}
      </div>
    </li>
  )
}
