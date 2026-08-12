import type { CSSProperties, ReactNode } from 'react'

export function Table({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]">
      <table className={`min-w-full text-left text-sm ${className}`} style={style}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-line bg-mist px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wide text-slate-soft ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line/80 px-3 py-2.5 align-middle text-ink ${className}`}>{children}</td>
}
