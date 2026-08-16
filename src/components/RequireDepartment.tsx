import { Navigate, useLocation } from 'react-router-dom'
import { useDemo } from '../context/DemoContext'
import { userCanAccessPath } from '../data/mockData'

/** Renders children only when the current user belongs to the module’s department. */
export function RequireDepartment({ children }: { children: React.ReactNode }) {
  const { currentUser } = useDemo()
  const location = useLocation()

  if (!userCanAccessPath(currentUser.departments, location.pathname)) {
    return <Navigate to="/" replace />
  }

  return children
}
