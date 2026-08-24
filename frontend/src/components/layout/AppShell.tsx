import {
  Award,
  BookOpen,
  Boxes,
  ChevronLeft,
  Database,
  Download,
  Flag,
  GitBranch,
  LayoutDashboard,
  Map,
  Menu,
  ScrollText,
  Swords,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/AppStoreContext'
import { cn } from '../../utils/cn'
import { downloadSaveFile } from '../../utils/download'
import { formatNumber } from '../../utils/format'
import { ProgressBar } from '../ui/ProgressBar'

interface NavigationItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navigation: NavigationItem[] = [
  { to: '/', label: '角色总览', icon: LayoutDashboard, end: true },
  { to: '/goals', label: '目标任务', icon: Flag },
  { to: '/skills', label: '技能树', icon: GitBranch },
  { to: '/collection', label: '成就装备', icon: Award },
  { to: '/events', label: '人生事件', icon: ScrollText },
  { to: '/bosses', label: 'Boss 挑战', icon: Swords },
  { to: '/timeline', label: '人生地图', icon: Map },
  { to: '/data', label: '数据管理', icon: Database },
]

export function AppShell() {
  const { data, settings, updateSettings, createSaveFile, isLoading, error } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
        <div>
          <Boxes className="mx-auto animate-pulse text-primary" size={36} />
          <p className="mt-4 text-sm text-muted">正在加载本地存档…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
        <div className="max-w-md rounded-xl border border-danger/30 bg-white p-6">
          <h1 className="font-semibold text-danger">存档加载失败</h1>
          <p className="mt-2 text-sm text-muted">{error ?? '没有可用的数据。请刷新页面后重试。'}</p>
        </div>
      </div>
    )
  }

  const collapsed = settings.sidebarCollapsed

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Brand compact={false} />
        <button
          type="button"
          aria-label={mobileOpen ? '关闭导航' : '打开导航'}
          className="rounded-lg p-2 text-ink hover:bg-primary-soft"
          onClick={() => setMobileOpen((current) => !current)}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="关闭导航遮罩"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] -translate-x-full flex-col bg-sidebar text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen && 'translate-x-0',
          collapsed && 'lg:w-[82px]',
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Brand compact={collapsed} />
          <button
            type="button"
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
            className="hidden rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:block"
            onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          >
            <ChevronLeft className={cn('transition-transform', collapsed && 'rotate-180')} size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon, end = false }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-white/72 transition-colors hover:bg-white/8 hover:text-white',
                  isActive && 'bg-primary text-white',
                  collapsed && 'lg:justify-center lg:px-0',
                )
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} className="shrink-0" />
              <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className={cn('rounded-xl bg-white/5 p-3', collapsed && 'lg:hidden')}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{data.character.name}</p>
                <p className="mt-0.5 truncate text-xs text-white/55">{data.character.profession}</p>
              </div>
              <span className="text-sm font-semibold text-[#63c99a]">Lv.{data.character.level}</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={data.character.exp} max={data.character.expToNextLevel} tone="exp" />
            </div>
            <p className="mt-2 text-[11px] text-white/48">
              总 EXP {formatNumber(data.character.totalExp)}
            </p>
          </div>
          <button
            type="button"
            disabled={isExporting}
            title={collapsed ? '导出数据' : undefined}
            className={cn(
              'mt-2 flex min-h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm text-white/68 hover:bg-white/8 hover:text-white',
              collapsed && 'lg:justify-center lg:px-0',
            )}
            onClick={() => {
              setIsExporting(true)
              void createSaveFile()
                .then(downloadSaveFile)
                .catch(() => undefined)
                .finally(() => setIsExporting(false))
            }}
          >
            <Download size={18} />
            <span className={cn(collapsed && 'lg:hidden')}>
              {isExporting ? '正在导出…' : '导出数据'}
            </span>
          </button>
        </div>
      </aside>

      <main key={location.pathname} className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1480px]">
          {error ? (
            <div role="alert" className="mb-5 rounded-[10px] border border-danger/25 bg-[#fff4f3] px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#4bb986] text-[#58c792]">
        <BookOpen size={19} />
      </span>
      <div className={cn(compact && 'lg:hidden')}>
        <p className="text-sm font-semibold tracking-wide text-white">Life RPG</p>
        <p className="text-[11px] text-white/52">人生成长系统</p>
      </div>
    </div>
  )
}
