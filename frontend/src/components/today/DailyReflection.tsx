import { Check, Leaf } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/AppStoreContext'
import { localDateString } from '../../utils/format'
import { nowIso } from '../../utils/id'
import { Button } from '../ui/Button'

export function DailyReflection() {
  const { data, saveEntity } = useAppStore()
  const today = localDateString()
  const existing = data?.events.find(
    (event) =>
      event.id === `reflection-${today}` ||
      event.title === `每日一记 · ${today}`,
  )
  const [text, setText] = useState(existing?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      const timestamp = nowIso()
      await saveEntity('events', {
        id: existing?.id ?? `reflection-${today}`,
        title: `每日一记 · ${today}`,
        description: text.trim(),
        date: existing?.date ?? timestamp,
        sourceType: 'manual',
        sourceId: null,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      setSaved(true)
    } catch {
      /* Store 展示保存错误，保留输入以便重试。 */
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="reflection-panel" aria-labelledby="reflection-title">
      <div className="section-title-row">
        <h2 id="reflection-title">
          <Leaf size={18} strokeWidth={1.5} />
          今日一记
        </h2>
        <Link to="/journal">查看足迹</Link>
      </div>
      <p>今天有什么值得记住的？</p>
      <form onSubmit={(event) => void submit(event)}>
        <textarea
          aria-label="今日一记"
          placeholder="写下你的想法、感受或灵感…"
          value={text}
          maxLength={2000}
          rows={2}
          onChange={(event) => {
            setText(event.currentTarget.value)
            setSaved(false)
          }}
        />
        <div className="reflection-footer">
          <span role="status">
            {saved ? (
              <>
                <Check size={14} />
                已留在成长足迹
              </>
            ) : (
              '一句话，也值得留下。'
            )}
          </span>
          <Button type="submit" disabled={saving || !text.trim() || saved}>
            {saving ? '保存中…' : saved ? '已保存' : '保存'}
          </Button>
        </div>
      </form>
    </section>
  )
}
