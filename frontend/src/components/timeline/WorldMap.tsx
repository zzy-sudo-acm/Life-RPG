import { CalendarRange, Check, Flag, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { TimelineNode, TimelineStatus } from '../../types/models'
import { formatDate } from '../../utils/format'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'

/* ================= 路径几何 ================= */

interface Point {
  x: number
  y: number
}

const VIEW_WIDTH = 400
const VIEW_HEIGHT = 640

/** 小径锚点：从下方海岸的故乡，蜿蜒走向上方远疆群山 */
const TRAIL_ANCHORS: Point[] = [
  { x: 92, y: 548 },
  { x: 184, y: 508 },
  { x: 252, y: 448 },
  { x: 172, y: 388 },
  { x: 100, y: 330 },
  { x: 150, y: 268 },
  { x: 240, y: 222 },
  { x: 206, y: 150 },
  { x: 152, y: 94 },
]

function catmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      (2 * p1.x +
        (p2.x - p0.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (p2.y - p0.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
  }
}

/** 在样条曲线上均匀采样，供弧长定位使用 */
function sampleTrail(anchors: Point[], samples = 240): Point[] {
  const result: Point[] = []
  for (let s = 0; s <= samples; s += 1) {
    const t = (s / samples) * (anchors.length - 1)
    const i = Math.min(anchors.length - 2, Math.floor(t))
    const u = t - i
    const p0 = anchors[Math.max(0, i - 1)] ?? anchors[0]
    const p1 = anchors[i] ?? anchors[0]
    const p2 = anchors[i + 1] ?? p1
    const p3 = anchors[Math.min(anchors.length - 1, i + 2)] ?? p2
    if (p0 && p1 && p2 && p3) result.push(catmullRomPoint(p0, p1, p2, p3, u))
  }
  return result
}

function catmullRomPath(anchors: Point[]): string {
  const first = anchors[0]
  if (!first || anchors.length < 2) return ''
  let d = `M ${first.x} ${first.y}`
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const p0 = anchors[Math.max(0, i - 1)] ?? first
    const p1 = anchors[i] ?? first
    const p2 = anchors[i + 1] ?? p1
    const p3 = anchors[Math.min(anchors.length - 1, i + 2)] ?? p2
    if (!p0 || !p1 || !p2 || !p3) continue
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`
  }
  return d
}

/** 按弧长比例（0=起点，1=远疆）在小径上取点 */
function pointAtFraction(samples: Point[], fraction: number): Point {
  const fallback = samples[0] ?? { x: 0, y: 0 }
  const lengths: number[] = [0]
  let total = 0
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1]
    const curr = samples[i]
    if (!prev || !curr) continue
    total += Math.hypot(curr.x - prev.x, curr.y - prev.y)
    lengths.push(total)
  }
  const target = total * Math.min(1, Math.max(0, fraction))
  for (let i = 1; i < samples.length; i += 1) {
    const segStart = lengths[i - 1] ?? 0
    const segEnd = lengths[i] ?? 0
    if (segEnd >= target) {
      const prev = samples[i - 1]
      const curr = samples[i]
      if (!prev || !curr) return fallback
      const span = segEnd - segStart
      const u = span === 0 ? 0 : (target - segStart) / span
      return { x: prev.x + (curr.x - prev.x) * u, y: prev.y + (curr.y - prev.y) * u }
    }
  }
  return samples[samples.length - 1] ?? fallback
}

/* ================= 节点排序（沿用父子承接关系） ================= */

interface FlatNode {
  node: TimelineNode
  parentName: string | null
}

function compareNodes(left: TimelineNode, right: TimelineNode): number {
  return (
    left.order - right.order ||
    (left.startDate ?? '').localeCompare(right.startDate ?? '') ||
    left.title.localeCompare(right.title)
  )
}

function flattenNodes(nodes: TimelineNode[]): FlatNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map<string | null, TimelineNode[]>()

  for (const node of nodes) {
    const parentKey = node.parentId !== null && byId.has(node.parentId) ? node.parentId : null
    const siblings = children.get(parentKey) ?? []
    siblings.push(node)
    children.set(parentKey, siblings)
  }
  for (const siblings of children.values()) siblings.sort(compareNodes)

  const result: FlatNode[] = []
  const visited = new Set<string>()
  const visit = (node: TimelineNode) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    result.push({
      node,
      parentName: node.parentId ? byId.get(node.parentId)?.title ?? null : null,
    })
    for (const child of children.get(node.id) ?? []) visit(child)
  }

  for (const root of children.get(null) ?? []) visit(root)
  for (const node of nodes.toSorted(compareNodes)) visit(node)
  return result
}

/* ================= 地图风物 ================= */

const INK = '#2c2620'
const FAINT = '#9a8d7a'
const PAPER = '#fbf7ee'
const SEA = '#7b95ad'

function Mountain({ x, y, s, tone = INK }: { x: number; y: number; s: number; tone?: string }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      stroke={tone}
      fill="none"
      strokeWidth="2"
      strokeLinejoin="round"
      opacity="0.75"
    >
      <path d="M -26 0 L 0 -34 L 26 0 Z" />
      <path d="M -8 -17 L 0 -9 L 8 -17" strokeWidth="1.3" />
    </g>
  )
}

function Pine({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={INK} opacity="0.7">
      <path d="M 0 -17 L 6 -7 L -6 -7 Z" />
      <path d="M 0 -11 L 7.5 0 L -7.5 0 Z" />
      <rect x="-1.2" y="0" width="2.4" height="6" />
    </g>
  )
}

function Cloud({ x, y, s, opacity = 1 }: { x: number; y: number; s: number; opacity?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M -18 4 A 8 8 0 0 1 -10 -8 A 10 10 0 0 1 8 -9 A 8 8 0 0 1 17 3 Q 17 8 12 8 L -12 8 Q -18 8 -18 4 Z"
      fill={PAPER}
      stroke="#cfc3a7"
      strokeWidth="1.4"
      opacity={opacity}
    />
  )
}

function waves(y: number, fromX: number, toX: number, step = 26): string {
  let d = `M ${fromX} ${y}`
  for (let x = fromX; x < toX; x += step) {
    d += ` q ${step / 4} -6, ${step / 2} 0 t ${step / 2} 0`
  }
  return d
}

/** 静态风物层：山海、林木、舟楫、罗盘，全部手绘墨线 */
function Scenery() {
  return (
    <g aria-hidden>
      {/* 群山脉络：远疆在地图上方 */}
      <Mountain x={56} y={112} s={0.95} />
      <Mountain x={90} y={98} s={1.25} />
      <Mountain x={122} y={114} s={0.85} />
      <Mountain x={282} y={92} s={1.1} />
      <Mountain x={316} y={106} s={0.85} />
      <Mountain x={352} y={185} s={0.7} tone={FAINT} />

      {/* 云雾：山顶与未来都笼在雾里 */}
      <Cloud x={120} y={58} s={0.7} opacity={0.9} />
      <Cloud x={188} y={62} s={0.85} opacity={0.95} />
      <Cloud x={252} y={72} s={1.05} opacity={0.95} />
      <Cloud x={322} y={268} s={0.85} opacity={0.8} />

      {/* 红日 */}
      <circle cx={52} cy={66} r={10} fill="#bd4229" opacity="0.85" />
      <circle cx={52} cy={66} r={15} fill="none" stroke="#bd4229" strokeWidth="1" strokeDasharray="1 5" opacity="0.6" />

      {/* 罗盘 */}
      <g transform="translate(348 54)">
        <circle r={15} fill={PAPER} stroke={INK} strokeWidth="1.2" opacity="0.95" />
        <path d="M 0 -11 L 2.8 0 L 0 11 L -2.8 0 Z" fill={INK} />
        <path d="M -11 0 L 0 2.4 L 11 0 L 0 -2.4 Z" fill={FAINT} />
        <text y={-21} textAnchor="middle" fontSize="10" fill={INK} className="font-kai">
          北
        </text>
      </g>

      {/* 河流：自远疆山麓入海 */}
      <path
        d="M 252 138 C 290 195, 302 252, 274 312 C 250 368, 308 428, 294 488 C 284 528, 300 566, 294 610"
        fill="none"
        stroke={SEA}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M 252 138 C 290 195, 302 252, 274 312 C 250 368, 308 428, 294 488 C 284 528, 300 566, 294 610"
        fill="none"
        stroke={SEA}
        strokeWidth="1.2"
        strokeDasharray="7 12"
        opacity="0.45"
      />

      {/* 林木 */}
      <Pine x={36} y={425} s={1} />
      <Pine x={56} y={438} s={0.85} />
      <Pine x={74} y={420} s={1.1} />
      <Pine x={332} y={442} s={0.95} />
      <Pine x={354} y={428} s={0.8} />
      <Pine x={48} y={255} s={0.9} />
      <Pine x={66} y={268} s={0.75} />

      {/* 飞鸟 */}
      <path d="M 188 205 q 4 -5 8 0 q 4 -5 8 0" fill="none" stroke={FAINT} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 78 190 q 3.5 -4.5 7 0 q 3.5 -4.5 7 0" fill="none" stroke={FAINT} strokeWidth="1.3" strokeLinecap="round" />

      {/* 大海与波浪 */}
      <path d={waves(594, 24, 376)} fill="none" stroke={SEA} strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
      <path d={waves(610, 36, 364, 30)} fill="none" stroke={SEA} strokeWidth="1.4" opacity="0.35" strokeLinecap="round" />

      {/* 小舟 */}
      <g transform="translate(318 586)" stroke={INK} strokeWidth="1.5" opacity="0.8">
        <path d="M -14 0 L 14 0 L 8 7 L -8 7 Z" fill={INK} stroke="none" />
        <line x1="0" y1="0" x2="0" y2="-17" />
        <path d="M 1.5 -16 L 1.5 -3 L 12 -3 Z" fill={PAPER} />
      </g>

      {/* 海中异兽与旁注 */}
      <path
        d="M 140 614 q 6 -10 12 0 q 6 10 12 0"
        fill="none"
        stroke={FAINT}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx={166} cy={610} r={1.8} fill={FAINT} />
      <text
        x={176}
        y={608}
        fontSize="9"
        fill={FAINT}
        className="font-kai"
        transform="rotate(-4 176 608)"
      >
        此处有龙
      </text>
    </g>
  )
}

/* ================= 阶段地标 ================= */

const STATUS_LABEL: Record<TimelineStatus, string> = {
  past: '已走过',
  current: '在此修行',
  future: '未至之境',
}

const STAGE_TYPE_LABEL: Record<string, string> = {
  education: '求学',
  research: '研究',
  career: '事业',
}

/** 地标造型：按阶段类型绘制不同建筑 */
function LandmarkGlyph({ stageType, color }: { stageType: string; color: string }) {
  switch (stageType) {
    case 'education':
      return (
        <g stroke={color} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M -13 -1 L 0 -13 L 13 -1 Z" fill={color} stroke="none" />
          <rect x="-9" y="-1" width="18" height="13" fill={PAPER} />
          <rect x="-3" y="5" width="6" height="7" fill={color} stroke="none" />
          <line x1="0" y1="-13" x2="0" y2="-19" />
          <path d="M 0 -19 L 8 -16.5 L 0 -14 Z" fill="#bd4229" stroke="none" />
        </g>
      )
    case 'research':
      return (
        <g stroke={color} strokeWidth="1.6" strokeLinejoin="round">
          <rect x="-6.5" y="-6" width="13" height="18" fill={PAPER} />
          <path d="M -8.5 -6 A 8.5 8.5 0 0 1 8.5 -6 Z" fill={color} stroke="none" />
          <path
            d="M 0 -25 L 1.8 -19.6 L 7.5 -19.6 L 2.9 -16.2 L 4.6 -10.8 L 0 -14.2 L -4.6 -10.8 L -2.9 -16.2 L -7.5 -19.6 L -1.8 -19.6 Z"
            fill="#a97c1f"
            stroke="none"
          />
          <rect x="-2.5" y="4" width="5" height="8" fill={color} stroke="none" />
        </g>
      )
    case 'career':
      return (
        <g stroke={color} strokeWidth="1.6" strokeLinejoin="round">
          <rect x="-12" y="-3" width="24" height="15" fill={PAPER} />
          <rect x="-12" y="-9" width="6" height="6" fill={color} stroke="none" />
          <rect x="-3" y="-9" width="6" height="6" fill={color} stroke="none" />
          <rect x="6" y="-9" width="6" height="6" fill={color} stroke="none" />
          <path d="M -4 12 L -4 5 A 4 4 0 0 1 4 5 L 4 12 Z" fill={color} stroke="none" />
        </g>
      )
    default:
      return (
        <g stroke={color} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M -11 0 L 0 -10 L 11 0 Z" fill={color} stroke="none" />
          <rect x="-8" y="0" width="16" height="11" fill={PAPER} />
          <rect x="4" y="-9" width="3" height="6" fill={color} stroke="none" />
        </g>
      )
  }
}

interface LandmarkProps {
  node: TimelineNode
  point: Point
  selected: boolean
  onSelect: (node: TimelineNode) => void
}

/** 小径上的一座地标：点击选中，状态决定墨色与迷雾 */
function Landmark({ node, point, selected, onSelect }: LandmarkProps) {
  const color = node.status === 'future' ? FAINT : INK
  // 高处地标上方是群山云雾，地名改放正下方居中；其余按左右空侧放置
  const labelBelow = point.y < 140
  const labelSide: 'start' | 'end' = point.x > 200 ? 'end' : 'start'
  const labelX = labelBelow ? point.x : point.x + (labelSide === 'end' ? -26 : 26)
  const labelAnchor: 'start' | 'end' | 'middle' = labelBelow ? 'middle' : labelSide
  const labelY = labelBelow ? point.y + 38 : point.y + 4
  const labelWidth = node.title.length * 13

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${node.title}，${STATUS_LABEL[node.status]}`}
      aria-pressed={selected}
      className="cursor-pointer outline-none"
      onClick={() => onSelect(node)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(node)
        }
      }}
    >
      <title>{`${node.title} · ${STATUS_LABEL[node.status]}`}</title>
      <g transform={`translate(${point.x} ${point.y})`}>
        {node.status === 'current' ? (
          <circle r={16} fill="none" stroke="#bd4229" strokeWidth="1.5">
            <animate attributeName="r" values="13;25" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        ) : null}
        {selected ? (
          <circle r={22} fill="none" stroke={INK} strokeWidth="1.2" strokeDasharray="3 4" opacity="0.7" />
        ) : null}

        {/* 未来阶段：地标半埋在未至的迷雾里 */}
        {node.status === 'future' ? (
          <ellipse
            cx="0"
            cy="13"
            rx="22"
            ry="7"
            fill="#f6efdd"
            stroke="#cfc3a7"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.9"
          />
        ) : null}

        <g opacity={node.status === 'future' ? 0.75 : 1}>
          <LandmarkGlyph stageType={node.stageType} color={color} />
        </g>

        {/* 已走过：竹青勾印 */}
        {node.status === 'past' ? (
          <g transform="translate(13 -14)">
            <circle r={6.5} fill="#3f6f52" stroke={PAPER} strokeWidth="1.5" />
            <path d="M -2.8 0 L -0.8 2.2 L 3 -2.2" fill="none" stroke={PAPER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}

        {/* 当前阶段：朱红旗帜 */}
        {node.status === 'current' ? (
          <g>
            <line x1="12" y1="-8" x2="12" y2="-32" stroke={INK} strokeWidth="2" />
            <path d="M 12 -32 L 32 -27 L 12 -22 Z" fill="#bd4229" />
          </g>
        ) : null}
      </g>

      {/* 地名标注 */}
      <text
        x={labelX}
        y={labelY}
        textAnchor={labelAnchor}
        fontSize="12.5"
        className="font-kai"
        fill={node.status === 'future' ? FAINT : INK}
        fontWeight={node.status === 'current' ? 700 : 400}
      >
        {node.title}
      </text>
      <line
        x1={labelAnchor === 'middle' ? labelX - labelWidth / 2 : labelSide === 'end' ? labelX - labelWidth : labelX}
        x2={labelAnchor === 'middle' ? labelX + labelWidth / 2 : labelSide === 'end' ? labelX : labelX + labelWidth}
        y1={labelY + 5}
        y2={labelY + 5}
        stroke={node.status === 'current' ? '#bd4229' : '#c9bda2'}
        strokeWidth="0.8"
        opacity="0.8"
      />
    </g>
  )
}

/* ================= 主组件 ================= */

interface WorldMapProps {
  nodes: TimelineNode[]
  onEdit: (node: TimelineNode) => void
  onDelete: (node: TimelineNode) => void
}

/**
 * 人生舆图：一张真正的手绘风地图。
 * 人生阶段是蜿蜒小径上的地标——脚下是海岸故乡，远方是云雾群山。
 */
export function WorldMap({ nodes, onEdit, onDelete }: WorldMapProps) {
  const rows = useMemo(() => flattenNodes(nodes), [nodes])
  const samples = useMemo(() => sampleTrail(TRAIL_ANCHORS), [])
  const trailD = useMemo(() => catmullRomPath(TRAIL_ANCHORS), [])

  const fractionOf = (index: number): number =>
    rows.length <= 1 ? 0.04 : index / (rows.length - 1)
  const points = rows.map((_, index) => pointAtFraction(samples, fractionOf(index)))

  const currentIndex = rows.findIndex((row) => row.node.status === 'current')
  const walkedFraction = currentIndex >= 0 ? fractionOf(currentIndex) : 0

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedRow =
    rows.find((row) => row.node.id === selectedId) ??
    (currentIndex >= 0 ? rows[currentIndex] : undefined) ??
    rows[0]

  return (
    <div>
      <Panel className="overflow-hidden p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="mx-auto w-full max-w-[520px]"
          role="img"
          aria-label={`人生舆图：共 ${rows.length} 个阶段，当前处于「${rows[currentIndex]?.node.title ?? '未定'}」`}
        >
          {/* 图幅底色与双层边框 */}
          <rect x="1" y="1" width={VIEW_WIDTH - 2} height={VIEW_HEIGHT - 2} rx="10" fill="#f6efdd" opacity="0.6" />
          <Scenery />

          {/* 小径：纸面衬底 + 未走的路（稀疏墨点）+ 已走的路（密实墨线） */}
          <path d={trailD} fill="none" stroke={PAPER} strokeWidth="8" strokeLinecap="round" opacity="0.6" />
          <path
            d={trailD}
            fill="none"
            stroke="#b7a67f"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 9"
          />
          {walkedFraction > 0 ? (
            <path
              d={trailD}
              fill="none"
              stroke="#8a744e"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${walkedFraction * 100} 100`}
              opacity="0.8"
            />
          ) : null}

          {/* 沿途地标 */}
          {rows.map((row, index) => {
            const point = points[index]
            if (!point) return null
            return (
              <Landmark
                key={row.node.id}
                node={row.node}
                point={point}
                selected={selectedRow?.node.id === row.node.id}
                onSelect={(node) => setSelectedId(node.id)}
              />
            )
          })}

          {/* 图框 */}
          <rect x="6" y="6" width={VIEW_WIDTH - 12} height={VIEW_HEIGHT - 12} rx="6" fill="none" stroke={INK} strokeWidth="2" opacity="0.75" />
          <rect x="12" y="12" width={VIEW_WIDTH - 24} height={VIEW_HEIGHT - 24} fill="none" stroke={INK} strokeWidth="0.75" opacity="0.45" />
        </svg>

        {/* 图例 */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-line/70 px-3 pb-2 pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[#fbf7ee]">
              <Check size={10} strokeWidth={3.5} />
            </span>
            已走过
          </span>
          <span className="flex items-center gap-1.5">
            <Flag size={13} className="text-danger" />
            在此修行
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border border-dashed border-faint" />
            未至之境
          </span>
        </div>
      </Panel>

      {/* 选中阶段的详情 */}
      {selectedRow ? (
        <Panel className="mt-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-bold text-ink">{selectedRow.node.title}</h2>
                <StatusBadge value={selectedRow.node.status} />
                <span className="rounded border border-line bg-ink/4 px-2 py-0.5 text-xs text-muted">
                  {STAGE_TYPE_LABEL[selectedRow.node.stageType] ?? selectedRow.node.stageType}
                </span>
              </div>
              {selectedRow.parentName ? (
                <p className="mt-2 font-kai text-xs text-primary-deep">
                  承接自：{selectedRow.parentName}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                {selectedRow.node.description || '暂无描述'}
              </p>
              {selectedRow.node.startDate !== null || selectedRow.node.endDate !== null ? (
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-faint">
                  <CalendarRange size={14} />
                  {formatDate(selectedRow.node.startDate)} — {formatDate(selectedRow.node.endDate)}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1 self-end sm:self-start">
              <Button
                variant="ghost"
                className="min-h-9 px-2.5 text-xs"
                icon={<Pencil size={13} />}
                onClick={() => onEdit(selectedRow.node)}
              >
                编辑
              </Button>
              <Button
                variant="ghost"
                className="min-h-9 px-2.5 text-xs text-danger hover:bg-danger-soft hover:text-danger"
                icon={<Trash2 size={13} />}
                onClick={() => onDelete(selectedRow.node)}
              >
                删除
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
