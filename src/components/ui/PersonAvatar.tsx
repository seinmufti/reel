import { useDemo } from '../../context/DemoContext'

/** FNV-1a — stable across sessions; does not depend on employee list order. */
export function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Curated rainbow — saturated enough for white initials, stable per employee id. */
const AVATAR_RAINBOW = [
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // amber
  '#65a30d', // lime
  '#16a34a', // green
  '#0d9488', // teal
  '#0891b2', // cyan
  '#2563eb', // blue
  '#4f46e5', // indigo
  '#7c3aed', // violet
  '#9333ea', // purple
  '#db2777', // pink
] as const

function ringFromHex(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.45)`
}

/** Distinct, readable avatar colors derived only from a stable seed (prefer employee id). */
export function avatarStyleFromSeed(seed: string, rainbowIndex?: number): {
  backgroundColor: string
  color: string
  ringColor: string
} {
  const index =
    rainbowIndex !== undefined
      ? ((rainbowIndex % AVATAR_RAINBOW.length) + AVATAR_RAINBOW.length) % AVATAR_RAINBOW.length
      : hashSeed(seed.trim() || '?') % AVATAR_RAINBOW.length
  const backgroundColor = AVATAR_RAINBOW[index]
  return { backgroundColor, color: '#ffffff', ringColor: ringFromHex(backgroundColor) }
}

/** Assign distinct rainbow slots — spread across the spectrum, not just red/orange/amber. */
const RAINBOW_ASSIGNMENT_ORDER = [0, 10, 1, 7, 4, 8, 2, 11, 5, 9, 3, 6] as const

/** Stable rainbow slot per employee — sorted by name, then id. */
export function buildEmployeeRainbowIndex(
  employees: { id: string; name: string }[],
): ReadonlyMap<string, number> {
  const sorted = [...employees].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
  return new Map(
    sorted.map((emp, i) => [
      emp.id,
      RAINBOW_ASSIGNMENT_ORDER[i % RAINBOW_ASSIGNMENT_ORDER.length],
    ]),
  )
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    const word = parts[0]
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word[0].toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** @deprecated Prefer initials */
export const firstLetter = initials

/** @deprecated Prefer avatarStyleFromSeed(employee.id). */
export function avatarColor(index: number) {
  return avatarStyleFromSeed(`idx:${index}`)
}

/** @deprecated Prefer hashing employee.id via avatarStyleFromSeed. */
export function avatarIndexForName(name: string, _knownNames: string[] = []) {
  return hashSeed(name)
}

type AvatarDecision = 'approved' | 'rejected' | 'pending' | 'pendingInLine' | 'raised' | 'skipped'

function decisionStatusLabel(decision?: AvatarDecision): string | undefined {
  switch (decision) {
    case 'raised':
      return 'Raised'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'skipped':
      return 'Discontinued'
    case 'pendingInLine':
      return 'Pending in Line'
    case 'pending':
      return 'Pending'
    default:
      return undefined
  }
}

export function PersonAvatar({
  name,
  role,
  seed,
  colorIndex,
  active = false,
  size = 'md',
  showTooltip = true,
  tooltipPlacement = 'bottom',
  decision,
  className = '',
}: {
  name: string
  role?: string
  /** Stable id (employee id). Falls back to name, then colorIndex. */
  seed?: string
  colorIndex?: number
  active?: boolean
  size?: 'sm' | 'md'
  showTooltip?: boolean
  tooltipPlacement?: 'top' | 'bottom'
  /** Overlapping mark for who approved, rejected, raised, is pending, or was skipped */
  decision?: AvatarDecision
  className?: string
}) {
  const { employeeRainbowIndex } = useDemo()
  const colorSeed =
    seed?.trim() ||
    (colorIndex !== undefined ? `idx:${colorIndex}` : '') ||
    name
  const color = avatarStyleFromSeed(colorSeed, employeeRainbowIndex.get(colorSeed))
  const box = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  const face = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  const mark = size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'
  const markPos = size === 'sm' ? '-bottom-1 -right-1' : '-bottom-1.5 -right-1.5'
  const markIcon = size === 'sm' ? 9 : 10
  const tooltipPos =
    tooltipPlacement === 'top'
      ? 'bottom-[calc(100%+2px)]'
      : 'top-[calc(100%+2px)]'
  const namePosition = role?.trim() ? `${name} - ${role.trim()}` : name
  const statusLabel = decisionStatusLabel(decision)
  const tooltipLabel = statusLabel
    ? `(${statusLabel})\n${namePosition}`
    : namePosition

  return (
    <span
      className={`group relative inline-flex ${box} items-center justify-center overflow-visible outline-none ${className}`}
      title={showTooltip ? undefined : tooltipLabel}
    >
      <span
        className={`flex ${face} items-center justify-center rounded-full font-display font-bold transition-all duration-200 ease-out ${
          decision === 'pendingInLine' || decision === 'skipped'
            ? 'opacity-45'
            : active
                ? 'shadow-sm group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110 group-focus-visible:shadow-md'
                : 'opacity-90 group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110 group-focus-visible:shadow-md group-hover:opacity-100'
        }`}
        style={{
          backgroundColor: color.backgroundColor,
          color: color.color,
          boxShadow: active
            ? `0 0 0 2px #fff, 0 0 0 4px ${color.ringColor}`
            : undefined,
        }}
      >
        {initials(name)}
      </span>
      {decision === 'approved' ||
      decision === 'rejected' ||
      decision === 'pending' ||
      decision === 'pendingInLine' ||
      decision === 'raised' ||
      decision === 'skipped' ? (
        <span
          className={`absolute ${markPos} z-10 flex ${mark} items-center justify-center rounded-full border-2 border-white ${
            decision === 'approved'
              ? 'bg-emerald-600'
              : decision === 'rejected'
                ? 'bg-rose'
                : decision === 'raised'
                  ? 'bg-blue-600'
                  : decision === 'skipped'
                    ? 'bg-slate-400'
                    : 'bg-yellow-500'
          }`}
          aria-hidden
        >
          {decision === 'approved' ? (
            <svg width={markIcon} height={markIcon} viewBox="0 0 8 8" fill="none">
              <path
                d="M1.5 4.1L3.2 5.8 6.5 2.2"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : decision === 'rejected' ? (
            <svg width={markIcon} height={markIcon} viewBox="0 0 8 8" fill="none">
              <path
                d="M2 2l4 4M6 2L2 6"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : decision === 'raised' ? (
            <svg width={markIcon} height={markIcon} viewBox="0 0 8 8" fill="none">
              <path
                d="M4 1.5v5M4 1.5L2.2 3.3M4 1.5L5.8 3.3"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : decision === 'skipped' ? (
            <svg width={markIcon} height={markIcon} viewBox="0 0 8 8" fill="none">
              <path d="M2 4h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : decision === 'pending' || decision === 'pendingInLine' ? (
            <span className="text-[8px] font-bold leading-none tracking-tighter text-white">···</span>
          ) : null}
        </span>
      ) : null}
      {showTooltip ? (
        <span
          className={`pointer-events-none absolute ${tooltipPos} left-1/2 z-20 w-max max-w-none -translate-x-1/2 whitespace-pre rounded-md bg-sidebar px-2.5 py-1 text-center text-[11px] font-semibold leading-snug text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100`}
        >
          {tooltipLabel}
        </span>
      ) : null}
    </span>
  )
}
