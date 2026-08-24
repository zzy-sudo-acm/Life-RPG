import {
  CalendarRange,
  Check,
  Circle,
  MapPin,
  Mountain,
  Pencil,
  Trash2,
  Trees,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { TimelineNode } from '../../types/models'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/format'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'

interface JourneyMapProps {
  nodes: TimelineNode[]
  onEdit: (node: TimelineNode) => void
  onDelete: (node: TimelineNode) => void
}

interface FlatNode {
  node: TimelineNode
  depth: number
  parentName: string | null
}

function compareNodes(left: TimelineNode, right: TimelineNode): number {
  return left.order - right.order ||
    (left.startDate ?? '').localeCompare(right.startDate ?? '') ||
    left.title.localeCompare(right.title)
}

function flattenNodes(nodes: TimelineNode[]): FlatNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map<string | null, TimelineNode[]>()

  for (const node of nodes) {
    const parentKey = node.parentId !== null && byId.has(node.parentId)
      ? node.parentId
      : null
    const siblings = children.get(parentKey) ?? []
    siblings.push(node)
    children.set(parentKey, siblings)
  }
  for (const siblings of children.values()) siblings.sort(compareNodes)

  const result: FlatNode[] = []
  const visited = new Set<string>()
  const visit = (node: TimelineNode, depth: number) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    result.push({
      node,
      depth,
      parentName: node.parentId ? byId.get(node.parentId)?.title ?? null : null,
    })
    for (const child of children.get(node.id) ?? []) visit(child, depth + 1)
  }

  for (const root of children.get(null) ?? []) visit(root, 0)
  for (const node of nodes.toSorted(compareNodes)) visit(node, 0)
  return result
}

/* 路径列的布局常量 */
const MARKER_TOP = 26
const MARKER_COL_WIDTH = 72

/** 路径在标记列内蛇形摆动 */
function markerX(index: number): number {
  return 22 + Math.round(12 * Math.sin(index * 1.15))
}

/** 路径点之间用竖切线三次贝塞尔连接，形成平滑的 S 弯 */
function trailPath(points: Array<{ x: number; y: number }>): string {
  const [first, ...rest] = points
  if (!first) return ''
  let path = `M ${first.x} ${first.y - 40}`
  let previous = first
  for (const point of rest) {
    const midY = (previous.y + point.y) / 2
    path += ` C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`
    previous = point
  }
  return path
}

/** 旅程节点标记：已完成=竹青勾，当前=朱红旗帜，未来=空心墨点。 */
function NodeMarker({ status, small }: { status: TimelineNode['status']; small: boolean }) {
  const size = small ? 'size-9' : 'size-11'
  if (status === 'past') {
    return (
      <span className={cn('flex items-center justify-center rounded-full border-2 border-primary/55 bg-primary-soft text-primary-deep shadow-[0_2px_6px_rgb(44_38_32/0.15)]', size)}>
        <Check size={small ? 14 : 17} strokeWidth={3} />
      </span>
    )
  }
  if (status === 'current') {
    return (
      <span className={cn('relative flex items-center justify-center rounded-full border-2 border-danger/60 bg-danger-soft text-danger shadow-[0_2px_6px_rgb(44_38_32/0.15)]', size)}>
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-danger/50"
        />
        <MapPin size={small ? 15 : 18} />
      </span>
    )
  }
  return (
    <span className={cn('flex items-center justify-center rounded-full border-2 border-dashed border-line bg-surface text-faint', size)}>
      <Circle size={small ? 11 : 13} />
    </span>
  )
}

/** 人生地图：一条蜿蜒的手绘虚线小径，人生阶段是小径上的营地。 */
export function JourneyMap({ nodes, onEdit, onDelete }: JourneyMapProps) {
  const rows = flattenNodes(nodes)
  const listRef = useRef<HTMLOListElement>(null)
  const [trail, setTrail] = useState<{ d: string; height: number }>({ d: '', height: 0 })

  // 路径要穿过每个标记的中心，需要真实行高；行数很少，测量开销可忽略
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return undefined

    const measure = () => {
      const items = [...list.children] as HTMLElement[]
      let accumulated = 0
      const points = items.map((item, index) => {
        const y = accumulated + MARKER_TOP
        accumulated += item.offsetHeight
        return { x: markerX(index), y }
      })
      setTrail({ d: trailPath(points), height: accumulated })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [rows.length])

  return (
    <div className="relative">
      {/* 蜿蜒小径 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 top-0"
        width={MARKER_COL_WIDTH}
        height={trail.height}
      >
        <path
          d={trail.d}
          fill="none"
          stroke="#c4b697"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 9"
        />
      </svg>

      {/* 沿途风景点缀 */}
      {trail.height > 300 ? (
        <>
          <Mountain aria-hidden size={18} className="absolute right-[8%] top-[24%] text-line" />
          <Trees aria-hidden size={18} className="absolute right-[16%] top-[62%] text-line" />
        </>
      ) : null}

      <ol ref={listRef} className="relative">
        {rows.map(({ node, depth, parentName }, index) => {
          const current = node.status === 'current'
          const small = depth > 0
          return (
            <li
              key={node.id}
              className={cn('relative pb-5 last:pb-0')}
              style={{ paddingLeft: MARKER_COL_WIDTH + (small ? 14 : 0) }}
            >
              {/* 小径上的营地标记 */}
              <span
                className="absolute"
                style={{
                  left: markerX(index) - (small ? 18 : 22),
                  top: MARKER_TOP - (small ? 18 : 22),
                }}
              >
                <NodeMarker status={node.status} small={small} />
              </span>
              {current ? (
                <span
                  className="absolute whitespace-nowrap rounded bg-danger px-1.5 py-0.5 font-display text-[10px] font-bold text-[#fdf3ee]"
                  style={{
                    left: markerX(index) + 26,
                    top: MARKER_TOP - 26,
                  }}
                >
                  在此修行
                </span>
              ) : null}

              <Panel className={cn('p-4 sm:p-5', current && 'border-danger/45')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-bold text-ink">{node.title}</h2>
                      <StatusBadge value={node.status} />
                      <span className="rounded border border-line bg-ink/4 px-2 py-0.5 text-xs text-muted">
                        {node.stageType || '未分类阶段'}
                      </span>
                    </div>
                    {parentName ? (
                      <p className="mt-2 font-kai text-xs text-primary-deep">承接自：{parentName}</p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {node.description || '暂无描述'}
                    </p>
                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-faint">
                      <CalendarRange size={14} />
                      {formatDate(node.startDate)} — {formatDate(node.endDate)}
                      <span>· 顺序 {node.order}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 self-end sm:self-start">
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2.5 text-xs"
                      icon={<Pencil size={13} />}
                      onClick={() => onEdit(node)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2.5 text-xs text-danger hover:bg-danger-soft hover:text-danger"
                      icon={<Trash2 size={13} />}
                      onClick={() => onDelete(node)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Panel>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
