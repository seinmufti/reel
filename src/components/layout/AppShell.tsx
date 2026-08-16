import { Outlet } from 'react-router-dom'
import { useDemo } from '../../context/DemoContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const { currentUser } = useDemo()

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="relative z-0 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto bg-mint p-6">
          <Outlet key={currentUser.id} />
        </main>
      </div>
    </div>
  )
}
