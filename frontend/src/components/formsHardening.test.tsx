import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import defaultDataJson from '../data/defaultData.json'
import type { AppData, Task } from '../types/models'
import { GoalEditor } from './goals/GoalEditor'
import { TaskEditor } from './goals/TaskEditor'
import { SkillCategoryEditor } from './skills/SkillCategoryEditor'
import { SkillEditor } from './skills/SkillEditor'

const defaultData = defaultDataJson as AppData

describe('精简 CRUD 表单', () => {
  it('任务首屏只展示名称、分类、难度、紧凑奖励和更多选项', async () => {
    const user = userEvent.setup()
    render(
      <TaskEditor
        task={null}
        goals={defaultData.goals}
        categories={defaultData.skillCategories}
        skills={defaultData.skills}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/任务名称/)).toBeInTheDocument()
    expect(screen.getByLabelText('分类')).toBeInTheDocument()
    expect(screen.getByLabelText('难度')).toBeInTheDocument()
    expect(screen.getByLabelText(/截止日期/)).not.toBeVisible()
    expect(screen.queryByLabelText('角色 EXP')).not.toBeInTheDocument()
    expect(screen.queryByText('Boss 伤害')).not.toBeInTheDocument()
    expect(screen.getByLabelText('自动奖励预览')).toHaveTextContent('自动奖励 · +')
    expect(screen.getByRole('button', { name: '保存任务' })).toHaveAttribute('form')
    expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument()

    await user.click(screen.getByText('更多选项'))
    expect(screen.getByLabelText(/截止日期/)).toBeVisible()
    expect(screen.getByLabelText('关联目标')).toBeVisible()
    expect(screen.getByLabelText('备注')).toBeVisible()
  })

  it('根据任务关键词推荐分类，手动选择后不再覆盖', async () => {
    const user = userEvent.setup()
    render(
      <TaskEditor
        task={null}
        goals={defaultData.goals}
        categories={defaultData.skillCategories}
        skills={defaultData.skills}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    const name = screen.getByLabelText(/任务名称/)
    const category = screen.getByLabelText('分类')
    await user.type(name, '英语阅读')
    expect(category).toHaveValue('category-language')
    await user.selectOptions(category, 'category-mathematics')
    await user.clear(name)
    await user.type(name, '复习 408 数据结构')
    expect(category).toHaveValue('category-mathematics')
  })

  it.each(['goal', 'task', 'skill', 'category'] as const)('%s 名称只含空格时不保存', async (kind) => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    if (kind === 'goal') render(<GoalEditor goal={null} goals={defaultData.goals} onClose={vi.fn()} onSave={onSave} />)
    if (kind === 'task') render(<TaskEditor task={null} goals={defaultData.goals} categories={defaultData.skillCategories} skills={defaultData.skills} onClose={vi.fn()} onSave={onSave} />)
    if (kind === 'skill') render(<SkillEditor skill={null} categories={defaultData.skillCategories} skills={defaultData.skills} initialCategoryId={defaultData.skillCategories[0]?.id ?? null} onClose={vi.fn()} onSave={onSave} />)
    if (kind === 'category') render(<SkillCategoryEditor category={null} onClose={vi.fn()} onSave={onSave} />)

    const input = screen.getByRole('textbox', { name: /名称/ })
    await user.type(input, '   ')
    await user.click(screen.getByRole('button', { name: /^保存/ }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('不能只包含空格')
  })

  it('异步保存期间阻止重复提交和关闭', async () => {
    const user = userEvent.setup()
    let resolveSave: (() => void) | undefined
    const onSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve }))
    const onClose = vi.fn()
    render(<GoalEditor goal={null} goals={defaultData.goals} onClose={onClose} onSave={onSave} />)

    await user.type(screen.getByLabelText(/目标名称/), '长期目标')
    await user.click(screen.getByRole('button', { name: '保存目标' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    resolveSave?.()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('已完成任务编辑时保留结算奖励', async () => {
    const user = userEvent.setup()
    const task: Task = {
      ...defaultData.tasks[0]!,
      status: 'completed',
      completedAt: '2026-08-24T12:00:00.000Z',
      rewardApplied: true,
    }
    const onSave = vi.fn(async (_task: Task) => undefined)
    render(<TaskEditor task={task} goals={defaultData.goals} categories={defaultData.skillCategories} skills={defaultData.skills} onClose={vi.fn()} onSave={onSave} />)

    const input = screen.getByLabelText(/任务名称/)
    await user.clear(input)
    await user.type(input, '更新后的任务')
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0]?.[0].rewards).toEqual(task.rewards)
    expect(onSave.mock.calls[0]?.[0].rewardApplied).toBe(true)
  })
})
