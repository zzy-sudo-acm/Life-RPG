import { GitBranch, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SkillCategoryEditor } from '../components/skills/SkillCategoryEditor'
import { SkillEditor } from '../components/skills/SkillEditor'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAppStore } from '../store/AppStoreContext'
import type { Skill, SkillCategory } from '../types/models'

interface SkillRow {
  skill: Skill
  depth: number
}

function flattenSkills(skills: Skill[]): SkillRow[] {
  const skillIds = new Set(skills.map((skill) => skill.id))
  const children = new Map<string | null, Skill[]>()

  for (const skill of skills) {
    const parentId =
      skill.parentId !== null && skillIds.has(skill.parentId)
        ? skill.parentId
        : null
    const siblings = children.get(parentId) ?? []
    siblings.push(skill)
    children.set(parentId, siblings)
  }

  for (const siblings of children.values()) {
    siblings.sort((left, right) =>
      left.level === right.level
        ? left.createdAt.localeCompare(right.createdAt)
        : right.level - left.level,
    )
  }

  const rows: SkillRow[] = []
  const visited = new Set<string>()
  const visit = (skill: Skill, depth: number) => {
    if (visited.has(skill.id)) return
    visited.add(skill.id)
    rows.push({ skill, depth })
    for (const child of children.get(skill.id) ?? []) {
      visit(child, depth + 1)
    }
  }

  for (const root of children.get(null) ?? []) {
    visit(root, 0)
  }
  for (const skill of skills) {
    visit(skill, 0)
  }
  return rows
}

export function SkillsPage() {
  const { data, saveEntity, deleteEntity } = useAppStore()
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null)
  const [skillEditorOpen, setSkillEditorOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null)

  if (data === null) return null

  const categories = data.skillCategories.toSorted(
    (left, right) => left.order - right.order || left.name.localeCompare(right.name),
  )
  const skillNames = new Map(data.skills.map((skill) => [skill.id, skill.name]))

  const openNewCategory = () => {
    setEditingCategory(null)
    setCategoryEditorOpen(true)
  }
  const openCategory = (category: SkillCategory) => {
    setEditingCategory(category)
    setCategoryEditorOpen(true)
  }
  const openNewSkill = (categoryId: string | null = null) => {
    setEditingSkill(null)
    setInitialCategoryId(categoryId)
    setSkillEditorOpen(true)
  }
  const openSkill = (skill: Skill) => {
    setEditingSkill(skill)
    setInitialCategoryId(skill.categoryId)
    setSkillEditorOpen(true)
  }

  const handleDeleteSkill = async (skill: Skill): Promise<void> => {
    if (!window.confirm(`确定删除技能“${skill.name}”吗？任务中的对应奖励也会移除。`)) {
      return
    }

    await deleteEntity('skills', skill.id)
  }

  const handleDeleteCategory = async (
    category: SkillCategory,
  ): Promise<void> => {
    const categorySkills = data.skills.filter(
      (skill) => skill.categoryId === category.id,
    )
    const confirmed = window.confirm(
      `确定删除分类“${category.name}”吗？${categorySkills.length > 0 ? `\n该分类下 ${categorySkills.length} 个技能也会删除，任务中的对应奖励会移除。` : ''}`,
    )
    if (!confirmed) return

    await deleteEntity('skillCategories', category.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="技能树"
        description="按分类维护可升级技能，并用父子关系表达学习路径。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={openNewCategory}
            >
              新建分类
            </Button>
            <Button
              icon={<Plus size={16} />}
              disabled={categories.length === 0}
              onClick={() => openNewSkill()}
            >
              新建技能
            </Button>
          </div>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="还没有技能分类"
          description="先创建一个分类，再添加具体技能。"
          action={<Button onClick={openNewCategory}>创建分类</Button>}
        />
      ) : (
        <div className="space-y-5">
          {categories.map((category) => {
            const categorySkills = data.skills.filter(
              (skill) => skill.categoryId === category.id,
            )
            const skillRows = flattenSkills(categorySkills)
            return (
              <Panel key={category.id} className="overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <GitBranch size={17} className="shrink-0 text-primary" />
                      <h2 className="font-semibold text-ink">{category.name}</h2>
                      <span className="text-xs text-muted">
                        {categorySkills.length} 项
                      </span>
                    </div>
                    {category.description ? (
                      <p className="mt-1 text-sm text-muted">{category.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      icon={<Plus size={15} />}
                      onClick={() => openNewSkill(category.id)}
                    >
                      添加技能
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2"
                      aria-label={`编辑分类：${category.name}`}
                      onClick={() => openCategory(category)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 text-danger"
                      aria-label={`删除分类：${category.name}`}
                      onClick={() =>
                        void handleDeleteCategory(category).catch(() => undefined)
                      }
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </header>

                {skillRows.length === 0 ? (
                  <div className="p-4 sm:p-5">
                    <EmptyState
                      title="这个分类还没有技能"
                      description="添加技能后，可以继续建立父子技能路径。"
                      action={
                        <Button onClick={() => openNewSkill(category.id)}>
                          添加技能
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {skillRows.map(({ skill, depth }) => (
                      <article
                        key={skill.id}
                        className="px-4 py-4 sm:px-5"
                        style={{ paddingLeft: `${20 + Math.min(depth, 4) * 18}px` }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <h3 className="font-medium text-ink">{skill.name}</h3>
                              <span className="font-semibold text-primary">
                                Lv.{skill.level}
                              </span>
                              {skill.parentId !== null ? (
                                <span className="text-xs text-muted">
                                  上级：{skillNames.get(skill.parentId) ?? '未知技能'}
                                </span>
                              ) : null}
                            </div>
                            {skill.description ? (
                              <p className="mt-1 text-sm text-muted">
                                {skill.description}
                              </p>
                            ) : null}
                            <div className="mt-3 max-w-xl">
                              <ProgressBar
                                value={skill.exp}
                                max={skill.expToNextLevel}
                                tone="exp"
                                label={`经验 ${skill.exp} / ${skill.expToNextLevel}`}
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              className="px-2"
                              aria-label={`编辑技能：${skill.name}`}
                              onClick={() => openSkill(skill)}
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-2 text-danger"
                              aria-label={`删除技能：${skill.name}`}
                              onClick={() =>
                                void handleDeleteSkill(skill).catch(() => undefined)
                              }
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      {categoryEditorOpen ? (
        <SkillCategoryEditor
          category={editingCategory}
          onClose={() => setCategoryEditorOpen(false)}
          onSave={(category) => saveEntity('skillCategories', category)}
        />
      ) : null}
      {skillEditorOpen ? (
        <SkillEditor
          skill={editingSkill}
          categories={categories}
          skills={data.skills}
          initialCategoryId={initialCategoryId}
          onClose={() => setSkillEditorOpen(false)}
          onSave={(skill) => saveEntity('skills', skill)}
        />
      ) : null}
    </div>
  )
}
