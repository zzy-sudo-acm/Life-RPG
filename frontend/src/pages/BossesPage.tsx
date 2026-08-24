import { Pencil, Plus, Swords, Trash2 } from 'lucide-react'
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
        title="Boss 挑战"
        description="将阶段性难题量化为 HP，通过完成任务或手动记录挑战逐步击破。"
        action={
          <Button icon={<Plus size={16} />} onClick={openNewBoss}>
            新建 Boss
          </Button>
        }
      />

      {bosses.length === 0 ? (
        <EmptyState
          title="暂时没有 Boss"
          description="为重要挑战设置生命值，再用现实行动逐步降低它。"
          action={<Button onClick={openNewBoss}>创建第一个 Boss</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {bosses.map((boss) => {
            const dealtDamage = boss.maxHp - boss.currentHp
            return (
              <Panel key={boss.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">{boss.name}</h2>
                      <StatusBadge value={boss.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {boss.goalId === null
                        ? '未关联目标'
                        : `目标：${goalNames.get(boss.goalId) ?? '未知目标'}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      className="px-2"
                      aria-label={`编辑 Boss：${boss.name}`}
                      onClick={() => openBoss(boss)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 text-danger"
                      aria-label={`删除 Boss：${boss.name}`}
                      onClick={() => void handleDelete(boss).catch(() => undefined)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                {boss.description ? (
                  <p className="mt-4 flex-1 text-sm text-muted">{boss.description}</p>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="mt-5">
                  <ProgressBar
                    value={dealtDamage}
                    max={boss.maxHp}
                    tone={boss.currentHp === 0 ? 'primary' : 'danger'}
                    label={`剩余 HP ${formatNumber(boss.currentHp)} / ${formatNumber(boss.maxHp)}`}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-xs text-muted">截止：{formatDate(boss.deadline)}</p>
                  <Button
                    icon={<Swords size={15} />}
                    disabled={boss.currentHp === 0 || boss.status === 'defeated'}
                    onClick={() => setDamageTarget(boss)}
                  >
                    记录伤害
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
