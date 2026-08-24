import { useState, type FormEvent } from 'react'
import type { Boss, LifeEvent, Skill } from '../../types/models'
import { createId, nowIso } from '../../utils/id'
import { localDateString } from '../../utils/format'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { readRewardBundle } from './rewardForm'
import { RewardFields } from './RewardFields'

interface EventEditorProps {
  lifeEvent: LifeEvent | null
  skills: Skill[]
  bosses: Boss[]
  onClose: () => void
  onSave: (lifeEvent: LifeEvent) => Promise<void>
}

function today(): string {
  return localDateString()
}

export function EventEditor({
  lifeEvent,
  skills,
  bosses,
  onClose,
  onSave,
}: EventEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const timestamp = nowIso()
    const entity: LifeEvent = {
      id: lifeEvent?.id ?? createId('event'),
      createdAt: lifeEvent?.createdAt ?? timestamp,
      updatedAt: timestamp,
      date: String(form.get('date') ?? ''),
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      rewards: readRewardBundle(form),
      sourceType: lifeEvent?.sourceType ?? 'manual',
      sourceId: lifeEvent?.sourceId ?? null,
    }

    setIsSaving(true)
    setError(null)
    void onSave(entity)
      .then(onClose)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : '保存事件失败')
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <Modal
      open
      wide
      title={lifeEvent ? '编辑人生事件' : '添加人生事件'}
      description={
        lifeEvent && lifeEvent.sourceType !== 'manual'
          ? '这是系统自动记录的事件；编辑奖励只会修改历史记录。'
          : '记录现实中的重要经历和当时获得的奖励。'
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {lifeEvent && lifeEvent.sourceType !== 'manual' ? (
          <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary">
            自动来源：{lifeEvent.sourceType} · {lifeEvent.sourceId ?? '未关联 ID'}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <FormField label="日期" htmlFor="event-date" required>
            <input
              id="event-date"
              name="date"
              type="date"
              required
              defaultValue={lifeEvent?.date.slice(0, 10) ?? today()}
              className={inputClassName}
            />
          </FormField>
          <FormField label="标题" htmlFor="event-title" required>
            <input
              id="event-title"
              name="title"
              required
              defaultValue={lifeEvent?.title ?? ''}
              className={inputClassName}
            />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="event-description">
          <textarea
            id="event-description"
            name="description"
            defaultValue={lifeEvent?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <RewardFields
          rewards={lifeEvent?.rewards ?? { exp: 0, stats: {}, skills: [], bosses: [] }}
          skills={skills}
          bosses={bosses}
        />
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={isSaving} onClick={onClose}>取消</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '保存中…' : '保存事件'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
