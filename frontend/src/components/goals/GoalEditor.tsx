import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useAsyncSubmission } from '../ui/useAsyncSubmission'
import type { Goal } from '../../types/models'
import { clamp, toNumber } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'

interface GoalEditorProps {
  goal: Goal | null
  goals: Goal[]
  onClose: () => void
  onSave: (goal: Goal) => Promise<void>
}

function collectDescendantIds(goals: Goal[], rootId: string): Set<string> {
  const descendants = new Set<string>()
  const pending = [rootId]

  while (pending.length > 0) {
    const parentId = pending.pop()
    if (parentId === undefined) {
      continue
    }

    for (const goal of goals) {
      if (goal.parentId === parentId && !descendants.has(goal.id)) {
        descendants.add(goal.id)
        pending.push(goal.id)
      }
    }
  }

  return descendants
}

export function GoalEditor({ goal, goals, onClose, onSave }: GoalEditorProps) {
  const [nameError, setNameError] = useState<string | null>(null)
  const {
    isSubmitting,
    submissionError,
    clearSubmissionError,
    runSubmission,
  } = useAsyncSubmission()
  const unavailableParentIds =
    goal === null ? new Set<string>() : collectDescendantIds(goals, goal.id)
  if (goal !== null) {
    unavailableParentIds.add(goal.id)
  }

  const parentOptions = goals.filter(
    (candidate) => !unavailableParentIds.has(candidate.id),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (name.length === 0) {
      setNameError('请输入目标名称，名称不能只包含空格。')
      return
    }

    setNameError(null)
    const timestamp = nowIso()
    const parentId = String(form.get('parentId') ?? '') || null
    const type = String(form.get('type')) as Goal['type']
    const status = String(form.get('status')) as Goal['status']
    const deadline = String(form.get('deadline') ?? '') || null

    const entity: Goal = {
      id: goal?.id ?? createId('goal'),
      parentId,
      name,
      type,
      description: String(form.get('description') ?? '').trim(),
      deadline,
      status,
      progress: clamp(toNumber(form.get('progress')), 0, 100),
      createdAt: goal?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    const saved = await runSubmission(() => onSave(entity), '保存目标失败')
    if (saved) {
      onClose()
    }
  }

  return (
    <Modal
      open
      title={goal === null ? '创建目标' : '编辑目标'}
      description="大目标可以作为小目标的上级，进度范围为 0–100%。"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          label="目标名称"
          htmlFor="goal-name"
          required
          error={nameError}
        >
          <input
            id="goal-name"
            name="name"
            required
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? 'goal-name-error' : undefined}
            defaultValue={goal?.name ?? ''}
            className={inputClassName}
            onChange={() => {
              setNameError(null)
              clearSubmissionError()
            }}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="目标类型" htmlFor="goal-type">
            <select
              id="goal-type"
              name="type"
              defaultValue={goal?.type ?? 'major'}
              className={inputClassName}
            >
              <option value="major">大目标</option>
              <option value="minor">小目标</option>
            </select>
          </FormField>
          <FormField label="上级目标" htmlFor="goal-parent">
            <select
              id="goal-parent"
              name="parentId"
              defaultValue={goal?.parentId ?? ''}
              className={inputClassName}
            >
              <option value="">无上级目标</option>
              {parentOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="描述" htmlFor="goal-description">
          <textarea
            id="goal-description"
            name="description"
            defaultValue={goal?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="截止日期" htmlFor="goal-deadline">
            <input
              id="goal-deadline"
              name="deadline"
              type="date"
              defaultValue={goal?.deadline?.slice(0, 10) ?? ''}
              className={inputClassName}
            />
          </FormField>
          <FormField label="状态" htmlFor="goal-status">
            <select
              id="goal-status"
              name="status"
              defaultValue={goal?.status ?? 'planned'}
              className={inputClassName}
            >
              <option value="planned">计划中</option>
              <option value="active">进行中</option>
              <option value="paused">已暂停</option>
              <option value="completed">已完成</option>
            </select>
          </FormField>
          <FormField label="进度（%）" htmlFor="goal-progress">
            <input
              id="goal-progress"
              name="progress"
              type="number"
              min="0"
              max="100"
              defaultValue={goal?.progress ?? 0}
              className={inputClassName}
            />
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
            {isSubmitting ? '保存中…' : '保存目标'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
