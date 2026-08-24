import { Pencil, Plus, Skull, Swords, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { BossDamageEditor } from '../components/bosses/BossDamageEditor'
import { BossEditor } from '../components/bosses/BossEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
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
        eyebrow="Boss Battle"
        title="Boss 挑战"
        description="把阶段性难题量化为 HP，通过完成任务或手动记录挑战逐步击破。"
        action={
          <Button icon={<Plus size={16} />} onClick={openNewBoss}>
            新建 Boss
          </Button>
        }
      />

      {bosses.length === 0 ? (
        <EmptyState
          icon={<Skull size={22} />}
          title="暂时没有 Boss"
          description="为重要挑战设置生命值，再用现实行动逐步降低它。"
          action={<Button onClick={openNewBoss}>创建第一个 Boss</Button>}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {bosses.map((boss) => {
            const defeated = boss.status === 'defeated' || boss.currentHp === 0
            return (
              <Panel
                key={boss.id}
                className={cn(
                  'relative flex flex-col overflow-hidden p-5',
                  defeated ? 'border-exp/35' : 'border-danger/25',
                )}
              >
                {/* 氛围光：未击败为暗红，已击败为金色 */}
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute -top-16 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full blur-3xl',
                    defeated ? 'bg-exp/15' : 'bg-danger/15',
                  )}
                />
                {defeated ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-4 flex rotate-12 items-center gap-1 rounded-lg border-2 border-exp/60 px-2 py-1 text-xs font-black tracking-widest text-exp/90"
                  >
                    <Trophy size={12} /> 已讨伐
                  </span>
                ) : null}

                <div className="relative flex items-start gap-3">
                  <span
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-2xl border',
                      defeated
                        ? 'border-exp/40 bg-exp-soft text-exp'
                        : 'border-danger/40 bg-danger-soft text-danger',
                    )}
                  >
                    <Skull size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">{boss.name}</h2>
                      <StatusBadge value={boss.status} />
                    </div>
                    <p className="mt-1 text-xs text-faint">
                      {boss.goalId === null
                        ? '未关联目标'
                        : `目标：${goalNames.get(boss.goalId) ?? '未知目标'}`}
                      {' · '}截止：{formatDate(boss.deadline)}
                    </p>
                  </div>
                </div>

                {boss.description ? (
                  <p className="relative mt-3 flex-1 text-sm leading-6 text-muted">{boss.description}</p>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="relative mt-4">
                  <ProgressBar
                    value={boss.currentHp}
                    max={boss.maxHp}
                    tone={defeated ? 'exp' : 'danger'}
                    size="lg"
                    label={`HP ${formatNumber(boss.currentHp)} / ${formatNumber(boss.maxHp)}`}
                  />
                </div>

                <div className="relative mt-4 flex items-center gap-2 border-t border-line/60 pt-4">
                  <Button
                    className="flex-1"
                    variant={defeated ? 'secondary' : 'dangerSolid'}
                    icon={<Swords size={15} />}
                    disabled={defeated}
                    onClick={() => setDamageTarget(boss)}
                  >
                    {defeated ? '已击破' : '记录伤害'}
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
              </Panel>
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
