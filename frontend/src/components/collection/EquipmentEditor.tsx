import { useState, type FormEvent } from 'react'
import {
  STAT_KEYS,
  type Equipment,
  type EquipmentQuality,
  type StatKey,
} from '../../types/models'
import { toNumber } from '../../utils/format'
import { createId, nowIso } from '../../utils/id'
import { Button } from '../ui/Button'
import {
  FormField,
  inputClassName,
  textareaClassName,
} from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { StatBonusFields } from './StatBonusFields'

interface EquipmentEditorProps {
  equipment: Equipment | null
  onClose: () => void
  onSave: (equipment: Equipment) => Promise<void>
}

function readStatBonuses(form: FormData): Equipment['statBonuses'] {
  const bonuses: Partial<Record<StatKey, number>> = {}

  for (const key of STAT_KEYS) {
    const amount = Math.max(0, toNumber(form.get(`stat-${key}`)))
    if (amount > 0) bonuses[key] = amount
  }

  return bonuses
}

export function EquipmentEditor({
  equipment,
  onClose,
  onSave,
}: EquipmentEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const timestamp = nowIso()
    const entity: Equipment = {
      id: equipment?.id ?? createId('equipment'),
      createdAt: equipment?.createdAt ?? timestamp,
      updatedAt: timestamp,
      name: String(form.get('name') ?? '').trim(),
      quality: String(form.get('quality') ?? 'common') as EquipmentQuality,
      description: String(form.get('description') ?? '').trim(),
      statBonuses: readStatBonuses(form),
    }

    setIsSaving(true)
    setError(null)
    void onSave(entity)
      .then(onClose)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : '保存装备失败')
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <Modal
      open
      wide
      title={equipment ? '编辑装备' : '添加装备'}
      description="装备代表现实中的电脑、书籍或工具，属性加成仅作记录。"
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="名称" htmlFor="equipment-name" required>
            <input
              id="equipment-name"
              name="name"
              required
              defaultValue={equipment?.name ?? ''}
              className={inputClassName}
            />
          </FormField>
          <FormField label="品质" htmlFor="equipment-quality">
            <select
              id="equipment-quality"
              name="quality"
              defaultValue={equipment?.quality ?? 'common'}
              className={inputClassName}
            >
              <option value="common">普通</option>
              <option value="fine">精良</option>
              <option value="rare">稀有</option>
              <option value="epic">史诗</option>
              <option value="legendary">传说</option>
            </select>
          </FormField>
        </div>
        <FormField label="描述" htmlFor="equipment-description">
          <textarea
            id="equipment-description"
            name="description"
            defaultValue={equipment?.description ?? ''}
            className={textareaClassName}
          />
        </FormField>
        <StatBonusFields values={equipment ? equipment.statBonuses : {}} />
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={isSaving} onClick={onClose}>取消</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '保存中…' : '保存装备'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
