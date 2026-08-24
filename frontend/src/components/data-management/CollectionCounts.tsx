import type { AppData } from '../../types/models'
import { Panel } from '../ui/Panel'

interface CollectionCountsProps {
  data: AppData
}

export function CollectionCounts({ data }: CollectionCountsProps) {
  const counts = [
    ['技能分类', data.skillCategories.length],
    ['技能', data.skills.length],
    ['目标', data.goals.length],
    ['任务', data.tasks.length],
    ['成就', data.achievements.length],
    ['装备', data.equipment.length],
    ['人生事件', data.events.length],
    ['Boss', data.bosses.length],
    ['地图节点', data.timeline.length],
    ['属性快照', data.stats.history.length],
  ] as const

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {counts.map(([label, count]) => (
        <Panel key={label} className="p-4 text-center">
          <p className="text-2xl font-semibold text-ink">{count}</p>
          <p className="mt-1 text-xs text-muted">{label}</p>
        </Panel>
      ))}
    </div>
  )
}
