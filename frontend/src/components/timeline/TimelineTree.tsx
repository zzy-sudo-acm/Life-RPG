import { CalendarRange, Pencil, Trash2 } from 'lucide-react'
import type { TimelineNode } from '../../types/models'
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

export function TimelineTree({ nodes, onEdit, onDelete }: TimelineTreeProps) {
  const flatNodes = flattenNodes(nodes)

  return (
    <ol className="space-y-3">
      {flatNodes.map(({ node, depth, parentName }) => (
        <li key={node.id} style={{ marginLeft: `${Math.min(depth, 4) * 20}px` }}>
          <Panel className={`relative p-4 sm:p-5 ${depth > 0 ? 'border-l-4 border-l-primary/35' : ''}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-ink">{node.title}</h2>
                  <StatusBadge value={node.status} />
                  <span className="rounded-md bg-[#f0f2f0] px-2 py-1 text-xs text-muted">
                    {node.stageType || '未分类阶段'}
                  </span>
                </div>
                {parentName ? (
                  <p className="mt-2 text-xs font-medium text-primary">承接自：{parentName}</p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                  {node.description || '暂无描述'}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <CalendarRange size={14} />
                  {formatDate(node.startDate)} — {formatDate(node.endDate)}
                  <span>· 顺序 {node.order}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-2 self-end sm:self-start">
                <Button variant="ghost" icon={<Pencil size={15} />} onClick={() => onEdit(node)}>
                  编辑
                </Button>
                <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => onDelete(node)}>
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
