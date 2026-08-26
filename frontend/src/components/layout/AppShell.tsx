import { ChevronLeft, ListChecks, Settings, Sparkles, Target, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/AppStoreContext'
import { cn } from '../../utils/cn'

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
          <span className="seal mx-auto flex size-14 animate-pulse items-center justify-center rounded-lg"><Sparkles size={26} /></span>
          <p className="mt-4 font-kai text-sm text-muted">正在摊开今日手账…</p>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-xl border border-danger/40 bg-surface p-6">
          <h1 className="font-display font-bold text-danger">存档读取失败</h1>
          <p className="mt-2 text-sm text-muted">{error ?? '没有可用的数据。请刷新页面后重试。'}</p>
        </div>
      </div>
    )
  }

  const collapsed = settings.sidebarCollapsed

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/95 px-4 backdrop-blur-sm lg:hidden">
        <Brand compact={false} />
        <NavLink to="/settings" aria-label="打开设置" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"><Settings size={19} /></NavLink>
      </header>

      <aside className={cn('sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col bg-sidebar text-[#e8e0cf] transition-[width] lg:flex', collapsed && 'w-[80px]')}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Brand compact={collapsed} />
          <button type="button" aria-label={collapsed ? '展开侧栏' : '收起侧栏'} className="rounded-lg p-1.5 text-[#a89a82] hover:bg-white/8 hover:text-white" onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}>
            <ChevronLeft size={18} className={cn('transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 px-3 py-6" aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? false} title={collapsed ? label : undefined} className={({ isActive }) => cn('relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#b7aa93] transition-colors hover:bg-white/6 hover:text-white', isActive && 'bg-primary/60 text-white', collapsed && 'justify-center px-0')}>
              <Icon size={20} />
              <span className={cn(collapsed && 'hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <NavLink to="/settings" title={collapsed ? '设置' : undefined} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-[#a89a82] hover:bg-white/6 hover:text-white', isActive && 'bg-white/8 text-white', collapsed && 'justify-center px-0')}>
            <Settings size={19} />
            <span className={cn(collapsed && 'hidden')}>设置</span>
          </NavLink>
        </div>
      </aside>

      <main key={location.pathname} className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
        <div className="page-enter mx-auto max-w-[1180px]">
          {error ? <p role="alert" className="mb-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
          <Outlet />
        </div>
      </main>

      <nav aria-label="主导航" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="grid grid-cols-3">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? false} className={({ isActive }) => cn('relative flex min-h-[62px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-faint outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60', isActive && 'text-primary')}>
              {({ isActive }) => <><Icon size={21} /><span>{label}</span>{isActive ? <span className="absolute inset-x-12 top-0 h-[3px] rounded-b bg-primary" /> : null}</>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="seal flex size-9 shrink-0 items-center justify-center rounded-lg"><Sparkles size={18} /></span>
      <div className={cn('text-ink lg:text-[#f2ecdf]', compact && 'lg:hidden')}>
        <p className="font-display text-sm font-bold tracking-wide">Life RPG</p>
        <p className="font-kai text-[11px] text-faint lg:text-[#a89a82]">每日成长手账</p>
      </div>
    </div>
  )
}
