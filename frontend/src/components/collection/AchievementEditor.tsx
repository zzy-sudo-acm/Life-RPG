import { useState, type FormEvent } from 'react'
import type { Achievement } from '../../types/models'
import { createId, nowIso } from '../../utils/id'
import { localDateString, toNumber } from '../../utils/format'
import { Button } from '../ui/Button'
import { FormField, inputClassName, textareaClassName } from '../ui/FormField'
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
    (achievement?.unlockedAt
      ? achievement.unlockedAt.length === 10
        ? achievement.unlockedAt
        : localDateString(new Date(achievement.unlockedAt))
      : null) ?? (achievement?.unlockType === 'automatic' ? '' : today()),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return
    const form = new FormData(event.currentTarget)
    if (!String(form.get('name') ?? '').trim()) {
      setError('请为这枚成就起一个名字。')
      return
    }
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
      description="自动成就会在任务、目标、技能或连续天数达到阈值时解锁。"
      onClose={onClose}
      closeDisabled={isSaving}
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
                const nextType = event.currentTarget
                  .value as Achievement['unlockType']
                setUnlockType(nextType)
                setUnlockDate((current) =>
                  nextType === 'manual' ? current || today() : '',
                )
              }}
            >
              <option value="manual">手动解锁</option>
              <option value="automatic">自动解锁</option>
            </select>
          </FormField>
          <FormField
            label={unlockType === 'manual' ? '解锁日期' : '解锁日期（可选）'}
            htmlFor="achievement-date"
            required={unlockType === 'manual'}
            hint={
              unlockType === 'automatic'
                ? '留空表示等待触发规则解锁。'
                : undefined
            }
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
            <legend className="px-1 text-sm font-medium text-ink">
              自动解锁条件
            </legend>
            <FormField
              label="达成条件"
              htmlFor="achievement-trigger-event"
              hint="达到设定数量后，成就会自动点亮。"
            >
              <select
                id="achievement-trigger-event"
                name="triggerEvent"
                defaultValue={achievement?.trigger?.event ?? 'task.completed'}
                className={inputClassName}
              >
                <option value="task.completed">累计完成行动</option>
                <option value="goal.completed">完成目标</option>
                <option value="skill.level">任一技能达到等级</option>
                <option value="streak.days">连续行动天数</option>
                {achievement?.trigger?.event &&
                ![
                  'task.completed',
                  'goal.completed',
                  'skill.level',
                  'streak.days',
                ].includes(achievement.trigger.event) ? (
                  <option value={achievement.trigger.event}>
                    原有自定义规则：{achievement.trigger.event}
                  </option>
                ) : null}
              </select>
            </FormField>
            <FormField label="目标数量" htmlFor="achievement-threshold">
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
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={isSaving} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '保存中…' : '保存成就'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
