import { ChevronLeft, ListChecks, Settings, Sparkles, Target, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/AppStoreContext'
import { cn } from '../../utils/cn'
import { LevelSeal } from '../ui/LevelSeal'

interface NavigationItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navigation: NavigationItem[] = [
  { to: '/', label: '今日', icon: ListChecks, end: true },
  { to: '/goals', label: '目标', icon: Target },
  { to: '/character', label: '角色', icon: UserRound },
]

export function AppShell() {
  const { data, settings, updateSettings, isLoading, error } = useAppStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <span className="mx-auto flex size-14 animate-pulse items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#33290f,#15100a)] text-primary ring-1 ring-primary/50"><Sparkles size={26} /></span>
          <p className="mt-4 text-sm text-muted">加载中…</p>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl bg-surface p-6 ring-1 ring-white/8">
          <h1 className="font-semibold text-danger">存档读取失败</h1>
          <p className="mt-2 text-sm text-muted">{error ?? '没有可用的数据。请刷新页面后重试。'}</p>
        </div>
      </div>
    )
  }

  const collapsed = settings.sidebarCollapsed
  const expPercentage = data.character.expToNextLevel > 0
    ? Math.min(100, Math.round((data.character.exp / data.character.expToNextLevel) * 100))
    : 0

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-xl lg:hidden">
        <Brand compact={false} />
        <NavLink to="/settings" aria-label="打开设置" className="rounded-full p-2 text-muted transition-colors hover:bg-white/5 hover:text-ink"><Settings size={19} /></NavLink>
      </header>

      <aside className={cn('sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-line bg-canvas transition-[width] lg:flex', collapsed && 'w-[80px]')}>
        <div className="flex h-20 items-center justify-between px-5">
          <Brand compact={collapsed} />
          <button type="button" aria-label={collapsed ? '展开侧栏' : '收起侧栏'} className="rounded-full p-1.5 text-faint transition-colors hover:bg-white/5 hover:text-ink" onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}>
            <ChevronLeft size={18} className={cn('transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* 角色迷你卡：桌面端常驻的成长反馈 */}
        <NavLink to="/character" title={collapsed ? `Lv.${data.character.level} ${data.character.name}` : undefined} className={cn('mx-3 mb-2 flex items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-white/8 transition-colors hover:ring-primary/40', collapsed && 'justify-center p-2')}>
          <LevelSeal level={data.character.level} size="sm" />
          <span className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
            <span className="block truncate text-sm font-semibold text-ink">{data.character.name}</span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/8">
              <span className="block h-full rounded-full bg-[linear-gradient(90deg,#d99a1f,#f5b83d)] shadow-[0_0_6px_rgb(245_184_61/0.5)]" style={{ width: `${expPercentage}%` }} />
            </span>
          </span>
        </NavLink>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? false} title={collapsed ? label : undefined} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink', isActive && 'bg-primary-soft text-primary', collapsed && 'justify-center px-0')}>
              <Icon size={20} />
              <span className={cn(collapsed && 'hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <NavLink to="/settings" title={collapsed ? '设置' : undefined} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-white/5 hover:text-ink', isActive && 'bg-primary-soft text-primary', collapsed && 'justify-center px-0')}>
            <Settings size={19} />
            <span className={cn(collapsed && 'hidden')}>设置</span>
          </NavLink>
        </div>
      </aside>

      <main key={location.pathname} className="min-w-0 flex-1 px-4 pb-44 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
        <div className="page-enter mx-auto max-w-[1180px]">
          {error ? <p role="alert" className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger ring-1 ring-danger/25">{error}</p> : null}
          <Outlet />
        </div>
      </main>

      <nav aria-label="主导航" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-3">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? false} className={({ isActive }) => cn('relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-faint outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60', isActive && 'text-primary')}>
              {({ isActive }) => (
                <>
                  {isActive ? <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary shadow-[0_0_8px_rgb(245_184_61/0.8)]" /> : null}
                  <Icon size={21} /><span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(160deg,#33290f,#15100a)] text-primary ring-1 ring-primary/50"><Sparkles size={16} /></span>
      <p className={cn('text-sm font-semibold tracking-tight text-ink', compact && 'lg:hidden')}>Life RPG</p>
    </div>
  )
}
