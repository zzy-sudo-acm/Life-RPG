import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'

const GoalsTasksPage = lazy(() =>
  import('./pages/GoalsTasksPage').then((module) => ({ default: module.GoalsTasksPage })),
)
const SkillsPage = lazy(() =>
  import('./pages/SkillsPage').then((module) => ({ default: module.SkillsPage })),
)
const AchievementsEquipmentPage = lazy(() =>
  import('./pages/AchievementsEquipmentPage').then((module) => ({
    default: module.AchievementsEquipmentPage,
  })),
)
const EventsPage = lazy(() =>
  import('./pages/EventsPage').then((module) => ({ default: module.EventsPage })),
)
const BossesPage = lazy(() =>
  import('./pages/BossesPage').then((module) => ({ default: module.BossesPage })),
)
const TimelinePage = lazy(() =>
  import('./pages/TimelinePage').then((module) => ({ default: module.TimelinePage })),
)
const DataManagementPage = lazy(() =>
  import('./pages/DataManagementPage').then((module) => ({
    default: module.DataManagementPage,
  })),
)

function RouteFallback() {
  return <p className="py-24 text-center text-sm text-muted">正在打开成长模块…</p>
}
export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="goals" element={<GoalsTasksPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="collection" element={<AchievementsEquipmentPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="bosses" element={<BossesPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="data" element={<DataManagementPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
