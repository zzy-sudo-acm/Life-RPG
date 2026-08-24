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
import { LevelSeal } from '../ui/LevelSeal'
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

/** 移动端底部固定的五个主入口；其余页面收纳进「手账目录」。 */
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
          <span className="seal mx-auto flex size-14 animate-pulse items-center justify-center rounded-lg">
            <Sparkles size={26} />
          </span>
          <p className="mt-4 font-kai text-sm text-muted">正在摊开手账…</p>
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
      {/* 移动端顶栏：品牌 + 等级印章 */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/92 px-4 backdrop-blur-sm lg:hidden">
        <Brand compact={false} dark={false} />
        <NavLink
          to="/"
          className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1.5 pr-3"
          aria-label={`返回角色总览，当前等级 ${character.level}`}
        >
          <LevelSeal level={character.level} size="sm" />
          <span className="w-16">
            <ProgressBar value={character.exp} max={character.expToNextLevel} tone="exp" size="sm" />
          </span>
        </NavLink>
      </header>

      {/* 桌面端侧栏：墨迹书脊 */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col bg-sidebar text-[#e8e0cf] lg:flex',
          collapsed && 'lg:w-[84px]',
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Brand compact={collapsed} dark />
          <button
            type="button"
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
            className="rounded-lg p-1.5 text-[#a89a82] transition-colors hover:bg-white/8 hover:text-[#f2ecdf]"
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
                  'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#a89a82] transition-colors hover:bg-white/6 hover:text-[#f2ecdf]',
                  isActive && 'bg-white/8 text-[#f5efdf]',
                  collapsed && 'lg:justify-center lg:px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-danger" />
                  ) : null}
                  <Icon size={19} className={cn('shrink-0', isActive && 'text-[#e0784f]')} />
                  <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className={cn('rounded-xl border border-white/12 bg-white/5 p-3', collapsed && 'lg:hidden')}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#f2ecdf]">{character.name}</p>
                <p className="mt-0.5 truncate text-xs text-[#a89a82]">{character.profession}</p>
              </div>
              <LevelSeal level={character.level} size="sm" />
            </div>
            <div className="mt-3">
              <ProgressBar value={character.exp} max={character.expToNextLevel} tone="exp" size="sm" />
            </div>
            <p className="mt-2 text-[11px] text-[#8d7f68]">总 EXP {formatNumber(character.totalExp)}</p>
          </div>
          <button
            type="button"
            disabled={isExporting}
            title={collapsed ? '导出数据' : undefined}
            className={cn(
              'mt-2 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#a89a82] transition-colors hover:bg-white/6 hover:text-[#f2ecdf]',
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
            <div role="alert" className="mb-5 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航：纸面标签 */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
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
                  isActive && 'text-danger',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute inset-x-7 top-0 h-[3px] rounded-b bg-danger" />
                  ) : null}
                  <Icon size={20} />
                  <span className={cn(isActive && 'font-semibold')}>{shortLabel}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            aria-label="打开手账目录"
            aria-expanded={menuOpen}
            className={cn(
              'relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-medium text-faint transition-colors',
              menuOpen && 'text-danger',
            )}
            onClick={() => setMenuOpen(true)}
          >
            {menuOpen ? (
              <span className="absolute inset-x-7 top-0 h-[3px] rounded-b bg-danger" />
            ) : null}
            <Grid3X3 size={20} />
            目录
          </button>
        </div>
      </nav>

      {/* 移动端「手账目录」抽屉 */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/45 lg:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="手账目录"
            className="max-h-[86vh] w-full animate-pop-in overflow-y-auto rounded-t-3xl border-t border-line bg-surface pb-[calc(env(safe-area-inset-bottom)+20px)]"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-4">
              <h2 className="font-display font-bold text-ink">手账目录</h2>
              <button
                type="button"
                aria-label="关闭目录"
                className="rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* 角色速览 */}
            <div className="mx-4 mt-4 rounded-xl border border-line bg-raised/50 p-4">
              <div className="flex items-center gap-3">
                <LevelSeal level={character.level} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold text-ink">{character.name}</p>
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
                      'flex flex-col items-center gap-2 rounded-xl border px-1 py-3 text-[11px] transition-colors',
                      isActive
                        ? 'border-danger/40 bg-danger-soft text-danger'
                        : 'border-transparent text-muted hover:bg-ink/5 hover:text-ink',
                    )
                  }
                >
                  <span className="flex size-10 items-center justify-center rounded-lg border border-line bg-surface">
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
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-raised/60 text-sm text-muted transition-colors hover:text-ink"
                onClick={handleExport}
              >
                <Download size={16} />
                {isExporting ? '正在导出…' : '导出存档'}
              </button>
              <p className="mt-3 text-center font-kai text-xs text-faint">
                数据仅保存在本机浏览器，记得定期导出备份
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Brand({ compact, dark }: { compact: boolean; dark: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="seal flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Sparkles size={18} />
      </span>
      <div className={cn(compact && 'lg:hidden')}>
        <p className={cn('font-display text-sm font-bold tracking-wide', dark ? 'text-[#f2ecdf]' : 'text-ink')}>
          Life RPG
        </p>
        <p className={cn('font-kai text-[11px]', dark ? 'text-[#a89a82]' : 'text-faint')}>人生成长手账</p>
      </div>
    </div>
  )
}
