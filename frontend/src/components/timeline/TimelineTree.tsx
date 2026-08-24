import { CalendarRange, Check, Circle, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { TimelineNode } from '../../types/models'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/format'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'

interface TimelineTreeProps {
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

/** 旅程节点标记：已完成=竹青勾，当前=朱红旗帜，未来=空心墨点。 */
function NodeMarker({ status }: { status: TimelineNode['status'] }) {
  if (status === 'past') {
    return (
      <span className="flex size-9 items-center justify-center rounded-full border border-primary/50 bg-primary-soft text-primary-deep">
        <Check size={16} strokeWidth={3} />
      </span>
    )
  }
  if (status === 'current') {
    return (
      <span className="relative flex size-9 items-center justify-center rounded-full border border-danger/55 bg-danger-soft text-danger">
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse-ring rounded-full border border-danger/50"
        />
        <MapPin size={16} />
      </span>
    )
  }
  return (
    <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-faint">
      <Circle size={13} />
    </span>
  )
}

export function TimelineTree({ nodes, onEdit, onDelete }: TimelineTreeProps) {
  const flatNodes = flattenNodes(nodes)

  return (
    <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-line before:to-line/50">
      {flatNodes.map(({ node, depth, parentName }) => (
        <li
          key={node.id}
          className="relative"
          style={{ paddingLeft: `${44 + Math.min(depth, 4) * 18}px` }}
        >
          {/* 深度缩进时保持主路上的标记对齐 */}
          <span className="absolute left-0 top-4" style={{ left: `${Math.min(depth, 4) * 18}px` }}>
            <NodeMarker status={node.status} />
          </span>

          <Panel
            className={cn(
              'p-4 sm:p-5',
              node.status === 'current' && 'border-danger/45',
            )}
          >
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
      ))}
    </ol>
  )
}
