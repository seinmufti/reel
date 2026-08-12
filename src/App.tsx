import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DemoProvider, useDemo } from './context/DemoContext'
import { Dashboard } from './pages/Dashboard'
import { FinancePage } from './pages/finance/FinancePage'
import { FleetPage } from './pages/fleet/FleetPage'
import { HrPage } from './pages/hr/HrPage'
import { LogisticsPage } from './pages/logistics/LogisticsPage'
import { ProcurementPage } from './pages/procurement/ProcurementPage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { PrimeThemeProvider } from './theme/PrimeThemeProvider'

/** Keep <Routes> mounted during boot so refresh preserves the current URL. */
function BootShell() {
  const { ready, error } = useDemo()

  if (!ready) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center text-sm text-slate-soft">
        Loading local database…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-display text-lg font-semibold text-ink">Local database unavailable</p>
        <p className="max-w-md text-sm text-slate-soft/80">
          Start the API with <code className="rounded bg-mist px-1.5 py-0.5">npm run dev</code> (or{' '}
          <code className="rounded bg-mist px-1.5 py-0.5">npm run dev:server</code>) so SQLite can serve
          data on port 8787.
        </p>
        <p className="max-w-md text-xs text-rose">{error}</p>
      </div>
    )
  }

  return <AppShell />
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<BootShell />}>
        <Route index element={<Dashboard />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="procurement/*" element={<ProcurementPage />} />
        <Route path="logistics" element={<LogisticsPage />} />
        <Route path="hr" element={<HrPage />} />
        <Route path="projects/*" element={<ProjectsPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <PrimeThemeProvider>
      <BrowserRouter>
        <DemoProvider>
          <AppRoutes />
        </DemoProvider>
      </BrowserRouter>
    </PrimeThemeProvider>
  )
}
