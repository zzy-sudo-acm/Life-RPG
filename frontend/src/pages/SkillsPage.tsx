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
import { cn } from '../utils/cn'

/** 技能段位：纯展示层映射，按等级划分成长阶段。 */
interface SkillTier {
  label: string
  color: string
}

function skillTier(skill: Skill): SkillTier {
  if (skill.level >= 20) return { label: '大师', color: '#a97c1f' }
  if (skill.level >= 10) return { label: '精通', color: '#6a5a8a' }
  if (skill.level >= 5) return { label: '熟练', color: '#4a6a8a' }
  return { label: '入门', color: '#4a7a5e' }
}

/** 尚未投入任何经验的技能显示为「未点亮」状态。 */
function isUntouched(skill: Skill): boolean {
  return skill.level <= 1 && skill.exp === 0
}

function buildChildrenMap(skills: Skill[]): Map<string | null, Skill[]> {
  const skillIds = new Set(skills.map((skill) => skill.id))
  const children = new Map<string | null, Skill[]>()

  for (const skill of skills) {
    const parentId =
      skill.parentId !== null && skillIds.has(skill.parentId) ? skill.parentId : null
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

  return children
}

interface SkillBranchProps {
  skill: Skill
  childrenMap: Map<string | null, Skill[]>
  onEdit: (skill: Skill) => void
  onDelete: (skill: Skill) => void
}

function SkillBranch({ skill, childrenMap, onEdit, onDelete }: SkillBranchProps) {
  const tier = skillTier(skill)
  const untouched = isUntouched(skill)
  const children = childrenMap.get(skill.id) ?? []

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-3 transition-colors hover:border-line hover:bg-ink/4 sm:px-3',
          untouched && 'opacity-55',
        )}
      >
        {/* 技能徽记：外圈颜色代表段位 */}
        <span
          className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border bg-canvas/60 font-black leading-none"
          style={{ borderColor: `${tier.color}66`, color: tier.color }}
        >
          <span className="text-[9px] font-medium opacity-70">Lv</span>
          <span className="text-sm tabular-nums">{skill.level}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-ink">{skill.name}</h3>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{
                borderColor: `${tier.color}55`,
                backgroundColor: `${tier.color}14`,
                color: tier.color,
              }}
            >
              {untouched ? '未点亮' : tier.label}
            </span>
          </div>
          {skill.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{skill.description}</p>
          ) : null}
          <ProgressBar
            className="mt-2 max-w-md"
            value={skill.exp}
            max={skill.expToNextLevel}
            tone="exp"
            size="sm"
            label={`经验 ${skill.exp} / ${skill.expToNextLevel}`}
          />
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            className="min-h-9 px-2"
            aria-label={`编辑技能：${skill.name}`}
            onClick={() => onEdit(skill)}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-danger hover:bg-danger-soft hover:text-danger"
            aria-label={`删除技能：${skill.name}`}
            onClick={() => onDelete(skill)}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {/* 子技能：用左侧竖线表达成长路径 */}
      {children.length > 0 ? (
        <div className="ml-5 space-y-1 border-l border-line/70 pl-3 sm:ml-7 sm:pl-4">
          {children.map((child) => (
            <SkillBranch
              key={child.id}
              skill={child}
              childrenMap={childrenMap}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
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
        eyebrow="Skill Tree"
        title="技能树"
        description="按分类维护可升级技能，父子关系表达学习路径，等级点亮段位。"
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
          icon={<GitBranch size={22} />}
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
            const childrenMap = buildChildrenMap(categorySkills)
            const roots = childrenMap.get(null) ?? []
            const totalLevels = categorySkills.reduce((sum, skill) => sum + skill.level, 0)

            return (
              <Panel key={category.id} className="overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-line/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <GitBranch size={17} className="shrink-0 text-primary" />
                      <h2 className="font-semibold text-ink">{category.name}</h2>
                      <span className="rounded-full border border-line bg-ink/4 px-2 py-0.5 text-xs text-muted">
                        {categorySkills.length} 项 · 总 Lv.{totalLevels}
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
                      className="min-h-9 px-2"
                      aria-label={`编辑分类：${category.name}`}
                      onClick={() => openCategory(category)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2 text-danger hover:bg-danger-soft hover:text-danger"
                      aria-label={`删除分类：${category.name}`}
                      onClick={() =>
                        void handleDeleteCategory(category).catch(() => undefined)
                      }
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </header>

                {roots.length === 0 ? (
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
                  <div className="space-y-1 p-3 sm:p-4">
                    {roots.map((skill) => (
                      <SkillBranch
                        key={skill.id}
                        skill={skill}
                        childrenMap={childrenMap}
                        onEdit={openSkill}
                        onDelete={(target) => void handleDeleteSkill(target).catch(() => undefined)}
                      />
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
