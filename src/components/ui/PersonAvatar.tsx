const avatarPalette = [
  { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-500/35' },
  { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-500/35' },
  { bg: 'bg-amber-400', text: 'text-ink', ring: 'ring-amber-400/40' },
  { bg: 'bg-lime-500', text: 'text-ink', ring: 'ring-lime-500/35' },
  { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-500/35' },
  { bg: 'bg-sky-500', text: 'text-white', ring: 'ring-sky-500/35' },
  { bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-600/35' },
  { bg: 'bg-violet-500', text: 'text-white', ring: 'ring-violet-500/35' },
  { bg: 'bg-fuchsia-500', text: 'text-white', ring: 'ring-fuchsia-500/35' },
] as const

export function firstLetter(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

export function avatarColor(index: number) {
  return avatarPalette[((index % avatarPalette.length) + avatarPalette.length) % avatarPalette.length]
}

export function avatarIndexForName(name: string, knownNames: string[] = []) {
  const exact = knownNames.findIndex((n) => n === name)
  if (exact >= 0) return exact
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export function PersonAvatar({
  name,
  colorIndex = 0,
  active = false,
  size = 'md',
  showTooltip = true,
  tooltipPlacement = 'bottom',
  className = '',
}: {
  name: string
  colorIndex?: number
  active?: boolean
  size?: 'sm' | 'md'
  showTooltip?: boolean
  tooltipPlacement?: 'top' | 'bottom'
  className?: string
}) {
  const color = avatarColor(colorIndex)
  const box = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  const face = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  const tooltipPos =
    tooltipPlacement === 'top'
      ? 'bottom-[calc(100%+2px)]'
      : 'top-[calc(100%+2px)]'

  return (
    <span
      className={`group relative inline-flex ${box} items-center justify-center outline-none ${className}`}
      title={showTooltip ? undefined : name}
    >
      <span
        className={`flex ${face} items-center justify-center rounded-full font-display font-bold transition-all duration-200 ease-out group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110 group-focus-visible:shadow-md ${color.bg} ${color.text} ${
          active ? `shadow-sm ring-2 ${color.ring} ring-offset-2` : 'opacity-90 group-hover:opacity-100'
        }`}
      >
        {firstLetter(name)}
      </span>
      {showTooltip ? (
        <span
          className={`pointer-events-none absolute ${tooltipPos} left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-sidebar px-2 py-0.5 text-[11px] font-semibold text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100`}
        >
          {name}
        </span>
      ) : null}
    </span>
  )
}
