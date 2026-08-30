import { Database, Download, HardDrive, RotateCcw, Settings, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { useAppStore } from '../store/AppStoreContext'
import { downloadSaveFile } from '../utils/download'
import { formatDate } from '../utils/format'

interface Feedback { tone: 'success' | 'error'; message: string }

export function SettingsPage() {
  const { data, error: storeError, createSaveFile, importSaveFile, resetToDefaults } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState<'export' | 'import' | 'reset' | null>(null)
  if (!data) return null

  const handleExport = async () => {
    setBusy('export')
    try {
      const save = await createSaveFile()
      downloadSaveFile(save)
      setFeedback({ tone: 'success', message: `已导出 v${save.schemaVersion} 存档（${formatDate(save.exportedAt)}）` })
    } catch (reason: unknown) {
      setFeedback({ tone: 'error', message: reason instanceof Error ? reason.message : '导出存档失败' })
    } finally { setBusy(null) }
  }
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setBusy('import')
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      if (!window.confirm('导入会覆盖当前本地存档。确定继续吗？')) return
      await importSaveFile(parsed)
      setFeedback({ tone: 'success', message: `已导入 ${file.name}；旧版存档会自动迁移。` })
    } catch (reason: unknown) {
      setFeedback({ tone: 'error', message: reason instanceof Error ? reason.message : '导入存档失败' })
    } finally {
      input.value = ''
      setBusy(null)
    }
  }
  const handleReset = async () => {
    if (window.confirm('重置会用初始示例覆盖当前数据，确定继续吗？')) return
    setBusy('reset')
    try {
      await resetToDefaults()
      setFeedback({ tone: 'success', message: '已恢复初始数据' })
    } catch (reason: unknown) {
      setFeedback({ tone: 'error', message: reason instanceof Error ? reason.message : '重置失败' })
    } finally { setBusy(null) }
  }

  const counts = [
    ['目标', data.goals.length],
    ['任务', data.tasks.length],
    ['技能', data.skills.length],
    ['成就', data.achievements.length],
    ['成长足迹', data.events.length],
  ] as const

  return (
    <div className="space-y-7">
      <header>
        <Link to="/character" className="text-xs font-medium text-primary">← 返回角色</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink lg:text-3xl">设置</h1>
        <p className="mt-2 text-sm text-muted">数据管理收纳在这里，不再占用主导航。</p>
      </header>

      <section><h2 className="text-xl font-semibold tracking-tight text-ink">存档概览</h2><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{counts.map(([label, count]) => <div key={label} className="rounded-2xl bg-surface px-3 py-3 text-center ring-1 ring-white/8"><strong className="block text-xl tabular-nums text-primary">{count}</strong><span className="mt-1 block text-xs text-muted">{label}</span></div>)}</div></section>

      {(feedback || storeError) ? <p role={feedback?.tone === 'error' || storeError ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ${feedback?.tone === 'error' || storeError ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'}`}>{feedback?.message ?? storeError}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Download size={20} /></span><div><h2 className="font-semibold text-ink">导出备份</h2><p className="mt-1 text-sm text-muted">下载完整 JSON 存档，便于转移或长期保存。</p></div></div><Button className="mt-5" icon={<Download size={16} />} disabled={busy !== null} onClick={() => void handleExport()}>{busy === 'export' ? '正在导出…' : '导出存档'}</Button></Panel>
        <Panel className="p-5 sm:p-6"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Upload size={20} /></span><div><h2 className="font-semibold text-ink">导入备份</h2><p className="mt-1 text-sm text-muted">支持当前 v2 和旧版 v1 存档，导入时自动迁移。</p></div></div><input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label="选择 Life RPG 存档" onChange={(event) => void handleImport(event)} /><Button className="mt-5" variant="secondary" icon={<Upload size={16} />} disabled={busy !== null} onClick={() => fileInputRef.current?.click()}>{busy === 'import' ? '正在导入…' : '选择并导入'}</Button></Panel>
      </section>

      <Panel className="p-5 sm:p-6"><h2 className="font-semibold text-ink">本地存储</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="flex gap-3"><Database size={20} className="shrink-0 text-primary" /><p className="text-sm leading-6 text-muted"><strong className="block text-ink">IndexedDB</strong>保存角色、目标、任务和成长数据。</p></div><div className="flex gap-3"><Settings size={20} className="shrink-0 text-primary" /><p className="text-sm leading-6 text-muted"><strong className="block text-ink">localStorage</strong>只保存导航和任务筛选偏好。</p></div></div><p className="mt-4 flex items-start gap-2 text-xs leading-5 text-faint"><HardDrive size={14} className="mt-0.5 shrink-0" /> 清理浏览器站点数据或更换设备可能丢失存档，请定期备份。</p></Panel>

      <Panel className="p-5 sm:p-6"><h2 className="font-semibold text-ink">恢复初始数据</h2><p className="mt-1 text-sm text-muted">当前存档会被覆盖，此操作无法在应用内撤销。</p><Button className="mt-5" variant="danger" icon={<RotateCcw size={16} />} disabled={busy !== null} onClick={() => void handleReset()}>{busy === 'reset' ? '正在重置…' : '重置全部数据'}</Button></Panel>
    </div>
  )
}
