import {
  CalendarDays,
  ChevronRight,
  Flag,
  Footprints,
  House,
  Leaf,
  Settings,
  Sprout,
  Trophy,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '../../store/AppStoreContext'
import { cn } from '../../utils/cn'

const navigation = [
  { to: '/', label: '今日概览', icon: House, end: true },
  { to: '/goals', label: '目标旅程', icon: Flag },
  { to: '/journal', label: '成长足迹', icon: Footprints },
  { to: '/achievements', label: '成就馆', icon: Trophy },
]

export function AppShell() {
  const { data, isLoading, error } = useAppStore()
  const location = useLocation()
  const title =
    navigation.find((item) => item.to === location.pathname)?.label ??
    (location.pathname === '/settings'
      ? '设置'
      : location.pathname === '/character'
        ? '成长档案'
        : '未找到页面')
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

  if (isLoading)
    return (
      <div className="loading-state">
        <Sprout size={40} className="animate-pulse text-primary" />
        <p>正在打开你的成长手账…</p>
      </div>
    )
  if (!data)
    return (
      <div className="loading-state">
        <h1>存档读取失败</h1>
        <p role="alert">{error ?? '请刷新页面后重试。'}</p>
        <button
          type="button"
          className="text-primary underline"
          onClick={() => window.location.reload()}
        >
          重新加载
        </button>
      </div>
    )

  return (
    <div className="app-layout">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        跳到主要内容
      </a>
      <aside className="desktop-sidebar">
        <NavLink to="/" className="brand-block" aria-label="Life RPG 首页">
          <Sprout size={48} strokeWidth={1.3} />
          <strong>Life RPG</strong>
          <span>人生成长手账</span>
        </NavLink>
        <nav className="sidebar-navigation" aria-label="桌面主导航">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? false}
              className={({ isActive }) =>
                cn('sidebar-link', isActive && 'is-active')
              }
            >
              <Icon size={21} strokeWidth={1.65} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <Leaf size={19} strokeWidth={1.3} />
            <p>每一步，都算数。</p>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn('sidebar-link', isActive && 'is-active')
            }
          >
            <Settings size={19} strokeWidth={1.65} />
            <span>设置</span>
          </NavLink>
          <NavLink to="/character" className="profile-link">
            <span className="profile-avatar">
              {data.character.name.slice(0, 1)}
            </span>
            <span className="profile-name">{data.character.name}</span>
            <span className="level-label">Lv.{data.character.level}</span>
          </NavLink>
        </div>
      </aside>
      <header className="mobile-header">
        <NavLink to="/" className="mobile-brand">
          <Sprout size={27} strokeWidth={1.6} />
          <strong>Life RPG</strong>
        </NavLink>
        <NavLink
          to="/settings"
          aria-label="打开设置"
          className="mobile-settings"
        >
          <CalendarDays size={16} />
          <span>{date}</span>
          <Settings size={18} />
        </NavLink>
      </header>
      <div className="main-shell">
        <div className="desktop-topbar">
          <div>
            <House size={17} />
            <ChevronRight size={14} />
            <span>{title}</span>
          </div>
          <time>
            <CalendarDays size={17} />
            {date}
          </time>
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="main-content"
          key={location.pathname}
        >
          <div className="page-enter">
            {error ? (
              <p
                role="alert"
                className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}
            <Outlet />
          </div>
        </main>
      </div>
      <nav className="mobile-navigation" aria-label="手机主导航">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            className={({ isActive }) =>
              cn('mobile-nav-link', isActive && 'is-active')
            }
          >
            <Icon size={23} strokeWidth={1.65} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
