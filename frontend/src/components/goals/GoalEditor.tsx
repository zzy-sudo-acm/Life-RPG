import { ChevronDown } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Goal } from '../../types/models'
import { clamp, toNumber } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'
import { Button } from '../ui/Button'
import { FormField, inputClassName, textareaClassName } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useAsyncSubmission } from '../ui/useAsyncSubmission'

interface GoalEditorProps {
  goal: Goal | null
  goals: Goal[]
  onClose: () => void
  onSave: (goal: Goal) => Promise<void>
}

function descendantIds(goals: Goal[], rootId: string): Set<string> {
  const result = new Set<string>()
  const pending = [rootId]
  while (pending.length > 0) {
    const parentId = pending.pop()
    for (const item of goals) {
      if (item.parentId === parentId && !result.has(item.id)) {
        result.add(item.id)
        pending.push(item.id)
      }
    }
  }
  return result
}

export function GoalEditor({ goal, goals, onClose, onSave }: GoalEditorProps) {
  const [nameError, setNameError] = useState<string | null>(null)
  const { isSubmitting, submissionError, clearSubmissionError, runSubmission } = useAsyncSubmission()
  const unavailable = goal === null ? new Set<string>() : descendantIds(goals, goal.id)
  if (goal) unavailable.add(goal.id)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (name.length === 0) {
      setNameError('请输入目标名称，名称不能只包含空格。')
      return
    }

    const timestamp = nowIso()
    const status = String(form.get('status')) as Goal['status']
    const entity: Goal = {
      id: goal?.id ?? createId('goal'),
      parentId: String(form.get('parentId') ?? '') || null,
      name,
      type: String(form.get('type')) as Goal['type'],
      displayMode: String(form.get('displayMode')) as Goal['displayMode'],
      description: String(form.get('description') ?? '').trim(),
      deadline: String(form.get('deadline') ?? '') || null,
      status,
      progress: status === 'completed' ? 100 : clamp(toNumber(form.get('progress')), 0, 100),
      createdAt: goal?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    const saved = await runSubmission(() => onSave(entity), '保存目标失败')
    if (saved) onClose()
  }

  return (
    <Modal
      open
      title={goal === null ? '添加目标' : '编辑目标'}
      description="目标只保留一层父子关系；Boss 模式只是同一进度的 RPG 展示。"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="目标名称" htmlFor="goal-name" required error={nameError}>
          <input
            id="goal-name"
            name="name"
            required
            autoFocus
            placeholder="例如：一年读完 12 本书"
            defaultValue={goal?.name ?? ''}
            className={inputClassName}
            onChange={() => {
              setNameError(null)
              clearSubmissionError()
            }}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="展示模式" htmlFor="goal-display-mode">
            <select id="goal-display-mode" name="displayMode" defaultValue={goal?.displayMode ?? 'standard'} className={inputClassName}>
              <option value="standard">普通目标</option>
              <option value="boss">Boss 目标 👹</option>
            </select>
          </FormField>
          <FormField label="截止日期（可选）" htmlFor="goal-deadline">
            <input id="goal-deadline" name="deadline" type="date" defaultValue={goal?.deadline?.slice(0, 10) ?? ''} className={inputClassName} />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="状态" htmlFor="goal-status">
            <select id="goal-status" name="status" defaultValue={goal?.status ?? 'active'} className={inputClassName}>
              <option value="active">进行中</option>
              <option value="planned">计划中</option>
              <option value="paused">已暂停</option>
              <option value="completed">已完成</option>
            </select>
          </FormField>
          <FormField label="当前进度（%）" htmlFor="goal-progress">
            <input id="goal-progress" name="progress" type="number" min="0" max="100" defaultValue={goal?.progress ?? 0} className={inputClassName} />
          </FormField>
        </div>

        <details className="group rounded-xl border border-line bg-surface px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink">
            更多选项
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-4 border-t border-line pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="目标层级" htmlFor="goal-type">
                <select id="goal-type" name="type" defaultValue={goal?.type ?? 'major'} className={inputClassName}>
                  <option value="major">长期目标</option>
                  <option value="minor">子目标</option>
                </select>
              </FormField>
              <FormField label="上级目标" htmlFor="goal-parent">
                <select id="goal-parent" name="parentId" defaultValue={goal?.parentId ?? ''} className={inputClassName}>
                  <option value="">无上级目标</option>
                  {goals.filter((item) => item.parentId === null && !unavailable.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="描述" htmlFor="goal-description">
              <textarea id="goal-description" name="description" defaultValue={goal?.description ?? ''} className={textareaClassName} />
            </FormField>
          </div>
        </details>

        {submissionError ? <p role="alert" className="text-sm text-danger">{submissionError}</p> : null}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中…' : '保存目标'}</Button>
        </div>
      </form>
    </Modal>
  )
}
