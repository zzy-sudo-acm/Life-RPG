import { ChevronDown, Sparkles } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
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

const CATEGORY_RECOMMENDATIONS = [
  { keywords: ['数学', '高数', '线代', '概率'], categoryNames: ['数学'] },
  { keywords: ['英语', '单词', '阅读'], categoryNames: ['英语', '语言'] },
  { keywords: ['408', '操作系统', '数据结构', '计算机网络'], categoryNames: ['计算机'] },
  { keywords: ['跑步', '健身'], categoryNames: ['健康', '运动'] },
] as const

function recommendCategoryId(name: string, categories: SkillCategory[]): string | null {
  const recommendation = CATEGORY_RECOMMENDATIONS.find(({ keywords }) =>
    keywords.some((keyword) => name.includes(keyword)),
  )
  if (recommendation === undefined) return null

  return categories.find((category) =>
    recommendation.categoryNames.some((categoryName) => category.name.includes(categoryName)),
  )?.id ?? null
}

export function TaskEditor({ task, goals, categories, skills, onClose, onSave }: TaskEditorProps) {
  const formId = useId()
  const [nameError, setNameError] = useState<string | null>(null)
  const [name, setName] = useState(task?.name ?? '')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? categories[0]?.id ?? '')
  const [categoryManuallyChanged, setCategoryManuallyChanged] = useState(false)
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
      footer={(
        <div className="space-y-2">
          {submissionError ? <p role="alert" className="text-sm text-danger">{submissionError}</p> : null}
          <Button className="min-h-12 w-full" type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? '保存中…' : '保存任务'}
          </Button>
        </div>
      )}
    >
      <form id={formId} className="space-y-3" onSubmit={handleSubmit}>
        <FormField label="任务名称" htmlFor="task-name" required error={nameError}>
          <input
            id="task-name"
            name="name"
            required
            autoFocus
            placeholder="例如：数学强化 2h"
            value={name}
            className={inputClassName}
            onChange={(event) => {
              const nextName = event.currentTarget.value
              setName(nextName)
              setNameError(null)
              clearSubmissionError()
              if (task === null && !categoryManuallyChanged) {
                const recommendation = recommendCategoryId(nextName, categories)
                if (recommendation !== null) setCategoryId(recommendation)
              }
            }}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="分类" htmlFor="task-category">
            <select
              id="task-category"
              value={categoryId}
              className={inputClassName}
              onChange={(event) => {
                setCategoryId(event.currentTarget.value)
                setCategoryManuallyChanged(true)
              }}
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
        </div>

        {!task?.rewardApplied ? (
          <div aria-label="自动奖励预览" className="flex min-h-10 items-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-2 text-xs text-muted">
            <Sparkles size={14} className="shrink-0 text-primary" />
            <p className="min-w-0 leading-5">
              <span className="font-medium text-ink">自动奖励</span>{' · '}
              +{preview.exp} EXP
              {previewSkill ? ` · ${previewSkill.name} +${preview.skills[0]?.amount}` : ''}
              {previewStat ? ` · ${STAT_LABELS[previewStat]} +${preview.stats[previewStat]}` : ''}
              {preview.goalProgress > 0 ? ` · 目标 +${preview.goalProgress}%` : ''}
            </p>
          </div>
        ) : null}

        <details className="group rounded-xl bg-ink/[0.04] px-3.5 py-3">
          <summary className="flex min-h-5 cursor-pointer list-none items-center justify-between text-sm font-medium text-ink">
            更多选项
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-3 border-t border-line pt-3">
            <FormField label="截止日期" htmlFor="task-due-date">
              <input
                id="task-due-date"
                name="dueDate"
                type="date"
                defaultValue={task?.dueDate?.slice(0, 10) ?? ''}
                className={inputClassName}
              />
            </FormField>
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
            <FormField label="备注" htmlFor="task-description">
              <textarea
                id="task-description"
                name="description"
                defaultValue={task?.description ?? ''}
                className={textareaClassName}
              />
            </FormField>
          </div>
        </details>
      </form>
    </Modal>
  )
}
