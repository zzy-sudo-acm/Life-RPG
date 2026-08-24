import { Map, Plus } from 'lucide-react'
import { useState } from 'react'
import { TimelineNodeEditor } from '../components/timeline/TimelineNodeEditor'
import { TimelineTree } from '../components/timeline/TimelineTree'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAppStore } from '../store/AppStoreContext'
import type { TimelineNode } from '../types/models'

export function TimelinePage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [editor, setEditor] = useState<TimelineNode | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const handleDelete = async (node: TimelineNode): Promise<void> => {
    const children = data.timeline.filter((candidate) => candidate.parentId === node.id)
    const childNote = children.length > 0
      ? `其 ${children.length} 个直接子阶段将接到上一级路线。`
      : ''
    if (!window.confirm(`确定删除阶段“${node.title}”吗？${childNote}`)) return

    setError(null)
    try {
      await deleteEntity('timeline', node.id)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '删除人生阶段失败')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="人生地图"
        description="用父子阶段组织人生路线，顺序、日期和状态都可随成长调整。"
        action={
          <Button icon={<Plus size={16} />} onClick={() => setEditor('new')}>
            添加阶段
          </Button>
        }
      />

      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}

      {data.timeline.length === 0 ? (
        <EmptyState
          title="人生地图还是空的"
          description="从当前阶段开始，再逐步添加积累阶段和职业阶段。"
          action={<Button icon={<Map size={16} />} onClick={() => setEditor('new')}>建立路线起点</Button>}
        />
      ) : (
        <TimelineTree
          nodes={data.timeline}
          onEdit={setEditor}
          onDelete={(node) => void handleDelete(node)}
        />
      )}

      {editor !== null ? (
        <TimelineNodeEditor
          node={editor === 'new' ? null : editor}
          nodes={data.timeline}
          onClose={() => setEditor(null)}
          onSave={(node) => saveEntity('timeline', node)}
        />
      ) : null}
    </div>
  )
}
