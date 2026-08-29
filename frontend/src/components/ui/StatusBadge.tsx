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
  return (
    <span className="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-muted">
      {labels[value] ?? value}
    </span>
  )
}
