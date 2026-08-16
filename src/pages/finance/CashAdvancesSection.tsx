import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FormProcedureBar } from '../../components/ui/FormProcedureMark'
import { Panel } from '../../components/ui/Panel'
import { DraggableStampButton } from '../../components/ui/DraggableStampButton'
import { RejectReasonDialog } from '../../components/ui/RejectReasonDialog'
import { SignatureFieldColumn } from '../../components/ui/SignatureMark'
import { SignatureStatusAvatars } from '../../components/ui/SignatureStatusAvatars'
import { Table, Td, Th } from '../../components/ui/Table'
import { cashAdvanceDashboardQueueId, dashboardPath, goAfterFormAction } from '../../lib/dashboardFocus'
import { cashAdvanceFinanceRejected, cashAdvanceLmRejected, cashAdvanceSignatureSlots } from '../../lib/signatureSlots'
import { WrappingSelect } from '../../components/ui/WrappingSelect'
import { useDemo } from '../../context/DemoContext'
import { formatDate } from '../../data/mockData'
import type { CashAdvanceItem, Employee, PrCurrency, PurchaseRequest } from '../../types'

const slotClass =
  'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] outline-none transition hover:border-slate-soft/40 focus:border-teal focus:shadow-[0_0_0_1px_var(--color-teal)]'

const lockedSlotClass = `${slotClass} !bg-sky-50 text-sky-900/70`

function fieldLabel(text: string, required = false) {
  return (
    <div className="text-[11px] font-semibold leading-tight text-ink/80">
      {text}
      {required ? <span className="text-rose"> *</span> : null}
    </div>
  )
}

function parseAmountInput(raw: string) {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function formatAmountNumber(amount: number, currency: PrCurrency) {
  if (currency === 'IQD') {
    return Math.round(amount).toLocaleString('en-US')
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatTypedAmount(raw: string, currency: PrCurrency): string | null {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (!cleaned) return ''
  if (currency === 'IQD') {
    const digits = cleaned.replace(/\./g, '')
    if (!/^\d*$/.test(digits)) return null
    if (!digits) return ''
    return Number(digits).toLocaleString('en-US')
  }
  const parts = cleaned.split('.')
  if (parts.length > 2) return null
  const intPart = parts[0] ?? ''
  const decPart = parts[1]
  if (decPart !== undefined && decPart.length > 2) return null
  if (!/^\d*$/.test(intPart) || (decPart !== undefined && !/^\d*$/.test(decPart))) return null
  const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '0'
  if (cleaned.includes('.')) {
    return decPart !== undefined ? `${formattedInt}.${decPart}` : `${formattedInt}.`
  }
  return intPart ? formattedInt : ''
}

function emptyItem(): CashAdvanceItem {
  return {
    id: `cai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    purchaseRequestId: undefined,
    prNumber: undefined,
    description: '',
    debitUsd: 0,
    debitIqd: 0,
  }
}

function AmountCellInput({
  currency,
  value,
  onChange,
}: {
  currency: PrCurrency
  value: number
  onChange: (next: number) => void
}) {
  const [display, setDisplay] = useState(() => (value ? formatAmountNumber(value, currency) : ''))

  useEffect(() => {
    setDisplay(value ? formatAmountNumber(value, currency) : '')
  }, [value, currency])

  return (
    <input
      className={`${slotClass} text-right tabular-nums`}
      type="text"
      inputMode={currency === 'USD' ? 'decimal' : 'numeric'}
      value={display}
      onChange={(e) => {
        const next = formatTypedAmount(e.target.value, currency)
        if (next === null) return
        setDisplay(next)
        onChange(parseAmountInput(next))
      }}
      placeholder="0"
    />
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 4.5h9M6.5 4.5V3.5h3v1M5 4.5l.5 8h5l.5-8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function financeSignerFor(employee: Employee, employees: Employee[]) {
  const inFinance = employees.filter((e) => e.departments.includes('Finance') && e.id !== employee.id)
  const dedicated = inFinance.filter((e) => e.departments.length === 1)
  return dedicated[0] ?? inFinance.find((e) => !e.isAdmin) ?? inFinance[0]
}

function itemsFromPr(pr: PurchaseRequest): CashAdvanceItem[] {
  const lines = pr.items?.filter((line) => line.description.trim() || line.quantity || line.unitCost) ?? []
  if (lines.length === 0) return [emptyItem()]
  return lines.map((line) => {
    const total = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0)
    return {
      ...emptyItem(),
      description: line.description.trim(),
      debitUsd: pr.currency === 'IQD' ? 0 : total,
      debitIqd: pr.currency === 'IQD' ? total : 0,
    }
  })
}

function daysBetweenInclusive(start: string, end: string) {
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1
}

export function CashAdvanceRequestPage() {
  const navigate = useNavigate()
  const { currentUser, employees, purchaseRequests, addCashAdvance } = useDemo()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<CashAdvanceItem[]>([emptyItem()])
  const [purchaseRequestId, setPurchaseRequestId] = useState('')

  const manager = employees.find((e) => e.id === currentUser.managerId)
  const financeSigner = financeSignerFor(currentUser, employees)
  const totalUsd = items.reduce((sum, item) => sum + (item.debitUsd || 0), 0)
  const totalIqd = items.reduce((sum, item) => sum + (item.debitIqd || 0), 0)
  const dueDays = daysBetweenInclusive(dateFrom, dateTo)

  function updateItem(id: string, patch: Partial<CashAdvanceItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const recipient = currentUser.name.trim()
    if (!recipient) {
      setError('Recipient is required.')
      return
    }
    if (!dateFrom) {
      setError('Date from is required.')
      return
    }
    if (!dateTo) {
      setError('Date to is required.')
      return
    }
    if (dateTo < dateFrom) {
      setError('Date to must be on or after date from.')
      return
    }
    if (totalUsd <= 0 && totalIqd <= 0) {
      setError('Enter at least one debit amount.')
      return
    }
    const filled = items.filter(
      (item) => item.description.trim() || item.debitUsd > 0 || item.debitIqd > 0,
    )
    const linkedPr = purchaseRequests.find((p) => p.id === purchaseRequestId)
    const amount = totalUsd > 0 ? totalUsd : totalIqd
    const currency: PrCurrency = totalUsd > 0 ? 'USD' : 'IQD'
    setSaving(true)
    try {
      const created = await addCashAdvance({
        recipient,
        amount,
        currency,
        dateFrom,
        dateTo,
        status: 'pending',
        items: filled.map((item) => ({
          ...item,
          description: item.description.trim(),
          purchaseRequestId: linkedPr?.id,
          prNumber: linkedPr?.number,
        })),
      })
      goAfterFormAction(navigate, dashboardPath(cashAdvanceDashboardQueueId(created.id, 'pending', false)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit cash advance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <FormProcedureBar
        mode="create"
        left={
          <Link to="/">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-lg border-2 border-ink/20 bg-[#fbfcfd] shadow-sm"
      >
        <div className="border-b-2 border-ink/15 bg-teal-soft/30 px-4 py-3 text-center">
          <h2 className="font-display text-xl font-bold text-ink">Cash advance request</h2>
        </div>

        <div className="flex min-h-[260mm] flex-col space-y-4 p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              {fieldLabel('Recipient')}
              <input className={lockedSlotClass} readOnly disabled value={currentUser.name} />
            </label>
            <label className="block space-y-1">
              {fieldLabel('Position')}
              <input className={lockedSlotClass} readOnly disabled value={currentUser.role} />
            </label>
            <div className="space-y-1">
              <label className="block space-y-1">
                {fieldLabel('Date from', true)}
                <input
                  className={slotClass}
                  type="date"
                  required
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <p className="text-sm text-ink">
                due: {dueDays} {dueDays === 1 ? 'day' : 'days'}
              </p>
            </div>
            <label className="block space-y-1">
              {fieldLabel('Date to', true)}
              <input
                className={slotClass}
                type="date"
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-1">
            {fieldLabel('PR no.')}
            <WrappingSelect
              name="cash-advance-pr"
              filter
              panelMatch="table"
              value={purchaseRequestId}
              onValueChange={(next) => {
                const id = next ?? ''
                setPurchaseRequestId(id)
                const pr = purchaseRequests.find((p) => p.id === id)
                setItems(pr ? itemsFromPr(pr) : [emptyItem()])
              }}
              placeholder="-Select a PR-"
              options={purchaseRequests.map((pr) => ({
                value: pr.id,
                label: `${pr.number} — ${pr.title}`,
                selectedLabel: pr.number,
              }))}
            />
          </label>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold leading-tight text-ink/80">Items</div>
            <div className="overflow-x-auto rounded-md border border-line bg-white">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="bg-mist/80">
                    <th className="border-b border-line px-3 py-2 font-semibold">Description</th>
                    <th className="w-24 border-b border-line px-2 py-2 text-right font-semibold leading-tight">
                      Debit USD
                    </th>
                    <th className="w-24 border-b border-line px-2 py-2 text-right font-semibold leading-tight">
                      Debit IQD
                    </th>
                    <th className="w-12 border-b border-line px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-line/80 px-2 py-2 align-top">
                        <input
                          className={slotClass}
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="What they will buy"
                        />
                      </td>
                      <td className="w-24 border-b border-line/80 px-1 py-2 align-top">
                        <AmountCellInput
                          currency="USD"
                          value={item.debitUsd}
                          onChange={(debitUsd) => updateItem(item.id, { debitUsd })}
                        />
                      </td>
                      <td className="w-24 border-b border-line/80 px-1 py-2 align-top">
                        <AmountCellInput
                          currency="IQD"
                          value={item.debitIqd}
                          onChange={(debitIqd) => updateItem(item.id, { debitIqd })}
                        />
                      </td>
                      <td className="border-b border-line/80 px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          title={items.length <= 1 ? 'Clear row' : 'Remove row'}
                          aria-label={items.length <= 1 ? 'Clear row' : 'Remove row'}
                          onClick={() => {
                            if (items.length <= 1) {
                              setItems([emptyItem()])
                              return
                            }
                            setItems((prev) => prev.filter((row) => row.id !== item.id))
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-rose hover:bg-rose/10"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                            <path
                              d="M3 3l10 10M13 3L3 13"
                              stroke="currentColor"
                              strokeWidth="2.25"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-mist/50">
                    <td
                      className="border-t border-line px-3 py-2 text-right text-sm font-semibold text-ink"
                    >
                      Total
                    </td>
                    <td className="w-24 border-t border-line px-2 py-2 text-right font-semibold tabular-nums text-ink">
                      {formatAmountNumber(totalUsd, 'USD')}
                    </td>
                    <td className="w-24 border-t border-line px-2 py-2 text-right font-semibold tabular-nums text-ink">
                      {formatAmountNumber(totalIqd, 'IQD')}
                    </td>
                    <td className="border-t border-line" />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              Add row
            </Button>
          </div>

          {error ? <p className="text-sm text-rose">{error}</p> : null}

          <div className="mt-auto grid gap-8 pt-8 sm:grid-cols-3 sm:items-stretch">
            <SignatureFieldColumn
              label="Recipient"
              name={currentUser.name}
              position={currentUser.role}
              signed
              date={new Date().toISOString()}
              signature={currentUser.signature}
            />
            <SignatureFieldColumn
              label="Line manager"
              name={manager?.name}
              position={manager?.role}
              vacant={!manager}
              signature={manager?.signature}
            />
            <SignatureFieldColumn
              label="Finance"
              name={financeSigner?.name}
              position={financeSigner?.role}
              vacant={!financeSigner}
              signature={financeSigner?.signature}
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
            <Link to="/">
              <Button type="button" variant="cancel" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export function CashAdvanceView() {
  const { advanceId } = useParams()
  const navigate = useNavigate()
  const { currentUser, employees, cashAdvances, updateCashAdvanceStatus, ready } = useDemo()
  const [signing, setSigning] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const advance = cashAdvances.find((ca) => ca.id === advanceId)
  if (!ready) return null
  if (!advance) return <Navigate to="/finance?tab=advances" replace />

  const recipient =
    employees.find((e) => e.name === advance.recipient) ??
    employees.find((e) => e.id === currentUser.id)
  if (!recipient) return <Navigate to="/" replace />

  const manager = employees.find((e) => e.id === recipient.managerId)
  const financeSigner = financeSignerFor(recipient, employees)
  const approved = advance.status === 'approved'
  const legacyBothSigned = approved && !advance.lmSignedBy && !advance.financeSignedBy
  const financeSigned = Boolean(advance.financeSignedBy) || legacyBothSigned
  const lmSigned = Boolean(advance.lmSignedBy) || legacyBothSigned
  const financeRejected = cashAdvanceFinanceRejected(advance)
  const lmRejected = cashAdvanceLmRejected(advance)
  const canSignLm =
    advance.status === 'pending' && recipient.managerId === currentUser.id && !advance.lmSignedBy
  const canSignFinance =
    advance.status === 'pending' &&
    financeSigner?.id === currentUser.id &&
    !advance.financeSignedBy &&
    (manager ? Boolean(advance.lmSignedBy) : true)
  const canAct = canSignLm || canSignFinance
  const dueDays = daysBetweenInclusive(advance.dateFrom, advance.dateTo)
  const prLabel = advance.items.find((item) => item.prNumber)?.prNumber ?? '—'
  const recipientDate = advance.createdAt || advance.dateFrom

  function handleSign(slot: 'lm' | 'finance') {
    setSigning(true)
    const willComplete = slot === 'finance' || !financeSigner
    void updateCashAdvanceStatus(advance.id, 'approved', {
      signSlot: slot,
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
    }).then(() =>
      goAfterFormAction(
        navigate,
        dashboardPath(
          cashAdvanceDashboardQueueId(
            advance.id,
            willComplete ? 'approved' : 'pending',
            willComplete,
          ),
        ),
      ),
    )
  }

  function handleStampClick() {
    if (canSignLm) handleSign('lm')
    else if (canSignFinance) handleSign('finance')
  }

  return (
    <div className="relative">
      <FormProcedureBar
        mode={canAct ? 'review' : 'view'}
        left={
          <Link to="/">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-[210mm] overflow-visible rounded-lg border-2 border-ink/20 bg-[#fbfcfd] shadow-sm">
        <div className="border-b-2 border-ink/15 bg-teal-soft/30 px-4 py-3 text-center">
          <h2 className="font-display text-xl font-bold text-ink">Cash advance request</h2>
        </div>
        <div className="flex min-h-[260mm] flex-col space-y-4 p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              {fieldLabel('Recipient')}
              <input className={lockedSlotClass} readOnly disabled value={recipient.name} />
            </label>
            <label className="block space-y-1">
              {fieldLabel('Position')}
              <input className={lockedSlotClass} readOnly disabled value={recipient.role} />
            </label>
            <div className="space-y-1">
              <label className="block space-y-1">
                {fieldLabel('Date from')}
                <input
                  className={lockedSlotClass}
                  type="date"
                  readOnly
                  disabled
                  value={advance.dateFrom}
                />
              </label>
              <p className="text-sm text-ink">
                due: {dueDays} {dueDays === 1 ? 'day' : 'days'}
              </p>
            </div>
            <label className="block space-y-1">
              {fieldLabel('Date to')}
              <input className={lockedSlotClass} type="date" readOnly disabled value={advance.dateTo} />
            </label>
          </div>

          <label className="block space-y-1">
            {fieldLabel('PR no.')}
            <input className={lockedSlotClass} readOnly disabled value={prLabel} />
          </label>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold leading-tight text-ink/80">Items</div>
            <div className="overflow-x-auto rounded-md border border-line bg-white">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="bg-mist/80">
                    <th className="border-b border-line px-3 py-2 font-semibold">Description</th>
                    <th className="w-24 border-b border-line px-2 py-2 text-right font-semibold leading-tight">
                      Debit USD
                    </th>
                    <th className="w-24 border-b border-line px-2 py-2 text-right font-semibold leading-tight">
                      Debit IQD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {advance.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-line/80 px-3 py-2">{item.description || '—'}</td>
                      <td className="w-24 border-b border-line/80 px-2 py-2 text-right tabular-nums">
                        {formatAmountNumber(item.debitUsd, 'USD')}
                      </td>
                      <td className="w-24 border-b border-line/80 px-2 py-2 text-right tabular-nums">
                        {formatAmountNumber(item.debitIqd, 'IQD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-mist/50">
                    <td className="border-t border-line px-3 py-2 text-right text-sm font-semibold text-ink">
                      Total
                    </td>
                    <td className="w-24 border-t border-line px-2 py-2 text-right font-semibold tabular-nums">
                      {formatAmountNumber(
                        advance.items.reduce((sum, item) => sum + item.debitUsd, 0),
                        'USD',
                      )}
                    </td>
                    <td className="w-24 border-t border-line px-2 py-2 text-right font-semibold tabular-nums">
                      {formatAmountNumber(
                        advance.items.reduce((sum, item) => sum + item.debitIqd, 0),
                        'IQD',
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="relative mt-auto pt-8">
            <DraggableStampButton
              storageKey="reel-stamp-offset-cash-advance"
              canAct={canAct}
              applied={approved}
              busy={signing}
              onStamp={handleStampClick}
              anchorClassName="-left-24 top-1/2 sm:-left-32"
            />
            <div className="grid gap-8 sm:grid-cols-3 sm:items-stretch">
            <SignatureFieldColumn
              label="Recipient"
              name={recipient.name}
              position={recipient.role}
              signed
              date={recipientDate}
              signature={recipient.signature}
            />
            <SignatureFieldColumn
              label="Line manager"
              name={manager?.name}
              position={manager?.role}
              vacant={!manager}
              signed={lmSigned}
              date={lmRejected ? advance.rejectedAt : advance.lmSignedAt}
              signature={manager?.signature}
              onTapToSign={canSignLm ? () => handleSign('lm') : undefined}
              tapBusy={signing}
              rejectedStamp={lmRejected}
              rejectionReason={lmRejected ? advance.rejectionReason : undefined}
            />
            <SignatureFieldColumn
              label="Finance"
              name={financeSigner?.name}
              position={financeSigner?.role}
              vacant={!financeSigner}
              signed={financeSigned}
              date={financeRejected ? advance.rejectedAt : advance.financeSignedAt}
              signature={financeSigner?.signature}
              onTapToSign={canSignFinance ? () => handleSign('finance') : undefined}
              tapBusy={signing}
              rejectedStamp={financeRejected}
              rejectionReason={financeRejected ? advance.rejectionReason : undefined}
            />
            </div>
          </div>

          {canAct ? (
            <div className="flex justify-end border-t border-line pt-4">
              <Button
                type="button"
                variant="danger"
                disabled={signing || rejecting}
                onClick={() => setShowRejectDialog(true)}
              >
                Reject
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <RejectReasonDialog
        key={showRejectDialog ? 'open' : 'closed'}
        open={showRejectDialog}
        busy={rejecting}
        onCancel={() => {
          if (!rejecting) setShowRejectDialog(false)
        }}
        onConfirm={(reason) => {
          setRejecting(true)
          void updateCashAdvanceStatus(advance.id, 'rejected', {
            rejectionReason: reason,
            rejectedBy: currentUser.name,
            rejectedAt: new Date().toISOString(),
          })
            .then(() => {
              setShowRejectDialog(false)
              setRejecting(false)
              goAfterFormAction(
                navigate,
                dashboardPath(cashAdvanceDashboardQueueId(advance.id, 'rejected', true)),
              )
            })
            .catch((err) => {
              window.alert(err instanceof Error ? err.message : 'Could not reject cash advance.')
              setRejecting(false)
            })
        }}
      />
    </div>
  )
}

export function CashAdvancesSection() {
  const { cashAdvances, deleteCashAdvance, employees } = useDemo()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteCashAdvance(id)
    } catch {
      // keep list as-is
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Panel title="Cash Advances">
        {cashAdvances.length === 0 ? (
          <p className="text-sm text-slate-soft/70">No cash advances yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Recipient</Th>
                <Th className="text-right">Amount</Th>
                <Th>Date from</Th>
                <Th>Date to</Th>
                <Th>Items</Th>
                <Th>Created</Th>
                <Th>Status</Th>
                <Th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {cashAdvances.map((advance) => (
                <tr key={advance.id}>
                  <Td className="font-medium">{advance.recipient}</Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {advance.currency} {formatAmountNumber(advance.amount, advance.currency)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {advance.dateFrom ? formatDate(advance.dateFrom) : '—'}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(advance.dateTo)}</Td>
                  <Td>{advance.items.length}</Td>
                  <Td className="whitespace-nowrap">
                    {advance.createdAt ? formatDate(advance.createdAt) : '—'}
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-2">
                      <Badge tone={statusTone(advance.status || 'pending')}>
                        {advance.status || 'pending'}
                      </Badge>
                      <SignatureStatusAvatars
                        slots={cashAdvanceSignatureSlots(advance, employees)}
                      />
                    </div>
                  </Td>
                  <Td className="space-x-2 text-right">
                    <Link to={`/finance/cash-advance/${advance.id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Delete advance for ${advance.recipient}`}
                      title="Delete"
                      disabled={deletingId === advance.id}
                      onClick={() => void handleDelete(advance.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-rose text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      <TrashIcon />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  )
}
