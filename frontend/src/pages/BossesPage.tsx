import { Pencil, Plus, Skull, Swords, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { BossDamageEditor } from '../components/bosses/BossDamageEditor'
import { BossDamageSpark } from '../components/bosses/BossDamageSpark'
import { BossEditor } from '../components/bosses/BossEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAppStore } from '../store/AppStoreContext'
import type { Boss } from '../types/models'
import { cn } from '../utils/cn'
import { formatDate, formatNumber } from '../utils/format'

export function BossesPage() {
  const { data, saveEntity, deleteEntity, damageBoss } = useAppStore()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBoss, setEditingBoss] = useState<Boss | null>(null)
  const [damageTarget, setDamageTarget] = useState<Boss | null>(null)

  if (data === null) return null

  const goalNames = new Map(data.goals.map((goal) => [goal.id, goal.name]))
  const bosses = data.bosses.toSorted((left, right) => {
    const statusOrder: Record<Boss['status'], number> = {
      active: 0,
      planned: 1,
      defeated: 2,
    }
    return (
      statusOrder[left.status] - statusOrder[right.status] ||
      left.createdAt.localeCompare(right.createdAt)
    )
  })

  const openNewBoss = () => {
    setEditingBoss(null)
    setEditorOpen(true)
  }
  const openBoss = (boss: Boss) => {
    setEditingBoss(boss)
    setEditorOpen(true)
  }

  const defeatedCount = bosses.filter((boss) => boss.status === 'defeated' || boss.currentHp === 0).length
  const activeCount = bosses.filter((boss) => boss.status === 'active').length

  const handleDelete = async (boss: Boss): Promise<void> => {
    const rewardTaskCount = data.tasks.filter((task) =>
      task.rewards.bosses.some((reward) => reward.bossId === boss.id),
    ).length
    const confirmed = window.confirm(
      `确定删除 Boss“${boss.name}”吗？${rewardTaskCount > 0 ? `\n${rewardTaskCount} 个任务中的对应 Boss 伤害奖励会移除。` : ''}`,
    )
    if (!confirmed) return

    await deleteEntity('bosses', boss.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wanted"
        title="悬赏讨伐"
        description="把阶段性难题写成一张悬赏令，用一次次行动把它击破。"
        action={
          <Button icon={<Plus size={16} />} onClick={openNewBoss}>
            张贴悬赏
          </Button>
        }
      />

      {bosses.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="悬赏统计">
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <Swords size={13} className="text-danger" />
            进行中 <b className="font-display text-sm text-ink">{activeCount}</b>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <Trophy size={13} className="text-exp" />
            已讨伐 <b className="font-display text-sm text-ink">{defeatedCount}</b>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <Skull size={13} className="text-faint" />
            悬赏总数 <b className="font-display text-sm text-ink">{bosses.length}</b>
          </span>
        </div>
      ) : null}

      {bosses.length === 0 ? (
        <EmptyState
          icon={<Skull size={22} />}
          title="还没有悬赏"
          description="为重要挑战设置生命值，再用现实行动逐步降低它。"
          action={<Button onClick={openNewBoss}>张贴第一张悬赏令</Button>}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {bosses.map((boss) => {
            const defeated = boss.status === 'defeated' || boss.currentHp === 0
            return (
              <article
                key={boss.id}
                className={cn(
                  'relative flex flex-col rounded-xl border bg-surface p-5 shadow-[0_1px_2px_rgb(44_38_32/0.05),0_10px_28px_rgb(44_38_32/0.07)]',
                  defeated ? 'border-[#c6b898]' : 'border-danger/35',
                )}
              >
                {/* 已讨伐：斜盖朱印 */}
                {defeated ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-4 flex size-16 rotate-12 items-center justify-center rounded-full border-[3px] border-danger/70 font-display text-sm font-bold tracking-widest text-danger/80 shadow-[inset_0_0_0_2px_rgb(189_66_41/0.2)]"
                  >
                    已讨伐
                  </span>
                ) : null}

                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-xl border',
                      defeated
                        ? 'border-line bg-ink/4 text-faint'
                        : 'border-danger/45 bg-danger-soft text-danger',
                    )}
                  >
                    <Skull size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 pr-2">
                      <h2 className="font-display text-lg font-bold text-ink">{boss.name}</h2>
                      <StatusBadge value={boss.status} />
                    </div>
                    <p className="mt-1 text-xs text-faint">
                      {boss.goalId === null
                        ? '未关联目标'
                        : `目标：${goalNames.get(boss.goalId) ?? '未知目标'}`}
                      {' · '}期限：{formatDate(boss.deadline)}
                    </p>
                  </div>
                </div>

                {boss.description ? (
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted">{boss.description}</p>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="mt-4">
                  <ProgressBar
                    value={boss.currentHp}
                    max={boss.maxHp}
                    tone={defeated ? 'exp' : 'danger'}
                    size="lg"
                    label={`HP ${formatNumber(boss.currentHp)} / ${formatNumber(boss.maxHp)}`}
                  />
                </div>

                <BossDamageSpark bossId={boss.id} events={data.events} />

                <div className="mt-4 flex items-center gap-2 border-t border-line/80 pt-4">
                  <Button
                    className="flex-1"
                    variant={defeated ? 'secondary' : 'dangerSolid'}
                    icon={<Swords size={15} />}
                    disabled={defeated}
                    onClick={() => setDamageTarget(boss)}
                  >
                    {defeated ? '已击破' : '记录讨伐'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-9 px-2"
                    aria-label={`编辑 Boss：${boss.name}`}
                    onClick={() => openBoss(boss)}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-9 px-2 text-danger hover:bg-danger-soft hover:text-danger"
                    aria-label={`删除 Boss：${boss.name}`}
                    onClick={() => void handleDelete(boss).catch(() => undefined)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editorOpen ? (
        <BossEditor
          boss={editingBoss}
          goals={data.goals}
          onClose={() => setEditorOpen(false)}
          onSave={(boss) => saveEntity('bosses', boss)}
        />
      ) : null}
      {damageTarget !== null ? (
        <BossDamageEditor
          boss={damageTarget}
          onClose={() => setDamageTarget(null)}
          onDamage={damageBoss}
        />
      ) : null}
    </div>
  )
}
