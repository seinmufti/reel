import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, kindTone, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { SignatureStatusAvatars } from '../components/ui/SignatureStatusAvatars'
import { useDemo } from '../context/DemoContext'
import { formatDate } from '../data/mockData'
import { dashboardItemDomId, isPrSuggestionDraft, prRequestorHref } from '../lib/dashboardFocus'
import {
  cashAdvanceSignatureSlots,
  financeSignerFor,
  leaveSignatureSlots,
  needsCashAdvanceSignature,
  needsLeaveSignature,
  needsPrApproval,
  prSignatureSlots,
  type SignatureSlot,
} from '../lib/signatureSlots'

type PendingItem = {
  id: string
  department: string
  kind: string
  title: string
  person: string
  signatures: SignatureSlot[]
  href?: string
  status: string
  occurredAt: number
  rejectionReason?: string
}

function lastUpdatedAtFrom(id: string, ...dates: Array<string | undefined>): number {
  let max = 0
  for (const d of dates) {
    if (!d) continue
    const t = Date.parse(d)
    if (!Number.isNaN(t) && t > max) max = t
  }
  const stamp = /(\d{10,13})/.exec(id)
  if (stamp) {
    const n = Number(stamp[1])
    const fromId = n > 1e12 ? n : n > 1e9 ? n * 1000 : 0
    if (fromId > max) max = fromId
  }
  return max
}

function sortNewest(items: PendingItem[]) {
  return [...items].sort((a, b) => b.occurredAt - a.occurredAt || b.id.localeCompare(a.id))
}

function userInSignatureChain(slots: SignatureSlot[], userId: string): boolean {
  return slots.some((slot) => slot.seed === userId)
}

function normalizeQueueStatus(status: string): 'pending' | 'approved' | 'rejected' {
  if (status === 'approved' || status === 'ordered') return 'approved'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

function RequestQueueCard({
  title,
  emptyText,
  items,
  inlineDepartment = false,
  statusOverride,
  statusColumn = false,
  actionLabel = 'View',
  statusTabs = false,
  highlightedQueueId = null,
  focusHighlightId = null,
}: {
  title: string
  emptyText: string
  items: PendingItem[]
  inlineDepartment?: boolean
  statusOverride?: string
  statusColumn?: boolean
  actionLabel?: string
  statusTabs?: boolean
  highlightedQueueId?: string | null
  focusHighlightId?: string | null
}) {
  const navigate = useNavigate()
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    if (!focusHighlightId || !statusTabs) return
    const item = items.find((entry) => entry.id === focusHighlightId)
    if (!item) return
    const normalized = normalizeQueueStatus(item.status)
    if (normalized === 'approved' || normalized === 'rejected' || normalized === 'pending') {
      setStatusTab(normalized)
    }
  }, [focusHighlightId, items, statusTabs])

  const visibleItems = useMemo(() => {
    if (!statusTabs || statusTab === 'all') return items
    return items.filter((item) => normalizeQueueStatus(item.status) === statusTab)
  }, [items, statusTab, statusTabs])

  const grouped = useMemo(() => [['', sortNewest(visibleItems)] as const], [visibleItems])

  function statusText(item: PendingItem) {
    return statusOverride ?? normalizeQueueStatus(item.status)
  }

  function statusBadgeTone(item: PendingItem) {
    return statusTone(statusOverride ?? normalizeQueueStatus(item.status))
  }

  const emptyMessage =
    statusTabs && statusTab === 'pending'
      ? 'No pending requests yet.'
      : statusTabs && statusTab === 'approved'
      ? 'No approved requests yet.'
      : statusTabs && statusTab === 'rejected'
        ? 'No rejected requests yet.'
        : emptyText

  return (
    <Panel
      title={title}
      className="min-w-0"
      bodyClassName="p-5"
      actions={
        <div className="flex items-center gap-3">
          {statusTabs ? (
            <div
              className="inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm"
              role="tablist"
              aria-label="Filter responses"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={statusTab === id}
                  onClick={() => setStatusTab(id)}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                    statusTab === id
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-slate-soft hover:bg-mist hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <span className="text-xs font-semibold tabular-nums text-slate-soft">
            {visibleItems.length}
          </span>
        </div>
      }
    >
      {visibleItems.length === 0 ? (
        <p className="text-sm text-slate-soft/70">{emptyMessage}</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([department, rows]) => (
            <div key={department || 'all'}>
              {!inlineDepartment ? (
                <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-slate-soft">
                  {department}
                </h3>
              ) : null}
              <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                {statusColumn ? (
                  <li className="flex items-center gap-3 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                    <span className="min-w-[7.5rem] shrink-0">Status</span>
                    <span className="min-w-0 flex-1">Request</span>
                    <span className="w-[4.25rem] shrink-0 text-right"> </span>
                  </li>
                ) : null}
                {rows.map((item) => (
                  <li
                    key={item.id}
                    id={dashboardItemDomId(item.id)}
                    className={`flex flex-wrap justify-between gap-3 px-3 py-2.5 ${
                      statusColumn || item.signatures.length > 0 ? 'items-start' : 'items-center'
                    } ${
                      highlightedQueueId === item.id
                        ? 'relative z-[1] bg-teal-soft/35 shadow-[inset_0_0_0_2px_var(--color-teal)]'
                        : ''
                    }`}
                  >
                    {statusColumn ? (
                      <div className="flex min-w-[7.5rem] shrink-0 flex-col items-start gap-2">
                        <Badge tone={statusBadgeTone(item)}>{statusText(item)}</Badge>
                        <SignatureStatusAvatars slots={item.signatures} />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {inlineDepartment ? (
                          <span className="font-semibold text-slate-soft">{item.department}</span>
                        ) : null}
                        <Badge tone={kindTone(item.kind)}>{item.kind}</Badge>
                      </div>
                      {item.href ? (
                        <button
                          type="button"
                          className="mt-1 block max-w-full cursor-pointer truncate text-left text-sm font-medium text-ink hover:text-teal"
                          onClick={() => navigate(item.href!)}
                        >
                          {item.title}
                        </button>
                      ) : (
                        <p className="mt-1 truncate text-sm font-medium text-ink">{item.title}</p>
                      )}
                      {item.person?.trim() ? (
                        <p className="mt-0.5 text-xs text-slate-soft/75">
                          Raised by: {item.person.trim()}
                        </p>
                      ) : null}
                      {statusColumn && item.rejectionReason?.trim() ? (
                        <p className="mt-1 text-sm text-rose">
                          rejection message: {item.rejectionReason.trim()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {statusColumn ? null : (
                        <div className="flex flex-col items-center gap-2">
                          <Badge tone={statusBadgeTone(item)}>{statusText(item)}</Badge>
                          <SignatureStatusAvatars slots={item.signatures} />
                        </div>
                      )}
                      {item.href ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => navigate(item.href!)}
                        >
                          {actionLabel}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function prQueueItem(
  pr: import('../types').PurchaseRequest,
  employees: import('../types').Employee[],
): PendingItem {
  return {
    id: `pr-${pr.id}`,
    department: 'Procurement',
    kind: isPrSuggestionDraft(pr) ? 'Suggested edit' : 'Purchase request',
    title: `${pr.number} · ${pr.title || pr.preliminaryExplanation}`,
    person: pr.requester,
    signatures: prSignatureSlots(pr, employees),
    href: prRequestorHref(pr),
    status: pr.status,
    rejectionReason: pr.rejectionReason,
    occurredAt: lastUpdatedAtFrom(
      pr.id,
      pr.createdAt,
      pr.requesterDate,
      pr.approverDate,
      pr.financeSignedAt,
      pr.rejectedAt,
    ),
  }
}

function leaveQueueItem(
  lv: import('../types').LeaveRequest,
  person: string,
  employees: import('../types').Employee[],
): PendingItem {
  return {
    id: `lv-${lv.id}`,
    department: 'HR',
    kind: 'Leave request',
    title: `${lv.type} · ${lv.days} day${lv.days === 1 ? '' : 's'} (${formatDate(lv.startDate)} → ${formatDate(lv.endDate)})`,
    person,
    signatures: leaveSignatureSlots(lv, employees),
    href: `/hr/leave/${lv.id}`,
    status: lv.status,
    rejectionReason: lv.rejectionReason,
    occurredAt: lastUpdatedAtFrom(lv.id, lv.rejectedAt, lv.lmSignedAt, lv.hrSignedAt),
  }
}

function cashAdvanceQueueItem(
  ca: import('../types').CashAdvance,
  employees: import('../types').Employee[],
): PendingItem {
  return {
    id: `ca-${ca.id}`,
    department: 'Finance',
    kind: 'Cash advance',
    title: `${ca.currency} ${ca.amount.toLocaleString()} · ${formatDate(ca.dateFrom)} → ${formatDate(ca.dateTo)}`,
    person: ca.recipient,
    signatures: cashAdvanceSignatureSlots(ca, employees),
    href: `/finance/cash-advance/${ca.id}`,
    status: ca.status || 'pending',
    rejectionReason: ca.rejectionReason,
    occurredAt: lastUpdatedAtFrom(
      ca.id,
      ca.createdAt,
      ca.rejectedAt,
      ca.lmSignedAt,
      ca.financeSignedAt,
    ),
  }
}

function collectReviewItems({
  currentUser,
  employees,
  purchaseRequests,
  leaveRequests,
  cashAdvances,
}: {
  currentUser: { id: string; name: string }
  employees: import('../types').Employee[]
  purchaseRequests: import('../types').PurchaseRequest[]
  leaveRequests: import('../types').LeaveRequest[]
  cashAdvances: import('../types').CashAdvance[]
}): PendingItem[] {
  const next: PendingItem[] = []

  for (const pr of purchaseRequests) {
    if (!needsPrApproval(pr, currentUser.id, employees)) continue
    next.push(prQueueItem(pr, employees))
  }

  for (const lv of leaveRequests) {
    if (!needsLeaveSignature(lv, currentUser.id, employees)) continue
    const emp = employees.find((e) => e.id === lv.employeeId)
    next.push(leaveQueueItem(lv, emp?.name ?? 'Employee', employees))
  }

  for (const ca of cashAdvances ?? []) {
    if (!needsCashAdvanceSignature(ca, currentUser.id, employees)) continue
    next.push(cashAdvanceQueueItem(ca, employees))
  }

  return next
}

function collectPendingApprovalItems({
  currentUser,
  employees,
  purchaseRequests,
  leaveRequests,
  cashAdvances,
}: {
  currentUser: { id: string; name: string }
  employees: import('../types').Employee[]
  purchaseRequests: import('../types').PurchaseRequest[]
  leaveRequests: import('../types').LeaveRequest[]
  cashAdvances: import('../types').CashAdvance[]
}): PendingItem[] {
  const next: PendingItem[] = []

  for (const pr of purchaseRequests) {
    if (pr.status !== 'submitted' && pr.status !== 'draft') continue
    const requester = employees.find((e) => e.name === pr.requester)
    if (requester?.id !== currentUser.id) continue
    next.push(prQueueItem(pr, employees))
  }

  for (const lv of leaveRequests) {
    if (lv.status !== 'pending') continue
    if (lv.employeeId !== currentUser.id) continue
    const emp = employees.find((e) => e.id === lv.employeeId)
    next.push(leaveQueueItem(lv, emp?.name ?? 'Employee', employees))
  }

  for (const ca of cashAdvances ?? []) {
    if ((ca.status || 'pending') !== 'pending') continue
    const recipient = employees.find((e) => e.name === ca.recipient)
    if (recipient?.id !== currentUser.id) continue
    next.push(cashAdvanceQueueItem(ca, employees))
  }

  return next
}

function collectOutcomeItems({
  currentUser,
  employees,
  purchaseRequests,
  leaveRequests,
  cashAdvances,
}: {
  currentUser: { id: string }
  employees: import('../types').Employee[]
  purchaseRequests: import('../types').PurchaseRequest[]
  leaveRequests: import('../types').LeaveRequest[]
  cashAdvances: import('../types').CashAdvance[]
}): PendingItem[] {
  const next: PendingItem[] = []

  function addIfLinked(item: PendingItem) {
    if (userInSignatureChain(item.signatures, currentUser.id)) {
      next.push(item)
    }
  }

  for (const pr of purchaseRequests) {
    if (
      pr.status !== 'approved' &&
      pr.status !== 'rejected' &&
      pr.status !== 'submitted' &&
      pr.status !== 'ordered'
    ) {
      continue
    }
    const requester = employees.find((e) => e.name === pr.requester)
    const finance = requester ? financeSignerFor(requester, employees) : undefined
    if (finance && pr.approverName && !pr.financeSignedBy && pr.status === 'approved') continue
    addIfLinked({
      ...prQueueItem(pr, employees),
      id: `pr-out-${pr.id}`,
    })
  }

  for (const lv of leaveRequests) {
    if (lv.status !== 'approved' && lv.status !== 'rejected' && lv.status !== 'pending') continue
    const emp = employees.find((e) => e.id === lv.employeeId)
    addIfLinked({
      ...leaveQueueItem(lv, emp?.name ?? 'Employee', employees),
      id: `lv-out-${lv.id}`,
    })
  }

  for (const ca of cashAdvances ?? []) {
    const caStatus = ca.status || 'pending'
    if (caStatus !== 'approved' && caStatus !== 'rejected' && caStatus !== 'pending') continue
    addIfLinked({
      ...cashAdvanceQueueItem(ca, employees),
      id: `ca-out-${ca.id}`,
    })
  }

  return next
}

function ReviewColumn() {
  const {
    currentUser,
    employees,
    purchaseRequests,
    leaveRequests,
    cashAdvances,
    ready,
  } = useDemo()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusHighlightId = searchParams.get('highlight')
  const pendingFocusRef = useRef<string | null>(focusHighlightId)
  const [highlightedQueueId, setHighlightedQueueId] = useState<string | null>(null)

  useEffect(() => {
    if (focusHighlightId) pendingFocusRef.current = focusHighlightId
  }, [focusHighlightId])

  const reviewItems = useMemo(
    () =>
      collectReviewItems({
        currentUser,
        employees,
        purchaseRequests,
        leaveRequests,
        cashAdvances,
      }),
    [currentUser, employees, leaveRequests, purchaseRequests, cashAdvances],
  )

  const pendingItems = useMemo(
    () =>
      collectPendingApprovalItems({
        currentUser,
        employees,
        purchaseRequests,
        leaveRequests,
        cashAdvances,
      }),
    [currentUser, employees, leaveRequests, purchaseRequests, cashAdvances],
  )

  const outcomeItems = useMemo(
    () =>
      collectOutcomeItems({
        currentUser,
        employees,
        purchaseRequests,
        leaveRequests,
        cashAdvances,
      }),
    [currentUser, employees, leaveRequests, purchaseRequests, cashAdvances],
  )

  const allQueueIds = useMemo(
    () => new Set([...reviewItems, ...pendingItems, ...outcomeItems].map((item) => item.id)),
    [reviewItems, pendingItems, outcomeItems],
  )

  useEffect(() => {
    const focusId = pendingFocusRef.current
    if (!focusId || !ready) return
    if (!allQueueIds.has(focusId)) return

    let cancelled = false
    let clearHighlight: number | undefined

    const tryFocus = () => {
      if (cancelled) return false
      const row = document.getElementById(dashboardItemDomId(focusId))
      if (!row) return false
      pendingFocusRef.current = null
      setHighlightedQueueId(focusId)
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearHighlight = window.setTimeout(() => {
        if (!cancelled) setHighlightedQueueId(null)
      }, 4000)
      setSearchParams(
        (prev) => {
          if (!prev.get('highlight')) return prev
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        },
        { replace: true },
      )
      return true
    }

    if (tryFocus()) {
      return () => {
        cancelled = true
        if (clearHighlight) window.clearTimeout(clearHighlight)
      }
    }

    const raf = window.requestAnimationFrame(() => {
      tryFocus()
    })
    const retry = window.setTimeout(() => {
      tryFocus()
    }, 100)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(retry)
      if (clearHighlight) window.clearTimeout(clearHighlight)
    }
  }, [allQueueIds, ready, reviewItems.length, pendingItems.length, outcomeItems.length, setSearchParams])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <RequestQueueCard
        title="To Review"
        emptyText="No documents waiting for your approval."
        items={reviewItems}
        inlineDepartment
        statusOverride="pending"
        actionLabel="Review"
        focusHighlightId={focusHighlightId}
        highlightedQueueId={highlightedQueueId}
      />
      <RequestQueueCard
        title="Pending approvals"
        emptyText="No requests waiting for approval."
        items={pendingItems}
        inlineDepartment
        statusOverride="pending"
        actionLabel="View"
        focusHighlightId={focusHighlightId}
        highlightedQueueId={highlightedQueueId}
      />
      <RequestQueueCard
        title="Responses"
        emptyText="No requests linked to you yet."
        items={outcomeItems}
        inlineDepartment
        statusColumn
        statusTabs
        focusHighlightId={focusHighlightId}
        highlightedQueueId={highlightedQueueId}
      />
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <Panel title="Control Panel" className="w-fit shrink-0" bodyClassName="p-0">
        <div className="flex min-w-[14rem] flex-col divide-y divide-line">
          <div className="px-3 py-3">
            <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-slate-soft">
              Finance
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/finance/cash-advance/new')}
            >
              Request cash advance
            </Button>
          </div>
          <div className="px-3 py-3">
            <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-slate-soft">
              Procurement
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/procurement/new')}
            >
              Request PR
            </Button>
          </div>
          <div className="px-3 py-3">
            <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-slate-soft">
              HR
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/hr/leave/new')}
            >
              Request leave
            </Button>
          </div>
        </div>
      </Panel>

      <ReviewColumn />

    </div>
  )
}
