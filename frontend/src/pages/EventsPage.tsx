import { CheckCircle2, PenLine, Plus, ScrollText, Swords, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { EventEditor } from '../components/events/EventEditor'
import { RewardSummary } from '../components/events/RewardSummary'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useAppStore } from '../store/AppStoreContext'
import type { LifeEvent } from '../types/models'
import { formatDate } from '../utils/format'

const SOURCE_META: Record<
  LifeEvent['sourceType'],
  { label: string; icon: typeof PenLine; color: string }
> = {
  manual: { label: '手动记录', icon: PenLine, color: '#6f6455' },
  task: { label: '任务达成', icon: CheckCircle2, color: '#4a7a5e' },
  achievement: { label: '成就解锁', icon: Trophy, color: '#a97c1f' },
  boss: { label: 'Boss 讨伐', icon: Swords, color: '#bd4229' },
}

export function EventsPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [editor, setEditor] = useState<LifeEvent | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const sortedEvents = data.events.toSorted((left, right) =>
    right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt),
  )

  const handleDelete = (lifeEvent: LifeEvent) => {
    const sourceWarning = lifeEvent.sourceType === 'manual'
      ? ''
      : '这是系统自动生成的历史记录。'
    if (!window.confirm(`${sourceWarning}确定删除“${lifeEvent.title}”吗？`)) return

    setError(null)
    void deleteEntity('events', lifeEvent.id).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : '删除事件失败')
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adventure Log"
        title="人生日志"
        description="每一次成长都值得留痕；任务、成就和 Boss 结算会自动写入日志。"
        action={
          <Button icon={<Plus size={16} />} onClick={() => setEditor('new')}>
            记录事件
          </Button>
        }
      />

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

      {sortedEvents.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={22} />}
          title="还没有人生事件"
          description="完成项目、比赛获奖或一个学习阶段，都值得留下记录。"
          action={<Button onClick={() => setEditor('new')}>记录第一条事件</Button>}
        />
      ) : (
        <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-gradient-to-b before:from-primary/50 before:via-line before:to-transparent">
          {sortedEvents.map((lifeEvent) => {
            const meta = SOURCE_META[lifeEvent.sourceType]
            const SourceIcon = meta.icon
            return (
              <li key={lifeEvent.id} className="relative pl-11 sm:pl-14">
                {/* 时间线节点 */}
                <span
                  className="absolute left-0 top-4 flex size-8 items-center justify-center rounded-full border bg-surface"
                  style={{
                    borderColor: `${meta.color}55`,
                    boxShadow: `0 0 12px ${meta.color}33`,
                  }}
                >
                  <SourceIcon size={14} style={{ color: meta.color }} />
                </span>

                <Panel className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <time className="rounded-md border border-line bg-canvas/60 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
                          {formatDate(lifeEvent.date)}
                        </time>
                        <span
                          className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            borderColor: `${meta.color}44`,
                            backgroundColor: `${meta.color}12`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <h2 className="mt-2 font-semibold text-ink">{lifeEvent.title}</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {lifeEvent.description || '暂无描述'}
                      </p>
                      <div className="mt-3">
                        <RewardSummary rewards={lifeEvent.rewards} skills={data.skills} bosses={data.bosses} />
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 self-end sm:self-start">
                      <Button
                        variant="ghost"
                        className="min-h-9 px-2"
                        aria-label={`编辑事件：${lifeEvent.title}`}
                        onClick={() => setEditor(lifeEvent)}
                      >
                        <PenLine size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-9 px-2 text-danger hover:bg-danger-soft hover:text-danger"
                        aria-label={`删除事件：${lifeEvent.title}`}
                        onClick={() => handleDelete(lifeEvent)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </Panel>
              </li>
            )
          })}
        </ol>
      )}

      {editor !== null ? (
        <EventEditor
          lifeEvent={editor === 'new' ? null : editor}
          skills={data.skills}
          bosses={data.bosses}
          onClose={() => setEditor(null)}
          onSave={(lifeEvent) => saveEntity('events', lifeEvent)}
        />
      ) : null}
    </div>
  )
}
