export function PageHeader({
  title,
  titleAside,
  actions,
  tabs,
}: {
  title: string
  titleAside?: React.ReactNode
  actions?: React.ReactNode
  tabs?: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {titleAside}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="mt-4">{tabs}</div> : null}
    </div>
  )
}
