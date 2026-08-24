import { Activity, Edit3, Flag, Swords, TrendingUp, Zap } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { StatTrendChart } from '../components/dashboard/StatTrendChart'
import { Button } from '../components/ui/Button'
import { FormField, inputClassName } from '../components/ui/FormField'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAppStore } from '../store/AppStoreContext'
import { STAT_KEYS, STAT_LABELS, type StatKey } from '../types/models'
import { formatDate, formatNumber, toNumber } from '../utils/format'

export function DashboardPage() {
  const { data, updateCharacter, changeStat, completeTask } = useAppStore()
  const [characterOpen, setCharacterOpen] = useState(false)
  const [statOpen, setStatOpen] = useState(false)

  if (!data) return null

  const primaryGoal = data.goals.find((goal) => goal.id === data.character.primaryGoalId)
  const activeTasks = data.tasks.filter((task) => task.status !== 'completed').slice(0, 5)
  const featuredSkills = data.skills
    .toSorted((a, b) => b.level - a.level || b.exp - a.exp)
    .slice(0, 4)
  const activeBoss = data.bosses.find((boss) => boss.status === 'active') ?? data.bosses[0]
  const recentEvents = data.events
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色总览"
        description="查看当前成长状态，并从今天的任务继续积累经验。"
        action={
          <Button variant="secondary" icon={<Edit3 size={16} />} onClick={() => setCharacterOpen(true)}>
            编辑角色
          </Button>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_1.4fr]">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">{data.character.name}</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-2xl font-semibold text-ink">{data.character.profession}</h2>
                <span className="text-lg font-semibold text-primary">Lv.{data.character.level}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{data.character.lifeStage}</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Zap size={24} />
            </div>
          </div>
          <div className="mt-6">
            <ProgressBar
              value={data.character.exp}
              max={data.character.expToNextLevel}
              tone="exp"
              label={`EXP ${formatNumber(data.character.exp)} / ${formatNumber(data.character.expToNextLevel)}`}
            />
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-primary">
              <Flag size={15} /> 当前主要目标
            </p>
            <p className="mt-2 text-lg font-medium text-ink">{primaryGoal?.name ?? '尚未设置主要目标'}</p>
            {primaryGoal ? (
              <div className="mt-3">
                <ProgressBar value={primaryGoal.progress} label={`目标进度 · ${primaryGoal.progress}%`} />
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <Activity size={18} className="text-primary" /> 人生属性五维
              </h2>
              <p className="mt-1 text-sm text-muted">每次调整都会写入趋势记录。</p>
            </div>
            <Button variant="ghost" onClick={() => setStatOpen(true)}>
              调整属性
            </Button>
          </div>
          <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {STAT_KEYS.map((key) => (
              <div key={key}>
                <ProgressBar value={data.stats.values[key]} label={`${STAT_LABELS[key]} · ${data.stats.values[key]}`} />
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
        <Panel className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <TrendingUp size={18} className="text-primary" /> 属性趋势
          </h2>
          <p className="mt-1 text-sm text-muted">最近八条属性快照</p>
          <div className="mt-5">
            <StatTrendChart history={data.stats.history} />
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Swords size={18} className="text-primary" /> Boss 挑战
          </h2>
          {activeBoss ? (
            <div className="mt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-ink">{activeBoss.name}</h3>
                  <p className="mt-1 text-sm text-muted">{activeBoss.description}</p>
                </div>
                <StatusBadge value={activeBoss.status} />
              </div>
              <div className="mt-5">
                <ProgressBar
                  value={activeBoss.maxHp - activeBoss.currentHp}
                  max={activeBoss.maxHp}
                  tone={activeBoss.currentHp === 0 ? 'primary' : 'danger'}
                  label={`剩余 HP ${formatNumber(activeBoss.currentHp)} / ${formatNumber(activeBoss.maxHp)}`}
                />
              </div>
              <p className="mt-4 text-sm text-muted">截止：{formatDate(activeBoss.deadline)}</p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">暂时没有 Boss 挑战。</p>
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">待完成任务</h2>
            <span className="text-xs text-muted">{activeTasks.length} 项</span>
          </div>
          <div className="mt-4 divide-y divide-line">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    className="size-5 shrink-0 rounded border border-line hover:border-primary"
                    aria-label={`完成任务：${task.name}`}
                    onClick={() => void completeTask(task.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{task.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatDate(task.dueDate)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-exp">+{task.rewards.exp} EXP</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted">所有任务都完成了</p>
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">技能概览</h2>
            <span className="text-xs text-muted">{data.skills.length} 项技能</span>
          </div>
          <div className="mt-4 divide-y divide-line">
            {featuredSkills.map((skill) => (
              <div key={skill.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{skill.name}</span>
                  <span className="text-primary">Lv.{skill.level}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={skill.exp} max={skill.expToNextLevel} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">最近事件</h2>
            <span className="text-xs text-muted">累计 {data.events.length}</span>
          </div>
          <ol className="mt-4 space-y-4">
            {recentEvents.map((event) => (
              <li key={event.id} className="relative border-l border-line pl-4">
                <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium text-ink">{event.title}</p>
                <p className="mt-1 text-xs text-muted">{formatDate(event.date)}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <CharacterEditor
        open={characterOpen}
        onClose={() => setCharacterOpen(false)}
        onSave={updateCharacter}
        character={data.character}
        goals={data.goals}
      />
      <StatEditor
        open={statOpen}
        onClose={() => setStatOpen(false)}
        onSave={changeStat}
      />
    </div>
  )
}

interface CharacterEditorProps {
  open: boolean
  onClose: () => void
  onSave: ReturnType<typeof useAppStore>['updateCharacter']
  character: NonNullable<ReturnType<typeof useAppStore>['data']>['character']
  goals: NonNullable<ReturnType<typeof useAppStore>['data']>['goals']
}

function CharacterEditor({ open, onClose, onSave, character, goals }: CharacterEditorProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void onSave({
      name: String(form.get('name') ?? '').trim(),
      profession: String(form.get('profession') ?? '').trim(),
      lifeStage: String(form.get('lifeStage') ?? '').trim(),
      level: Math.max(1, toNumber(form.get('level'), 1)),
      exp: Math.max(0, toNumber(form.get('exp'))),
      expToNextLevel: Math.max(1, toNumber(form.get('expToNextLevel'), 100)),
      primaryGoalId: String(form.get('primaryGoalId') ?? '') || null,
    }).then(onClose)
  }

  return (
    <Modal open={open} title="编辑角色" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="用户名称" htmlFor="character-name" required>
          <input id="character-name" name="name" required defaultValue={character.name} className={inputClassName} />
        </FormField>
        <FormField label="当前职业" htmlFor="character-profession" required>
          <input
            id="character-profession"
            name="profession"
            required
            defaultValue={character.profession}
            className={inputClassName}
          />
        </FormField>
        <FormField label="人生阶段" htmlFor="character-stage">
          <input id="character-stage" name="lifeStage" defaultValue={character.lifeStage} className={inputClassName} />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="等级" htmlFor="character-level">
            <input id="character-level" name="level" type="number" min="1" defaultValue={character.level} className={inputClassName} />
          </FormField>
          <FormField label="当前 EXP" htmlFor="character-exp">
            <input id="character-exp" name="exp" type="number" min="0" defaultValue={character.exp} className={inputClassName} />
          </FormField>
          <FormField label="升级所需" htmlFor="character-next-exp">
            <input
              id="character-next-exp"
              name="expToNextLevel"
              type="number"
              min="1"
              defaultValue={character.expToNextLevel}
              className={inputClassName}
            />
          </FormField>
        </div>
        <FormField label="主要目标" htmlFor="character-goal">
          <select id="character-goal" name="primaryGoalId" defaultValue={character.primaryGoalId ?? ''} className={inputClassName}>
            <option value="">未设置</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">保存角色</Button>
        </div>
      </form>
    </Modal>
  )
}

interface StatEditorProps {
  open: boolean
  onClose: () => void
  onSave: ReturnType<typeof useAppStore>['changeStat']
}

function StatEditor({ open, onClose, onSave }: StatEditorProps) {
  const defaultKey = useMemo<StatKey>(() => 'technical', [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const key = String(form.get('stat')) as StatKey
    const amount = toNumber(form.get('amount'))
    const note = String(form.get('note') ?? '').trim() || '手动调整'
    void onSave(key, amount, note).then(onClose)
  }

  return (
    <Modal open={open} title="调整属性" description="正数增加，负数减少；系统会自动保存趋势快照。" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="属性" htmlFor="stat-key">
          <select id="stat-key" name="stat" defaultValue={defaultKey} className={inputClassName}>
            {STAT_KEYS.map((key) => (
              <option key={key} value={key}>{STAT_LABELS[key]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="变化值" htmlFor="stat-amount" hint="例如 3 或 -2">
          <input id="stat-amount" name="amount" type="number" required defaultValue="1" className={inputClassName} />
        </FormField>
        <FormField label="备注" htmlFor="stat-note">
          <input id="stat-note" name="note" placeholder="记录变化原因" className={inputClassName} />
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">保存变化</Button>
        </div>
      </form>
    </Modal>
  )
}
