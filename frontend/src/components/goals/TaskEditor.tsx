import { ChevronDown, Sparkles } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { calculateTaskRewards } from '../../systems/rewardRules'
import {
  EMPTY_REWARDS,
  STAT_KEYS,
  STAT_LABELS,
  TASK_DIFFICULTY_LABELS,
  type Goal,
  type Skill,
  type SkillCategory,
  type Task,
  type TaskDifficulty,
} from '../../types/models'
import { createId, nowIso } from '../../utils/id'
import { Button } from '../ui/Button'
import { FormField, inputClassName, textareaClassName } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useAsyncSubmission } from '../ui/useAsyncSubmission'

interface TaskEditorProps {
  task: Task | null
  goals: Goal[]
  categories: SkillCategory[]
  skills: Skill[]
  onClose: () => void
  onSave: (task: Task) => Promise<void>
}

export function TaskEditor({ task, goals, categories, skills, onClose, onSave }: TaskEditorProps) {
  const [nameError, setNameError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? categories[0]?.id ?? '')
  const [difficulty, setDifficulty] = useState<TaskDifficulty>(task?.difficulty ?? 'medium')
  const [goalId, setGoalId] = useState(task?.goalId ?? '')
  const { isSubmitting, submissionError, clearSubmissionError, runSubmission } = useAsyncSubmission()

  const preview = useMemo(() => calculateTaskRewards(
    { categoryId: categoryId || null, difficulty, goalId: goalId || null },
    { skillCategories: categories, skills },
  ), [categoryId, difficulty, goalId, categories, skills])
  const previewSkill = skills.find((skill) => skill.id === preview.skills[0]?.skillId)
  const previewStat = STAT_KEYS.find((key) => (preview.stats[key] ?? 0) > 0)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (name.length === 0) {
      setNameError('请输入任务名称，名称不能只包含空格。')
      return
    }

    setNameError(null)
    const timestamp = nowIso()
    const entity: Task = {
      id: task?.id ?? createId('task'),
      goalId: goalId || null,
      categoryId: categoryId || null,
      name,
      description: String(form.get('description') ?? '').trim(),
      dueDate: String(form.get('dueDate') ?? '') || null,
      difficulty,
      status: task?.status === 'completed' ? 'completed' : task?.status ?? 'todo',
      rewards: task?.rewardApplied ? task.rewards : EMPTY_REWARDS,
      completedAt: task?.completedAt ?? null,
      rewardApplied: task?.rewardApplied ?? false,
      createdAt: task?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    const saved = await runSubmission(() => onSave(entity), '保存任务失败')
    if (saved) onClose()
  }

  return (
    <Modal
      open
      title={task === null ? '添加任务' : '编辑任务'}
      description={task?.rewardApplied ? '已完成任务的奖励保持锁定。' : '只填日常需要的信息，奖励由系统自动计算。'}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="任务名称" htmlFor="task-name" required error={nameError}>
          <input
            id="task-name"
            name="name"
            required
            autoFocus
            placeholder="例如：数学强化 2h"
            defaultValue={task?.name ?? ''}
            className={inputClassName}
            onChange={() => {
              setNameError(null)
              clearSubmissionError()
            }}
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="分类 / 标签" htmlFor="task-category">
            <select
              id="task-category"
              value={categoryId}
              className={inputClassName}
              onChange={(event) => setCategoryId(event.currentTarget.value)}
            >
              <option value="">未分类</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </FormField>
          <FormField label="难度" htmlFor="task-difficulty">
            <select
              id="task-difficulty"
              value={difficulty}
              className={inputClassName}
              onChange={(event) => setDifficulty(event.currentTarget.value as TaskDifficulty)}
            >
              {Object.entries(TASK_DIFFICULTY_LABELS).map(([value, label]) =>
                <option key={value} value={value}>{label}</option>,
              )}
            </select>
          </FormField>
          <FormField label="截止日期（可选）" htmlFor="task-due-date">
            <input
              id="task-due-date"
              name="dueDate"
              type="date"
              defaultValue={task?.dueDate?.slice(0, 10) ?? ''}
              className={inputClassName}
            />
          </FormField>
        </div>

        {!task?.rewardApplied ? (
          <div className="rounded-xl border border-exp/25 bg-exp-soft px-4 py-3 text-sm text-muted">
            <p className="flex items-center gap-2 font-medium text-exp"><Sparkles size={15} /> 自动奖励预览</p>
            <p className="mt-1.5">
              +{preview.exp} EXP
              {previewSkill ? ` · ${previewSkill.name} +${preview.skills[0]?.amount}` : ''}
              {previewStat ? ` · ${STAT_LABELS[previewStat]} +${preview.stats[previewStat]}` : ''}
              {preview.goalProgress > 0 ? ` · 目标 +${preview.goalProgress}%` : ''}
            </p>
          </div>
        ) : null}

        <details className="group rounded-xl border border-line bg-surface px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink">
            更多选项
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-4 border-t border-line pt-4">
            <FormField label="关联目标" htmlFor="task-goal">
              <select
                id="task-goal"
                value={goalId}
                className={inputClassName}
                onChange={(event) => setGoalId(event.currentTarget.value)}
              >
                <option value="">不关联目标</option>
                {goals.filter((goal) => goal.status !== 'completed').map((goal) =>
                  <option key={goal.id} value={goal.id}>{goal.name}</option>,
                )}
              </select>
            </FormField>
            <FormField label="描述" htmlFor="task-description">
              <textarea
                id="task-description"
                name="description"
                defaultValue={task?.description ?? ''}
                className={textareaClassName}
              />
            </FormField>
          </div>
        </details>

        {submissionError ? <p role="alert" className="text-sm text-danger">{submissionError}</p> : null}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中…' : '保存任务'}</Button>
        </div>
      </form>
    </Modal>
  )
}
