import {
  Award,
  ChevronLeft,
  Database,
  Download,
  Flag,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  Map,
  ScrollText,
  Sparkles,
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
  shortLabel: string
  icon: LucideIcon
  end?: boolean
}

const navigation: NavigationItem[] = [
  { to: '/', label: '角色总览', shortLabel: '总览', icon: LayoutDashboard, end: true },
  { to: '/goals', label: '目标任务', shortLabel: '任务', icon: Flag },
  { to: '/skills', label: '技能树', shortLabel: '技能', icon: GitBranch },
  { to: '/collection', label: '成就装备', shortLabel: '收藏', icon: Award },
  { to: '/events', label: '人生事件', shortLabel: '事件', icon: ScrollText },
  { to: '/bosses', label: 'Boss 挑战', shortLabel: 'Boss', icon: Swords },
  { to: '/timeline', label: '人生地图', shortLabel: '地图', icon: Map },
  { to: '/data', label: '数据管理', shortLabel: '数据', icon: Database },
]

/** 移动端底部固定的五个主入口；其余页面收纳进「冒险菜单」。 */
const bottomTabPaths = ['/', '/goals', '/skills', '/bosses'] as const
const bottomTabs = bottomTabPaths.map(
  (path) => navigation.find((item) => item.to === path) as NavigationItem,
)

export function AppShell() {
  const { data, settings, updateSettings, createSaveFile, isLoading, error } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <span className="mx-auto flex size-14 animate-pulse items-center justify-center rounded-2xl border border-primary/40 bg-primary-soft text-primary">
            <Sparkles size={26} />
          </span>
          <p className="mt-4 text-sm text-muted">正在加载本地存档…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-danger/30 bg-surface p-6">
          <h1 className="font-semibold text-danger">存档加载失败</h1>
          <p className="mt-2 text-sm text-muted">{error ?? '没有可用的数据。请刷新页面后重试。'}</p>
        </div>
      </div>
    )
  }

  const collapsed = settings.sidebarCollapsed
  const { character } = data

  const handleExport = () => {
    setIsExporting(true)
    void createSaveFile()
      .then(downloadSaveFile)
      .catch(() => undefined)
      .finally(() => setIsExporting(false))
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* 移动端顶栏：品牌 + 等级速览 */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-canvas/85 px-4 backdrop-blur-xl lg:hidden">
        <Brand compact={false} />
        <NavLink
          to="/"
          className="flex items-center gap-2.5 rounded-full border border-line bg-surface/80 py-1 pl-1.5 pr-3"
          aria-label={`返回角色总览，当前等级 ${character.level}`}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-exp to-[#c8871d] text-xs font-black text-[#241600] shadow-[0_0_12px_rgb(242_178_62/0.4)]">
            {character.level}
          </span>
          <span className="w-16">
            <ProgressBar value={character.exp} max={character.expToNextLevel} tone="exp" size="sm" />
          </span>
        </NavLink>
      </header>

      {/* 桌面端侧栏 */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line bg-sidebar lg:flex',
          collapsed && 'lg:w-[84px]',
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-line/70 px-5">
          <Brand compact={collapsed} />
          <button
            type="button"
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/8 hover:text-ink"
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
                  'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink',
                  isActive && 'bg-primary-soft text-primary',
                  collapsed && 'lg:justify-center lg:px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_rgb(62_207_142/0.7)]" />
                  ) : null}
                  <Icon size={19} className="shrink-0" />
                  <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line/70 p-3">
          <div className={cn('rounded-2xl border border-line/70 bg-raised/50 p-3', collapsed && 'lg:hidden')}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{character.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{character.profession}</p>
              </div>
              <span className="rounded-lg bg-exp-soft px-2 py-1 text-sm font-bold text-exp">
                Lv.{character.level}
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={character.exp} max={character.expToNextLevel} tone="exp" size="sm" />
            </div>
            <p className="mt-2 text-[11px] text-faint">总 EXP {formatNumber(character.totalExp)}</p>
          </div>
          <button
            type="button"
            disabled={isExporting}
            title={collapsed ? '导出数据' : undefined}
            className={cn(
              'mt-2 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-white/5 hover:text-ink',
              collapsed && 'lg:justify-center lg:px-0',
            )}
            onClick={handleExport}
          >
            <Download size={18} />
            <span className={cn(collapsed && 'lg:hidden')}>
              {isExporting ? '正在导出…' : '导出数据'}
            </span>
          </button>
        </div>
      </aside>

      {/* 主内容区；移动端为底部导航预留空间 */}
      <main key={location.pathname} className="min-w-0 flex-1 px-4 pb-32 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
        <div className="page-enter mx-auto max-w-[1480px]">
          {error ? (
            <div role="alert" className="mb-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5">
          {bottomTabs.map(({ to, shortLabel, icon: Icon, end = false }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-medium text-faint transition-colors',
                  isActive && 'text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
                  ) : null}
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl transition-all',
                      isActive && 'bg-primary-soft shadow-[0_0_18px_rgb(62_207_142/0.25)]',
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  {shortLabel}
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            aria-label="打开冒险菜单"
            aria-expanded={menuOpen}
            className={cn(
              'relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-medium text-faint transition-colors',
              menuOpen && 'text-primary',
            )}
            onClick={() => setMenuOpen(true)}
          >
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl transition-all',
                menuOpen && 'bg-primary-soft shadow-[0_0_18px_rgb(62_207_142/0.25)]',
              )}
            >
              <Grid3X3 size={20} />
            </span>
            菜单
          </button>
        </div>
      </nav>

      {/* 移动端「冒险菜单」抽屉 */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/65 backdrop-blur-sm lg:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="冒险菜单"
            className="max-h-[86vh] w-full animate-pop-in overflow-y-auto rounded-t-3xl border-t border-line bg-surface pb-[calc(env(safe-area-inset-bottom)+20px)]"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line/70 bg-surface/95 px-5 py-4 backdrop-blur">
              <h2 className="font-semibold text-ink">冒险菜单</h2>
              <button
                type="button"
                aria-label="关闭菜单"
                className="rounded-lg p-1.5 text-muted hover:bg-white/8 hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* 角色速览卡 */}
            <div className="mx-4 mt-4 rounded-2xl border border-line bg-raised/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-b from-exp to-[#c8871d] text-lg font-black text-[#241600] shadow-[0_0_18px_rgb(242_178_62/0.35)]">
                  {character.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{character.name}</p>
                  <p className="truncate text-xs text-muted">
                    {character.profession} · {character.lifeStage}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={character.exp}
                  max={character.expToNextLevel}
                  tone="exp"
                  size="sm"
                  label={`EXP ${formatNumber(character.exp)} / ${formatNumber(character.expToNextLevel)}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4">
              {navigation.map(({ to, label, icon: Icon, end = false }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-2 rounded-2xl border border-transparent px-1 py-3 text-[11px] text-muted transition-colors',
                      isActive
                        ? 'border-primary/30 bg-primary-soft text-primary'
                        : 'hover:bg-white/5 hover:text-ink',
                    )
                  }
                >
                  <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-raised/70">
                    <Icon size={18} />
                  </span>
                  {label}
                </NavLink>
              ))}
            </div>

            <div className="px-4">
              <button
                type="button"
                disabled={isExporting}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-raised/70 text-sm text-muted transition-colors hover:text-ink"
                onClick={handleExport}
              >
                <Download size={16} />
                {isExporting ? '正在导出…' : '导出存档'}
              </button>
              <p className="mt-3 text-center text-[11px] text-faint">
                数据仅保存在本机浏览器 · 记得定期导出备份
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary-soft text-primary shadow-[0_0_16px_rgb(62_207_142/0.2)]">
        <Sparkles size={18} />
      </span>
      <div className={cn(compact && 'lg:hidden')}>
        <p className="text-sm font-bold tracking-wide text-ink">Life RPG</p>
        <p className="text-[11px] text-faint">人生成长系统</p>
      </div>
    </div>
  )
}
