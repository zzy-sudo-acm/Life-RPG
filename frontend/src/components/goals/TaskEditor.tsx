import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useAsyncSubmission } from '../ui/useAsyncSubmission'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Boss,
  type Goal,
  type RewardBundle,
  type Skill,
  type StatKey,
  type Task,
} from '../../types/models'
import { toNumber } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'

interface TaskEditorProps {
  task: Task | null
  goals: Goal[]
  skills: Skill[]
  bosses: Boss[]
  onClose: () => void
  onSave: (task: Task) => Promise<void>
}

function nonNegative(value: FormDataEntryValue | null): number {
  return Math.max(0, toNumber(value))
}

export function TaskEditor({
  task,
  goals,
  skills,
  bosses,
  onClose,
  onSave,
}: TaskEditorProps) {
  const rewardLocked = task?.rewardApplied === true
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
      setNameError('请输入任务名称，名称不能只包含空格。')
      return
    }

    setNameError(null)
    const timestamp = nowIso()
    const stats: RewardBundle['stats'] = {}

    for (const key of STAT_KEYS) {
      const amount = nonNegative(form.get(`stat:${key}`))
      if (amount > 0) {
        stats[key] = amount
      }
    }

    const skillRewards = skills.flatMap((skill) => {
      const amount = nonNegative(form.get(`skill:${skill.id}`))
      return amount > 0 ? [{ skillId: skill.id, amount }] : []
    })
    const bossRewards = bosses.flatMap((boss) => {
      const damage = nonNegative(form.get(`boss:${boss.id}`))
      return damage > 0 ? [{ bossId: boss.id, damage }] : []
    })
    const status =
      task?.status === 'completed'
        ? 'completed'
        : (String(form.get('status')) as Task['status'])

    const entity: Task = {
      id: task?.id ?? createId('task'),
      goalId: String(form.get('goalId') ?? '') || null,
      name,
      type: String(form.get('type') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      dueDate: String(form.get('dueDate') ?? '') || null,
      status,
      rewards: rewardLocked
        ? task.rewards
        : {
            exp: nonNegative(form.get('exp')),
            stats,
            skills: skillRewards,
            bosses: bossRewards,
          },
      completedAt: task?.completedAt ?? null,
      rewardApplied: task?.rewardApplied ?? false,
      createdAt: task?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    const saved = await runSubmission(() => onSave(entity), '保存任务失败')
    if (saved) {
      onClose()
    }
  }

  const statReward = (key: StatKey) => task?.rewards.stats[key] ?? 0
  const skillReward = (skillId: string) =>
    task?.rewards.skills.find((reward) => reward.skillId === skillId)?.amount ?? 0
  const bossDamage = (bossId: string) =>
    task?.rewards.bosses.find((reward) => reward.bossId === bossId)?.damage ?? 0

  return (
    <Modal
      open
      wide
      title={task === null ? '创建任务' : '编辑任务'}
      description={
        rewardLocked
          ? '任务已结算；基础信息仍可修改，历史奖励保持锁定。'
          : '奖励会在点击“完成任务”时一次性结算。'
      }
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="space-y-4">
          <FormField
            label="任务名称"
            htmlFor="task-name"
            required
            error={nameError}
          >
            <input
              id="task-name"
              name="name"
              required
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? 'task-name-error' : undefined}
              defaultValue={task?.name ?? ''}
              className={inputClassName}
              onChange={() => {
                setNameError(null)
                clearSubmissionError()
              }}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="所属目标" htmlFor="task-goal">
              <select
                id="task-goal"
                name="goalId"
                defaultValue={task?.goalId ?? ''}
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
            <FormField label="任务类型" htmlFor="task-type">
              <input
                id="task-type"
                name="type"
                placeholder="学习、项目、运动…"
                defaultValue={task?.type ?? ''}
                className={inputClassName}
              />
            </FormField>
            <FormField label="截止日期" htmlFor="task-due-date">
              <input
                id="task-due-date"
                name="dueDate"
                type="date"
                defaultValue={task?.dueDate?.slice(0, 10) ?? ''}
                className={inputClassName}
              />
            </FormField>
          </div>
          <FormField label="描述" htmlFor="task-description">
            <textarea
              id="task-description"
              name="description"
              defaultValue={task?.description ?? ''}
              className={textareaClassName}
            />
          </FormField>
          <FormField label="状态" htmlFor="task-status">
            {task?.status === 'completed' ? (
              <div className="rounded-[10px] border border-line bg-[#f1f3f1] px-3 py-2 text-sm text-muted">
                已完成（奖励已结算，不能退回）
              </div>
            ) : (
              <select
                id="task-status"
                name="status"
                defaultValue={task?.status ?? 'todo'}
                className={inputClassName}
              >
                <option value="todo">待开始</option>
                <option value="in_progress">进行中</option>
              </select>
            )}
          </FormField>
        </section>

        <fieldset
          disabled={rewardLocked}
          className="space-y-4 border-t border-line pt-5 disabled:opacity-70"
        >
          <div>
            <h3 className="font-medium text-ink">完成奖励</h3>
            <p className="mt-1 text-sm text-muted">
              {rewardLocked
                ? '奖励已结算并锁定，避免与角色数值和历史事件不一致。'
                : '留空或填写 0 表示不提供该项奖励。'}
            </p>
          </div>
          <FormField label="角色 EXP" htmlFor="task-exp">
            <input
              id="task-exp"
              name="exp"
              type="number"
              min="0"
              defaultValue={task?.rewards.exp ?? 0}
              className={inputClassName}
            />
          </FormField>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">五维属性经验</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {STAT_KEYS.map((key) => (
                <FormField key={key} label={STAT_LABELS[key]} htmlFor={`task-stat-${key}`}>
                  <input
                    id={`task-stat-${key}`}
                    name={`stat:${key}`}
                    type="number"
                    min="0"
                    defaultValue={statReward(key)}
                    className={inputClassName}
                  />
                </FormField>
              ))}
            </div>
          </div>

          {skills.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">技能经验</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {skills.map((skill) => (
                  <FormField
                    key={skill.id}
                    label={skill.name}
                    htmlFor={`task-skill-${skill.id}`}
                  >
                    <input
                      id={`task-skill-${skill.id}`}
                      name={`skill:${skill.id}`}
                      type="number"
                      min="0"
                      defaultValue={skillReward(skill.id)}
                      className={inputClassName}
                    />
                  </FormField>
                ))}
              </div>
            </div>
          ) : null}

          {bosses.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Boss 伤害</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {bosses.map((boss) => (
                  <FormField
                    key={boss.id}
                    label={boss.name}
                    htmlFor={`task-boss-${boss.id}`}
                  >
                    <input
                      id={`task-boss-${boss.id}`}
                      name={`boss:${boss.id}`}
                      type="number"
                      min="0"
                      defaultValue={bossDamage(boss.id)}
                      className={inputClassName}
                    />
                  </FormField>
                ))}
              </div>
            </div>
          ) : null}
        </fieldset>

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
            {isSubmitting ? '保存中…' : '保存任务'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
