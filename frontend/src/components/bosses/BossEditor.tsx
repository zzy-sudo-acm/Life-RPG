import { useState, type FormEvent } from 'react'
import type { Boss, Goal } from '../../types/models'
import { toNumber } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useAsyncSubmission } from '../ui/useAsyncSubmission'

interface BossEditorProps {
  boss: Boss | null
  goals: Goal[]
  onClose: () => void
  onSave: (boss: Boss) => Promise<void>
}

export function BossEditor({ boss, goals, onClose, onSave }: BossEditorProps) {
  const [nameError, setNameError] = useState<string | null>(null)
  const {
    isSubmitting,
    submissionError,
    clearSubmissionError,
    runSubmission,
  } = useAsyncSubmission()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (name.length === 0) {
      setNameError('请输入 Boss 名称，名称不能只包含空格。')
      return
    }

    setNameError(null)
    const timestamp = nowIso()
    const maxHp = Math.max(1, toNumber(form.get('maxHp'), 100))
    const enteredCurrentHp = Math.max(0, toNumber(form.get('currentHp'), maxHp))
    const selectedStatus = String(form.get('status')) as Boss['status']
    const currentHp = selectedStatus === 'defeated' ? 0 : Math.min(maxHp, enteredCurrentHp)
    const status = currentHp === 0 ? 'defeated' : selectedStatus
    const entity: Boss = {
      id: boss?.id ?? createId('boss'),
      goalId: String(form.get('goalId') ?? '') || null,
      name,
      description: String(form.get('description') ?? '').trim(),
      maxHp,
      currentHp,
      deadline: String(form.get('deadline') ?? '') || null,
      status,
      createdAt: boss?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    const saved = await runSubmission(() => onSave(entity), '保存 Boss 失败')
    if (saved) {
      onClose()
    }
  }

  return (
    <Modal
      open
      title={boss === null ? '创建 Boss 挑战' : '编辑 Boss 挑战'}
      description="Boss 可以关联人生目标；任务奖励和手动挑战都能扣减 HP。"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          label="Boss 名称"
          htmlFor="boss-name"
          required
          error={nameError}
        >
          <input
            id="boss-name"
            name="name"
            required
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? 'boss-name-error' : undefined}
            defaultValue={boss?.name ?? ''}
            className={inputClassName}
            onChange={() => {
              setNameError(null)
              clearSubmissionError()
            }}
          />
        </FormField>
        <FormField label="关联目标" htmlFor="boss-goal">
          <select
            id="boss-goal"
            name="goalId"
            defaultValue={boss?.goalId ?? ''}
            className={inputClassName}
          >
            <option value="">不关联目标</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="描述" htmlFor="boss-description">
          <textarea
            id="boss-description"
            name="description"
            defaultValue={boss?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="最大 HP" htmlFor="boss-max-hp">
            <input
              id="boss-max-hp"
              name="maxHp"
              type="number"
              min="1"
              defaultValue={boss?.maxHp ?? 100}
              className={inputClassName}
            />
          </FormField>
          <FormField label="当前 HP" htmlFor="boss-current-hp">
            <input
              id="boss-current-hp"
              name="currentHp"
              type="number"
              min="0"
              defaultValue={boss?.currentHp ?? 100}
              className={inputClassName}
            />
          </FormField>
          <FormField label="截止日期" htmlFor="boss-deadline">
            <input
              id="boss-deadline"
              name="deadline"
              type="date"
              defaultValue={boss?.deadline?.slice(0, 10) ?? ''}
              className={inputClassName}
            />
          </FormField>
          <FormField label="状态" htmlFor="boss-status">
            <select
              id="boss-status"
              name="status"
              defaultValue={boss?.status ?? 'planned'}
              className={inputClassName}
            >
              <option value="planned">计划中</option>
              <option value="active">挑战中</option>
              <option value="defeated">已击败（HP 归零）</option>
            </select>
          </FormField>
        </div>
        {submissionError ? (
          <p role="alert" className="text-sm text-danger">
            {submissionError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '保存中…' : '保存 Boss'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
