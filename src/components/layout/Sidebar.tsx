import { NavLink } from 'react-router-dom'
import { hiddenModules, primaryModules } from './nav'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap transition ${
    isActive
      ? 'text-white group-hover/sidebar:bg-teal group-hover/sidebar:shadow-sm'
      : 'text-white/75 group-hover/sidebar:hover:bg-white/10 group-hover/sidebar:hover:text-white'
  }`

function IconBox({
  children,
  active = false,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
        active
          ? 'bg-teal text-white shadow-sm group-hover/sidebar:bg-transparent group-hover/sidebar:shadow-none'
          : ''
      }`}
      aria-hidden
    >
      {children}
    </span>
  )
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3 3h5v5H3V3zm7 0h5v5h-5V3zM3 10h5v5H3v-5zm7 0h5v5h-5v-5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 14.5c.8-2.2 2.6-3.5 5-3.5s4.2 1.3 5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ProcurementIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M4 5h10l-1 8H5L4 5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 8V5.5a2 2 0 014 0V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function FinanceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3.5 13.5l3.2-3.2 2.3 2.3 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.5 7.5h3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogisticsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3 12V6.5L9 3.5l6 3V12l-6 3-6-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 8.5v6.5M3 6.5l6 3 6-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3.5 5.5h11v9h-11v-9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6.5 5.5V4a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 8.5h11" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function FleetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3 11.5h12l-.8-4.2A1.5 1.5 0 0012.7 6H5.3a1.5 1.5 0 00-1.5 1.3L3 11.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="13" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="13" r="1.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.8 6l.7-2h3l.7 2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function FishingRodIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.2 14.2L14.8 3.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M2.4 15.2l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="6.4" cy="10.6" r="1.55" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M14.8 3.4c1.2 1.8 1.1 4.2-.4 5.8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M14.4 9.2c.7.1 1.2.7 1.1 1.4-.1.6-.7 1-1.3.9"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function NorthernLightsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M2 13.5c1.5-2.8 3.2-4.2 5-4.2s3.2 1.2 4.5 2.8c1.2 1.4 2.6 2.2 4.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2.5 10c1.8-2.6 3.4-3.8 5.2-3.8 1.7 0 3.1 1 4.4 2.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M3 7c1.6-2.2 3-3.2 4.6-3.2 1.4 0 2.6.7 3.8 1.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path d="M14.2 4.2l.6 1.4 1.4.4-1.4.4-.6 1.4-.6-1.4-1.4-.4 1.4-.4.6-1.4z" fill="currentColor" />
    </svg>
  )
}

const moduleIcons: Record<string, React.ReactNode> = {
  '/hr': <HrIcon />,
  '/procurement': <ProcurementIcon />,
  '/finance': <FinanceIcon />,
  '/logistics': <LogisticsIcon />,
  '/projects': <ProjectsIcon />,
  '/fleet': <FleetIcon />,
}

export function Sidebar() {
  return (
    <aside className="relative z-40 w-14 shrink-0 self-stretch">
      {/* Outer rail clips; inner column stays w-64 so labels never shift */}
      <div className="group/sidebar absolute inset-y-0 left-0 w-14 overflow-hidden border-r border-white/5 bg-sidebar text-white transition-[width,box-shadow] duration-200 ease-out hover:w-64 hover:shadow-[12px_0_28px_rgba(0,0,0,0.28)]">
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-4">
            <IconBox>
              <FishingRodIcon />
            </IconBox>
            <div className="min-w-0 pt-0.5">
              <div className="font-display text-2xl font-bold tracking-tight leading-none">REEL</div>
              <div className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">
                Project
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLink to="/" end className={linkClass} title="Dashboard">
              {({ isActive }) => (
                <>
                  <IconBox active={isActive}>
                    <DashboardIcon />
                  </IconBox>
                  <span>Dashboard</span>
                </>
              )}
            </NavLink>

            <div className="flex items-center gap-3 px-2 pt-4 pb-1">
              <IconBox>{null}</IconBox>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                Modules
              </span>
            </div>
            {primaryModules.map((mod) => (
              <NavLink key={mod.to} to={mod.to} className={linkClass} title={mod.short}>
                {({ isActive }) => (
                  <>
                    <IconBox active={isActive}>{moduleIcons[mod.to]}</IconBox>
                    <span>{mod.short}</span>
                  </>
                )}
              </NavLink>
            ))}

            <div className="flex items-center gap-3 px-2 pt-4 pb-1">
              <IconBox>{null}</IconBox>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/20">
                Hiddens
              </span>
            </div>
            {hiddenModules.map((mod) => (
              <span
                key={mod.to}
                aria-disabled="true"
                title="Disabled"
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap text-white/25"
              >
                <IconBox>{moduleIcons[mod.to]}</IconBox>
                <span>{mod.short}</span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3 border-t border-white/10 px-3 py-4 text-xs text-sidebar-muted">
            <IconBox>
              <NorthernLightsIcon />
            </IconBox>
            <span className="leading-snug">
              Developed by <span className="font-semibold text-white/80">Nordlys</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
