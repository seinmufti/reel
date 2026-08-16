import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { PersonAvatar, avatarStyleFromSeed, initials } from '../ui/PersonAvatar'
import { useDemo } from '../../context/DemoContext'
import { crumbForPath } from './nav'

function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  if (location.pathname === '/') return null

  function goBack() {
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    const crumbs = crumbForPath(location.pathname)
    const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2]?.to : '/'
    navigate(parent || '/')
  }

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={goBack}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-soft transition hover:bg-mist hover:text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M11 4.5L6.5 9 11 13.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export function TopBar() {
  const { pathname } = useLocation()
  const crumbs = crumbForPath(pathname)
  const { employees, currentUser, setCurrentUserId, employeeRainbowIndex } = useDemo()
  const currentColor = avatarStyleFromSeed(
    currentUser.id,
    employeeRainbowIndex.get(currentUser.id),
  )

  return (
    <header className="relative z-20 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 overflow-visible border-b border-line bg-surface/95 px-6 shadow-[0_1px_2px_0_rgba(18,18,23,0.04)] backdrop-blur">
      <nav className="flex min-w-0 items-center gap-2 text-sm text-slate-soft" aria-label="Breadcrumb">
        <BackButton />
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-2 truncate">
              {i > 0 ? <span className="text-line">/</span> : null}
              {crumb.to && !isLast ? (
                <Link to={crumb.to} className="truncate hover:text-teal hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className={`truncate ${isLast ? 'font-semibold text-ink' : ''}`}>{crumb.label}</span>
              )}
            </span>
          )
        })}
      </nav>

      <div className="flex items-center gap-4 py-1" role="group" aria-label="Switch account">
        {employees.map((emp) => {
          const active = emp.id === currentUser.id
          return (
            <button
              key={emp.id}
              type="button"
              aria-label={`Login as ${emp.name}`}
              aria-pressed={active}
              onClick={() => setCurrentUserId(emp.id)}
              className="outline-none"
            >
              <PersonAvatar name={emp.name} role={emp.role} seed={emp.id} active={active} />
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        <div className="text-right leading-tight">
          <div className="flex items-center justify-end gap-2 text-sm font-semibold text-ink">
            <span>{currentUser.name}</span>
            {currentUser.isAdmin ? <Badge tone="rose">Admin</Badge> : null}
          </div>
          <div className="text-xs text-slate-soft">{currentUser.role}</div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold"
          style={{
            backgroundColor: currentColor.backgroundColor,
            color: currentColor.color,
          }}
        >
          {initials(currentUser.name)}
        </div>
      </div>
    </header>
  )
}
