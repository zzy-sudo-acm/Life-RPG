import { Award, Lock, Package, Pencil, Plus, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { AchievementEditor } from '../components/collection/AchievementEditor'
import { EquipmentEditor } from '../components/collection/EquipmentEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useAppStore } from '../store/AppStoreContext'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Achievement,
  type Equipment,
  type EquipmentQuality,
} from '../types/models'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'
import { STAT_COLORS } from '../components/dashboard/statPalette'

const QUALITY_LABELS: Record<EquipmentQuality, string> = {
  common: '普通',
  fine: '精良',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

const QUALITY_COLORS: Record<EquipmentQuality, string> = {
  common: '#9aa4b2',
  fine: '#3ecf8e',
  rare: '#4cc2ff',
  epic: '#b07cf6',
  legendary: '#f2b23e',
}

export function AchievementsEquipmentPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [achievementEditor, setAchievementEditor] = useState<Achievement | null | 'new'>(null)
  const [equipmentEditor, setEquipmentEditor] = useState<Equipment | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const unlockedCount = data.achievements.filter((item) => item.unlockedAt !== null).length

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collection"
        title="收藏室"
        description="值得纪念的里程碑，以及现实中帮助你成长的装备。"
      />

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

      {/* 成就墙 */}
      <section className="space-y-4" aria-labelledby="achievement-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="achievement-heading" className="flex items-center gap-2 font-semibold text-ink">
              <Trophy size={19} className="text-exp" /> 成就墙
            </h2>
            <p className="mt-1 text-sm text-muted">
              已解锁 {unlockedCount} / {data.achievements.length} 项
            </p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setAchievementEditor('new')}>
            添加成就
          </Button>
        </div>

        {data.achievements.length === 0 ? (
          <EmptyState
            icon={<Trophy size={22} />}
            title="还没有成就"
            description="记录第一个值得纪念的进展。"
            action={<Button onClick={() => setAchievementEditor('new')}>添加成就</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.achievements
              .toSorted((left, right) => {
                // 已解锁的排在前面，按解锁时间倒序
                const leftUnlocked = left.unlockedAt !== null
                const rightUnlocked = right.unlockedAt !== null
                if (leftUnlocked !== rightUnlocked) return leftUnlocked ? -1 : 1
                return (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? '')
              })
              .map((achievement) => {
                const unlocked = achievement.unlockedAt !== null
                return (
                  <Panel
                    key={achievement.id}
                    className={cn(
                      'relative flex min-h-44 flex-col overflow-hidden p-5',
                      unlocked && 'border-exp/35',
                      !unlocked && 'opacity-75',
                    )}
                  >
                    {unlocked ? (
                      <>
                        <span
                          aria-hidden
                          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-exp/80 to-transparent"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 w-16 animate-shine bg-gradient-to-r from-transparent via-white/8 to-transparent"
                        />
                      </>
                    ) : null}

                    <div className="flex items-start gap-3.5">
                      {/* 徽章 */}
                      <span
                        className={cn(
                          'relative flex size-14 shrink-0 items-center justify-center rounded-2xl border text-3xl',
                          unlocked
                            ? 'border-exp/50 bg-gradient-to-b from-exp/25 to-exp/5 shadow-[0_0_22px_rgb(242_178_62/0.3)]'
                            : 'border-line bg-canvas/60 grayscale',
                        )}
                      >
                        {achievement.icon ? (
                          <span aria-hidden className={cn(!unlocked && 'opacity-40')}>
                            {achievement.icon}
                          </span>
                        ) : (
                          <Award size={26} className={unlocked ? 'text-exp' : 'text-faint'} />
                        )}
                        {!unlocked ? (
                          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-canvas/45">
                            <Lock size={18} className="text-faint" />
                          </span>
                        ) : null}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className={cn('font-semibold', unlocked ? 'text-ink' : 'text-muted')}>
                          {achievement.name}
                        </h3>
                        <p className="mt-1 text-xs text-faint">
                          {unlocked
                            ? `解锁于 ${formatDate(achievement.unlockedAt)}`
                            : achievement.unlockType === 'automatic'
                              ? '等待自动解锁'
                              : '等待手动点亮'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {achievement.description || '暂无描述'}
                    </p>

                    {achievement.trigger ? (
                      <p className="mt-3 rounded-lg border border-line/70 bg-canvas/50 px-3 py-2 text-xs text-muted">
                        触发条件：{achievement.trigger.event} ≥ {achievement.trigger.threshold}
                      </p>
                    ) : null}

                    <div className="mt-4 flex justify-end gap-1 border-t border-line/60 pt-3">
                      <Button
                        variant="ghost"
                        className="min-h-9 px-2.5 text-xs"
                        icon={<Pencil size={13} />}
                        onClick={() => setAchievementEditor(achievement)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-9 px-2.5 text-xs text-danger hover:bg-danger-soft hover:text-danger"
                        icon={<Trash2 size={13} />}
                        onClick={() => deleteAchievement(achievement)}
                      >
                        删除
                      </Button>
                    </div>
                  </Panel>
                )
              })}
          </div>
        )}
      </section>

      {/* 装备架 */}
      <section className="space-y-4 border-t border-line/60 pt-6" aria-labelledby="equipment-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="equipment-heading" className="flex items-center gap-2 font-semibold text-ink">
              <Package size={19} className="text-info" /> 现实装备
            </h2>
            <p className="mt-1 text-sm text-muted">共 {data.equipment.length} 件</p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setEquipmentEditor('new')}>
            添加装备
          </Button>
        </div>

        {data.equipment.length === 0 ? (
          <EmptyState
            icon={<Package size={22} />}
            title="还没有装备"
            description="电脑、书籍、运动器材或任何帮助成长的工具都可以记录。"
            action={<Button onClick={() => setEquipmentEditor('new')}>添加装备</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.equipment.map((equipment) => {
              const qualityColor = QUALITY_COLORS[equipment.quality]
              const bonuses = STAT_KEYS.flatMap((key) => {
                const value = equipment.statBonuses[key]
                return value === undefined || value === 0
                  ? []
                  : [{ key, label: `${STAT_LABELS[key]} +${value}` }]
              })

              return (
                <Panel
                  key={equipment.id}
                  className="relative flex min-h-44 flex-col overflow-hidden p-5"
                  style={{ borderColor: `${qualityColor}55` }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5"
                    style={{
                      background: `linear-gradient(to right, transparent, ${qualityColor}cc, transparent)`,
                    }}
                  />
                  {equipment.quality === 'legendary' ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-16 animate-shine bg-gradient-to-r from-transparent via-exp/10 to-transparent"
                    />
                  ) : null}

                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-ink">{equipment.name}</h3>
                    <span
                      className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        borderColor: `${qualityColor}66`,
                        backgroundColor: `${qualityColor}14`,
                        color: qualityColor,
                      }}
                    >
                      {QUALITY_LABELS[equipment.quality]}
                    </span>
                  </div>

                  <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {equipment.description || '暂无描述'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {bonuses.length > 0 ? (
                      bonuses.map((bonus) => (
                        <span
                          key={bonus.key}
                          className="rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{
                            borderColor: `${STAT_COLORS[bonus.key]}44`,
                            backgroundColor: `${STAT_COLORS[bonus.key]}12`,
                            color: STAT_COLORS[bonus.key],
                          }}
                        >
                          {bonus.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-faint">无属性加成</span>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end gap-1 border-t border-line/60 pt-3">
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2.5 text-xs"
                      icon={<Pencil size={13} />}
                      onClick={() => setEquipmentEditor(equipment)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2.5 text-xs text-danger hover:bg-danger-soft hover:text-danger"
                      icon={<Trash2 size={13} />}
                      onClick={() => deleteEquipment(equipment)}
                    >
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
