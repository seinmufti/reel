const styles: Record<string, string> = {
  default: 'bg-mist text-slate-soft',
  teal: 'bg-teal-soft text-teal-dark',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-red-100 text-rose',
  emerald: 'bg-emerald-100 text-emerald-800',
  slate: 'bg-slate-200 text-slate-700',
  violet: 'bg-violet-100 text-violet-800',
  sky: 'bg-sky-100 text-sky-800',
  orange: 'bg-orange-100 text-orange-800',
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: keyof typeof styles
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${styles[tone]}`}
    >
      {children}
    </span>
  )
}

export function statusTone(status: string): keyof typeof styles {
  const map: Record<string, keyof typeof styles> = {
    approved: 'emerald',
    paid: 'emerald',
    done: 'emerald',
    completed: 'emerald',
    active: 'teal',
    available: 'teal',
    submitted: 'amber',
    pending: 'amber',
    requested: 'amber',
    draft: 'slate',
    planned: 'slate',
    todo: 'slate',
    rejected: 'rose',
    cancelled: 'rose',
    maintenance: 'rose',
    off_duty: 'slate',
    ordered: 'teal',
    in_progress: 'amber',
    on_trip: 'amber',
    restricted: 'amber',
    unrestricted: 'teal',
  }
  return map[status] ?? 'default'
}

export function kindTone(kind: string): keyof typeof styles {
  const map: Record<string, keyof typeof styles> = {
    'Purchase request': 'teal',
    'Leave request': 'violet',
    Timesheet: 'sky',
    'Trip request': 'orange',
    'Cash advance': 'sky',
  }
  return map[kind] ?? 'default'
}
