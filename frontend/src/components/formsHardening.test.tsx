import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import defaultDataJson from '../data/defaultData.json'
import type { AppData, Task } from '../types/models'
import { BossEditor } from './bosses/BossEditor'
import { GoalEditor } from './goals/GoalEditor'
import { TaskEditor } from './goals/TaskEditor'
import { SkillCategoryEditor } from './skills/SkillCategoryEditor'
import { SkillEditor } from './skills/SkillEditor'

const defaultData = defaultDataJson as AppData

type NamedEditor = 'goal' | 'task' | 'skill' | 'category' | 'boss'

function renderNamedEditor(
  editor: NamedEditor,
  onSave: (value: unknown) => void | Promise<void>,
  onClose: () => void = vi.fn(),
) {
  switch (editor) {
    case 'goal':
      return render(
        <GoalEditor
          goal={null}
          goals={defaultData.goals}
          onClose={onClose}
          onSave={async (goal) => {
            await onSave(goal)
          }}
        />,
      )
    case 'task':
      return render(
        <TaskEditor
          task={null}
          goals={defaultData.goals}
          skills={defaultData.skills}
          bosses={defaultData.bosses}
          onClose={onClose}
          onSave={async (task) => {
            await onSave(task)
          }}
        />,
      )
    case 'skill':
      return render(
        <SkillEditor
          skill={null}
          categories={defaultData.skillCategories}
          skills={defaultData.skills}
          initialCategoryId={defaultData.skillCategories[0]?.id ?? null}
          onClose={onClose}
          onSave={async (skill) => {
            await onSave(skill)
          }}
        />,
      )
    case 'category':
      return render(
        <SkillCategoryEditor
          category={null}
          onClose={onClose}
          onSave={async (category) => {
            await onSave(category)
          }}
        />,
      )
    case 'boss':
      return render(
        <BossEditor
          boss={null}
          goals={defaultData.goals}
          onClose={onClose}
          onSave={async (boss) => {
            await onSave(boss)
          }}
        />,
      )
  }
}

describe('CRUD 表单加固', () => {
  it.each([
    ['goal', '目标名称'],
    ['task', '任务名称'],
    ['skill', '技能名称'],
    ['category', '分类名称'],
    ['boss', 'Boss 名称'],
  ] as const)('%s 名称只含空格时不保存', async (editor, label) => {
    const user = userEvent.setup()
    const onSave = vi.fn((_value: unknown) => undefined)
    renderNamedEditor(editor, onSave)

    await user.type(screen.getByLabelText(new RegExp(label)), '   ')
    await user.click(screen.getByRole('button', { name: /^保存/ }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('不能只包含空格')
  })

  it('异步保存期间阻止重复提交和关闭', async () => {
    const user = userEvent.setup()
    let resolveSave: (() => void) | undefined
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    const onClose = vi.fn()
    renderNamedEditor('goal', onSave, onClose)

    await user.type(screen.getByLabelText(/目标名称/), '长期目标')
    const saveButton = screen.getByRole('button', { name: '保存目标' })
    await user.click(saveButton)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '关闭' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    resolveSave?.()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('已结算任务保存基础信息时仍保留原奖励', async () => {
    const user = userEvent.setup()
    const task: Task = {
      ...defaultData.tasks[0]!,
      status: 'completed',
      completedAt: '2026-08-24T12:00:00.000Z',
      rewardApplied: true,
    }
    const onSave = vi.fn(async (_savedTask: Task) => undefined)

    render(
      <TaskEditor
        task={task}
        goals={defaultData.goals}
        skills={defaultData.skills}
        bosses={defaultData.bosses}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    const nameInput = screen.getByLabelText(/任务名称/)
    await user.clear(nameInput)
    await user.type(nameInput, '更新后的任务名称')
    await user.click(screen.getByRole('button', { name: '保存任务' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const savedTask = onSave.mock.calls[0]?.[0]
    expect(savedTask).toBeDefined()
    if (savedTask === undefined) {
      return
    }
    expect(savedTask.rewards).toEqual(task.rewards)
    expect(savedTask.rewardApplied).toBe(true)
    expect(savedTask.status).toBe('completed')
  })
})
