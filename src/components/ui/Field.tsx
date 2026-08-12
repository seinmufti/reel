export function Field({
  label,
  children,
  className = '',
  required = false,
}: {
  label: string
  children: React.ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-slate-soft">
        {label}
        {required ? <span className="text-rose"> *</span> : null}
      </span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] outline-none transition placeholder:text-slate-soft/70 hover:border-slate-soft/40 focus:border-teal focus:shadow-[0_0_0_1px_var(--color-teal)] disabled:cursor-not-allowed disabled:bg-mist disabled:text-slate-soft'
