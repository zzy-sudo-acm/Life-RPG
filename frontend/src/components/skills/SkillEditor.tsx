import { useState, type FormEvent } from 'react'
import type { Skill, SkillCategory } from '../../types/models'
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

interface SkillEditorProps {
  skill: Skill | null
  categories: SkillCategory[]
  skills: Skill[]
  initialCategoryId: string | null
  onClose: () => void
  onSave: (skill: Skill) => Promise<void>
}

function collectDescendantIds(skills: Skill[], rootId: string): Set<string> {
  const descendants = new Set<string>()
  const pending = [rootId]

  while (pending.length > 0) {
    const parentId = pending.pop()
    if (parentId === undefined) {
      continue
    }

    for (const skill of skills) {
      if (skill.parentId === parentId && !descendants.has(skill.id)) {
        descendants.add(skill.id)
        pending.push(skill.id)
      }
    }
  }

  return descendants
}

export function SkillEditor({
  skill,
  categories,
  skills,
  initialCategoryId,
  onClose,
  onSave,
}: SkillEditorProps) {
  const fallbackCategoryId = categories[0]?.id ?? ''
  const [categoryId, setCategoryId] = useState(
    skill?.categoryId ?? initialCategoryId ?? fallbackCategoryId,
  )
  const [parentId, setParentId] = useState(skill?.parentId ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const {
    isSubmitting,
    submissionError,
    clearSubmissionError,
    runSubmission,
  } = useAsyncSubmission()
  const unavailableParentIds =
    skill === null ? new Set<string>() : collectDescendantIds(skills, skill.id)
  if (skill !== null) {
    unavailableParentIds.add(skill.id)
  }

  const parentOptions = skills.filter(
    (candidate) =>
      candidate.categoryId === categoryId &&
      !unavailableParentIds.has(candidate.id),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (name.length === 0) {
      setNameError('请输入技能名称，名称不能只包含空格。')
      return
    }

    setNameError(null)
    const timestamp = nowIso()
    const entity: Skill = {
      id: skill?.id ?? createId('skill'),
      categoryId,
      parentId: parentId || null,
      name,
      level: Math.max(1, Math.round(toNumber(form.get('level'), 1))),
      exp: Math.max(0, toNumber(form.get('exp'))),
      expToNextLevel: Math.max(1, toNumber(form.get('expToNextLevel'), 100)),
      description: String(form.get('description') ?? '').trim(),
      createdAt: skill?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    const saved = await runSubmission(() => onSave(entity), '保存技能失败')
    if (saved) {
      onClose()
    }
  }

  return (
    <Modal
      open
      title={skill === null ? '创建技能' : '编辑技能'}
      description="同一分类内的技能可以建立父子关系。"
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          label="技能名称"
          htmlFor="skill-name"
          required
          error={nameError}
        >
          <input
            id="skill-name"
            name="name"
            required
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? 'skill-name-error' : undefined}
            defaultValue={skill?.name ?? ''}
            className={inputClassName}
            onChange={() => {
              setNameError(null)
              clearSubmissionError()
            }}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="所属分类" htmlFor="skill-category" required>
            <select
              id="skill-category"
              required
              value={categoryId}
              className={inputClassName}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setParentId('')
              }}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="上级技能" htmlFor="skill-parent">
            <select
              id="skill-parent"
              value={parentId}
              className={inputClassName}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">无上级技能</option>
              {parentOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="描述" htmlFor="skill-description">
          <textarea
            id="skill-description"
            name="description"
            defaultValue={skill?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="等级" htmlFor="skill-level">
            <input
              id="skill-level"
              name="level"
              type="number"
              min="1"
              step="1"
              defaultValue={skill?.level ?? 1}
              className={inputClassName}
            />
          </FormField>
          <FormField label="当前经验" htmlFor="skill-exp">
            <input
              id="skill-exp"
              name="exp"
              type="number"
              min="0"
              defaultValue={skill?.exp ?? 0}
              className={inputClassName}
            />
          </FormField>
          <FormField label="升级所需" htmlFor="skill-next-exp">
            <input
              id="skill-next-exp"
              name="expToNextLevel"
              type="number"
              min="1"
              defaultValue={skill?.expToNextLevel ?? 100}
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
          <Button
            type="submit"
            disabled={categoryId.length === 0 || isSubmitting}
          >
            {isSubmitting ? '保存中…' : '保存技能'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
