import type { FormEvent } from 'react'
import type { Boss } from '../../types/models'
import { toNumber } from '../../utils/format'
import { Button } from '../ui/Button'
import { FormField, inputClassName } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useAsyncSubmission } from '../ui/useAsyncSubmission'

interface BossDamageEditorProps {
  boss: Boss
  onClose: () => void
  onDamage: (bossId: string, damage: number, note: string) => Promise<void>
}

export function BossDamageEditor({
  boss,
  onClose,
  onDamage,
}: BossDamageEditorProps) {
  const { isSubmitting, submissionError, runSubmission } =
    useAsyncSubmission()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const damage = Math.max(1, toNumber(form.get('damage'), 1))
    const note = String(form.get('note') ?? '').trim()

    const damaged = await runSubmission(
      () => onDamage(boss.id, damage, note),
      '记录 Boss 伤害失败',
    )
    if (damaged) {
      onClose()
    }
  }

  return (
    <Modal
      open
      title={`挑战 ${boss.name}`}
      description={`当前剩余 ${boss.currentHp} / ${boss.maxHp} HP。伤害不会使 HP 低于 0。`}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="造成伤害" htmlFor="boss-damage" required>
          <input
            id="boss-damage"
            name="damage"
            type="number"
            min="1"
            max={boss.currentHp}
            required
            defaultValue={Math.min(10, boss.currentHp)}
            className={inputClassName}
          />
        </FormField>
        <FormField label="挑战记录" htmlFor="boss-damage-note">
          <input
            id="boss-damage-note"
            name="note"
            placeholder="例如：完成一套模拟题"
            className={inputClassName}
          />
        </FormField>
        {submissionError ? (
          <p role="alert" className="text-sm text-danger">
            {submissionError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '记录中…' : '记录伤害'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
