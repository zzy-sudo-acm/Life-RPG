import { useState, type FormEvent } from 'react'
import type { SkillCategory } from '../../types/models'
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

interface SkillCategoryEditorProps {
  category: SkillCategory | null
  onClose: () => void
  onSave: (category: SkillCategory) => Promise<void>
}

export function SkillCategoryEditor({
  category,
  onClose,
  onSave,
}: SkillCategoryEditorProps) {
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
      setNameError('请输入分类名称，名称不能只包含空格。')
      return
    }

    setNameError(null)
    const timestamp = nowIso()
    const entity: SkillCategory = {
      id: category?.id ?? createId('skill-category'),
      name,
      description: String(form.get('description') ?? '').trim(),
      order: Math.max(0, Math.round(toNumber(form.get('order')))),
      createdAt: category?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    const saved = await runSubmission(() => onSave(entity), '保存技能分类失败')
    if (saved) {
      onClose()
    }
  }

  return (
    <Modal
      open
      title={category === null ? '创建技能分类' : '编辑技能分类'}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          label="分类名称"
          htmlFor="skill-category-name"
          required
          error={nameError}
        >
          <input
            id="skill-category-name"
            name="name"
            required
            aria-invalid={nameError !== null}
            aria-describedby={
              nameError ? 'skill-category-name-error' : undefined
            }
            defaultValue={category?.name ?? ''}
            className={inputClassName}
            onChange={() => {
              setNameError(null)
              clearSubmissionError()
            }}
          />
        </FormField>
        <FormField label="描述" htmlFor="skill-category-description">
          <textarea
            id="skill-category-description"
            name="description"
            defaultValue={category?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <FormField
          label="排序"
          htmlFor="skill-category-order"
          hint="数字越小越靠前。"
        >
          <input
            id="skill-category-order"
            name="order"
            type="number"
            min="0"
            step="1"
            defaultValue={category?.order ?? 0}
            className={inputClassName}
          />
        </FormField>
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
            {isSubmitting ? '保存中…' : '保存分类'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
