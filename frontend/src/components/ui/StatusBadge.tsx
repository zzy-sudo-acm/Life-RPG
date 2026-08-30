const tones: Record<string, string> = {
  active: 'bg-primary-soft text-primary',
  current: 'bg-primary-soft text-primary',
  in_progress: 'bg-primary-soft text-primary',
  completed: 'bg-verdant/10 text-verdant',
  past: 'bg-verdant/10 text-verdant',
  defeated: 'bg-verdant/10 text-verdant',
  planned: 'bg-arcane-soft text-arcane',
  paused: 'bg-white/8 text-muted',
  todo: 'bg-white/8 text-muted',
}

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
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${tones[value] ?? 'bg-white/8 text-muted'}`}
    >
      {labels[value] ?? value}
    </span>
  )
}
