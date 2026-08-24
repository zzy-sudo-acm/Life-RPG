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
import { formatNumber } from '../utils/format'

const SOURCE_META: Record<
  LifeEvent['sourceType'],
  { label: string; icon: typeof PenLine; color: string }
> = {
  manual: { label: '手动记录', icon: PenLine, color: '#6f6455' },
  task: { label: '任务达成', icon: CheckCircle2, color: '#4a7a5e' },
  achievement: { label: '成就解锁', icon: Trophy, color: '#a97c1f' },
  boss: { label: 'Boss 讨伐', icon: Swords, color: '#bd4229' },
}

/** 日记式的日期邮票：大号日期 + 小年月 */
function DateStamp({ date }: { date: string }) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-line bg-raised/60 text-xs text-faint">
        未定
      </span>
    )
  }
  return (
    <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-raised/60">
      <b className="font-display text-lg font-bold leading-none tabular-nums text-ink">
        {parsed.getDate()}
      </b>
      <span className="mt-1 text-[9px] leading-none tabular-nums text-faint">
        {parsed.getFullYear()}/{String(parsed.getMonth() + 1).padStart(2, '0')}
      </span>
    </span>
  )
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  return `${year}年${month}月`
}

interface MonthGroup {
  monthKey: string
  events: LifeEvent[]
  exp: number
}

export function EventsPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [editor, setEditor] = useState<LifeEvent | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const sortedEvents = data.events.toSorted((left, right) =>
    right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt),
  )

  // 按月份分篇
  const monthGroups: MonthGroup[] = []
  for (const lifeEvent of sortedEvents) {
    const monthKey = lifeEvent.date.slice(0, 7)
    const group = monthGroups[monthGroups.length - 1]
    if (group && group.monthKey === monthKey) {
      group.events.push(lifeEvent)
      group.exp += lifeEvent.rewards.exp
    } else {
      monthGroups.push({ monthKey, events: [lifeEvent], exp: lifeEvent.rewards.exp })
    }
  }

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

      {error ? <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

      {sortedEvents.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={22} />}
          title="还没有人生事件"
          description="完成项目、比赛获奖或一个学习阶段，都值得留下记录。"
          action={<Button onClick={() => setEditor('new')}>记录第一条事件</Button>}
        />
      ) : (
        <div className="space-y-6">
          {monthGroups.map((group) => (
            <section key={group.monthKey} aria-label={monthLabel(group.monthKey)}>
              {/* 月份篇章分隔 */}
              <div className="flex items-center gap-3 pb-4">
                <span aria-hidden className="h-px flex-1 border-t border-dashed border-line" />
                <h2 className="font-display text-sm font-bold tracking-wide text-muted">
                  {monthLabel(group.monthKey)}
                </h2>
                <span className="font-kai text-[11px] text-faint">
                  {group.events.length} 篇 · 修为 +{formatNumber(group.exp)}
                </span>
                <span aria-hidden className="h-px flex-1 border-t border-dashed border-line" />
              </div>

              <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[5px] before:top-2 before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-line before:to-transparent">
                {group.events.map((lifeEvent) => {
                  const meta = SOURCE_META[lifeEvent.sourceType]
                  const SourceIcon = meta.icon
                  return (
                    <li key={lifeEvent.id} className="relative pl-6">
                      {/* 时间线节点：颜色区分来源 */}
                      <span
                        aria-hidden
                        className="absolute left-0 top-6 size-[11px] rounded-full border-2 border-surface"
                        style={{ backgroundColor: meta.color }}
                      />

                      <Panel className="p-4 sm:p-5">
                        <div className="flex gap-3.5">
                          <DateStamp date={lifeEvent.date} />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display font-bold text-ink">{lifeEvent.title}</h3>
                              <span
                                className="flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                  borderColor: `${meta.color}44`,
                                  backgroundColor: `${meta.color}12`,
                                  color: meta.color,
                                }}
                              >
                                <SourceIcon size={11} />
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                              {lifeEvent.description || '暂无描述'}
                            </p>
                            <div className="mt-3">
                              <RewardSummary rewards={lifeEvent.rewards} skills={data.skills} bosses={data.bosses} />
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col gap-1">
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
            </section>
          ))}
        </div>
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
