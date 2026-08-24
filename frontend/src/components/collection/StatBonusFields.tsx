import { FormField, inputClassName } from '../ui/FormField'
import {
  STAT_KEYS,
  STAT_LABELS,
  type Equipment,
} from '../../types/models'

interface StatBonusFieldsProps {
  values?: Equipment['statBonuses']
  namePrefix?: string
  label?: string
}

export function StatBonusFields({
  values = {},
  namePrefix = 'stat',
  label = '属性加成',
}: StatBonusFieldsProps) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {STAT_KEYS.map((key) => (
          <FormField key={key} label={STAT_LABELS[key]} htmlFor={`${namePrefix}-${key}`}>
            <input
              id={`${namePrefix}-${key}`}
              name={`${namePrefix}-${key}`}
              type="number"
              min="0"
              step="1"
              defaultValue={values[key] ?? 0}
              className={inputClassName}
            />
          </FormField>
        ))}
      </div>
    </fieldset>
  )
}
