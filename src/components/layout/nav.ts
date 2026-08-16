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

  if (pathname === '/hr/new') {
    crumbs.push({ label: 'New employee', to: pathname })
  } else if (/\/hr\/[^/]+\/edit$/.test(pathname)) {
    crumbs.push({ label: 'Edit', to: pathname })
  } else if (pathname === '/hr/leave/new') {
    crumbs.push({ label: 'Request leave', to: pathname })
  } else if (/^\/hr\/leave\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'Leaves', to: '/hr/leave' })
    crumbs.push({ label: 'Leave request', to: pathname })
  } else if (pathname === '/hr/leave') {
    crumbs.push({ label: 'Leaves', to: pathname })
  } else if (pathname === '/hr/timesheets') {
    crumbs.push({ label: 'Timesheets', to: pathname })
  } else if (pathname === '/hr/payroll') {
    crumbs.push({ label: 'Payroll', to: pathname })
  } else if (pathname === '/finance/cash-advance/new') {
    crumbs.push({ label: 'Request cash advance', to: pathname })
  } else if (/^\/finance\/cash-advance\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'Cash advance', to: pathname })
  }

  if (pathname === '/fleet/new') {
    crumbs.push({ label: 'New trip', to: pathname })
  } else if (pathname === '/fleet/vehicles') {
    crumbs.push({ label: 'Vehicles', to: pathname })
  } else if (pathname === '/fleet/drivers') {
    crumbs.push({ label: 'Drivers', to: pathname })
  }

  if (
    (pathname.endsWith('/new') || pathname.includes('/new')) &&
    !pathname.startsWith('/hr') &&
    !pathname.startsWith('/fleet') &&
    !pathname.startsWith('/finance/cash-advance')
  ) {
    crumbs.push({ label: 'New', to: `${mod.to}/new` })
  }
  if (pathname.includes('/approvals')) {
    crumbs.push({ label: 'Approvals', to: `${mod.to}/approvals` })
  }
  if (/\/projects\/[^/]+$/.test(pathname) && pathname !== '/projects') {
    crumbs.push({ label: 'Detail', to: pathname })
  }
  if (/\/procurement\/[^/]+\/edit-suggestion$/.test(pathname)) {
    crumbs.push({ label: 'Edit Suggestion', to: pathname })
  } else if (/\/procurement\/[^/]+\/suggest$/.test(pathname)) {
    crumbs.push({ label: 'Suggest Edit', to: pathname })
  } else if (/\/procurement\/[^/]+\/edit$/.test(pathname)) {
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
