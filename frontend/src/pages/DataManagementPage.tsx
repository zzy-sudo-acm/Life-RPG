import {
  Database,
  Download,
  HardDrive,
  RotateCcw,
  Settings,
  Upload,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { CollectionCounts } from '../components/data-management/CollectionCounts'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useAppStore } from '../store/AppStoreContext'
import { downloadSaveFile } from '../utils/download'
import { formatDate } from '../utils/format'

interface Feedback {
  tone: 'success' | 'error'
  message: string
}

function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback
}

export function DataManagementPage() {
  const {
    data,
    error: storeError,
    createSaveFile,
    importSaveFile,
    resetToDefaults,
  } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busyAction, setBusyAction] = useState<
    'export' | 'import' | 'reset' | null
  >(null)

  if (!data) return null

  const handleExport = async (): Promise<void> => {
    setBusyAction('export')
    try {
      const saveFile = await createSaveFile()
      downloadSaveFile(saveFile)
      setFeedback({
        tone: 'success',
        message: `已导出 life_rpg_save.json（${formatDate(saveFile.exportedAt)}）`,
      })
    } catch (reason: unknown) {
      setFeedback({ tone: 'error', message: getErrorMessage(reason, '导出存档失败') })
    } finally {
      setBusyAction(null)
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setFeedback(null)
    setBusyAction('import')
    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text) as unknown
      } catch {
        throw new Error('文件不是有效的 JSON 存档')
      }

      if (!window.confirm('导入会覆盖当前本地存档。确定继续吗？')) return

      await importSaveFile(parsed)
      setFeedback({ tone: 'success', message: `已成功导入 ${file.name}` })
    } catch (reason: unknown) {
      setFeedback({ tone: 'error', message: getErrorMessage(reason, '导入存档失败') })
    } finally {
      setBusyAction(null)
      input.value = ''
    }
  }

  const handleReset = async (): Promise<void> => {
    if (!window.confirm('重置会清除当前本地数据并恢复初始示例，确定继续吗？')) return

    setFeedback(null)
    setBusyAction('reset')
    try {
      await resetToDefaults()
      setFeedback({ tone: 'success', message: '已恢复初始数据' })
    } catch (reason: unknown) {
      setFeedback({ tone: 'error', message: getErrorMessage(reason, '重置数据失败') })
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive"
        title="数据管理"
        description="所有成长数据保存在当前浏览器中；建议定期导出 JSON 备份。"
      />

      <section aria-labelledby="data-overview-heading" className="space-y-3">
        <h2 id="data-overview-heading" className="font-semibold text-ink">当前存档概览</h2>
        <CollectionCounts data={data} />
      </section>

      {(feedback || storeError) ? (
        <p
          role={feedback?.tone === 'error' || storeError ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback?.tone === 'error' || storeError
              ? 'border-danger/30 bg-danger-soft text-danger'
              : 'border-primary/30 bg-primary-soft text-primary'
          }`}
        >
          {feedback?.message ?? storeError}
        </p>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Download size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-ink">导出备份</h2>
              <p className="mt-1 text-sm text-muted">
                下载完整的 <code>life_rpg_save.json</code>，可转移到其他浏览器或设备。
              </p>
            </div>
          </div>
          <Button
            className="mt-5 w-full sm:w-auto"
            icon={<Download size={16} />}
            disabled={busyAction !== null}
            onClick={() => void handleExport()}
          >
            {busyAction === 'export' ? '正在导出…' : '导出存档'}
          </Button>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-ink">导入备份</h2>
              <p className="mt-1 text-sm text-muted">
                选择 Life RPG JSON 存档；系统会校验版本和全部关键字段。
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="选择 Life RPG 存档"
            onChange={(event) => void handleImport(event)}
          />
          <Button
            className="mt-5 w-full sm:w-auto"
            variant="secondary"
            icon={<Upload size={16} />}
            disabled={busyAction !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            {busyAction === 'import' ? '正在导入…' : '选择并导入'}
          </Button>
        </Panel>
      </section>

      <Panel className="p-5 sm:p-6">
        <h2 className="font-semibold text-ink">本地存储说明</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-line bg-raised/50 p-4">
            <Database size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-medium text-ink">IndexedDB</h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                保存角色、属性、技能、任务、事件等主要数据；刷新页面后仍会保留。
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-line bg-raised/50 p-4">
            <Settings size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-medium text-ink">localStorage</h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                仅保存侧边栏和筛选器等轻量界面设置，不保存核心成长数据。
              </p>
            </div>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
          <HardDrive size={15} className="mt-0.5 shrink-0" />
          浏览器清理站点数据、无痕模式结束或更换设备都可能丢失本地存档，请定期导出备份。
        </p>
      </Panel>

      <Panel className="border-danger/30 p-5 sm:p-6">
        <h2 className="font-semibold text-ink">恢复初始数据</h2>
        <p className="mt-1 text-sm text-muted">当前数据会被初始示例覆盖，此操作无法在应用内撤销。</p>
        <Button
          className="mt-5 w-full sm:w-auto"
          variant="danger"
          icon={<RotateCcw size={16} />}
          disabled={busyAction !== null}
          onClick={() => void handleReset()}
        >
          {busyAction === 'reset' ? '正在重置…' : '重置全部数据'}
        </Button>
      </Panel>
    </div>
  )
}
