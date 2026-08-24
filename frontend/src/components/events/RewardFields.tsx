import {
  STAT_KEYS,
  STAT_LABELS,
  type Boss,
  type RewardBundle,
  type Skill,
} from '../../types/models'
import { FormField, inputClassName } from '../ui/FormField'

interface RewardFieldsProps {
  rewards: RewardBundle
  skills: Skill[]
  bosses: Boss[]
}

interface RewardRow {
  id: string
  label: string
  value: number
}

function skillRows(rewards: RewardBundle, skills: Skill[]): RewardRow[] {
  const known = new Map(skills.map((skill) => [skill.id, skill.name]))
  const amounts = new Map(rewards.skills.map((reward) => [reward.skillId, reward.amount]))
  const ids = new Set([...known.keys(), ...amounts.keys()])
  return [...ids].map((id) => ({
    id,
    label: known.get(id) ?? `已删除的技能（${id}）`,
    value: amounts.get(id) ?? 0,
  }))
}

function bossRows(rewards: RewardBundle, bosses: Boss[]): RewardRow[] {
  const known = new Map(bosses.map((boss) => [boss.id, boss.name]))
  const amounts = new Map(rewards.bosses.map((reward) => [reward.bossId, reward.damage]))
  const ids = new Set([...known.keys(), ...amounts.keys()])
  return [...ids].map((id) => ({
    id,
    label: known.get(id) ?? `已删除的 Boss（${id}）`,
    value: amounts.get(id) ?? 0,
  }))
}

export function RewardFields({ rewards, skills, bosses }: RewardFieldsProps) {
  const availableSkills = skillRows(rewards, skills)
  const availableBosses = bossRows(rewards, bosses)

  return (
    <fieldset className="space-y-4 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-medium text-ink">奖励记录</legend>
      <p className="text-xs text-muted">这里只记录历史奖励，不会再次增加角色数值。</p>
      <FormField label="角色 EXP" htmlFor="event-reward-exp">
        <input
          id="event-reward-exp"
          name="reward-exp"
          type="number"
          min="0"
          defaultValue={rewards.exp}
          className={inputClassName}
        />
      </FormField>
      <div>
        <p className="mb-2 text-sm font-medium text-ink">属性经验</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STAT_KEYS.map((key) => (
            <FormField key={key} label={STAT_LABELS[key]} htmlFor={`event-reward-stat-${key}`}>
              <input
                id={`event-reward-stat-${key}`}
                name={`reward-stat-${key}`}
                type="number"
                min="0"
                defaultValue={rewards.stats[key] ?? 0}
                className={inputClassName}
              />
            </FormField>
          ))}
        </div>
      </div>
      {availableSkills.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">技能经验</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableSkills.map((row) => (
              <FormField key={row.id} label={row.label} htmlFor={`event-reward-skill-${row.id}`}>
                <input
                  id={`event-reward-skill-${row.id}`}
                  name={`reward-skill:${row.id}`}
                  type="number"
                  min="0"
                  defaultValue={row.value}
                  className={inputClassName}
                />
              </FormField>
            ))}
          </div>
        </div>
      ) : null}
      {availableBosses.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Boss 伤害</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableBosses.map((row) => (
              <FormField key={row.id} label={row.label} htmlFor={`event-reward-boss-${row.id}`}>
                <input
                  id={`event-reward-boss-${row.id}`}
                  name={`reward-boss:${row.id}`}
                  type="number"
                  min="0"
                  defaultValue={row.value}
                  className={inputClassName}
                />
              </FormField>
            ))}
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
