import { useState, type FormEvent } from 'react'
import type { LifeEvent } from '../../types/models'
import { localDateString } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'
import { Button } from '../ui/Button'
import { FormField, inputClassName, textareaClassName } from '../ui/FormField'
import { Modal } from '../ui/Modal'

interface EventEditorProps {
  event: LifeEvent | null
  onClose: () => void
  onSave: (event: LifeEvent) => Promise<void>
}

export function EventEditor({ event, onClose, onSave }: EventEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title) {
      setError('请输入事件标题，标题不能只包含空格。')
      return
    }
    const timestamp = nowIso()
    const entity: LifeEvent = {
      id: event?.id ?? createId('event'),
      title,
      description: String(form.get('description') ?? '').trim(),
      date: String(form.get('date') ?? '') || localDateString(),
      sourceType: event?.sourceType ?? 'manual',
      sourceId: event?.sourceId ?? null,
      createdAt: event?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    setSaving(true)
    setError(null)
    void onSave(entity)
      .then(onClose)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '保存重要事件失败'))
      .finally(() => setSaving(false))
  }

  return (
    <Modal open title={event ? '编辑重要事件' : '添加重要事件'} description="成长足迹只记录真正重要的节点。" onClose={onClose} closeDisabled={saving}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="事件标题" htmlFor="event-title" required error={error}>
          <input id="event-title" name="title" required defaultValue={event?.title ?? ''} className={inputClassName} onChange={() => setError(null)} />
        </FormField>
        <FormField label="日期" htmlFor="event-date">
          <input id="event-date" name="date" type="date" defaultValue={event?.date.slice(0, 10) ?? localDateString()} className={inputClassName} />
        </FormField>
        <FormField label="说明" htmlFor="event-description">
          <textarea id="event-description" name="description" defaultValue={event?.description ?? ''} className={textareaClassName} />
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存事件'}</Button>
        </div>
      </form>
    </Modal>
  )
}
