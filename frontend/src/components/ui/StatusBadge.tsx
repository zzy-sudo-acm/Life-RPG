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
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-1 text-xs font-medium',
        positive && 'bg-primary-soft text-primary',
        active && 'bg-[#e8f0fb] text-[#2b65a5]',
        !positive && !active && 'bg-[#f0f2f0] text-muted',
      )}
    >
      {labels[value] ?? value}
    </span>
  )
}
