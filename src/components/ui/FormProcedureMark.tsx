import type { ReactNode } from 'react'

export type FormProcedure = 'view' | 'create' | 'edit' | 'review' | 'suggest' | 'editSuggestion'

function EyeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.8 8s2.4-4.2 6.2-4.2S14.2 8 14.2 8s-2.4 4.2-6.2 4.2S1.8 8 1.8 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 2.5h5.2L13 6.3V13.5H4V2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.2 2.5V6.3H13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M6.1 10.1l1.3 1.3 2.6-2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusDocIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 2.5h5.2L13 6.3V13.5H4V2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.2 2.5V6.3H13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 8.2v3.2M6.4 9.8h3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.5 2.5l2 2M3 13l.7-2.8L11.2 2.7a1.4 1.4 0 012 2L5.8 12.1 3 13z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LightBulbIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.2A4.1 4.1 0 003.9 6.3c0 1.5.8 2.8 2 3.5V11h4.2V9.8c1.2-.7 2-2 2-3.5A4.1 4.1 0 008 2.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 12.4h3.2M6.8 13.8h2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CompareIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="5.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="3" width="5.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.2 8h1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const PROCEDURE: Record<FormProcedure, { label: string; Icon: () => ReactNode }> = {
  view: { label: 'View', Icon: EyeIcon },
  review: { label: 'Review', Icon: ReviewIcon },
  create: { label: 'Create', Icon: PlusDocIcon },
  edit: { label: 'Edit', Icon: PencilIcon },
  suggest: { label: 'Suggest Edit', Icon: LightBulbIcon },
  editSuggestion: { label: 'Edit Suggestion', Icon: CompareIcon },
}

export function FormProcedureMark({
  mode,
  className = '',
}: {
  mode: FormProcedure
  className?: string
}) {
  const { label, Icon } = PROCEDURE[mode]
  return (
    <div
      className={`flex items-center justify-center gap-3 text-2xl font-semibold uppercase tracking-wide text-slate-soft ${className}`}
    >
      <Icon />
      <span>{label}</span>
    </div>
  )
}

export function FormProcedureBar({
  mode,
  left,
  right,
}: {
  mode: FormProcedure
  left?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div>{left}</div>
      <FormProcedureMark mode={mode} />
      <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
    </div>
  )
}
