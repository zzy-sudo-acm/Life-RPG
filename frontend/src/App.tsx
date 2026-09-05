import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { TodayPage } from './pages/TodayPage'
import { NotFoundPage } from './pages/NotFoundPage'

const GoalsPage = lazy(() =>
  import('./pages/GoalsPage').then((module) => ({ default: module.GoalsPage })),
)
const CharacterPage = lazy(() =>
  import('./pages/CharacterPage').then((module) => ({
    default: module.CharacterPage,
  })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const JournalPage = lazy(() =>
  import('./pages/JournalPage').then((module) => ({
    default: module.JournalPage,
  })),
)
const AchievementsPage = lazy(() =>
  import('./pages/AchievementsPage').then((module) => ({
    default: module.AchievementsPage,
  })),
)

function RouteFallback() {
  return (
    <p className="py-24 text-center text-sm text-muted">正在打开成长手账…</p>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<TodayPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="character" element={<CharacterPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
