import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Flag,
  Footprints,
  Leaf,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { EventEditor } from '../components/events/EventEditor'
import {
  calendarDate,
  calendarDay,
  completedTasksByDay,
  displayDay,
} from '../components/growth/growthData'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { useAppStore } from '../store/AppStoreContext'
import type { LifeEvent } from '../types/models'
import { localDateString } from '../utils/format'
import '../components/growth/growth.css'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'manual', label: '人生时刻' },
  { value: 'goal', label: '目标' },
  { value: 'achievement', label: '成就' },
  { value: 'stage', label: '阶段' },
] as const

const EVENT_META = {
  manual: { label: '人生时刻', Icon: Leaf },
  goal: { label: '目标抵达', Icon: Flag },
  achievement: { label: '获得成就', Icon: Award },
  stage: { label: '人生阶段', Icon: BookOpen },
} as const

export function JournalPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
  const [editor, setEditor] = useState<LifeEvent | 'new' | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calendarExpanded, setCalendarExpanded] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const heatmapRef = useRef<HTMLDivElement>(null)
  const loaded = data !== null
  useEffect(() => {
    const heatmap = heatmapRef.current
    if (heatmap) heatmap.scrollLeft = heatmap.scrollWidth
  }, [loaded, calendarExpanded])
  if (!data) return null

  const today = localDateString()
  const start = calendarDate(today)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 77)
  const weeks = Array.from({ length: 12 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = new Date(start)
      day.setDate(start.getDate() + week * 7 + weekday)
      return localDateString(day)
    }),
  )
  const tasksByDay = completedTasksByDay(data.tasks)
  const recentDays = weeks.flat().filter((day) => day <= today)
  const actionDays = recentDays.filter((day) => tasksByDay.has(day)).length
  const actionCount = recentDays.reduce(
    (count, day) => count + (tasksByDay.get(day)?.length ?? 0),
    0,
  )
  const events = data.events
    .filter(
      (event) =>
        (filter === 'all' || event.sourceType === filter) &&
        (selectedDay === null || calendarDay(event.date) === selectedDay),
    )
    .toSorted(
      (left, right) =>
        calendarDay(right.date).localeCompare(calendarDay(left.date)) ||
        right.createdAt.localeCompare(left.createdAt),
    )
  const selectedTasks = selectedDay ? (tasksByDay.get(selectedDay) ?? []) : []

  async function removeEvent(event: LifeEvent) {
    if (!window.confirm(`确定删除“${event.title}”吗？这条记录将被移除。`))
      return
    setDeleting(event.id)
    setError(null)
    try {
      await deleteEntity('events', event.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败，请重试。')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="growth-page">
      <header className="growth-page-heading">
        <div>
          <h1>成长足迹</h1>
          <p className="growth-subtitle">每一小步，都有迹可循。</p>
        </div>
        <Button icon={<Plus size={17} />} onClick={() => setEditor('new')}>
          记录时刻
        </Button>
      </header>

      <Panel className="growth-activity-panel">
        <div className="growth-section-heading">
          <div>
            <h2>
              <Leaf size={19} /> 成长的纹理
            </h2>
            <p>过去 12 周，那些为自己行动的日子。</p>
          </div>
          <span className="growth-period">近 12 周</span>
        </div>
        <div className="growth-activity-stats">
          <div>
            <strong>
              {actionDays}
              <span>天</span>
            </strong>
            <span>为自己行动</span>
          </div>
          <div>
            <strong>
              {actionCount}
              <span>件</span>
            </strong>
            <span>完成的小事</span>
          </div>
          <div>
            <strong>
              {data.events.length}
              <span>个</span>
            </strong>
            <span>留下的时刻</span>
          </div>
        </div>
        <div className="growth-mobile-week">
          <div className="growth-week-header">
            <span>这一周的小脚印</span>
            <button
              type="button"
              aria-expanded={calendarExpanded}
              onClick={() => setCalendarExpanded(!calendarExpanded)}
            >
              {calendarExpanded ? '收起日历' : '查看 12 周'}
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="growth-week-strip">
            {weeks[11]?.map((day, index) => {
              const count = tasksByDay.get(day)?.length ?? 0
              return (
                <button
                  type="button"
                  key={day}
                  disabled={day > today}
                  aria-pressed={selectedDay === day}
                  aria-label={`${displayDay(day)}，完成 ${count} 个行动`}
                  className={`${count ? 'has-actions' : ''} ${selectedDay === day ? 'is-selected' : ''}`}
                  onClick={() =>
                    setSelectedDay((previous) =>
                      previous === day ? null : day,
                    )
                  }
                >
                  <span>
                    {['一', '二', '三', '四', '五', '六', '日'][index]}
                  </span>
                  <strong>{count ? <Check size={17} /> : day.slice(-2)}</strong>
                </button>
              )
            })}
          </div>
        </div>
        {calendarExpanded ? (
          <p className="growth-scroll-hint">
            左右滑动查看 · 点击一天回顾 <ChevronRight size={13} />
          </p>
        ) : null}
        <div
          ref={heatmapRef}
          className={`growth-heatmap-scroll${calendarExpanded ? ' is-expanded' : ''}`}
          tabIndex={0}
          aria-label="过去 12 周行动日历，可左右滑动"
        >
          <div className="growth-heatmap">
            <div className="growth-weekday-labels">
              <span />
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
              <span>日</span>
            </div>
            {weeks.map((week) => (
              <div className="growth-heatmap-week" key={week[0]}>
                <span className="growth-month-label">
                  {week[0]?.slice(5).replace('-', '/')}
                </span>
                {week.map((day) => {
                  const count = tasksByDay.get(day)?.length ?? 0
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`growth-day growth-day-${Math.min(count, 4)}${selectedDay === day ? ' is-selected' : ''}${day > today ? ' is-future' : ''}`}
                      disabled={day > today}
                      aria-pressed={selectedDay === day}
                      aria-label={`${displayDay(day)}，完成 ${count} 个行动`}
                      title={`${displayDay(day)} · ${count} 个行动`}
                      onClick={() =>
                        setSelectedDay((previous) =>
                          previous === day ? null : day,
                        )
                      }
                    >
                      <span />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="growth-heatmap-footer">
          <span>小小的坚持，慢慢长成一片绿。</span>
          <span className="growth-heatmap-legend">
            少{' '}
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} className={`growth-level-${level}`} />
            ))}{' '}
            多
          </span>
        </div>
        {selectedDay ? (
          <div className="growth-day-detail">
            <div className="growth-day-detail-heading">
              <strong>{displayDay(selectedDay)}</strong>
              <button
                type="button"
                className="growth-icon-button"
                aria-label="取消日期筛选"
                onClick={() => setSelectedDay(null)}
              >
                <X size={17} />
              </button>
            </div>
            {selectedTasks.length > 0 ? (
              <ul>
                {selectedTasks.map((task) => (
                  <li key={task.id}>
                    <Check size={15} />
                    {task.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>这一天还没有已完成的行动记录。</p>
            )}
          </div>
        ) : null}
      </Panel>

      <section aria-labelledby="journal-timeline-heading">
        <div className="growth-section-heading growth-timeline-heading">
          <div>
            <h2 id="journal-timeline-heading">
              <Footprints size={20} /> 值得记住的时刻
            </h2>
            <p>
              {selectedDay
                ? `${displayDay(selectedDay)}的记录`
                : '生活不只有完成，还有经历与感受。'}
            </p>
          </div>
          <span className="growth-count">{events.length} 条记录</span>
        </div>
        <div className="growth-filter-scroll">
          <div className="growth-filter-tabs" aria-label="足迹类型筛选">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                className={filter === item.value ? 'is-active' : ''}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {error ? (
          <p role="alert" className="growth-error">
            {error}
          </p>
        ) : null}
        {events.length > 0 ? (
          <ol className="growth-timeline">
            {events.map((event, index) => {
              const daily =
                event.sourceType === 'manual' &&
                event.title.startsWith('每日一记 · ')
              const { Icon, label } = EVENT_META[event.sourceType]
              const currentDay = calendarDay(event.date)
              const previous = events[index - 1]
              const showDate =
                !previous || calendarDay(previous.date) !== currentDay
              return (
                <li className="growth-timeline-entry" key={event.id}>
                  {showDate ? (
                    <time
                      className="growth-timeline-date"
                      dateTime={currentDay}
                    >
                      {displayDay(currentDay)}
                    </time>
                  ) : null}
                  <div className="growth-timeline-row">
                    <span
                      className={`growth-timeline-icon growth-event-${event.sourceType}`}
                    >
                      <Icon size={18} />
                    </span>
                    <Panel className="growth-event-card">
                      <div className="growth-event-topline">
                        <span className="growth-event-kind">
                          {daily ? '每日一记' : label}
                        </span>
                        {event.sourceType === 'manual' ? (
                          <div className="growth-event-actions">
                            <button
                              className="growth-icon-button"
                              type="button"
                              aria-label={`编辑记录：${event.title}`}
                              onClick={() => setEditor(event)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="growth-icon-button growth-delete-button"
                              type="button"
                              disabled={deleting === event.id}
                              aria-label={`删除记录：${event.title}`}
                              onClick={() => void removeEvent(event)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <Sparkles size={14} className="growth-auto-icon" />
                        )}
                      </div>
                      <h3>{daily ? '今天，也有值得记下的事' : event.title}</h3>
                      {event.description ? (
                        <p
                          className={daily ? 'growth-journal-text' : undefined}
                        >
                          {event.description}
                        </p>
                      ) : null}
                    </Panel>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <Panel className="growth-empty">
            <span className="growth-empty-icon">
              <Leaf size={29} />
            </span>
            <h3>
              {selectedDay
                ? '这一天，还没有留下时刻'
                : filter === 'all'
                  ? '故事，从这一刻开始'
                  : '这一页，等待新的故事'}
            </h3>
            <p>
              {filter === 'all' || filter === 'manual'
                ? '记下一个小小的突破，或平凡日子里的感受。'
                : '完成目标、解锁成就后，重要节点会自动留在这里。'}
            </p>
            <Button
              variant="secondary"
              icon={<Plus size={15} />}
              onClick={() => setEditor('new')}
            >
              记录一个时刻
            </Button>
            {selectedDay ? (
              <Button variant="ghost" onClick={() => setSelectedDay(null)}>
                查看全部日期
              </Button>
            ) : null}
          </Panel>
        )}
      </section>
      {editor !== null ? (
        <EventEditor
          event={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSave={(event) => saveEntity('events', event)}
        />
      ) : null}
    </div>
  )
}
