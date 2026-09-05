import {
  ArrowUpRight,
  Award,
  BookOpen,
  ChevronDown,
  Footprints,
  Pencil,
  Settings2,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SkillCategoryEditor } from '../components/skills/SkillCategoryEditor'
import { SkillEditor } from '../components/skills/SkillEditor'
import { Button } from '../components/ui/Button'
import { FormField, inputClassName } from '../components/ui/FormField'
import { LevelSeal } from '../components/ui/LevelSeal'
import { Modal } from '../components/ui/Modal'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RadarChart } from '../components/ui/RadarChart'
import { useAppStore } from '../store/AppStoreContext'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Character,
  type Skill,
  type SkillCategory,
  type StatKey,
} from '../types/models'
import { formatNumber, toNumber } from '../utils/format'

type EditorState<T> = T | 'new' | null

export function CharacterPage() {
  const { data, updateCharacter, changeStat, saveEntity, deleteEntity } =
    useAppStore()
  const [characterOpen, setCharacterOpen] = useState(false)
  const [statOpen, setStatOpen] = useState(false)
  const [skillEditor, setSkillEditor] = useState<EditorState<Skill>>(null)
  const [categoryEditor, setCategoryEditor] =
    useState<EditorState<SkillCategory>>(null)
  const [error, setError] = useState<string | null>(null)
  if (!data) return null

  const remove = async (
    collection: 'skills' | 'skillCategories',
    id: string,
    label: string,
  ) => {
    if (!window.confirm(`删除“${label}”吗？`)) return
    setError(null)
    try {
      await deleteEntity(collection, id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败，请重试。')
    }
  }

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
            成长档案
          </h1>
          <p className="mt-2 text-xs leading-6 text-muted sm:text-sm">
            认识现在的自己，看见慢慢积累的成长。
          </p>
        </div>
        <Button
          variant="secondary"
          className="min-h-11 shrink-0"
          icon={<Pencil size={15} />}
          onClick={() => setCharacterOpen(true)}
        >
          编辑档案
        </Button>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <Panel glow className="p-5 sm:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <LevelSeal level={data.character.level} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  {data.character.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {data.character.profession} · {data.character.lifeStage}
                </p>
              </div>
              <p className="text-sm text-muted">
                总 EXP{' '}
                <strong className="text-lg tabular-nums text-primary">
                  {formatNumber(data.character.totalExp)}
                </strong>
              </p>
            </div>
            <div className="mt-4">
              <ProgressBar
                value={data.character.exp}
                max={data.character.expToNextLevel}
                size="lg"
                label={`Lv.${data.character.level} · EXP ${formatNumber(data.character.exp)} / ${formatNumber(data.character.expToNextLevel)}`}
              />
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="skills-heading">
          <div className="mb-3">
            <h2
              id="skills-heading"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink lg:text-xl"
            >
              <BookOpen size={19} className="text-muted" /> 技能
            </h2>
            <p className="mt-1 hidden text-xs text-faint lg:block">
              完成同分类任务时自动成长
            </p>
          </div>
          <Panel className="divide-y divide-line overflow-hidden">
            {data.skillCategories.map((category) => {
              const skills = data.skills.filter(
                (skill) => skill.categoryId === category.id,
              )
              if (skills.length === 0) return null
              return (
                <div key={category.id} className="p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-muted">
                    {category.name}
                  </h3>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {skills.map((skill) => (
                      <li
                        key={skill.id}
                        className="rounded-xl bg-raised p-3 ring-1 ring-white/6"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-ink">
                            {skill.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-arcane-soft px-2 py-0.5 text-xs font-semibold text-arcane">
                            Lv.{skill.level}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <ProgressBar
                            value={skill.exp}
                            max={skill.expToNextLevel}
                            size="sm"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {data.skills.length === 0 ? (
              <p className="p-6 text-sm text-muted">
                还没有技能，任务仍会获得角色 EXP 与属性成长。
              </p>
            ) : null}
          </Panel>
        </section>

        <section aria-labelledby="stats-heading">
          <div className="mb-3">
            <h2
              id="stats-heading"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink lg:text-xl"
            >
              <TrendingUp size={19} className="text-muted" /> 五维属性
            </h2>
            <p className="mt-1 hidden text-xs text-faint lg:block">
              分类决定任务主要成长方向
            </p>
          </div>
          <Panel className="p-4 sm:p-5">
            <RadarChart values={data.stats.values} />
          </Panel>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <Link
          to="/achievements"
          className="group flex min-h-24 items-center gap-3 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-primary/30 sm:p-5"
        >
          <Award size={23} className="shrink-0 text-primary/70" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">成就馆</h2>
            <p className="mt-1 text-xs text-muted">
              {
                data.achievements.filter(
                  (achievement) => achievement.unlockedAt !== null,
                ).length
              }{' '}
              枚成长收藏
            </p>
          </div>
          <ArrowUpRight size={16} className="hidden text-faint sm:block" />
        </Link>
        <Link
          to="/journal"
          className="group flex min-h-24 items-center gap-3 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-primary/30 sm:p-5"
        >
          <Footprints size={23} className="shrink-0 text-primary/70" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">成长足迹</h2>
            <p className="mt-1 text-xs text-muted">
              {data.events.length} 个值得记住的时刻
            </p>
          </div>
          <ArrowUpRight size={16} className="hidden text-faint sm:block" />
        </Link>
      </div>
      <details className="group rounded-2xl bg-surface p-4 ring-1 ring-white/8 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
          <span className="flex items-center gap-2">
            <Settings2 size={18} className="text-muted" /> 高级成长管理
          </span>
          <ChevronDown
            size={18}
            className="transition-transform group-open:rotate-180"
          />
        </summary>
        <p className="mt-2 text-sm text-muted">
          技能会随行动自动成长，你也可以在这里管理技能与属性。
        </p>
        <div className="mt-5 border-t border-line pt-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">技能与分类</h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="min-h-8 px-2 text-xs"
                  onClick={() => setCategoryEditor('new')}
                >
                  + 分类
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-8 px-2 text-xs"
                  onClick={() => setSkillEditor('new')}
                >
                  + 技能
                </Button>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {data.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="flex items-center justify-between rounded-lg bg-raised px-3 py-2 text-sm"
                >
                  <span>
                    {skill.name} · Lv.{skill.level}
                  </span>
                  <span className="flex">
                    <button
                      className="p-1.5 text-muted hover:text-primary"
                      aria-label={`编辑技能：${skill.name}`}
                      onClick={() => setSkillEditor(skill)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="p-1.5 text-muted hover:text-danger"
                      aria-label={`删除技能：${skill.name}`}
                      onClick={() =>
                        void remove('skills', skill.id, skill.name)
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => setStatOpen(true)}
            >
              手动调整属性
            </Button>
          </div>
        </div>
      </details>

      {characterOpen ? (
        <CharacterEditor
          character={data.character}
          goals={data.goals}
          onClose={() => setCharacterOpen(false)}
          onSave={updateCharacter}
        />
      ) : null}
      {statOpen ? (
        <StatEditor onClose={() => setStatOpen(false)} onSave={changeStat} />
      ) : null}
      {skillEditor !== null ? (
        <SkillEditor
          skill={skillEditor === 'new' ? null : skillEditor}
          categories={data.skillCategories}
          skills={data.skills}
          initialCategoryId={data.skillCategories[0]?.id ?? null}
          onClose={() => setSkillEditor(null)}
          onSave={(skill) => saveEntity('skills', skill)}
        />
      ) : null}
      {categoryEditor !== null ? (
        <SkillCategoryEditor
          category={categoryEditor === 'new' ? null : categoryEditor}
          onClose={() => setCategoryEditor(null)}
          onSave={(category) => saveEntity('skillCategories', category)}
        />
      ) : null}
    </div>
  )
}

function CharacterEditor({
  character,
  goals,
  onClose,
  onSave,
}: {
  character: Character
  goals: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (patch: Partial<Character>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!String(form.get('name') ?? '').trim()) {
      setError('请输入档案名称。')
      return
    }
    setSaving(true)
    setError(null)
    void onSave({
      name: String(form.get('name') ?? '').trim(),
      profession: String(form.get('profession') ?? '').trim(),
      lifeStage: String(form.get('lifeStage') ?? '').trim(),
      primaryGoalId: String(form.get('primaryGoalId') ?? '') || null,
    })
      .then(onClose)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : '保存档案失败，请重试。',
        ),
      )
      .finally(() => setSaving(false))
  }
  return (
    <Modal open title="编辑成长档案" onClose={onClose} closeDisabled={saving}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <FormField label="档案名称" htmlFor="character-name">
          <input
            id="character-name"
            name="name"
            required
            defaultValue={character.name}
            className={inputClassName}
          />
        </FormField>
        <FormField label="职业 / 身份" htmlFor="character-profession">
          <input
            id="character-profession"
            name="profession"
            defaultValue={character.profession}
            className={inputClassName}
          />
        </FormField>
        <FormField label="当前阶段" htmlFor="character-stage">
          <input
            id="character-stage"
            name="lifeStage"
            defaultValue={character.lifeStage}
            className={inputClassName}
          />
        </FormField>
        <FormField label="主要目标" htmlFor="character-goal">
          <select
            id="character-goal"
            name="primaryGoalId"
            defaultValue={character.primaryGoalId ?? ''}
            className={inputClassName}
          >
            <option value="">暂不设置</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存档案'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function StatEditor({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (key: StatKey, amount: number, note: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    void onSave(
      String(form.get('key')) as StatKey,
      toNumber(form.get('amount')),
      String(form.get('note') ?? '').trim(),
    )
      .then(onClose)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : '保存属性失败，请重试。',
        ),
      )
      .finally(() => setSaving(false))
  }
  return (
    <Modal
      open
      title="手动调整属性"
      description="这是高级入口；任务完成会自动增长属性。"
      onClose={onClose}
      closeDisabled={saving}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <FormField label="属性" htmlFor="stat-key">
          <select id="stat-key" name="key" className={inputClassName}>
            {STAT_KEYS.map((key) => (
              <option key={key} value={key}>
                {STAT_LABELS[key]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="变化值" htmlFor="stat-amount">
          <input
            id="stat-amount"
            name="amount"
            type="number"
            step="0.25"
            defaultValue="1"
            className={inputClassName}
          />
        </FormField>
        <FormField label="说明" htmlFor="stat-note">
          <input
            id="stat-note"
            name="note"
            placeholder="为什么调整"
            className={inputClassName}
          />
        </FormField>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存调整'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
