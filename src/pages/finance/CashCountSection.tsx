import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { Panel } from '../../components/ui/Panel'
import type { CashCountDenoms, CashCountSnapshot, PrCurrency } from '../../types'

const USD_DENOMS = [100, 50, 20, 10, 5, 2, 1] as const
const IQD_DENOMS = [50_000, 25_000, 10_000, 5_000, 1_000, 750, 500, 250] as const

export const CASH_COUNT_USD_DENOMS = USD_DENOMS
export const CASH_COUNT_IQD_DENOMS = IQD_DENOMS

/** Sum denomination face value × quantity from a stored cash-count map. */
export function sumCashCountDenoms(
  denoms: readonly number[],
  stored?: CashCountDenoms,
): number {
  if (!stored) return 0
  return denoms.reduce(
    (sum, denom) => sum + denom * Math.max(0, Math.floor(Number(stored[String(denom)]) || 0)),
    0,
  )
}

type DenomCounts = Record<number, number>

const currencyTheme: Record<
  PrCurrency,
  { header: string; total: string; border: string; label: string }
> = {
  USD: {
    header: 'bg-emerald-100 text-emerald-900',
    total: 'bg-emerald-100 text-emerald-900',
    border: 'border-emerald-200',
    label: 'USD',
  },
  IQD: {
    header: 'bg-amber-100 text-amber-950',
    total: 'bg-amber-100 text-amber-950',
    border: 'border-amber-200',
    label: 'IQD',
  },
}

function formatDenom(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })
}

function formatMoney(amount: number, currency: PrCurrency) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: currency === 'IQD' ? 0 : 2,
    maximumFractionDigits: currency === 'IQD' ? 0 : 2,
  })
}

function emptyCounts(denoms: readonly number[]): DenomCounts {
  return Object.fromEntries(denoms.map((d) => [d, 0]))
}

function sumCounts(denoms: readonly number[], counts: DenomCounts) {
  return denoms.reduce((sum, denom) => sum + denom * (counts[denom] || 0), 0)
}

function denomsFromStored(denoms: readonly number[], stored?: CashCountDenoms): DenomCounts {
  const next = emptyCounts(denoms)
  if (!stored) return next
  for (const denom of denoms) {
    next[denom] = Math.max(0, Math.floor(Number(stored[String(denom)]) || 0))
  }
  return next
}

function denomsToStored(denoms: readonly number[], counts: DenomCounts): CashCountDenoms {
  const out: CashCountDenoms = {}
  for (const denom of denoms) {
    const qty = counts[denom] || 0
    if (qty > 0) out[String(denom)] = qty
  }
  return out
}

function DenomTable({
  currency,
  denoms,
  counts,
  onChange,
  disabled = false,
}: {
  currency: PrCurrency
  denoms: readonly number[]
  counts: DenomCounts
  onChange: (denom: number, qty: number) => void
  disabled?: boolean
}) {
  const theme = currencyTheme[currency]
  const total = sumCounts(denoms, counts)

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border ${theme.border} bg-white`}
    >
      <div className={`px-3 py-2 text-center text-sm font-bold tracking-wide ${theme.header}`}>
        {theme.label}
      </div>
      <div className="min-h-0 flex-1">
        <table className="w-full text-sm">
          <tbody>
            {denoms.map((denom) => (
              <tr key={denom} className="border-t border-line/80">
                <td className="w-[45%] px-3 py-1.5 text-right tabular-nums text-ink">
                  {formatDenom(denom)}
                </td>
                <td className="border-l border-line/80 px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={disabled}
                    readOnly={disabled}
                    className={`${inputClass} py-1 text-center tabular-nums ${
                      disabled ? 'cursor-not-allowed bg-mist/60 text-slate-soft' : ''
                    }`}
                    value={counts[denom] || ''}
                    placeholder="0"
                    onChange={(e) => {
                      if (disabled) return
                      const raw = e.target.value
                      onChange(denom, raw === '' ? 0 : Math.max(0, Math.floor(Number(raw) || 0)))
                    }}
                    aria-label={`${theme.label} ${formatDenom(denom)} count`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className={`mt-auto grid grid-cols-2 border-t text-sm ${theme.border} ${theme.total}`}
      >
        <div className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide">Total</div>
        <div className={`border-l px-3 py-2 text-right font-bold tabular-nums ${theme.border}`}>
          {currency === 'USD' ? `$ ${formatMoney(total, currency)}` : `IQD ${formatMoney(total, currency)}`}
        </div>
      </div>
    </div>
  )
}

function CashCountCard({
  title,
  actions,
  usdCounts,
  iqdCounts,
  onUsdChange,
  onIqdChange,
  disabled = false,
  footer,
}: {
  title: string
  actions?: ReactNode
  usdCounts: DenomCounts
  iqdCounts: DenomCounts
  onUsdChange: (denom: number, qty: number) => void
  onIqdChange: (denom: number, qty: number) => void
  disabled?: boolean
  footer?: ReactNode
}) {
  return (
    <Panel
      title={title}
      actions={
        actions ?? (
          // Keep header height identical to the card that has Register.
          <span className="invisible pointer-events-none select-none" aria-hidden>
            <Button type="button">Register Beginning cash count</Button>
          </span>
        )
      }
    >
      <div className="grid items-stretch gap-4 sm:grid-cols-2">
        <DenomTable
          currency="USD"
          denoms={USD_DENOMS}
          counts={usdCounts}
          disabled={disabled}
          onChange={onUsdChange}
        />
        <DenomTable
          currency="IQD"
          denoms={IQD_DENOMS}
          counts={iqdCounts}
          disabled={disabled}
          onChange={onIqdChange}
        />
      </div>
      {footer}
    </Panel>
  )
}

export function CashCountSection({
  month,
  cashCount,
  accountingUsd,
  accountingIqd,
  onSave,
}: {
  month: string
  cashCount?: CashCountSnapshot
  accountingUsd: number
  accountingIqd: number
  onSave: (input: {
    creditUsd: number
    creditIqd: number
    cashCount: CashCountSnapshot
  }) => Promise<void>
}) {
  const [beginUsd, setBeginUsd] = useState<DenomCounts>(() =>
    denomsFromStored(USD_DENOMS, cashCount?.beginUsd),
  )
  const [beginIqd, setBeginIqd] = useState<DenomCounts>(() =>
    denomsFromStored(IQD_DENOMS, cashCount?.beginIqd),
  )
  const [endUsd, setEndUsd] = useState<DenomCounts>(() =>
    denomsFromStored(USD_DENOMS, cashCount?.endUsd),
  )
  const [endIqd, setEndIqd] = useState<DenomCounts>(() =>
    denomsFromStored(IQD_DENOMS, cashCount?.endIqd),
  )
  const [showRegister, setShowRegister] = useState(false)
  const [draftUsd, setDraftUsd] = useState<DenomCounts>(() => emptyCounts(USD_DENOMS))
  const [draftIqd, setDraftIqd] = useState<DenomCounts>(() => emptyCounts(IQD_DENOMS))
  const [savingRegister, setSavingRegister] = useState(false)
  const skipSaveRef = useRef(true)
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const pendingSaveRef = useRef<{
    creditUsd: number
    creditIqd: number
    cashCount: CashCountSnapshot
  } | null>(null)

  useEffect(() => {
    skipSaveRef.current = true
    dirtyRef.current = false
    setBeginUsd(denomsFromStored(USD_DENOMS, cashCount?.beginUsd))
    setBeginIqd(denomsFromStored(IQD_DENOMS, cashCount?.beginIqd))
    setEndUsd(denomsFromStored(USD_DENOMS, cashCount?.endUsd))
    setEndIqd(denomsFromStored(IQD_DENOMS, cashCount?.endIqd))
    setShowRegister(false)
    // Hydrate once per month; avoid resetting while saves refresh cashCount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- month-scoped hydrate
  }, [month])

  // Keep beginning table in sync when register/save updates persisted begin counts.
  useEffect(() => {
    if (showRegister) return
    setBeginUsd(denomsFromStored(USD_DENOMS, cashCount?.beginUsd))
    setBeginIqd(denomsFromStored(IQD_DENOMS, cashCount?.beginIqd))
  }, [cashCount?.beginUsd, cashCount?.beginIqd, showRegister])

  const beginUsdTotal = useMemo(() => sumCounts(USD_DENOMS, beginUsd), [beginUsd])
  const beginIqdTotal = useMemo(() => sumCounts(IQD_DENOMS, beginIqd), [beginIqd])
  const endUsdTotal = useMemo(() => sumCounts(USD_DENOMS, endUsd), [endUsd])
  const endIqdTotal = useMemo(() => sumCounts(IQD_DENOMS, endIqd), [endIqd])
  const draftUsdTotal = useMemo(() => sumCounts(USD_DENOMS, draftUsd), [draftUsd])
  const draftIqdTotal = useMemo(() => sumCounts(IQD_DENOMS, draftIqd), [draftIqd])

  const snapshot = useMemo<CashCountSnapshot>(
    () => ({
      beginUsd: denomsToStored(USD_DENOMS, beginUsd),
      beginIqd: denomsToStored(IQD_DENOMS, beginIqd),
      endUsd: denomsToStored(USD_DENOMS, endUsd),
      endIqd: denomsToStored(IQD_DENOMS, endIqd),
      projectLabel: cashCount?.projectLabel || 'REEL',
    }),
    [beginUsd, beginIqd, endUsd, endIqd, cashCount?.projectLabel],
  )

  useEffect(() => {
    const payload = {
      creditUsd: beginUsdTotal,
      creditIqd: beginIqdTotal,
      cashCount: snapshot,
    }
    pendingSaveRef.current = payload
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    if (!dirtyRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void onSaveRef.current(payload)
    }, 350)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [beginUsdTotal, beginIqdTotal, snapshot])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const pending = pendingSaveRef.current
      if (pending && dirtyRef.current) {
        void onSaveRef.current(pending)
      }
    }
  }, [])

  const diffUsd = endUsdTotal - accountingUsd
  const diffIqd = endIqdTotal - accountingIqd

  function setCount(
    setter: Dispatch<SetStateAction<DenomCounts>>,
    denom: number,
    qty: number,
  ) {
    dirtyRef.current = true
    setter((prev) => ({ ...prev, [denom]: qty }))
  }

  function openRegisterModal() {
    setDraftUsd({ ...beginUsd })
    setDraftIqd({ ...beginIqd })
    setShowRegister(true)
  }

  function closeRegisterModal() {
    if (savingRegister) return
    setShowRegister(false)
  }

  async function submitRegister() {
    if (savingRegister) return
    setSavingRegister(true)
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const nextBeginUsdStored = denomsToStored(USD_DENOMS, draftUsd)
      const nextBeginIqdStored = denomsToStored(IQD_DENOMS, draftIqd)
      const nextBeginUsd = denomsFromStored(USD_DENOMS, nextBeginUsdStored)
      const nextBeginIqd = denomsFromStored(IQD_DENOMS, nextBeginIqdStored)
      const creditUsd = sumCounts(USD_DENOMS, nextBeginUsd)
      const creditIqd = sumCounts(IQD_DENOMS, nextBeginIqd)
      const nextSnapshot: CashCountSnapshot = {
        beginUsd: nextBeginUsdStored,
        beginIqd: nextBeginIqdStored,
        endUsd: denomsToStored(USD_DENOMS, endUsd),
        endIqd: denomsToStored(IQD_DENOMS, endIqd),
        projectLabel: cashCount?.projectLabel || 'REEL',
      }
      // Update the beginning table immediately, then persist.
      skipSaveRef.current = true
      dirtyRef.current = false
      setBeginUsd(nextBeginUsd)
      setBeginIqd(nextBeginIqd)
      await onSave({
        creditUsd,
        creditIqd,
        cashCount: nextSnapshot,
      })
      setShowRegister(false)
    } finally {
      setSavingRegister(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <CashCountCard
          title="Beginning of the month"
          actions={
            <Button type="button" onClick={openRegisterModal}>
              Register Beginning cash count
            </Button>
          }
          usdCounts={beginUsd}
          iqdCounts={beginIqd}
          disabled
          onUsdChange={() => undefined}
          onIqdChange={() => undefined}
        />

        <CashCountCard
          title="Current / End of Month Cash count"
          usdCounts={endUsd}
          iqdCounts={endIqd}
          onUsdChange={(denom, qty) => setCount(setEndUsd, denom, qty)}
          onIqdChange={(denom, qty) => setCount(setEndIqd, denom, qty)}
          footer={
            <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2">
              {(
                [
                  {
                    currency: 'USD' as const,
                    accounting: accountingUsd,
                    difference: diffUsd,
                    border: 'border-emerald-200',
                    labelBg: 'bg-emerald-50 text-emerald-950',
                    okBg: 'bg-emerald-50 text-emerald-950',
                    format: (n: number) => `$ ${formatMoney(n, 'USD')}`,
                  },
                  {
                    currency: 'IQD' as const,
                    accounting: accountingIqd,
                    difference: diffIqd,
                    border: 'border-amber-200',
                    labelBg: 'bg-amber-50 text-amber-950',
                    okBg: 'bg-amber-50 text-amber-950',
                    format: (n: number) => `IQD ${formatMoney(n, 'IQD')}`,
                  },
                ] as const
              ).map((col) => (
                <div
                  key={col.currency}
                  className={`overflow-hidden rounded-lg border ${col.border} text-sm`}
                >
                  <div className="grid grid-cols-2 border-b border-line">
                    <div className="bg-mist px-3 py-2 font-semibold text-ink">Accounting balance</div>
                    <div
                      className={`border-l border-line px-3 py-2 text-right font-bold tabular-nums ${col.labelBg}`}
                    >
                      {col.format(col.accounting)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="bg-mist px-3 py-2 font-semibold text-ink">Difference</div>
                    <div
                      className={`border-l border-line px-3 py-2 text-right font-bold tabular-nums ${
                        col.difference === 0 ? col.okBg : 'bg-rose/10 text-rose'
                      }`}
                    >
                      {col.format(col.difference)}
                    </div>
                  </div>
                  {col.difference !== 0 ? (
                    <div className="border-t border-line bg-rose/5 px-3 py-2 text-xs text-rose">
                      {col.difference > 0 ? (
                        <>
                          <p>There is more cash remaining,</p>
                          <p>Have you made sure to pay all your suppliers?</p>
                        </>
                      ) : (
                        <>
                          <p>There is cash missing,</p>
                          <p>Are you sure you&apos;ve documented all the invoices?</p>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          }
        />
      </div>

      {showRegister ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            onClick={closeRegisterModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-cash-count-title"
            className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h2
                id="register-cash-count-title"
                className="font-display text-lg font-semibold text-ink"
              >
                Register Beginning cash count
              </h2>
              <button
                type="button"
                aria-label="Close"
                title="Close"
                disabled={savingRegister}
                onClick={closeRegisterModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-soft transition hover:bg-mist hover:text-ink disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2">
              <DenomTable
                currency="USD"
                denoms={USD_DENOMS}
                counts={draftUsd}
                onChange={(denom, qty) => setDraftUsd((prev) => ({ ...prev, [denom]: qty }))}
              />
              <DenomTable
                currency="IQD"
                denoms={IQD_DENOMS}
                counts={draftIqd}
                onChange={(denom, qty) => setDraftIqd((prev) => ({ ...prev, [denom]: qty }))}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  USD total
                </div>
                <div className="mt-0.5 font-bold tabular-nums text-emerald-950">
                  $ {formatMoney(draftUsdTotal, 'USD')}
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                  IQD total
                </div>
                <div className="mt-0.5 font-bold tabular-nums text-amber-950">
                  IQD {formatMoney(draftIqdTotal, 'IQD')}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeRegisterModal} disabled={savingRegister}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitRegister()} disabled={savingRegister}>
                {savingRegister ? 'Saving…' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
