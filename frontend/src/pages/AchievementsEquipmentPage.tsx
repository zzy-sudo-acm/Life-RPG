import { Award, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AchievementEditor } from '../components/collection/AchievementEditor'
import { EquipmentEditor } from '../components/collection/EquipmentEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAppStore } from '../store/AppStoreContext'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Achievement,
  type Equipment,
  type EquipmentQuality,
} from '../types/models'
import { formatDate } from '../utils/format'

const QUALITY_LABELS: Record<EquipmentQuality, string> = {
  common: '普通',
  fine: '精良',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

export function AchievementsEquipmentPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [achievementEditor, setAchievementEditor] = useState<Achievement | null | 'new'>(null)
  const [equipmentEditor, setEquipmentEditor] = useState<Equipment | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const deleteAchievement = (achievement: Achievement) => {
    if (!window.confirm(`确定删除成就“${achievement.name}”吗？`)) return
    setError(null)
    void deleteEntity('achievements', achievement.id).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : '删除成就失败')
    })
  }

  const deleteEquipment = (equipment: Equipment) => {
    if (!window.confirm(`确定删除装备“${equipment.name}”吗？`)) return
    setError(null)
    void deleteEntity('equipment', equipment.id).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : '删除装备失败')
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="成就与装备"
        description="记录值得纪念的里程碑，以及现实中帮助你成长的工具。"
      />

      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <section className="space-y-4" aria-labelledby="achievement-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="achievement-heading" className="flex items-center gap-2 font-semibold text-ink">
              <Award size={19} className="text-primary" /> 成就
            </h2>
            <p className="mt-1 text-sm text-muted">共 {data.achievements.length} 项</p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setAchievementEditor('new')}>
            添加成就
          </Button>
        </div>

        {data.achievements.length === 0 ? (
          <EmptyState
            title="还没有成就"
            description="记录第一个值得纪念的进展。"
            action={<Button onClick={() => setAchievementEditor('new')}>添加成就</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.achievements
              .toSorted((left, right) =>
                (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? ''),
              )
              .map((achievement) => (
                <Panel key={achievement.id} className="flex min-h-48 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="text-3xl" aria-hidden="true">{achievement.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink">{achievement.name}</h3>
                        <p className="mt-1 text-xs text-muted">
                          {achievement.unlockedAt
                            ? formatDate(achievement.unlockedAt)
                            : '等待自动解锁'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge value={achievement.unlockType} />
                  </div>
                  <p className="mt-4 flex-1 whitespace-pre-wrap text-sm text-muted">
                    {achievement.description || '暂无描述'}
                  </p>
                  {achievement.trigger ? (
                    <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
                      触发：{achievement.trigger.event} ≥ {achievement.trigger.threshold}
                    </p>
                  ) : null}
                  <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
                    <Button variant="ghost" icon={<Pencil size={15} />} onClick={() => setAchievementEditor(achievement)}>
                      编辑
                    </Button>
                    <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => deleteAchievement(achievement)}>
                      删除
                    </Button>
                  </div>
                </Panel>
              ))}
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-line pt-6" aria-labelledby="equipment-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="equipment-heading" className="flex items-center gap-2 font-semibold text-ink">
              <Package size={19} className="text-primary" /> 现实装备
            </h2>
            <p className="mt-1 text-sm text-muted">共 {data.equipment.length} 件</p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setEquipmentEditor('new')}>
            添加装备
          </Button>
        </div>

        {data.equipment.length === 0 ? (
          <EmptyState
            title="还没有装备"
            description="电脑、书籍、运动器材或任何帮助成长的工具都可以记录。"
            action={<Button onClick={() => setEquipmentEditor('new')}>添加装备</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.equipment.map((equipment) => {
              const bonuses = STAT_KEYS.flatMap((key) => {
                const value = equipment.statBonuses[key]
                return value === undefined || value === 0
                  ? []
                  : [`${STAT_LABELS[key]} +${value}`]
              })

              return (
                <Panel key={equipment.id} className="flex min-h-48 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-ink">{equipment.name}</h3>
                    <span className="rounded-md bg-[#f0f2f0] px-2 py-1 text-xs font-medium text-muted">
                      {QUALITY_LABELS[equipment.quality]}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 whitespace-pre-wrap text-sm text-muted">
                    {equipment.description || '暂无描述'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bonuses.length > 0 ? bonuses.map((bonus) => (
                      <span key={bonus} className="rounded-md bg-primary-soft px-2 py-1 text-xs text-primary">
                        {bonus}
                      </span>
                    )) : <span className="text-xs text-muted">无属性加成</span>}
                  </div>
                  <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
                    <Button variant="ghost" icon={<Pencil size={15} />} onClick={() => setEquipmentEditor(equipment)}>
                      编辑
                    </Button>
                    <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => deleteEquipment(equipment)}>
                      删除
                    </Button>
                  </div>
                </Panel>
              )
            })}
          </div>
        )}
      </section>

      {achievementEditor !== null ? (
        <AchievementEditor
          achievement={achievementEditor === 'new' ? null : achievementEditor}
          onClose={() => setAchievementEditor(null)}
          onSave={(achievement) => saveEntity('achievements', achievement)}
        />
      ) : null}
      {equipmentEditor !== null ? (
        <EquipmentEditor
          equipment={equipmentEditor === 'new' ? null : equipmentEditor}
          onClose={() => setEquipmentEditor(null)}
          onSave={(equipment) => saveEntity('equipment', equipment)}
        />
      ) : null}
    </div>
  )
}
