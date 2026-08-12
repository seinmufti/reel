export function Panel({
  title,
  children,
  className = '',
  actions,
  leading,
}: {
  title?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  leading?: React.ReactNode
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] ${className}`}
    >
      {title || leading || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-mist/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {leading}
            {title ? <h2 className="font-display text-sm font-semibold text-ink">{title}</h2> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}
