import { useState, type FormEvent } from 'react'
import type { Achievement } from '../../types/models'
import { createId, nowIso } from '../../utils/id'
import { localDateString, toNumber } from '../../utils/format'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'

interface AchievementEditorProps {
  achievement: Achievement | null
  onClose: () => void
  onSave: (achievement: Achievement) => Promise<void>
}

function today(): string {
  return localDateString()
}

export function AchievementEditor({
  achievement,
  onClose,
  onSave,
}: AchievementEditorProps) {
  const [unlockType, setUnlockType] = useState<Achievement['unlockType']>(
    achievement?.unlockType ?? 'manual',
  )
  const [unlockDate, setUnlockDate] = useState(
    achievement?.unlockedAt?.slice(0, 10) ??
      (achievement?.unlockType === 'automatic' ? '' : today()),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const timestamp = nowIso()
    const triggerEvent = String(form.get('triggerEvent') ?? '').trim()
    const entity: Achievement = {
      id: achievement?.id ?? createId('achievement'),
      createdAt: achievement?.createdAt ?? timestamp,
      updatedAt: timestamp,
      name: String(form.get('name') ?? '').trim(),
      icon: String(form.get('icon') ?? '').trim() || '🏆',
      description: String(form.get('description') ?? '').trim(),
      unlockType,
      unlockedAt:
        unlockType === 'manual' ? unlockDate || today() : unlockDate || null,
      trigger:
        unlockType === 'automatic' && triggerEvent.length > 0
          ? {
              event: triggerEvent,
              threshold: Math.max(0, toNumber(form.get('threshold'))),
            }
          : null,
    }

    setIsSaving(true)
    setError(null)
    void onSave(entity)
      .then(onClose)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : '保存成就失败')
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <Modal
      open
      title={achievement ? '编辑成就' : '添加成就'}
      description="自动解锁规则先保存为触发器配置，后续可接入自动检测。"
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-[88px_1fr]">
          <FormField label="图标" htmlFor="achievement-icon">
            <input
              id="achievement-icon"
              name="icon"
              defaultValue={achievement?.icon ?? '🏆'}
              className={inputClassName}
            />
          </FormField>
          <FormField label="名称" htmlFor="achievement-name" required>
            <input
              id="achievement-name"
              name="name"
              required
              defaultValue={achievement?.name ?? ''}
              className={inputClassName}
            />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="achievement-description">
          <textarea
            id="achievement-description"
            name="description"
            defaultValue={achievement?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="解锁方式" htmlFor="achievement-type">
            <select
              id="achievement-type"
              name="unlockType"
              value={unlockType}
              className={inputClassName}
              onChange={(event) => {
                const nextType = event.currentTarget.value as Achievement['unlockType']
                setUnlockType(nextType)
                setUnlockDate((current) =>
                  nextType === 'manual' ? current || today() : '',
                )
              }}
            >
              <option value="manual">手动解锁</option>
              <option value="automatic">自动解锁（预留）</option>
            </select>
          </FormField>
          <FormField
            label={unlockType === 'manual' ? '解锁日期' : '解锁日期（可选）'}
            htmlFor="achievement-date"
            required={unlockType === 'manual'}
            hint={unlockType === 'automatic' ? '留空表示等待触发规则解锁。' : undefined}
          >
            <input
              id="achievement-date"
              name="unlockedAt"
              type="date"
              required={unlockType === 'manual'}
              value={unlockDate}
              onChange={(event) => setUnlockDate(event.currentTarget.value)}
              className={inputClassName}
            />
          </FormField>
        </div>
        {unlockType === 'automatic' ? (
          <fieldset className="space-y-3 rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-medium text-ink">自动触发器</legend>
            <FormField
              label="事件标识"
              htmlFor="achievement-trigger-event"
              hint="例如 task.completed；留空表示暂不配置自动规则。"
            >
              <input
                id="achievement-trigger-event"
                name="triggerEvent"
                defaultValue={achievement?.trigger?.event ?? ''}
                placeholder="task.completed"
                className={inputClassName}
              />
            </FormField>
            <FormField label="触发阈值" htmlFor="achievement-threshold">
              <input
                id="achievement-threshold"
                name="threshold"
                type="number"
                min="0"
                defaultValue={achievement?.trigger?.threshold ?? 1}
                className={inputClassName}
              />
            </FormField>
          </fieldset>
        ) : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={isSaving} onClick={onClose}>取消</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '保存中…' : '保存成就'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
