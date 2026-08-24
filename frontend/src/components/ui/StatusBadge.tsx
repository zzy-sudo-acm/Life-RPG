import { cn } from '../../utils/cn'

const labels: Record<string, string> = {
  planned: '计划中',
  active: '进行中',
  completed: '已完成',
  paused: '已暂停',
  todo: '待开始',
  in_progress: '进行中',
  defeated: '已击败',
  past: '已完成',
  current: '当前阶段',
  future: '未来阶段',
  manual: '手动',
  automatic: '自动',
}
interface StatusBadgeProps {
  value: string
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const positive = value === 'completed' || value === 'defeated' || value === 'past'
  const active = value === 'active' || value === 'in_progress' || value === 'current'
  const golden = value === 'automatic'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        positive && 'border-primary/35 bg-primary-soft text-primary',
        active && 'border-info/35 bg-info-soft text-info',
        golden && 'border-exp/35 bg-exp-soft text-exp',
        !positive && !active && !golden && 'border-line bg-white/5 text-muted',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          positive && 'bg-primary',
          active && 'bg-info',
          golden && 'bg-exp',
          !positive && !active && !golden && 'bg-faint',
        )}
      />
      {labels[value] ?? value}
    </span>
  )
}
