type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cancel' | 'blue'

const variants: Record<Variant, string> = {
  primary:
    'border border-transparent bg-teal text-white shadow-sm hover:bg-teal-dark focus-visible:ring-2 focus-visible:ring-teal/30',
  secondary:
    'border border-line bg-white text-ink shadow-sm hover:bg-mist hover:border-slate-soft/30 focus-visible:ring-2 focus-visible:ring-teal/20',
  ghost: 'border border-transparent text-teal hover:bg-teal-soft focus-visible:ring-2 focus-visible:ring-teal/20',
  danger:
    'border border-transparent bg-rose text-white shadow-sm hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-rose/30',
  cancel:
    'border border-rose/25 bg-rose/5 text-rose hover:bg-rose/10 focus-visible:ring-2 focus-visible:ring-rose/20',
  blue:
    'border border-transparent bg-[#2563eb] text-white shadow-sm hover:bg-[#1d4ed8] focus-visible:ring-2 focus-visible:ring-[#2563eb]/30',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
