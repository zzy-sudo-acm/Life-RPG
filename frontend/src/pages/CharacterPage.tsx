import { Award, BookOpen, ChevronDown, Footprints, Pencil, Plus, Settings2, Trash2, TrendingUp } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AchievementEditor } from '../components/collection/AchievementEditor'
import { EventEditor } from '../components/events/EventEditor'
import { SkillCategoryEditor } from '../components/skills/SkillCategoryEditor'
import { SkillEditor } from '../components/skills/SkillEditor'
import { Button } from '../components/ui/Button'
import { FormField, inputClassName } from '../components/ui/FormField'
import { LevelSeal } from '../components/ui/LevelSeal'
import { Modal } from '../components/ui/Modal'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAppStore } from '../store/AppStoreContext'
import { STAT_KEYS, STAT_LABELS, type Achievement, type Character, type LifeEvent, type Skill, type SkillCategory, type StatKey } from '../types/models'
import { cn } from '../utils/cn'
import { formatDate, formatNumber, toNumber } from '../utils/format'

type EditorState<T> = T | 'new' | null

const EVENT_ICONS: Record<LifeEvent['sourceType'], string> = {
  manual: '✦',
  achievement: '🏆',
  goal: '🏁',
  stage: '📖',
}

export function CharacterPage() {
  const { data, updateCharacter, changeStat, saveEntity, deleteEntity } = useAppStore()
  const [characterOpen, setCharacterOpen] = useState(false)
  const [statOpen, setStatOpen] = useState(false)
  const [skillEditor, setSkillEditor] = useState<EditorState<Skill>>(null)
  const [categoryEditor, setCategoryEditor] = useState<EditorState<SkillCategory>>(null)
  const [achievementEditor, setAchievementEditor] = useState<EditorState<Achievement>>(null)
  const [eventEditor, setEventEditor] = useState<EditorState<LifeEvent>>(null)
  if (!data) return null

  const unlockedAchievements = data.achievements
    .filter((achievement) => achievement.unlockedAt !== null)
    .toSorted((left, right) => (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? ''))
  const footprint = data.events.toSorted((left, right) => right.date.localeCompare(left.date))

  const remove = async (collection: 'skills' | 'skillCategories' | 'achievements' | 'events', id: string, label: string) => {
    if (window.confirm(`删除“${label}”吗？`)) await deleteEntity(collection, id)
  }

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">角色</h1><p className="mt-2 hidden text-sm text-muted lg:block">这里集中展示成长反馈；日常无需手动维护数值。</p></div>
        <Button variant="secondary" className="shrink-0" icon={<Pencil size={15} />} onClick={() => setCharacterOpen(true)}>编辑角色</Button>
      </header>

      <Panel className="p-5 sm:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <LevelSeal level={data.character.level} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{data.character.name}</h2><p className="mt-1 text-sm text-muted">{data.character.profession} · {data.character.lifeStage}</p></div>
              <p className="text-sm text-muted">总 EXP <strong className="text-ink">{formatNumber(data.character.totalExp)}</strong></p>
            </div>
            <div className="mt-4"><ProgressBar value={data.character.exp} max={data.character.expToNextLevel} size="lg" label={`Lv.${data.character.level} · EXP ${formatNumber(data.character.exp)} / ${formatNumber(data.character.expToNextLevel)}`} /></div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="skills-heading">
          <div className="mb-3"><h2 id="skills-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink lg:text-xl"><BookOpen size={19} className="text-muted" /> 技能</h2><p className="mt-1 hidden text-xs text-faint lg:block">完成同分类任务时自动成长</p></div>
          <Panel className="divide-y divide-line overflow-hidden">
            {data.skillCategories.map((category) => {
              const skills = data.skills.filter((skill) => skill.categoryId === category.id)
              if (skills.length === 0) return null
              return (
                <div key={category.id} className="p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-muted">{category.name}</h3>
                  <ul className="mt-3 space-y-4">
                    {skills.map((skill) => <li key={skill.id}><div className="flex items-center justify-between gap-3"><span className="font-medium text-ink">{skill.name}</span><span className="text-xs font-semibold text-primary">Lv.{skill.level}</span></div><div className="mt-2"><ProgressBar value={skill.exp} max={skill.expToNextLevel} size="sm" /></div></li>)}
                  </ul>
                </div>
              )
            })}
            {data.skills.length === 0 ? <p className="p-6 text-sm text-muted">还没有技能，任务仍会获得角色 EXP 与属性成长。</p> : null}
          </Panel>
        </section>

        <section aria-labelledby="stats-heading">
          <div className="mb-3"><h2 id="stats-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink lg:text-xl"><TrendingUp size={19} className="text-muted" /> 五维属性</h2><p className="mt-1 hidden text-xs text-faint lg:block">分类决定任务主要成长方向</p></div>
          <Panel className="p-4 sm:p-5">
            <ul className="space-y-4">
              {STAT_KEYS.map((key) => <li key={key} className="flex items-center gap-4"><span className="w-16 shrink-0 text-sm text-muted">{STAT_LABELS[key]}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, data.stats.values[key])}%` }} /></div><strong className="w-12 text-right tabular-nums text-ink">{data.stats.values[key]}</strong></li>)}
            </ul>
          </Panel>
        </section>
      </div>

      <section aria-labelledby="achievements-heading">
        <div className="mb-3"><h2 id="achievements-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink lg:text-xl"><Award size={19} className="text-muted" /> 成就</h2><p className="mt-1 hidden text-xs text-faint lg:block">重要节点会自动解锁并写入成长足迹</p></div>
        {unlockedAchievements.length > 0 ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {unlockedAchievements.map((achievement) => <Panel key={achievement.id} className="flex w-[75vw] max-w-72 shrink-0 snap-start items-start gap-3 p-4 sm:w-auto sm:max-w-none"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink/5 text-2xl">{achievement.icon}</span><div><h3 className="font-semibold text-ink">{achievement.name}</h3><p className="mt-1 text-xs leading-5 text-muted">{achievement.description}</p><p className="mt-2 text-[11px] text-faint">{formatDate(achievement.unlockedAt)}</p></div></Panel>)}
          </div>
        ) : <Panel className="p-6 text-sm text-muted">成就尚未解锁。持续完成任务和长期目标即可自然获得。</Panel>}
      </section>

      <section aria-labelledby="footprint-heading">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="footprint-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink lg:text-xl"><Footprints size={19} className="text-muted" /> 成长足迹</h2><p className="mt-1 hidden text-xs text-faint lg:block">只记录目标、成就、阶段和主动添加的重要事件</p></div><Button variant="ghost" className="min-h-9 shrink-0 px-3" icon={<Plus size={14} />} onClick={() => setEventEditor('new')}>重要事件</Button></div>
        <Panel className="p-5 sm:p-6">
          {footprint.length > 0 ? (
            <ol className="relative space-y-0 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-line">
              {footprint.map((event) => <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0"><span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm">{EVENT_ICONS[event.sourceType]}</span><div className="min-w-0 flex-1 pt-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium text-ink">{event.title}</h3><time className="text-xs text-faint">{formatDate(event.date)}</time></div>{event.description ? <p className="mt-1 text-sm leading-6 text-muted">{event.description}</p> : null}</div></li>)}
            </ol>
          ) : <p className="text-sm text-muted">还没有成长足迹。</p>}
        </Panel>
      </section>

      <details className="group rounded-2xl bg-surface p-4 shadow-[0_1px_4px_rgb(0_0_0/0.04)] sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink"><span className="flex items-center gap-2"><Settings2 size={18} className="text-muted" /> 高级成长管理</span><ChevronDown size={18} className="transition-transform group-open:rotate-180" /></summary>
        <p className="mt-2 text-sm text-muted">手动编辑技能、分类、属性与成就。日常使用通常不需要打开这里。</p>
        <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between"><h3 className="font-semibold text-ink">技能与分类</h3><div className="flex gap-1"><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => setCategoryEditor('new')}>+ 分类</Button><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => setSkillEditor('new')}>+ 技能</Button></div></div>
            <ul className="mt-3 space-y-2">{data.skills.map((skill) => <li key={skill.id} className="flex items-center justify-between rounded-lg bg-ink/[0.04] px-3 py-2 text-sm"><span>{skill.name} · Lv.{skill.level}</span><span className="flex"><button className="p-1.5 text-muted hover:text-primary" aria-label={`编辑技能：${skill.name}`} onClick={() => setSkillEditor(skill)}><Pencil size={14} /></button><button className="p-1.5 text-muted hover:text-danger" aria-label={`删除技能：${skill.name}`} onClick={() => void remove('skills', skill.id, skill.name)}><Trash2 size={14} /></button></span></li>)}</ul>
            <Button variant="secondary" className="mt-3" onClick={() => setStatOpen(true)}>手动调整属性</Button>
          </div>
          <div>
            <div className="flex items-center justify-between"><h3 className="font-semibold text-ink">成就规则</h3><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => setAchievementEditor('new')}>+ 成就</Button></div>
            <ul className="mt-3 space-y-2">{data.achievements.map((achievement) => <li key={achievement.id} className="flex items-center justify-between rounded-lg bg-ink/[0.04] px-3 py-2 text-sm"><span className={cn(achievement.unlockedAt === null && 'text-muted')}>{achievement.icon} {achievement.name}</span><span className="flex"><button className="p-1.5 text-muted hover:text-primary" aria-label={`编辑成就：${achievement.name}`} onClick={() => setAchievementEditor(achievement)}><Pencil size={14} /></button><button className="p-1.5 text-muted hover:text-danger" aria-label={`删除成就：${achievement.name}`} onClick={() => void remove('achievements', achievement.id, achievement.name)}><Trash2 size={14} /></button></span></li>)}</ul>
          </div>
        </div>
      </details>

      {characterOpen ? <CharacterEditor character={data.character} goals={data.goals} onClose={() => setCharacterOpen(false)} onSave={updateCharacter} /> : null}
      {statOpen ? <StatEditor onClose={() => setStatOpen(false)} onSave={changeStat} /> : null}
      {skillEditor !== null ? <SkillEditor skill={skillEditor === 'new' ? null : skillEditor} categories={data.skillCategories} skills={data.skills} initialCategoryId={data.skillCategories[0]?.id ?? null} onClose={() => setSkillEditor(null)} onSave={(skill) => saveEntity('skills', skill)} /> : null}
      {categoryEditor !== null ? <SkillCategoryEditor category={categoryEditor === 'new' ? null : categoryEditor} onClose={() => setCategoryEditor(null)} onSave={(category) => saveEntity('skillCategories', category)} /> : null}
      {achievementEditor !== null ? <AchievementEditor achievement={achievementEditor === 'new' ? null : achievementEditor} onClose={() => setAchievementEditor(null)} onSave={(achievement) => saveEntity('achievements', achievement)} /> : null}
      {eventEditor !== null ? <EventEditor event={eventEditor === 'new' ? null : eventEditor} onClose={() => setEventEditor(null)} onSave={(event) => saveEntity('events', event)} /> : null}
    </div>
  )
}

function CharacterEditor({ character, goals, onClose, onSave }: { character: Character; goals: Array<{ id: string; name: string }>; onClose: () => void; onSave: (patch: Partial<Character>) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    void onSave({ name: String(form.get('name') ?? '').trim(), profession: String(form.get('profession') ?? '').trim(), lifeStage: String(form.get('lifeStage') ?? '').trim(), primaryGoalId: String(form.get('primaryGoalId') ?? '') || null })
      .then(onClose)
      .finally(() => setSaving(false))
  }
  return <Modal open title="编辑角色" onClose={onClose} closeDisabled={saving}><form className="space-y-4" onSubmit={handleSubmit}><FormField label="角色名称" htmlFor="character-name"><input id="character-name" name="name" required defaultValue={character.name} className={inputClassName} /></FormField><FormField label="职业 / 身份" htmlFor="character-profession"><input id="character-profession" name="profession" defaultValue={character.profession} className={inputClassName} /></FormField><FormField label="当前阶段" htmlFor="character-stage"><input id="character-stage" name="lifeStage" defaultValue={character.lifeStage} className={inputClassName} /></FormField><FormField label="主要目标" htmlFor="character-goal"><select id="character-goal" name="primaryGoalId" defaultValue={character.primaryGoalId ?? ''} className={inputClassName}><option value="">暂不设置</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></FormField><div className="flex justify-end gap-3 pt-2"><Button variant="secondary" disabled={saving} onClick={onClose}>取消</Button><Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存角色'}</Button></div></form></Modal>
}

function StatEditor({ onClose, onSave }: { onClose: () => void; onSave: (key: StatKey, amount: number, note: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    void onSave(String(form.get('key')) as StatKey, toNumber(form.get('amount')), String(form.get('note') ?? '').trim()).then(onClose).finally(() => setSaving(false))
  }
  return <Modal open title="手动调整属性" description="这是高级入口；任务完成会自动增长属性。" onClose={onClose} closeDisabled={saving}><form className="space-y-4" onSubmit={handleSubmit}><FormField label="属性" htmlFor="stat-key"><select id="stat-key" name="key" className={inputClassName}>{STAT_KEYS.map((key) => <option key={key} value={key}>{STAT_LABELS[key]}</option>)}</select></FormField><FormField label="变化值" htmlFor="stat-amount"><input id="stat-amount" name="amount" type="number" step="0.25" defaultValue="1" className={inputClassName} /></FormField><FormField label="说明" htmlFor="stat-note"><input id="stat-note" name="note" placeholder="为什么调整" className={inputClassName} /></FormField><div className="flex justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={onClose}>取消</Button><Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存调整'}</Button></div></form></Modal>
}
