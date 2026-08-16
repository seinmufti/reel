import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireDepartment } from './components/RequireDepartment'
import { DemoProvider, useDemo } from './context/DemoContext'
import { Dashboard } from './pages/Dashboard'
import { CashAdvanceRequestPage, CashAdvanceView } from './pages/finance/CashAdvancesSection'
import { FinancePage } from './pages/finance/FinancePage'
import { FleetPage } from './pages/fleet/FleetPage'
import { HrPage } from './pages/hr/HrPage'
import { LogisticsPage } from './pages/logistics/LogisticsPage'
import { ProcurementPage } from './pages/procurement/ProcurementPage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { ThemeProvider } from './context/ThemeContext'
import { PrimeThemeProvider } from './theme/PrimeThemeProvider'

/** App shell stays mounted during boot so refresh keeps the current URL. */
function BootShell() {
  const { error } = useDemo()

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
        <Route
          path="finance/cash-advance/new"
          element={
            <RequireDepartment>
              <CashAdvanceRequestPage />
            </RequireDepartment>
          }
        />
        <Route
          path="finance/cash-advance/:advanceId"
          element={
            <RequireDepartment>
              <CashAdvanceView />
            </RequireDepartment>
          }
        />
        <Route
          path="finance"
          element={
            <RequireDepartment>
              <FinancePage />
            </RequireDepartment>
          }
        />
        <Route
          path="procurement/*"
          element={
            <RequireDepartment>
              <ProcurementPage />
            </RequireDepartment>
          }
        />
        <Route
          path="logistics"
          element={
            <RequireDepartment>
              <LogisticsPage />
            </RequireDepartment>
          }
        />
        <Route
          path="hr/*"
          element={
            <RequireDepartment>
              <HrPage />
            </RequireDepartment>
          }
        />
        <Route
          path="projects/*"
          element={
            <RequireDepartment>
              <ProjectsPage />
            </RequireDepartment>
          }
        />
        <Route
          path="fleet/*"
          element={
            <RequireDepartment>
              <FleetPage />
            </RequireDepartment>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <PrimeThemeProvider>
        <BrowserRouter>
          <DemoProvider>
            <AppRoutes />
          </DemoProvider>
        </BrowserRouter>
      </PrimeThemeProvider>
    </ThemeProvider>
  )
}
