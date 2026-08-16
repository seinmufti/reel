import { RejectedStamp } from './RejectedStamp'

export const SIGNATURE_LINE_CLASS = 'border-b border-slate-soft/45'

/** Min height of stamp/signature area so lines align across columns. */
export const SIGNATURE_SLOT_MIN_HEIGHT_CLASS = 'min-h-[48px] pb-1.5'

export const SIGNATURE_MAX_HEIGHT_CLASS = 'max-h-[calc(1.75rem*1.3)]'

export const signatureImgClass = () =>
  `mx-auto block h-auto w-auto max-w-full ${SIGNATURE_MAX_HEIGHT_CLASS} object-contain object-bottom leading-none`

export const signatureMediaWrapClass = () => 'flex w-full justify-center leading-none'

export function formatSignedAt(value: string) {
  const raw = value.trim()
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
  const d = dateOnly ? new Date(`${raw}T00:00:00`) : new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  return `${date} ${time}`
}

export function SignatureMark({
  src,
  alt = 'Signature',
  signedAt,
  fallbackName,
  className = '',
  slot = false,
}: {
  src?: string
  alt?: string
  signedAt?: string
  fallbackName?: string
  className?: string
  slot?: boolean
}) {
  const signedAtLabel = signedAt?.trim() ? formatSignedAt(signedAt.trim()) : null
  const hasSignature = Boolean(src || fallbackName)
  if (!hasSignature && !signedAtLabel) return null
  const wrapClass = `flex w-full justify-center leading-[0] ${className}`
  const fallbackClass =
    `inline-block w-auto max-w-full ${SIGNATURE_MAX_HEIGHT_CLASS} origin-bottom text-center font-[cursive] text-[calc(1.25rem*1.3)] leading-none text-[#6b4c9a]`
  return (
    <div className={wrapClass}>
      {src ? (
        <span className={signatureMediaWrapClass()}>
          <img src={src} alt={alt} className={signatureImgClass()} />
        </span>
      ) : fallbackName ? (
        <span className={signatureMediaWrapClass()}>
          <span className={fallbackClass}>
            {fallbackName}
          </span>
        </span>
      ) : null}
      {signedAtLabel ? (
        <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-[#2563eb]">
          {signedAtLabel}
        </p>
      ) : null}
    </div>
  )
}

export function SignatureFieldColumn({
  label,
  name,
  position,
  signed = false,
  date,
  signature,
  vacant = false,
  onTapToSign,
  tapBusy = false,
  rejectedStamp = false,
  rejectionReason,
}: {
  label: string
  name?: string
  position?: string
  signed?: boolean
  date?: string
  signature?: string
  vacant?: boolean
  onTapToSign?: () => void
  tapBusy?: boolean
  rejectedStamp?: boolean
  rejectionReason?: string
}) {
  const showTap = Boolean(onTapToSign) && !vacant && !signed && !rejectedStamp
  const dateLabel = !vacant && signed && date?.trim() ? formatSignedAt(date.trim()) : null
  const rejectedDateLabel =
    rejectedStamp && date?.trim() ? formatSignedAt(date.trim()) : null
  const rejectionMessage =
    rejectedStamp && rejectionReason?.trim() ? rejectionReason.trim() : null
  const footerDateLabel = rejectedStamp ? rejectedDateLabel : dateLabel

  return (
    <div className="relative flex h-full min-w-0 flex-col text-center">
      {vacant ? (
        <span
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          aria-hidden
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path
              d="M14 14l28 28M42 14L14 42"
              stroke="#dc2626"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">{label}</p>
      <p className="mt-1.5 min-h-5 text-sm font-medium text-ink">{vacant ? '' : name || '—'}</p>
      <p className="min-h-8 text-xs leading-snug text-slate-soft/80">{vacant ? '' : position || '—'}</p>
      <div className="mt-1 w-full">
        <div
          className={`${SIGNATURE_SLOT_MIN_HEIGHT_CLASS} flex w-full flex-col items-center justify-end`}
        >
          {showTap ? (
            <button
              type="button"
              disabled={tapBusy}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTapToSign?.()
              }}
              className="flex min-h-[2.5rem] w-full cursor-pointer items-center justify-center rounded-md border-2 border-[#6b4c9a] bg-[#6b4c9a]/5 px-3 text-sm font-semibold text-[#6b4c9a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tapBusy ? 'Signing…' : 'Tap to Sign'}
            </button>
          ) : !vacant && rejectedStamp ? (
            <div className="flex w-full justify-center leading-[0]">
              <span className={signatureMediaWrapClass()}>
                <RejectedStamp />
              </span>
            </div>
          ) : !vacant && signed ? (
            <SignatureMark
              slot
              src={signature}
              alt={`${name ?? label} signature`}
              fallbackName={name}
            />
          ) : null}
        </div>
        <div className={SIGNATURE_LINE_CLASS} aria-hidden />
      </div>
      <p className="mt-0 min-h-[14px] text-[11px] font-semibold text-[#2563eb]">
        {footerDateLabel ?? '\u00a0'}
      </p>
      {rejectionMessage ? (
        <p className="mt-1 max-w-full px-1 text-center text-base font-medium leading-snug text-rose">
          {rejectionMessage}
        </p>
      ) : null}
    </div>
  )
}
