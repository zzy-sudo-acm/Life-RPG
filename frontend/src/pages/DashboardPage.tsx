import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  Minus,
  ScrollText,
  Sparkles,
  Swords,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ActivityHeatmap } from '../components/dashboard/ActivityHeatmap'
import { CharacterHero } from '../components/dashboard/CharacterHero'
import { StatsRadar } from '../components/dashboard/StatsRadar'
import { STAT_COLORS } from '../components/dashboard/statPalette'
import { StatTrendChart } from '../components/dashboard/StatTrendChart'
import { RewardCelebration } from '../components/feedback/RewardCelebration'
import { useRewardCelebration } from '../components/feedback/useRewardCelebration'
import { TierDonut } from '../components/skills/TierDonut'
import { Button } from '../components/ui/Button'
import { FormField, inputClassName } from '../components/ui/FormField'
import { Modal } from '../components/ui/Modal'
import { Panel } from '../components/ui/Panel'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAppStore } from '../store/AppStoreContext'
import {
  STAT_KEYS,
  STAT_LABELS,
  type StatKey,
  type Task,
} from '../types/models'
import { formatDate, formatNumber, toNumber } from '../utils/format'

function SectionLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-0.5 text-xs font-medium text-faint transition-colors hover:text-primary"
    >
      {label}
      <ChevronRight size={13} />
    </Link>
  )
}

export function DashboardPage() {
  const { data, updateCharacter, changeStat, completeTask } = useAppStore()
  const [characterOpen, setCharacterOpen] = useState(false)
  const [statOpen, setStatOpen] = useState(false)
  const { celebration, present, dismiss } = useRewardCelebration()

  const statDeltas = useMemo(() => {
    if (!data) return null
    const history = data.stats.history
    if (history.length < 2) return null
    const ordered = history.toSorted((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    const latest = ordered[ordered.length - 1]
    const previous = ordered[ordered.length - 2]
    if (!latest || !previous) return null
    const deltas = {} as Record<StatKey, number>
    for (const key of STAT_KEYS) {
      deltas[key] = latest.values[key] - previous.values[key]
    }
    return deltas
  }, [data])

  if (!data) return null

  const primaryGoal = data.goals.find((goal) => goal.id === data.character.primaryGoalId)
  const pendingTasks = data.tasks
    .filter((task) => task.status !== 'completed')
    .toSorted((left, right) => (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999'))
  const activeTasks = pendingTasks.slice(0, 5)
  const featuredSkills = data.skills
    .toSorted((a, b) => b.level - a.level || b.exp - a.exp)
    .slice(0, 4)
  const activeBoss = data.bosses.find((boss) => boss.status === 'active') ?? data.bosses[0]
  const recentEvents = data.events
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const handleQuickComplete = async (task: Task): Promise<void> => {
    const baseLevel = data.character.level
    try {
      await completeTask(task.id)
      present({ title: task.name, rewards: task.rewards, baseLevel })
    } catch {
      // 写入失败时错误由全局提示展示
    }
  }

  return (
    <div className="space-y-5">
      <CharacterHero
        character={data.character}
        primaryGoal={primaryGoal}
        onEdit={() => setCharacterOpen(true)}
      />

      <section className="grid gap-5 lg:grid-cols-5">
        {/* 五维属性 */}
        <Panel className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Activity size={18} className="text-primary" /> 人生属性
            </h2>
            <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setStatOpen(true)}>
              调整属性
            </Button>
          </div>
          <div className="mt-4">
            <StatsRadar values={data.stats.values} />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {STAT_KEYS.map((key) => {
              const delta = statDeltas?.[key] ?? null
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-line/70 bg-canvas/40 px-3 py-2"
                >
                  <span
                    className="size-2 shrink-0 rotate-45"
                    style={{ backgroundColor: STAT_COLORS[key] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">
                    {STAT_LABELS[key]}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {data.stats.values[key]}
                  </span>
                  {delta !== null ? (
                    <span
                      className={`flex items-center text-[11px] font-semibold tabular-nums ${
                        delta > 0 ? 'text-primary' : delta < 0 ? 'text-danger' : 'text-faint'
                      }`}
                      title="较上次记录的变化"
                    >
                      {delta > 0 ? <ArrowUp size={11} /> : delta < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                      {delta !== 0 ? Math.abs(delta) : ''}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Panel>

        {/* 今日待办 */}
        <Panel className="p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Sparkles size={18} className="text-exp" /> 今日待办
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-faint">剩余 {pendingTasks.length} 项</span>
              <SectionLink to="/goals" label="全部任务" />
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 rounded-xl border border-line/70 bg-canvas/40 px-3 py-3 transition-colors hover:border-primary/40"
                >
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-line text-transparent transition-all hover:border-primary hover:bg-primary-soft hover:text-primary"
                    aria-label={`完成任务：${task.name}`}
                    onClick={() => void handleQuickComplete(task)}
                  >
                    <Check size={15} strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{task.name}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {task.type ? `${task.type} · ` : ''}截止 {formatDate(task.dueDate)}
                    </p>
                  </div>
                  {task.rewards.exp > 0 ? (
                    <span className="shrink-0 rounded-full border border-exp/30 bg-exp-soft px-2 py-0.5 text-xs font-bold text-exp">
                      +{task.rewards.exp} EXP
                    </span>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-line/80 py-8 text-center text-sm text-muted">
                所有任务都完成了，去创建新的挑战吧
              </li>
            )}
          </ul>
        </Panel>
      </section>

      {/* 修炼足迹热力图 */}
      <Panel className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold text-ink">
            <CalendarDays size={18} className="text-primary" /> 修炼足迹
          </h2>
          <SectionLink to="/events" label="人生日志" />
        </div>
        <div className="mt-4">
          <ActivityHeatmap events={data.events} />
        </div>
      </Panel>

      <section className="grid gap-5 lg:grid-cols-3">
        {/* 属性趋势 */}
        <Panel className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <TrendingUp size={18} className="text-primary" /> 属性趋势
            </h2>
            <span className="text-xs text-faint">最近 {Math.min(data.stats.history.length, 8)} 条快照</span>
          </div>
          <div className="mt-5">
            <StatTrendChart history={data.stats.history} />
          </div>
        </Panel>

        {/* Boss 挑战 */}
        <Panel className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Swords size={18} className="text-danger" /> Boss 挑战
            </h2>
            <SectionLink to="/bosses" label="挑战列表" />
          </div>
          {activeBoss ? (
            <div className="mt-5 flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium text-ink">{activeBoss.name}</h3>
                <StatusBadge value={activeBoss.status} />
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={activeBoss.currentHp}
                  max={activeBoss.maxHp}
                  tone="danger"
                  size="lg"
                  label={`HP ${formatNumber(activeBoss.currentHp)} / ${formatNumber(activeBoss.maxHp)}`}
                />
              </div>
              <p className="mt-4 text-xs text-faint">截止：{formatDate(activeBoss.deadline)}</p>
              <Link
                to="/bosses"
                className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-danger/50 bg-danger-soft text-sm font-medium text-danger transition-colors hover:bg-danger/25"
              >
                <Swords size={15} /> 继续挑战
              </Link>
            </div>
          ) : (
            <p className="mt-5 flex-1 text-sm text-muted">
              暂时没有 Boss 挑战。把一个阶段性难题设置成 Boss，用任务逐步击破它。
            </p>
          )}
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {/* 技能概览 */}
        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">技能概览</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-faint">{data.skills.length} 项技能</span>
              <SectionLink to="/skills" label="技能树" />
            </div>
          </div>
          <div className="mt-4">
            <TierDonut skills={data.skills} />
          </div>
          <ul className="mt-5 space-y-4 border-t border-line/70 pt-4">
            {featuredSkills.length > 0 ? (
              featuredSkills.map((skill) => (
                <li key={skill.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink">{skill.name}</span>
                    <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-bold text-primary">
                      Lv.{skill.level}
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    value={skill.exp}
                    max={skill.expToNextLevel}
                    tone="exp"
                    size="sm"
                  />
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-muted">还没有技能，去技能树点亮第一项</li>
            )}
          </ul>
        </Panel>

        {/* 最近事件 */}
        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <ScrollText size={18} className="text-info" /> 最近事件
            </h2>
            <SectionLink to="/events" label="人生日志" />
          </div>
          <ol className="mt-4 space-y-4">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <li key={event.id} className="relative border-l border-line pl-4">
                  <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-primary" />
                  <p className="text-sm font-medium text-ink">{event.title}</p>
                  <p className="mt-1 text-xs text-faint">{formatDate(event.date)}</p>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-muted">还没有事件记录</li>
            )}
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
      <RewardCelebration celebration={celebration} onClose={dismiss} />
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
