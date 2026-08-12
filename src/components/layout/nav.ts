export type AppModule = {
  to: string
  label: string
  short: string
  description: string
}

export const primaryModules: AppModule[] = [
  {
    to: '/hr',
    label: 'Human Resources',
    short: 'HR',
    description: 'Employees, leave, timesheets, payroll',
  },
  {
    to: '/procurement',
    label: 'Procurement',
    short: 'Procurement',
    description: 'Purchase requests and approvals',
  },
  {
    to: '/finance',
    label: 'Finance & Accounting',
    short: 'Finance',
    description: 'Funds, single-entry ledger, and PR payments',
  },
]

export const hiddenModules: AppModule[] = [
  {
    to: '/logistics',
    label: 'Logistics',
    short: 'Logistics',
    description: 'Inventory, receive and issue stock',
  },
  {
    to: '/projects',
    label: 'Project Management',
    short: 'Projects',
    description: 'Programs, goals, and tasks',
  },
  {
    to: '/fleet',
    label: 'Fleet Management',
    short: 'Fleet',
    description: 'Vehicles, drivers, and trip requests',
  },
]

export const modules: AppModule[] = [...primaryModules, ...hiddenModules]

export type Crumb = {
  label: string
  to?: string
}

export function crumbForPath(pathname: string): Crumb[] {
  if (pathname === '/') return [{ label: 'Dashboard', to: '/' }]

  const mod = modules.find((m) => pathname === m.to || pathname.startsWith(`${m.to}/`))
  if (!mod) return [{ label: 'REEL', to: '/' }]

  const crumbs: Crumb[] = [
    { label: 'Dashboard', to: '/' },
    { label: mod.label, to: mod.to },
  ]

  if (pathname.endsWith('/new') || pathname.includes('/new')) {
    crumbs.push({ label: 'New', to: `${mod.to}/new` })
  }
  if (pathname.includes('/approvals')) {
    crumbs.push({ label: 'Approvals', to: `${mod.to}/approvals` })
  }
  if (/\/projects\/[^/]+$/.test(pathname) && pathname !== '/projects') {
    crumbs.push({ label: 'Detail', to: pathname })
  }
  if (/\/procurement\/[^/]+\/edit$/.test(pathname)) {
    crumbs.push({ label: 'Edit', to: pathname })
  } else if (/\/procurement\/[^/]+\/exhaustion$/.test(pathname)) {
    crumbs.push({ label: 'Exhaustion of entries', to: pathname })
  } else if (
    /\/procurement\/[^/]+$/.test(pathname) &&
    !pathname.endsWith('/new') &&
    !pathname.endsWith('/approvals')
  ) {
    crumbs.push({ label: 'Form', to: pathname })
  }

  return crumbs
}
