import { Lock, Package, Pencil, Plus, Trash2, Trophy } from 'lucide-react'
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
  common: '#8d8474',
  fine: '#4a7a5e',
  rare: '#4a6a8a',
  epic: '#6a5a8a',
  legendary: '#a97c1f',
}

/** 御朱印不会盖得整整齐齐 —— 每枚印章带一点各自的歪斜 */
const STAMP_TILTS = [-5, 3, -3, 4, -2, 5]

export function AchievementsEquipmentPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [achievementEditor, setAchievementEditor] = useState<Achievement | null | 'new'>(null)
  const [equipmentEditor, setEquipmentEditor] = useState<Equipment | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const unlockedCount = data.achievements.filter((item) => item.unlockedAt !== null).length

  // 品质图鉴：从传说排到普通
  const qualityOrder: EquipmentQuality[] = ['legendary', 'epic', 'rare', 'fine', 'common']
  const qualityCounts = qualityOrder.map((quality) => ({
    quality,
    count: data.equipment.filter((item) => item.quality === quality).length,
  }))

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
        description="值得纪念的里程碑盖成朱印，陪伴成长的装备收进道具袋。"
      />

      {error ? <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

      {/* 朱印成就墙 */}
      <section className="space-y-4" aria-labelledby="achievement-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="achievement-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Trophy size={19} className="text-exp" /> 成就朱印
            </h2>
            <p className="mt-1 text-sm text-muted">
              已盖印 {unlockedCount} / {data.achievements.length} 枚
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
              .map((achievement, index) => {
                const unlocked = achievement.unlockedAt !== null
                const tilt = STAMP_TILTS[index % STAMP_TILTS.length]
                return (
                  <Panel
                    key={achievement.id}
                    className={cn(
                      'relative flex min-h-44 flex-col p-5',
                      !unlocked && 'opacity-75',
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* 朱印 / 未盖印 */}
                      {unlocked ? (
                        <span
                          className="flex size-14 shrink-0 items-center justify-center rounded-full border-[2.5px] border-danger/75 bg-surface text-2xl shadow-[inset_0_0_0_2px_rgb(189_66_41/0.18)]"
                          style={{ transform: `rotate(${tilt}deg)` }}
                        >
                          <span aria-hidden>{achievement.icon || '🏅'}</span>
                        </span>
                      ) : (
                        <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line bg-ink/4 text-faint">
                          <Lock size={18} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className={cn('font-display font-bold', unlocked ? 'text-ink' : 'text-muted')}>
                          {achievement.name}
                        </h3>
                        <p className="mt-1 font-kai text-xs text-faint">
                          {unlocked
                            ? `盖印于 ${formatDate(achievement.unlockedAt)}`
                            : achievement.unlockType === 'automatic'
                              ? '静待时机自动解锁'
                              : '等待亲手盖印'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {achievement.description || '暂无描述'}
                    </p>

                    {achievement.trigger ? (
                      <p className="mt-3 rounded-lg border border-line bg-raised/50 px-3 py-2 text-xs text-muted">
                        触发条件：{achievement.trigger.event} ≥ {achievement.trigger.threshold}
                      </p>
                    ) : null}

                    <div className="mt-4 flex justify-end gap-1 border-t border-line/70 pt-3">
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

      {/* 道具袋 */}
      <section className="space-y-4 border-t border-line pt-6" aria-labelledby="equipment-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="equipment-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Package size={19} className="text-info" /> 现实装备
            </h2>
            <p className="mt-1 text-sm text-muted">共 {data.equipment.length} 件</p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setEquipmentEditor('new')}>
            添加装备
          </Button>
        </div>

        {/* 品质图鉴：堆叠条 + 计数 */}
        {data.equipment.length > 0 ? (
          <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
            <div
              className="flex h-2.5 overflow-hidden rounded-full border border-line"
              role="img"
              aria-label="装备品质分布"
            >
              {qualityCounts
                .filter(({ count }) => count > 0)
                .map(({ quality, count }) => (
                  <span
                    key={quality}
                    title={`${QUALITY_LABELS[quality]} ${count} 件`}
                    style={{
                      width: `${(count / data.equipment.length) * 100}%`,
                      backgroundColor: QUALITY_COLORS[quality],
                    }}
                  />
                ))}
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {qualityCounts.map(({ quality, count }) => (
                <li key={quality} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rotate-45"
                    style={{ backgroundColor: QUALITY_COLORS[quality] }}
                  />
                  {QUALITY_LABELS[quality]}
                  <b className="font-display tabular-nums text-ink">{count}</b>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
                  className="relative flex min-h-44 flex-col overflow-hidden p-5 pl-6"
                >
                  {/* 品质色织带 */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1.5"
                    style={{ backgroundColor: qualityColor }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display font-bold text-ink">{equipment.name}</h3>
                    <span
                      className="shrink-0 rounded px-2.5 py-1 text-xs font-bold text-[#fbf7ee] shadow-[0_1px_3px_rgb(44_38_32/0.25)]"
                      style={{ backgroundColor: qualityColor }}
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
                          className="rounded border px-2 py-0.5 text-xs font-medium"
                          style={{
                            borderColor: `${STAT_COLORS[bonus.key]}55`,
                            backgroundColor: `${STAT_COLORS[bonus.key]}10`,
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

                  <div className="mt-4 flex justify-end gap-1 border-t border-line/70 pt-3">
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
