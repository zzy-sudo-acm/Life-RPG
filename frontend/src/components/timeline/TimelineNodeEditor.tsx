import { useState, type FormEvent } from 'react'
import type { TimelineNode, TimelineStatus } from '../../types/models'
import { toNumber } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'

interface TimelineNodeEditorProps {
  node: TimelineNode | null
  nodes: TimelineNode[]
  onClose: () => void
  onSave: (node: TimelineNode) => Promise<void>
}

function descendantIds(nodeId: string, nodes: TimelineNode[]): Set<string> {
  const result = new Set<string>([nodeId])
  let added = true

  while (added) {
    added = false
    for (const node of nodes) {
      if (node.parentId !== null && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id)
        added = true
      }
    }
  }

  return result
}

export function TimelineNodeEditor({
  node,
  nodes,
  onClose,
  onSave,
}: TimelineNodeEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const excludedParentIds = node ? descendantIds(node.id, nodes) : new Set<string>()
  const parentOptions = nodes
    .filter((candidate) => !excludedParentIds.has(candidate.id))
    .toSorted((left, right) => left.order - right.order || left.title.localeCompare(right.title))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startDate = String(form.get('startDate') ?? '') || null
    const endDate = String(form.get('endDate') ?? '') || null

    if (startDate !== null && endDate !== null && endDate < startDate) {
      setError('结束日期不能早于开始日期')
      return
    }

    const timestamp = nowIso()
    const entity: TimelineNode = {
      id: node?.id ?? createId('timeline'),
      createdAt: node?.createdAt ?? timestamp,
      updatedAt: timestamp,
      parentId: String(form.get('parentId') ?? '') || null,
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      stageType: String(form.get('stageType') ?? '').trim(),
      status: String(form.get('status') ?? 'future') as TimelineStatus,
      startDate,
      endDate,
      order: Math.trunc(toNumber(form.get('order'))),
    }

    setIsSaving(true)
    setError(null)
    void onSave(entity)
      .then(onClose)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : '保存人生阶段失败')
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <Modal
      open
      wide
      title={node ? '编辑人生阶段' : '添加人生阶段'}
      description="通过父阶段建立路线分支；顺序较小的节点优先显示。"
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="阶段名称" htmlFor="timeline-title" required>
            <input
              id="timeline-title"
              name="title"
              required
              defaultValue={node?.title ?? ''}
              className={inputClassName}
            />
          </FormField>
          <FormField label="阶段类型" htmlFor="timeline-type" required hint="例如大学、积累阶段、职业。">
            <input
              id="timeline-type"
              name="stageType"
              required
              defaultValue={node?.stageType ?? ''}
              className={inputClassName}
            />
          </FormField>
        </div>
        <FormField label="上一级阶段" htmlFor="timeline-parent">
          <select
            id="timeline-parent"
            name="parentId"
            defaultValue={node?.parentId ?? ''}
            className={inputClassName}
          >
            <option value="">作为路线起点</option>
            {parentOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}（{candidate.stageType || '未分类'}）
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="描述" htmlFor="timeline-description">
          <textarea
            id="timeline-description"
            name="description"
            defaultValue={node?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="状态" htmlFor="timeline-status">
            <select
              id="timeline-status"
              name="status"
              defaultValue={node?.status ?? 'future'}
              className={inputClassName}
            >
              <option value="past">已完成</option>
              <option value="current">当前阶段</option>
              <option value="future">未来阶段</option>
            </select>
          </FormField>
          <FormField label="开始日期" htmlFor="timeline-start">
            <input
              id="timeline-start"
              name="startDate"
              type="date"
              defaultValue={node?.startDate?.slice(0, 10) ?? ''}
              className={inputClassName}
            />
          </FormField>
          <FormField label="结束日期" htmlFor="timeline-end">
            <input
              id="timeline-end"
              name="endDate"
              type="date"
              defaultValue={node?.endDate?.slice(0, 10) ?? ''}
              className={inputClassName}
            />
          </FormField>
          <FormField label="显示顺序" htmlFor="timeline-order">
            <input
              id="timeline-order"
              name="order"
              type="number"
              step="1"
              defaultValue={node?.order ?? nodes.length}
              className={inputClassName}
            />
          </FormField>
        </div>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={isSaving} onClick={onClose}>取消</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '保存中…' : '保存阶段'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
