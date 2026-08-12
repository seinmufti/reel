import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { PersonAvatar, avatarIndexForName } from '../../components/ui/PersonAvatar'
import { Table, Td, Th } from '../../components/ui/Table'
import { useDemo } from '../../context/DemoContext'
import { directReports, formatMoney, prTotal } from '../../data/mockData'
import type { Employee, PrCurrency, PrItem, PrStatus, PurchaseRequest, Transaction } from '../../types'

const slotClass =
  'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] outline-none transition hover:border-slate-soft/40 focus:border-teal focus:shadow-[0_0_0_1px_var(--color-teal)]'

const fieldLabel = (text: string, hint?: 'required' | 'optional') => (
  <div className="text-[11px] font-semibold leading-tight text-ink/80">
    {text}
    {hint === 'required' ? <span className="text-rose"> *</span> : null}
    {hint === 'optional' ? <span className="font-normal text-slate-soft/70"> (optional)</span> : null}
  </div>
)

function emptyLine(id?: string): PrItem {
  return {
    id: id ?? `pri-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: '',
    deliveryDatePlace: '',
    quantity: 1,
    unitCost: 0,
  }
}

type DemoPrTemplate = {
  preliminaryExplanation: string
  department: string
  currency: PrCurrency
  comments?: string
  budgetLine: string
  projectName: string
  items: Array<{ description: string; quantity: number; unitCost: number }>
}

const BYPASS_LAPTOP_PR_TEMPLATE: DemoPrTemplate = {
  preliminaryExplanation:
    'Bypass purchase of 10 field laptops for monitoring and MEAL teams — deliver to Erbil HQ IT.',
  department: 'Procurement',
  currency: 'USD',
  comments: 'Bypass approved — standard REEL laptop spec for field staff.',
  budgetLine: 'P.Costs',
  projectName: 'IQ2026',
  items: [
    { description: 'Dell Latitude 5440 — 14", 16GB RAM, 512GB SSD', quantity: 4, unitCost: 700 },
    { description: 'Lenovo ThinkPad L14 — 14", 16GB RAM, 512GB SSD', quantity: 3, unitCost: 700 },
    { description: 'HP ProBook 450 G10 — 15.6", 16GB RAM, 512GB SSD', quantity: 3, unitCost: 700 },
  ],
}

const DEMO_PR_TEMPLATES: DemoPrTemplate[] = [
  {
    preliminaryExplanation:
      'Office stationery restock for Erbil hub — deliver to admin store by end of week.',
    department: 'Procurement',
    currency: 'USD',
    comments: 'Prefer local vendor with delivery included.',
    budgetLine: 'R.Costs',
    projectName: 'IQ2026',
    items: [
      { description: 'A4 copy paper (box of 5 reams)', quantity: 12, unitCost: 18 },
      { description: 'Blue ballpoint pens (pack of 50)', quantity: 8, unitCost: 9.5 },
    ],
  },
  {
    preliminaryExplanation:
      'Laptop replacement for field monitoring officer — deliver to Mosul office.',
    department: 'Project',
    currency: 'USD',
    budgetLine: 'P.Costs',
    projectName: 'IQ2026',
    items: [{ description: '14" laptop, 16GB RAM, 512GB SSD', quantity: 1, unitCost: 980 }],
  },
  {
    preliminaryExplanation:
      'Fuel for logistics convoy to Dohuk warehouse — refill at contracted station.',
    department: 'Logistics',
    currency: 'USD',
    comments: 'Keep pump receipts attached to GRN.',
    budgetLine: 'R.Costs',
    projectName: 'IQ2026',
    items: [{ description: 'Diesel fuel (liters)', quantity: 400, unitCost: 0.75 }],
  },
  {
    preliminaryExplanation:
      'Training venue and catering for 2-day MEAL workshop in Erbil.',
    department: 'HR',
    currency: 'USD',
    budgetLine: 'P.Costs',
    projectName: 'SY2026',
    items: [
      { description: 'Conference room rental (2 days)', quantity: 2, unitCost: 220 },
      { description: 'Lunch + coffee breaks (25 pax/day)', quantity: 50, unitCost: 12 },
    ],
  },
  {
    preliminaryExplanation:
      'Accounting software annual license renewal for Finance team.',
    department: 'Finance',
    currency: 'USD',
    comments: 'Invoice must be in REEL legal name.',
    budgetLine: 'R.Costs',
    projectName: 'IQ2026',
    items: [{ description: 'QuickBooks Online Plus — annual subscription', quantity: 1, unitCost: 420 }],
  },
  {
    preliminaryExplanation:
      'Hygiene kits for distribution in Al-Hasakah — deliver to SY warehouse.',
    department: 'Logistics',
    currency: 'USD',
    budgetLine: 'P.Costs',
    projectName: 'SY2026',
    items: [
      { description: 'Family hygiene kit (standard REEL pack)', quantity: 200, unitCost: 14.75 },
      { description: 'Carton packing tape (roll)', quantity: 40, unitCost: 2.5 },
    ],
  },
  {
    preliminaryExplanation:
      'Printer toner for HQ printers — ground floor admin wing.',
    department: 'Procurement',
    currency: 'USD',
    budgetLine: 'R.Costs',
    projectName: 'IQ2026',
    items: [{ description: 'HP 26A black toner cartridge', quantity: 6, unitCost: 75 }],
  },
  {
    preliminaryExplanation:
      'Vehicle spare parts for fleet maintenance — Toyota Hilux plate IQ-4421.',
    department: 'Logistics',
    currency: 'USD',
    comments: 'Mechanic to confirm fitment before payment.',
    budgetLine: 'R.Costs',
    projectName: 'IQ2026',
    items: [
      { description: 'Oil filter (OEM equivalent)', quantity: 4, unitCost: 14 },
      { description: 'Brake pad set (front)', quantity: 1, unitCost: 95 },
    ],
  },
  {
    preliminaryExplanation:
      'Visibility materials for donor visit — banners and folders.',
    department: 'Project',
    currency: 'USD',
    budgetLine: 'P.Costs',
    projectName: 'SY2026',
    items: [
      { description: 'Roll-up banner 85×200cm with stand', quantity: 3, unitCost: 65 },
      { description: 'Printed project briefing folders (pack of 50)', quantity: 2, unitCost: 40 },
    ],
  },
  {
    preliminaryExplanation:
      'First-aid supplies top-up for field bases — deliver to logistics store.',
    department: 'HR',
    currency: 'USD',
    comments: 'Check expiry dates > 18 months.',
    budgetLine: 'P.Costs',
    projectName: 'IQ2026',
    items: [{ description: 'Workplace first-aid kit (large)', quantity: 5, unitCost: 48 }],
  },
]

let demoPrCursor = 0

function nextDemoPr(): DemoPrTemplate {
  const demo = DEMO_PR_TEMPLATES[demoPrCursor % DEMO_PR_TEMPLATES.length]!
  demoPrCursor += 1
  return demo
}

function demoToFormInitial(demo: DemoPrTemplate): Partial<PurchaseRequest> {
  return {
    title: demo.preliminaryExplanation.slice(0, 80),
    preliminaryExplanation: demo.preliminaryExplanation,
    department: demo.department,
    currency: demo.currency,
    comments: demo.comments,
    budgetLine: demo.budgetLine,
    projectName: demo.projectName,
    items: demo.items.map((item, index) => ({
      id: `dummy-${Date.now()}-${index + 1}`,
      description: item.description,
      deliveryDatePlace: '',
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  }
}

function formatPrNumber(n: number): string {
  return `PR.${String(n).padStart(3, '0')}`
}

function nextPreviewPrNumber(existing: Array<{ number: string }>): string {
  let max = 0
  for (const pr of existing) {
    const match = pr.number.match(/(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return formatPrNumber(max + 1)
}

function PrFormPaper({
  mode,
  initial,
  onSubmit,
  submitLabel,
  canAssignMeta = false,
  bypassApproval = false,
  assignedBudgetLine,
  assignedProjectName,
  onAssignBudgetLine,
  onAssignProjectName,
}: {
  mode: 'create' | 'edit' | 'view'
  initial?: Partial<PurchaseRequest>
  onSubmit?: (data: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>) => void
  submitLabel?: string
  /** Line manager can assign budget line + project */
  canAssignMeta?: boolean
  /** Create as approved without line-manager workflow */
  bypassApproval?: boolean
  assignedBudgetLine?: string
  assignedProjectName?: string
  onAssignBudgetLine?: (value: string) => void
  onAssignProjectName?: (value: string) => void
}) {
  const { currentUser, purchaseRequests, departments, currencies, budgetLines, prProjects } = useDemo()
  const readOnly = mode === 'view'
  const today = new Date().toISOString().slice(0, 10)
  const previewNumber = initial?.number ?? nextPreviewPrNumber(purchaseRequests)
  const [lines, setLines] = useState<PrItem[]>(
    initial?.items?.length ? initial.items : [emptyLine('1')],
  )

  function removeLine(id: string) {
    setLines((prev) => {
      if (prev.length <= 1) {
        return [emptyLine()]
      }
      return prev.filter((line) => line.id !== id)
    })
  }
  const [currency, setCurrency] = useState<PrCurrency>(initial?.currency ?? 'USD')

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0), 0),
    [lines],
  )

  function updateLine(id: string, patch: Partial<PrItem>) {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onSubmit) return
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    let status = (submitter?.value === 'draft' ? 'draft' : 'submitted') as PrStatus
    if (mode === 'edit' && initial) {
      if (submitter?.value === 'draft') {
        status = 'draft'
      } else if (initial.status === 'approved' || initial.status === 'ordered') {
        status = initial.status
      }
    }
    const fd = new FormData(e.currentTarget)
    const filled = lines.filter((l) => l.description.trim())
    if (status === 'submitted' && filled.length === 0) {
      window.alert('Add at least one line item with a detailed description.')
      return
    }
    const budgetLine = canAssignMeta ? (assignedBudgetLine ?? '').trim() : (initial?.budgetLine ?? '')
    const projectName = canAssignMeta
      ? (assignedProjectName ?? '').trim()
      : (initial?.projectName ?? '')
    if (bypassApproval && status === 'submitted') {
      if (!budgetLine || !projectName) {
        window.alert('Assign budget line and project before submitting.')
        return
      }
      status = 'approved'
    }
    const preliminary = String(fd.get('preliminaryExplanation')).trim()
    const firstDesc = filled[0]?.description.slice(0, 80) ?? 'Draft purchase request'
    onSubmit({
      title: preliminary || firstDesc,
      receiptDate: initial?.receiptDate ?? today,
      budgetLine,
      projectName: projectName || undefined,
      department: String(fd.get('department')),
      preliminaryExplanation: preliminary,
      currency,
      comments: String(fd.get('comments') || '').trim() || undefined,
      requester: (initial?.requester ?? currentUser.name).trim(),
      requesterPosition: (initial?.requesterPosition ?? currentUser.role).trim(),
      requesterDate: initial?.requesterDate ?? today,
      ...(status === 'approved'
        ? {
            approverName:
              mode === 'edit' && initial?.approverName ? initial.approverName : currentUser.name,
            approverPosition:
              mode === 'edit' && initial?.approverPosition
                ? initial.approverPosition
                : currentUser.role,
            approverDate:
              mode === 'edit' && initial?.approverDate ? initial.approverDate : today,
          }
        : {}),
      status,
      items: filled.map((l) => ({
        ...l,
        deliveryDatePlace: '',
        quantity: Number(l.quantity) || 0,
        unitCost: Number(l.unitCost) || 0,
      })),
    })
  }

  const budgetValue = canAssignMeta ? (assignedBudgetLine ?? '') : (initial?.budgetLine ?? '')
  const projectValue = canAssignMeta ? (assignedProjectName ?? '') : (initial?.projectName ?? '')

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-5xl overflow-hidden rounded-lg border-2 border-ink/20 bg-[#fbfcfd] shadow-sm"
    >
      <div className="border-b-2 border-ink/15 bg-teal-soft/30 px-4 py-3 text-center">
        <h2 className="font-display text-xl font-bold text-ink">Purchase request</h2>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {/* Header meta slots */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block space-y-1">
            {fieldLabel('Date of PR receipt')}
            <input
              className={`${slotClass} bg-mist/50`}
              type="date"
              name="receiptDate"
              value={initial?.receiptDate ?? today}
              disabled
            />
          </label>
          <label className="block space-y-1">
            {fieldLabel('Purchase request #')}
            <input className={`${slotClass} bg-mist/50`} readOnly disabled value={previewNumber} />
          </label>
          <label className="block space-y-1">
            {fieldLabel('Budget line', canAssignMeta ? 'required' : undefined)}
            {canAssignMeta ? (
              <select
                className={slotClass}
                name="budgetLine"
                required
                value={budgetValue}
                onChange={(e) => onAssignBudgetLine?.(e.target.value)}
              >
                <option value="">Select budget line</option>
                {budgetLines.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={`${slotClass} !bg-sky-50 text-sky-900/70 placeholder:text-sky-700/45`}
                name="budgetLine"
                readOnly
                disabled={!readOnly}
                value={budgetValue}
                placeholder="Assigned later"
              />
            )}
          </label>
          <label className="block space-y-1">
            {fieldLabel('Project', canAssignMeta ? 'required' : undefined)}
            {canAssignMeta ? (
              <select
                className={slotClass}
                name="projectName"
                required
                value={projectValue}
                onChange={(e) => onAssignProjectName?.(e.target.value)}
              >
                <option value="">Select project</option>
                {prProjects.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={`${slotClass} !bg-sky-50 text-sky-900/70 placeholder:text-sky-700/45`}
                name="projectName"
                readOnly
                disabled={!readOnly}
                value={projectValue}
                placeholder="Assigned later"
              />
            )}
          </label>
          <label className="block space-y-1">
            {fieldLabel('Department', readOnly ? undefined : 'required')}
            {readOnly ? (
              <input className={slotClass} readOnly defaultValue={initial?.department ?? ''} />
            ) : (
              <select
                className={slotClass}
                name="department"
                required
                defaultValue={initial?.department ?? 'Procurement'}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>

        {/* Preliminary explanation */}
        <label className="block space-y-1">
          {fieldLabel(
            'Preliminary explanation (reason, place and time of delivery)',
            readOnly ? undefined : 'required',
          )}
          <textarea
            className={`${slotClass} min-h-[4.5rem]`}
            name="preliminaryExplanation"
            required={!readOnly}
            readOnly={readOnly}
            defaultValue={initial?.preliminaryExplanation ?? initial?.title ?? ''}
            placeholder="Reason, place and time of delivery"
          />
        </label>

        {/* Line items */}
        <div className="overflow-x-auto rounded border border-ink/15">
          <table className="min-w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '56%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="bg-mist/80">
                <th className="border border-line px-2 py-2 text-center font-semibold">
                  {fieldLabel('#')}
                </th>
                <th className="border border-line px-2 py-2 text-left font-semibold">
                  {fieldLabel('Detailed description', readOnly ? undefined : 'required')}
                </th>
                <th className="border border-line px-2 py-2 text-center font-semibold">
                  {fieldLabel('Quantity', readOnly ? undefined : 'required')}
                </th>
                <th className="border border-line px-2 py-2 text-center font-semibold">
                  {fieldLabel('Unit cost', readOnly ? undefined : 'required')}
                </th>
                <th className="border border-line px-2 py-2 text-right font-semibold">
                  {fieldLabel('Total')}
                </th>
                <th className="border-0 bg-transparent p-0" aria-label={readOnly ? undefined : 'Remove'} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0)
                return (
                  <tr key={line.id}>
                    <td className="border border-line px-2 py-1 text-center text-slate-soft">{index + 1}</td>
                    <td className="border border-line p-1">
                      <textarea
                        className={`${slotClass} min-h-[2.5rem] border-0 bg-transparent`}
                        readOnly={readOnly}
                        required={index === 0 && !readOnly}
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Item details"
                      />
                    </td>
                    <td className="border border-line p-1 text-center">
                      <input
                        className={`${slotClass} border-0 bg-transparent text-center font-normal tabular-nums`}
                        type="number"
                        min="0"
                        step="1"
                        required={!readOnly}
                        readOnly={readOnly}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="border border-line p-1 text-center">
                      <input
                        className={`${slotClass} border-0 bg-transparent text-center font-normal tabular-nums`}
                        type="number"
                        min="0"
                        step="0.01"
                        required={!readOnly}
                        readOnly={readOnly}
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.id, { unitCost: Number(e.target.value) })}
                      />
                    </td>
                    <td className="border border-line px-2 py-1 text-right text-sm font-normal tabular-nums">
                      {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-0 bg-transparent px-1 py-1 text-center align-middle">
                      {!readOnly ? (
                        <button
                          type="button"
                          title={lines.length <= 1 ? 'Clear row' : 'Remove row'}
                          aria-label={lines.length <= 1 ? 'Clear row' : `Remove row ${index + 1}`}
                          onClick={() => removeLine(line.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded text-rose hover:bg-rose/10"
                        >
                          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
                            <path
                              d="M3 3l10 10M13 3L3 13"
                              stroke="currentColor"
                              strokeWidth="2.75"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-mist/40">
                <td colSpan={4} className="border border-line px-3 py-4 text-right text-sm font-bold">
                  Grand Total
                </td>
                <td className="border border-line px-2 py-4 text-right text-sm font-bold tabular-nums">
                  {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="border-0 bg-transparent px-1 py-4 text-center align-middle">
                  {readOnly ? (
                    <input
                      className="mx-auto block w-[3.75rem] rounded border border-line bg-white px-1 py-0.5 text-center text-xs font-normal text-ink outline-none"
                      readOnly
                      value={currency}
                      aria-label="Currency"
                    />
                  ) : (
                    <select
                      className="mx-auto block w-[3.75rem] rounded border border-line bg-white px-1 py-0.5 text-center text-xs font-normal text-ink outline-none transition hover:border-slate-soft/40 focus:border-teal focus:shadow-[0_0_0_1px_var(--color-teal)]"
                      value={currency}
                      required
                      onChange={(e) => setCurrency(e.target.value as PrCurrency)}
                      aria-label="Currency"
                    >
                      {currencies.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!readOnly ? (
          <div>
            <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
              Add row
            </Button>
          </div>
        ) : null}

        <label className="block space-y-1">
          {fieldLabel('Comments & requirements', 'optional')}
          <textarea
            className={`${slotClass} min-h-[3.5rem]`}
            name="comments"
            readOnly={readOnly}
            defaultValue={initial?.comments ?? ''}
          />
        </label>

        {!readOnly ? (
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
            <Link to="/procurement">
              <Button type="button" variant="cancel">
                Cancel
              </Button>
            </Link>
            <div className="flex flex-wrap items-end gap-3">
              <Button type="submit" name="intent" value="draft" variant="secondary" formNoValidate>
                Save as draft
              </Button>
              <Button type="submit" name="intent" value="submitted">
                {submitLabel ?? 'Submit purchase request'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  )
}

function canEditPr(_pr: PurchaseRequest, _currentUserName: string) {
  return true
}

function requesterEmployee(pr: PurchaseRequest, employees: Employee[]) {
  return employees.find((e) => e.name === pr.requester)
}

/** Submitted PRs from this user's direct reports (line-director approval inbox). */
function needsMyApproval(pr: PurchaseRequest, currentUser: Employee, employees: Employee[]) {
  if (pr.status !== 'submitted') return false
  if (pr.requester === currentUser.name) return false
  const reports = directReports(currentUser.id, employees)
  const requester = requesterEmployee(pr, employees)
  if (requester && reports.some((r) => r.id === requester.id)) return true
  // Admin without matching manager link still reviews all submitted PRs from others
  if (currentUser.isAdmin && reports.length === 0) return true
  return false
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.5 2.5l2 2M3 13l.7-2.8L11.2 2.7a1.4 1.4 0 012 2L5.8 12.1 3 13z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 4.5h9M6.5 4.5V3.2a.7.7 0 01.7-.7h1.6a.7.7 0 01.7.7v1.3M5 4.5l.5 8.2a1 1 0 001 .9h3a1 1 0 001-.9l.5-8.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ConfirmDeleteDialog({
  open,
  prNumber,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean
  prNumber: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-pr-title"
        className="relative z-10 w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
      >
        <h3 id="delete-pr-title" className="font-display text-lg font-semibold text-ink">
          Delete {prNumber}?
        </h3>
        <p className="mt-2 text-sm text-slate-soft/80">
          This purchase request will be permanently removed. This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function prExhausted(pr: PurchaseRequest, transactions: Transaction[]) {
  return transactions
    .filter((txn) => txn.purchaseRequestId === pr.id && txn.currency === pr.currency)
    .reduce((sum, txn) => sum + (Number(txn.debit) || 0), 0)
}

function formatPrAmount(currency: PrCurrency, amount: number) {
  return `${currency} ${formatMoney(amount).replace('$', '')}`
}

function PrExhaustedBar({
  exhausted,
  total,
  currency,
}: {
  exhausted: number
  total: number
  currency: PrCurrency
}) {
  const withinPct =
    exhausted <= 0
      ? 0
      : total <= 0
        ? 100
        : exhausted <= total
          ? (exhausted / total) * 100
          : (total / exhausted) * 100
  const overPct =
    exhausted > total && exhausted > 0 ? ((exhausted - total) / exhausted) * 100 : 0

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-inset ring-slate-300/80"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(
        total > 0 ? Math.min(100, (exhausted / total) * 100) : exhausted > 0 ? 100 : 0,
      )}
      aria-label={`${formatPrAmount(currency, exhausted)} of ${formatPrAmount(currency, total)} spent`}
    >
      {withinPct > 0 ? (
        <div className="h-full bg-teal transition-[width]" style={{ width: `${withinPct}%` }} />
      ) : null}
      {overPct > 0 ? (
        <div className="h-full bg-rose transition-[width]" style={{ width: `${overPct}%` }} />
      ) : null}
    </div>
  )
}

const projectTagPalette = [
  'bg-teal-soft text-teal-dark',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
  'bg-orange-100 text-orange-800',
  'bg-fuchsia-100 text-fuchsia-800',
] as const

function projectTagClass(projectName: string, knownProjects: string[]) {
  const knownIndex = knownProjects.findIndex((p) => p === projectName)
  const index =
    knownIndex >= 0
      ? knownIndex
      : avatarIndexForName(projectName)
  return projectTagPalette[index % projectTagPalette.length]
}

function ProjectTag({ name, knownProjects }: { name: string; knownProjects: string[] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${projectTagClass(name, knownProjects)}`}
    >
      {name}
    </span>
  )
}

function PrTable({
  rows,
  currentUserName,
  transactions,
  employees,
  projects,
}: {
  rows: PurchaseRequest[]
  currentUserName: string
  transactions: Transaction[]
  employees: Employee[]
  projects: string[]
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-soft/70">None.</p>
  }

  const employeeNames = employees.map((e) => e.name)

  return (
    <Table>
      <thead>
        <tr>
          <Th>Number</Th>
          <Th>Subject</Th>
          <Th>Requester</Th>
          <Th>Department</Th>
          <Th>Project</Th>
          <Th className="text-right">Total</Th>
          <Th className="text-right">Exhausted</Th>
          <Th className="text-right">Remaining</Th>
          <Th className="w-14" />
        </tr>
      </thead>
      <tbody>
        {rows.map((pr) => {
          const total = prTotal(pr)
          const exhausted = prExhausted(pr, transactions)
          const remaining = total - exhausted
          const empIndex = employees.findIndex((e) => e.name === pr.requester)
          const colorIndex = empIndex >= 0 ? empIndex : avatarIndexForName(pr.requester, employeeNames)
          return (
            <tr key={pr.id}>
              <Td>
                <Link className="font-mono text-xs font-semibold text-teal hover:underline" to={`/procurement/${pr.id}`}>
                  {pr.number}
                </Link>
              </Td>
              <Td className="max-w-[16rem] whitespace-normal break-words">{pr.title}</Td>
              <Td className="overflow-visible">
                <PersonAvatar
                  name={pr.requester}
                  colorIndex={colorIndex}
                  size="sm"
                  tooltipPlacement="top"
                />
              </Td>
              <Td>{pr.department}</Td>
              <Td>
                {pr.projectName ? (
                  <ProjectTag name={pr.projectName} knownProjects={projects} />
                ) : (
                  '—'
                )}
              </Td>
              <Td className="text-right font-semibold">{formatPrAmount(pr.currency, total)}</Td>
              <Td className="min-w-[7.5rem]">
                <Link
                  to={`/procurement/${pr.id}/exhaustion`}
                  className="block space-y-1.5 text-right text-ink transition hover:text-teal"
                  aria-label={`View exhaustion of entries for ${pr.number}`}
                  title="Exhaustion of entries"
                >
                  <div>{formatPrAmount(pr.currency, exhausted)}</div>
                  <PrExhaustedBar exhausted={exhausted} total={total} currency={pr.currency} />
                </Link>
              </Td>
              <Td className="text-right font-semibold">{formatPrAmount(pr.currency, remaining)}</Td>
              <Td className="relative z-10 text-right">
                {canEditPr(pr, currentUserName) ? (
                  <Link
                    to={`/procurement/${pr.id}/edit`}
                    aria-label={`Edit ${pr.number}`}
                    title="Edit"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-mist"
                  >
                    <PencilIcon />
                  </Link>
                ) : null}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}

function PrList() {
  const { purchaseRequests, currentUser, employees, transactions, prProjects } = useDemo()

  const pendingApproval = useMemo(
    () =>
      purchaseRequests.filter((pr) => needsMyApproval(pr, currentUser, employees)),
    [purchaseRequests, currentUser, employees],
  )

  const approved = useMemo(
    () => purchaseRequests.filter((pr) => pr.status === 'approved' || pr.status === 'ordered'),
    [purchaseRequests],
  )

  return (
    <div>
      <PageHeader
        title="Procurement"
        actions={
          <>
            <Link to="/procurement/new-bypass">
              <Button className="!bg-pink-500 text-white hover:!bg-pink-600">
                New Purchase Request Bypass
              </Button>
            </Link>
            <Link to="/procurement/new">
              <Button>New purchase request</Button>
            </Link>
          </>
        }
      />

      <div className="space-y-5">
        <Panel title={`Pending approvals (${pendingApproval.length})`}>
          <PrTable
            rows={pendingApproval}
            currentUserName={currentUser.name}
            transactions={transactions}
            employees={employees}
            projects={prProjects}
          />
        </Panel>

        <Panel title={`Approved (${approved.length})`}>
          <PrTable
            rows={approved}
            currentUserName={currentUser.name}
            transactions={transactions}
            employees={employees}
            projects={prProjects}
          />
        </Panel>
      </div>
    </div>
  )
}

function PrApprovals() {
  const { purchaseRequests } = useDemo()
  const queue = purchaseRequests.filter((pr) => pr.status === 'submitted')

  return (
    <div>
      <PageHeader
        title="PR approval queue"
        actions={
          <Link to="/procurement">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <Panel>
        {queue.length === 0 ? (
          <p className="text-sm text-slate-soft/70">No submitted PRs waiting for approval.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>PR</Th>
                <Th>Subject</Th>
                <Th>Requester</Th>
                <Th className="text-right">Total</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {queue.map((pr) => (
                <tr key={pr.id}>
                  <Td>
                    <Link className="font-mono text-xs text-teal hover:underline" to={`/procurement/${pr.id}`}>
                      {pr.number}
                    </Link>
                  </Td>
                  <Td>{pr.title}</Td>
                  <Td>{pr.requester}</Td>
                  <Td className="text-right font-semibold">
                    {pr.currency} {prTotal(pr).toLocaleString()}
                  </Td>
                  <Td className="text-right">
                    <Link to={`/procurement/${pr.id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <p className="mt-3 text-sm text-slate-soft/70">
        Payments for approved PRs are recorded under{' '}
        <Link className="font-semibold text-teal hover:underline" to="/finance">
          Finance → Ledger
        </Link>
        .
      </p>
    </div>
  )
}

function NewPr() {
  const { addPurchaseRequest } = useDemo()
  const navigate = useNavigate()
  const [formSeed, setFormSeed] = useState(0)
  const [formInitial, setFormInitial] = useState<Partial<PurchaseRequest> | undefined>()

  function fillWithDummy() {
    const filled = demoToFormInitial(nextDemoPr())
    setFormInitial({
      ...filled,
      budgetLine: '',
      projectName: undefined,
    })
    setFormSeed((n) => n + 1)
  }

  return (
    <div>
      <PageHeader
        title="New purchase request"
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={fillWithDummy}
              aria-label="Fill with dummy"
              title="Fill with dummy"
              className="!px-2 !py-1 leading-none"
            >
              <span aria-hidden className="text-2xl leading-none">
                🤪
              </span>
            </Button>
            <Link to="/procurement">
              <Button variant="cancel">Cancel</Button>
            </Link>
          </>
        }
      />
      <PrFormPaper
        key={formSeed}
        mode="create"
        initial={formInitial}
        onSubmit={(data) => {
          void addPurchaseRequest(data).then(() => navigate('/procurement'))
        }}
        submitLabel="Submit purchase request"
      />
    </div>
  )
}

function NewPrBypass() {
  const { addPurchaseRequest } = useDemo()
  const navigate = useNavigate()
  const [formSeed, setFormSeed] = useState(0)
  const [formInitial, setFormInitial] = useState<Partial<PurchaseRequest> | undefined>(() =>
    demoToFormInitial(BYPASS_LAPTOP_PR_TEMPLATE),
  )
  const [budgetLine, setBudgetLine] = useState(BYPASS_LAPTOP_PR_TEMPLATE.budgetLine)
  const [projectName, setProjectName] = useState(BYPASS_LAPTOP_PR_TEMPLATE.projectName)

  function fillWithDummy() {
    const demo = nextDemoPr()
    setBudgetLine(demo.budgetLine)
    setProjectName(demo.projectName)
    setFormInitial(demoToFormInitial(demo))
    setFormSeed((n) => n + 1)
  }

  return (
    <div>
      <PageHeader
        title="New purchase request bypass"
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={fillWithDummy}
              aria-label="Fill with dummy"
              title="Fill with dummy"
              className="!px-2 !py-1 leading-none"
            >
              <span aria-hidden className="text-2xl leading-none">
                🤪
              </span>
            </Button>
            <Link to="/procurement">
              <Button variant="cancel">Cancel</Button>
            </Link>
          </>
        }
      />
      <PrFormPaper
        key={formSeed}
        mode="create"
        canAssignMeta
        bypassApproval
        initial={formInitial}
        assignedBudgetLine={budgetLine}
        assignedProjectName={projectName}
        onAssignBudgetLine={setBudgetLine}
        onAssignProjectName={setProjectName}
        onSubmit={(data) => {
          void addPurchaseRequest(data).then(() => navigate('/procurement'))
        }}
        submitLabel="Submit bypass request"
      />
    </div>
  )
}

function EditPr() {
  const { prId } = useParams()
  const navigate = useNavigate()
  const { purchaseRequests, currentUser, updatePurchaseRequest, deletePurchaseRequest } = useDemo()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pr = purchaseRequests.find((p) => p.id === prId)

  if (!pr) return <Navigate to="/procurement" replace />
  if (!canEditPr(pr, currentUser.name)) return <Navigate to={`/procurement/${pr.id}`} replace />

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePurchaseRequest(pr!.id)
      navigate('/procurement')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete purchase request.'
      setDeleteError(message.replace(/<[^>]+>/g, ' ').trim() || 'Could not delete purchase request.')
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${pr.number}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label={`Delete ${pr.number}`}
              title="Delete"
              onClick={() => {
                setDeleteError(null)
                setShowDeleteDialog(true)
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose text-white hover:bg-rose-700"
            >
              <TrashIcon />
            </button>
            <Link to="/procurement">
              <Button variant="cancel">Cancel</Button>
            </Link>
          </div>
        }
      />
      <PrFormPaper
        mode="edit"
        initial={pr}
        onSubmit={(data) => {
          void updatePurchaseRequest(pr.id, data)
            .then(() => navigate('/procurement'))
            .catch((err: unknown) => {
              window.alert(
                err instanceof Error ? err.message : 'Could not save purchase request.',
              )
            })
        }}
        submitLabel="Save purchase request"
      />
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        prNumber={pr.number}
        busy={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) {
            setShowDeleteDialog(false)
            setDeleteError(null)
          }
        }}
        onConfirm={() => {
          void confirmDelete()
        }}
      />
    </div>
  )
}

function ViewPr() {
  const { prId } = useParams()
  const navigate = useNavigate()
  const {
    purchaseRequests,
    currentUser,
    employees,
    deletePurchaseRequest,
    updatePurchaseRequest,
    updatePrStatus,
  } = useDemo()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [budgetLine, setBudgetLine] = useState('')
  const [projectName, setProjectName] = useState('')
  const [approving, setApproving] = useState(false)
  const [metaReadyFor, setMetaReadyFor] = useState<string | null>(null)

  const pr = purchaseRequests.find((p) => p.id === prId)

  if (pr && metaReadyFor !== pr.id) {
    setBudgetLine(pr.budgetLine ?? '')
    setProjectName(pr.projectName ?? '')
    setMetaReadyFor(pr.id)
  }

  if (!pr) return <Navigate to="/procurement" replace />

  const canApprove = needsMyApproval(pr, currentUser, employees)
  const canEdit = canEditPr(pr, currentUser.name)

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePurchaseRequest(pr!.id)
      navigate('/procurement')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete purchase request.'
      setDeleteError(message.replace(/<[^>]+>/g, ' ').trim() || 'Could not delete purchase request.')
      setDeleting(false)
    }
  }

  async function handleApprove() {
    if (!budgetLine.trim() || !projectName.trim()) {
      window.alert('Assign budget line and project before approving.')
      return
    }
    setApproving(true)
    try {
      await updatePurchaseRequest(pr.id, {
        title: pr.title,
        receiptDate: pr.receiptDate,
        budgetLine: budgetLine.trim(),
        projectName: projectName.trim(),
        department: pr.department,
        preliminaryExplanation: pr.preliminaryExplanation,
        currency: pr.currency,
        comments: pr.comments,
        requester: pr.requester,
        requesterPosition: pr.requesterPosition,
        requesterDate: pr.requesterDate,
        approverName: currentUser.name,
        approverPosition: currentUser.role,
        approverDate: new Date().toISOString().slice(0, 10),
        status: 'approved',
        items: pr.items,
      })
      navigate('/procurement')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not approve purchase request.')
      setApproving(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/procurement">
            <Button variant="secondary">Back to list</Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canApprove ? (
            <>
              <Button type="button" onClick={() => void handleApprove()} disabled={approving}>
                {approving ? 'Approving…' : 'Approve'}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={approving}
                onClick={() => updatePrStatus(pr.id, 'rejected')}
              >
                Reject
              </Button>
            </>
          ) : null}
          {canEdit ? (
            <>
              <Link
                to={`/procurement/${pr.id}/edit`}
                aria-label={`Edit ${pr.number}`}
                title="Edit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-mist"
              >
                <PencilIcon />
              </Link>
              <button
                type="button"
                aria-label={`Delete ${pr.number}`}
                title="Delete"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDeleteError(null)
                  setShowDeleteDialog(true)
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose text-white hover:bg-rose-700"
              >
                <TrashIcon />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <PrFormPaper
        mode="view"
        initial={pr}
        canAssignMeta={canApprove}
        assignedBudgetLine={budgetLine}
        assignedProjectName={projectName}
        onAssignBudgetLine={setBudgetLine}
        onAssignProjectName={setProjectName}
      />
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        prNumber={pr.number}
        busy={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) {
            setShowDeleteDialog(false)
            setDeleteError(null)
          }
        }}
        onConfirm={() => {
          void confirmDelete()
        }}
      />
    </div>
  )
}

function invoiceRefId(ref: string) {
  const match = ref.match(/#(\d+)(\.bb)?$/i)
  return match ? `#${match[1]}${match[2] ?? ''}` : ref
}

function ledgerPathForTxn(txn: Transaction) {
  const params = new URLSearchParams()
  if (/\.bb$/i.test(txn.invoiceRef ?? '')) params.set('view', 'bankbook')
  const month = txn.date.slice(0, 7)
  if (/^\d{4}-\d{2}$/.test(month)) params.set('month', month)
  params.set('entry', txn.id)
  const qs = params.toString()
  return qs ? `/finance?${qs}` : '/finance'
}

function formatLedgerDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return value
  return `${match[3]}-${match[2]}-${match[1]}`
}

function formatLedgerWeekday(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return ''
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function LedgerDateCell({ value }: { value: string }) {
  const weekday = formatLedgerWeekday(value)
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{formatLedgerDate(value)}</span>
      {weekday ? <span className="text-[11px] font-normal opacity-70">{weekday}</span> : null}
    </span>
  )
}

function LedgerDebitCell({ amount, currency }: { amount: number; currency: PrCurrency }) {
  if (!amount) {
    return <span className="block text-center opacity-50">—</span>
  }
  const unit = currency === 'USD' ? '$' : currency
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (
    <div className="flex w-full flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 tabular-nums">
      <span className="shrink-0 text-left">{unit}</span>
      <span className="min-w-0 max-w-full text-right break-all">{formatted}</span>
    </div>
  )
}

function PrExhaustion() {
  const { prId } = useParams()
  const { purchaseRequests, transactions, suppliers } = useDemo()
  const pr = purchaseRequests.find((p) => p.id === prId)

  const linked = useMemo(() => {
    if (!pr) return []
    return transactions
      .filter((txn) => txn.purchaseRequestId === pr.id)
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date)
        if (byDate !== 0) return byDate
        return (a.invoiceRef ?? '').localeCompare(b.invoiceRef ?? '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
  }, [pr, transactions])

  if (!pr) return <Navigate to="/procurement" replace />

  return (
    <div>
      <PageHeader
        title="Exhaustion of entries"
        actions={
          <Link to="/procurement">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <Panel title={`${pr.number} — ${pr.title}`}>
        {linked.length === 0 ? (
          <p className="text-sm text-slate-soft/70">No cashbook or bankbook entries linked to this PR.</p>
        ) : (
          <Table className="[&_th]:align-middle [&_th]:whitespace-normal [&_td]:align-middle [&_td]:whitespace-normal [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-line [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-line/70 [&_tbody>tr:nth-child(even)]:bg-slate-100 [&_tbody>tr:nth-child(odd)]:bg-white">
            <thead>
              <tr>
                <Th className="!bg-slate-200 !text-slate-600 text-center">Ref</Th>
                <Th className="!bg-slate-200 !text-slate-600 text-center">Date</Th>
                <Th className="!bg-slate-200 !text-slate-600">Description</Th>
                <Th className="!bg-slate-200 !text-slate-600 text-center">Debit USD</Th>
                <Th className="!bg-slate-200 !text-slate-600 text-center">Debit IQD</Th>
                <Th className="!bg-slate-200 !text-slate-600 text-center">Supplier</Th>
              </tr>
            </thead>
            <tbody>
              {linked.map((txn) => {
                const supplier = suppliers.find((s) => s.id === txn.supplierId)
                const usdDebit = txn.currency === 'USD' ? txn.debit : 0
                const iqdDebit = txn.currency === 'IQD' ? txn.debit : 0
                return (
                  <tr key={txn.id}>
                    <Td className="text-center font-mono text-xs">
                      {txn.invoiceRef ? (
                        <Link
                          to={ledgerPathForTxn(txn)}
                          className="font-mono text-teal hover:underline"
                          title={txn.invoiceRef}
                        >
                          {invoiceRefId(txn.invoiceRef)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-center">
                      <LedgerDateCell value={txn.date} />
                    </Td>
                    <Td>{txn.description || '—'}</Td>
                    <Td className="!text-rose">
                      <LedgerDebitCell amount={usdDebit} currency="USD" />
                    </Td>
                    <Td className="!text-rose">
                      <LedgerDebitCell amount={iqdDebit} currency="IQD" />
                    </Td>
                    <Td className="text-center">{supplier?.name ?? '—'}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

export function ProcurementPage() {
  return (
    <Routes>
      <Route index element={<PrList />} />
      <Route path="approvals" element={<PrApprovals />} />
      <Route path="new" element={<NewPr />} />
      <Route path="new-bypass" element={<NewPrBypass />} />
      <Route path=":prId/exhaustion" element={<PrExhaustion />} />
      <Route path=":prId/edit" element={<EditPr />} />
      <Route path=":prId" element={<ViewPr />} />
      <Route path="*" element={<Navigate to="/procurement" replace />} />
    </Routes>
  )
}
