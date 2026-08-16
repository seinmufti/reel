import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { FormProcedureBar } from '../../components/ui/FormProcedureMark'
import { RejectReasonDialog } from '../../components/ui/RejectReasonDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { PersonAvatar, hashSeed } from '../../components/ui/PersonAvatar'
import { SignatureStatusAvatars } from '../../components/ui/SignatureStatusAvatars'
import { dashboardPath, goAfterFormAction, prDashboardQueueId, prRequestorHref } from '../../lib/dashboardFocus'
import {
  computePrSuggestionDiff,
  diffHighlightClass,
  prToSuggestionSnapshot,
  type LineCellKey,
} from '../../lib/prSuggestionDiff'
import { needsPrFinanceApproval, needsPrLmApproval, prFinanceRejected, prLmRejected, prSignatureSlots } from '../../lib/signatureSlots'
import { SignatureFieldColumn } from '../../components/ui/SignatureMark'
import { Table, Td, Th } from '../../components/ui/Table'
import { useDemo } from '../../context/DemoContext'
import { formatDate, formatMoney, prTotal, userCanAccessPath } from '../../data/mockData'
import type { Employee, PrCurrency, PrItem, PrStatus, PrSuggestionSnapshot, PurchaseRequest, Transaction } from '../../types'

const slotClass =
  'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] outline-none transition hover:border-slate-soft/40 focus:border-teal focus:shadow-[0_0_0_1px_var(--color-teal)]'

const lockedSlotClass = `${slotClass} !bg-sky-50 text-sky-900/70 placeholder:text-xs placeholder:text-sky-700/45`

const fieldLabel = (text: string, hint?: 'required' | 'optional', compact = false) => (
  <div className={`font-semibold leading-tight text-ink/80 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
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

function nowStamp() {
  return new Date().toISOString()
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

function prDraftEditPath(pr: PurchaseRequest) {
  return prRequestorHref(pr)
}

function PrFormPaper({
  mode,
  initial,
  onSubmit,
  submitLabel,
  bypassApproval = false,
  assignedBudgetLine,
  assignedProjectName,
  onAssignBudgetLine,
  onAssignProjectName,
  onLineManagerSign,
  lineManagerSigning = false,
  onFinanceSign,
  financeSigning = false,
  onReject,
  onSuggestEdit,
  compareBaseline,
  compareAfter,
  compareSide,
  showSignatures = true,
  containerClassName,
}: {
  mode: 'create' | 'edit' | 'view' | 'suggest' | 'editSuggestion'
  initial?: Partial<PurchaseRequest>
  onSubmit?: (data: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>) => void
  submitLabel?: string
  /** Create as approved without line-manager workflow */
  bypassApproval?: boolean
  assignedBudgetLine?: string
  assignedProjectName?: string
  onAssignBudgetLine?: (value: string) => void
  onAssignProjectName?: (value: string) => void
  onLineManagerSign?: () => void
  lineManagerSigning?: boolean
  onFinanceSign?: () => void
  financeSigning?: boolean
  onReject?: () => void
  onSuggestEdit?: () => void
  compareBaseline?: PrSuggestionSnapshot
  compareAfter?: PrSuggestionSnapshot
  compareSide?: 'before' | 'after'
  showSignatures?: boolean
  containerClassName?: string
}) {
  const { currentUser, employees, purchaseRequests, departments, currencies, budgetLines, prProjects } = useDemo()
  const readOnly = mode === 'view' || compareSide === 'before'
  const today = new Date().toISOString().slice(0, 10)
  const signedAt = initial?.requesterDate ?? nowStamp()
  const previewNumber = initial?.number ?? nextPreviewPrNumber(purchaseRequests)
  const compareControlled = compareSide === 'after'
  const departmentOptions =
    currentUser.departments.length > 0 ? currentUser.departments : departments
  const defaultDepartment =
    (initial?.department && departmentOptions.includes(initial.department)
      ? initial.department
      : departmentOptions[0]) ?? ''
  const [lines, setLines] = useState<PrItem[]>(() => {
    if (compareSide === 'before' && compareBaseline?.items?.length) {
      return compareBaseline.items.map((item) => ({ ...item }))
    }
    return initial?.items?.length ? initial.items.map((item) => ({ ...item })) : [emptyLine('1')]
  })
  const [department, setDepartment] = useState(defaultDepartment)
  const [preliminaryExplanation, setPreliminaryExplanation] = useState(
    initial?.preliminaryExplanation ?? initial?.title ?? '',
  )
  const [comments, setComments] = useState(initial?.comments ?? '')

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0), 0),
    [lines],
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
  const budgetLineRef = useRef<HTMLSelectElement>(null)
  const projectNameRef = useRef<HTMLSelectElement>(null)

  const requester =
    employees.find((e) => e.name === (initial?.requester ?? currentUser.name)) ?? currentUser
  const requesterManager = employees.find((e) => e.id === requester.managerId)
  const financeSigner = financeEmployee(employees, requester.id)
  const financeCanActOnPr =
    Boolean(initial) &&
    needsPrFinanceApproval(initial as PurchaseRequest, currentUser.id, employees)
  /** Only the finance signer may set budget line and project. */
  const canAssignMeta =
    Boolean(financeSigner && financeSigner.id === currentUser.id) &&
    (mode === 'suggest' || (bypassApproval && mode !== 'view')
      ? true
      : mode === 'view' && financeCanActOnPr)
  const budgetValue = canAssignMeta ? (assignedBudgetLine ?? '') : (initial?.budgetLine ?? '')
  const projectValue = canAssignMeta ? (assignedProjectName ?? '') : (initial?.projectName ?? '')

  const compareDiff = useMemo(() => {
    if (!compareBaseline || !compareSide) return null
    const afterSnapshot =
      compareSide === 'before'
        ? (compareAfter ??
          prToSuggestionSnapshot({
            department: initial?.department ?? '',
            preliminaryExplanation: initial?.preliminaryExplanation ?? initial?.title ?? '',
            comments: initial?.comments,
            currency: initial?.currency ?? 'USD',
            budgetLine: initial?.budgetLine ?? '',
            projectName: initial?.projectName,
            items: initial?.items ?? [],
          }))
        : prToSuggestionSnapshot({
            department: compareControlled ? department : (initial?.department ?? ''),
            preliminaryExplanation: compareControlled
              ? preliminaryExplanation
              : (initial?.preliminaryExplanation ?? initial?.title ?? ''),
            comments: compareControlled ? comments : initial?.comments,
            currency,
            budgetLine: budgetValue,
            projectName: projectValue,
            items: lines,
          })
    return computePrSuggestionDiff(compareBaseline, afterSnapshot)
  }, [
    compareBaseline,
    compareSide,
    compareAfter,
    compareControlled,
    department,
    preliminaryExplanation,
    comments,
    currency,
    budgetValue,
    projectValue,
    lines,
    initial,
  ])

  function fieldHighlight(key: string) {
    if (!compareDiff || !compareSide) return ''
    return diffHighlightClass(compareDiff.fields[key], compareSide)
  }

  function lineCellHighlight(lineId: string, cell: LineCellKey) {
    if (!compareDiff || !compareSide) return ''
    const cellTone = compareDiff.lineCells[lineId]?.[cell]
    return diffHighlightClass(cellTone, compareSide)
  }

  function updateLine(id: string, patch: Partial<PrItem>) {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onSubmit) return
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    let status = (submitter?.value === 'draft' ? 'draft' : 'submitted') as PrStatus
    if (mode === 'suggest') {
      status = 'draft'
    }
    if (mode === 'edit' && initial) {
      if (submitter?.value === 'draft') {
        status = 'draft'
      } else if (initial.status === 'approved' || initial.status === 'ordered') {
        status = initial.status
      }
    }
    if (mode === 'editSuggestion') {
      status = 'submitted'
    }
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
    const preliminary = compareControlled
      ? preliminaryExplanation.trim()
      : String(new FormData(e.currentTarget).get('preliminaryExplanation')).trim()
    const firstDesc = filled[0]?.description.slice(0, 80) ?? 'Draft purchase request'
    onSubmit({
      title: preliminary || firstDesc,
      receiptDate: initial?.receiptDate ?? today,
      budgetLine,
      projectName: projectName || undefined,
      department: compareControlled ? department : String(new FormData(e.currentTarget).get('department')),
      preliminaryExplanation: preliminary,
      currency,
      comments: (compareControlled ? comments : String(new FormData(e.currentTarget).get('comments') || '')).trim() || undefined,
      requester: (initial?.requester ?? currentUser.name).trim(),
      requesterPosition: (initial?.requesterPosition ?? currentUser.role).trim(),
      requesterDate: initial?.requesterDate ?? nowStamp(),
      ...(status === 'approved'
        ? {
            approverName:
              mode === 'edit' && initial?.approverName ? initial.approverName : currentUser.name,
            approverPosition:
              mode === 'edit' && initial?.approverPosition
                ? initial.approverPosition
                : currentUser.role,
            approverDate:
              mode === 'edit' && initial?.approverDate ? initial.approverDate : nowStamp(),
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

  const lineManagerVacant = !requesterManager && !initial?.approverName
  const canLineManagerAct =
    readOnly &&
    initial?.status === 'submitted' &&
    Boolean(requesterManager && requesterManager.id === currentUser.id) &&
    !initial?.approverName
  const canSignFinance = readOnly && financeCanActOnPr
  const financeRejected = initial ? prFinanceRejected(initial as PurchaseRequest) : false
  const lmRejected = initial ? prLmRejected(initial as PurchaseRequest) : false

  function reportFinanceMetaValidity(): boolean {
    if (!canAssignMeta) return true
    const budget = budgetLineRef.current
    const project = projectNameRef.current
    if (budget && !budget.reportValidity()) {
      budget.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    if (project && !project.reportValidity()) {
      project.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  function handleFinanceTap() {
    if (!onFinanceSign) return
    if (!reportFinanceMetaValidity()) return
    onFinanceSign()
  }
  const compactMeta = Boolean(compareSide)
  const metaSizeClass = compactMeta ? 'text-xs px-1.5 py-1' : ''
  const metaInputClass = `${slotClass} min-w-0 max-w-full truncate ${metaSizeClass}`
  const metaLockedClass = `${lockedSlotClass} min-w-0 max-w-full truncate ${metaSizeClass}`
  const headerMetaGridClass = compactMeta
    ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.65fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)]'
    : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.65fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)]'

  return (
    <div className={`relative mx-auto w-full overflow-visible ${containerClassName ?? 'max-w-5xl'}`}>
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col overflow-visible rounded-lg border-2 border-ink/20 bg-[#fbfcfd] shadow-sm"
    >
      <div className="border-b-2 border-ink/15 bg-teal-soft/30 px-4 py-3 text-center">
        <h2 className="font-display text-xl font-bold text-ink">Purchase request</h2>
      </div>

      <div className={`flex flex-col p-4 md:p-6 ${showSignatures ? 'min-h-[calc(100vh-11rem)]' : ''}`}>
        <div className="flex flex-1 flex-col space-y-4">
        {/* Header meta slots */}
        <div className={headerMetaGridClass}>
          <label className="block min-w-0 space-y-1">
            {fieldLabel('Date of PR receipt', undefined, compactMeta)}
            <input
              className={metaLockedClass}
              type="date"
              name="receiptDate"
              value={initial?.receiptDate ?? today}
              disabled
            />
          </label>
          <label className="block min-w-0 space-y-1">
            {fieldLabel('PR #', undefined, compactMeta)}
            <input className={metaLockedClass} readOnly disabled value={previewNumber} />
          </label>
          <label className={`block min-w-0 space-y-1 rounded-md p-0.5 ${fieldHighlight('budgetLine')}`}>
            {fieldLabel('Budget line', canAssignMeta ? 'required' : undefined, compactMeta)}
            {canAssignMeta ? (
              <select
                ref={budgetLineRef}
                className={metaInputClass}
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
                className={metaLockedClass}
                name="budgetLine"
                readOnly
                disabled
                value={budgetValue}
                placeholder="Assigned by Finance"
              />
            )}
          </label>
          <label className={`block min-w-0 space-y-1 rounded-md p-0.5 ${fieldHighlight('projectName')}`}>
            {fieldLabel('Project', canAssignMeta ? 'required' : undefined, compactMeta)}
            {canAssignMeta ? (
              <select
                ref={projectNameRef}
                className={metaInputClass}
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
                className={metaLockedClass}
                name="projectName"
                readOnly
                disabled
                value={projectValue}
                placeholder="Assigned by Finance"
              />
            )}
          </label>
          <label className={`block min-w-0 space-y-1 rounded-md p-0.5 ${fieldHighlight('department')}`}>
            {fieldLabel('Department', readOnly ? undefined : 'required', compactMeta)}
            {readOnly ? (
              <input
                className={metaInputClass}
                readOnly
                value={compareControlled ? department : (initial?.department ?? '')}
              />
            ) : (
              <select
                className={metaInputClass}
                name="department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>

        {/* Preliminary explanation */}
        <label className={`block space-y-1 rounded-md p-0.5 ${fieldHighlight('preliminaryExplanation')}`}>
          {fieldLabel(
            'Preliminary explanation (reason, place and time of delivery)',
            readOnly ? undefined : 'required',
          )}
          <textarea
            className={`${slotClass} min-h-[4.5rem]`}
            name="preliminaryExplanation"
            required={!readOnly}
            readOnly={readOnly}
            value={compareControlled || readOnly ? preliminaryExplanation : undefined}
            defaultValue={compareControlled || readOnly ? undefined : (initial?.preliminaryExplanation ?? initial?.title ?? '')}
            onChange={compareControlled ? (e) => setPreliminaryExplanation(e.target.value) : undefined}
            placeholder="Reason, place and time of delivery"
          />
        </label>

        {/* Line items */}
        <div className="overflow-x-auto rounded border border-ink/15">
          <table className="min-w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
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
                    <td className={`border border-line p-1 ${lineCellHighlight(line.id, 'description')}`}>
                      <textarea
                        className={`${slotClass} min-h-[2.5rem] border-0 bg-transparent`}
                        readOnly={readOnly}
                        required={index === 0 && !readOnly}
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Item details"
                      />
                    </td>
                    <td className={`border border-line p-1 text-center ${lineCellHighlight(line.id, 'quantity')}`}>
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
                    <td className={`border border-line p-1 text-center ${lineCellHighlight(line.id, 'unitCost')}`}>
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
                    <td className={`border border-line px-2 py-1 text-right text-sm font-normal tabular-nums ${lineCellHighlight(line.id, 'total')}`}>
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
                <td className={`border-0 bg-transparent px-1 py-4 text-center align-middle ${fieldHighlight('currency')}`}>
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

        <label className={`block space-y-1 rounded-md p-0.5 ${fieldHighlight('comments')}`}>
          {fieldLabel('Comments & requirements', 'optional')}
          <textarea
            className={`${slotClass} min-h-[3.5rem]`}
            name="comments"
            readOnly={readOnly}
            value={compareControlled || readOnly ? comments : undefined}
            defaultValue={compareControlled || readOnly ? undefined : (initial?.comments ?? '')}
            onChange={compareControlled ? (e) => setComments(e.target.value) : undefined}
          />
        </label>

        {showSignatures ? (
        <div className="relative pb-6 pt-[calc(1.5rem+11vh)]">
          <div className="grid gap-8 sm:grid-cols-3 sm:items-stretch">
          <SignatureFieldColumn
            label="Requestor"
            name={initial?.requester ?? currentUser.name}
            position={initial?.requesterPosition ?? currentUser.role}
            signed
            date={initial?.requesterDate ?? signedAt}
            signature={requester.signature ?? currentUser.signature}
          />
          <SignatureFieldColumn
            label="Line manager"
            name={
              lineManagerVacant
                ? ''
                : (initial?.approverName ?? requesterManager?.name)
            }
            position={
              lineManagerVacant
                ? ''
                : (initial?.approverPosition ?? requesterManager?.role)
            }
            signed={!lineManagerVacant && Boolean(initial?.approverName)}
            date={
              lineManagerVacant
                ? undefined
                : lmRejected
                  ? initial?.rejectedAt
                  : initial?.approverDate
            }
            vacant={lineManagerVacant}
            onTapToSign={canLineManagerAct ? onLineManagerSign : undefined}
            tapBusy={lineManagerSigning}
            rejectedStamp={!lineManagerVacant && lmRejected}
            rejectionReason={lmRejected ? initial?.rejectionReason : undefined}
            signature={
              lineManagerVacant
                ? undefined
                : employees.find((e) => e.name === (initial?.approverName ?? requesterManager?.name))
                    ?.signature
            }
          />
          <SignatureFieldColumn
            label="Finance"
            name={financeSigner?.name}
            position={financeSigner?.role}
            signed={Boolean(initial?.financeSignedBy)}
            date={financeRejected ? initial?.rejectedAt : initial?.financeSignedAt}
            signature={financeSigner?.signature}
            onTapToSign={canSignFinance ? handleFinanceTap : undefined}
            tapBusy={financeSigning}
            rejectedStamp={financeRejected}
            rejectionReason={financeRejected ? initial?.rejectionReason : undefined}
          />
          </div>
        </div>
        ) : null}
        </div>

        {!readOnly ? (
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
            <Link
              to={
                mode === 'editSuggestion' && initial?.id
                  ? dashboardPath(prDashboardQueueId(initial.id, 'draft'))
                  : mode === 'suggest' && initial?.id
                    ? `/procurement/${initial.id}`
                    : '/procurement'
              }
            >
              <Button type="button" variant="cancel">
                Cancel
              </Button>
            </Link>
            <div className="flex flex-wrap items-end gap-3">
              {mode === 'suggest' || mode === 'editSuggestion' ? null : (
                <Button type="submit" name="intent" value="draft" variant="secondary" formNoValidate>
                  Save as draft
                </Button>
              )}
              <Button type="submit" name="intent" value="submitted">
                {submitLabel ?? (mode === 'suggest' ? 'Submit' : mode === 'editSuggestion' ? 'Resubmit purchase request' : 'Submit purchase request')}
              </Button>
            </div>
          </div>
        ) : (onReject || (onSuggestEdit && canLineManagerAct)) && (canLineManagerAct || canSignFinance) ? (
          <div className="mt-auto flex justify-end gap-3 border-t border-line pt-4">
            {onSuggestEdit && canLineManagerAct ? (
              <Button
                type="button"
                variant="blue"
                disabled={lineManagerSigning || financeSigning}
                onClick={onSuggestEdit}
              >
                Suggest Edit
              </Button>
            ) : null}
            {onReject ? (
              <Button
                type="button"
                variant="danger"
                disabled={lineManagerSigning || financeSigning}
                onClick={onReject}
              >
                Reject
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
    </div>
  )
}

function canEditPr(_pr: PurchaseRequest, _currentUserName: string) {
  return true
}

function financeEmployee(employees: Employee[], excludeId?: string) {
  const inFinance = employees.filter((e) => e.departments.includes('Finance') && e.id !== excludeId)
  const dedicated = inFinance.filter((e) => e.departments.length === 1)
  return dedicated[0] ?? inFinance.find((e) => !e.isAdmin) ?? inFinance[0]
}

/** Submitted PRs from this user's direct reports (line-director approval inbox). */
function needsMyApproval(pr: PurchaseRequest, currentUser: Employee, employees: Employee[]) {
  return needsPrLmApproval(pr, currentUser.id, employees)
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

function projectTagClass(projectName: string, _knownProjects: string[]) {
  const index = hashSeed(projectName)
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
  showSpendColumns = true,
  showRejectionColumn = false,
}: {
  rows: PurchaseRequest[]
  currentUserName: string
  transactions: Transaction[]
  employees: Employee[]
  projects: string[]
  showSpendColumns?: boolean
  showRejectionColumn?: boolean
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-soft/70">None.</p>
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Number</Th>
          <Th>Subject</Th>
          {showRejectionColumn ? <Th>Rejection message</Th> : null}
          <Th>Department</Th>
          <Th>Project</Th>
          <Th className="text-right">Total</Th>
          {showSpendColumns ? (
            <>
              <Th className="text-right">Exhausted</Th>
              <Th className="text-right">Remaining</Th>
            </>
          ) : null}
          <Th>Signatures</Th>
          <Th className="w-14" />
        </tr>
      </thead>
      <tbody>
        {rows.map((pr) => {
          const total = prTotal(pr)
          const exhausted = prExhausted(pr, transactions)
          const remaining = total - exhausted
          return (
            <tr key={pr.id}>
              <Td>
                <Link className="font-mono text-xs font-semibold text-teal hover:underline" to={`/procurement/${pr.id}`}>
                  {pr.number}
                </Link>
              </Td>
              <Td className="max-w-[16rem] whitespace-normal break-words">{pr.title}</Td>
              {showRejectionColumn ? (
                <Td className="max-w-[20rem] whitespace-normal break-words text-slate-soft">
                  {pr.rejectionReason?.trim() || '—'}
                </Td>
              ) : null}
              <Td>{pr.department}</Td>
              <Td>
                {pr.projectName ? (
                  <ProjectTag name={pr.projectName} knownProjects={projects} />
                ) : (
                  '—'
                )}
              </Td>
              <Td className="text-right font-semibold">{formatPrAmount(pr.currency, total)}</Td>
              {showSpendColumns ? (
                <>
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
                </>
              ) : null}
              <Td className="overflow-visible">
                <SignatureStatusAvatars slots={prSignatureSlots(pr, employees)} />
              </Td>
              <Td className="relative z-10 text-right">
                {pr.status === 'submitted' || pr.status === 'rejected' ? (
                  <Link to={`/procurement/${pr.id}`}>
                    <Button variant="secondary">View</Button>
                  </Link>
                ) : canEditPr(pr, currentUserName) ? (
                  <Link
                    to={prDraftEditPath(pr)}
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
  const {
    purchaseRequests,
    currentUser,
    employees,
    transactions,
    prProjects,
  } = useDemo()

  const drafts = useMemo(
    () =>
      purchaseRequests.filter(
        (pr) => pr.status === 'draft' && pr.requester === currentUser.name,
      ),
    [purchaseRequests, currentUser.name],
  )

  const toReview = useMemo(
    () => purchaseRequests.filter((pr) => needsMyApproval(pr, currentUser, employees)),
    [purchaseRequests, currentUser, employees],
  )

  const pendingApproval = useMemo(
    () =>
      purchaseRequests.filter(
        (pr) => pr.status === 'submitted' && !needsMyApproval(pr, currentUser, employees),
      ),
    [purchaseRequests, currentUser, employees],
  )

  const approved = useMemo(
    () => purchaseRequests.filter((pr) => pr.status === 'approved' || pr.status === 'ordered'),
    [purchaseRequests],
  )
  const rejected = useMemo(
    () => purchaseRequests.filter((pr) => pr.status === 'rejected'),
    [purchaseRequests],
  )
  const isLineManager =
    employees.some((e) => e.managerId === currentUser.id) || toReview.length > 0

  return (
    <div>
      <PageHeader
        title="Procurement"
        actions={
          <Link to="/procurement/new">
            <Button>New purchase request</Button>
          </Link>
        }
      />

      <div className="space-y-5">
        {drafts.length > 0 ? (
          <Panel title={`Drafts (${drafts.length})`}>
            <PrTable
              rows={drafts}
              currentUserName={currentUser.name}
              transactions={transactions}
              employees={employees}
              projects={prProjects}
            />
          </Panel>
        ) : null}

        {isLineManager ? (
          <Panel title={`To Review (${toReview.length})`}>
            <PrTable
              rows={toReview}
              currentUserName={currentUser.name}
              transactions={transactions}
              employees={employees}
              projects={prProjects}
            />
          </Panel>
        ) : null}

        <Panel title={`Pending approvals (${pendingApproval.length})`}>
          <PrTable
            rows={pendingApproval}
            currentUserName={currentUser.name}
            transactions={transactions}
            employees={employees}
            projects={prProjects}
            showSpendColumns={false}
          />
        </Panel>

        <Panel title={`Rejected (${rejected.length})`}>
          <PrTable
            rows={rejected}
            currentUserName={currentUser.name}
            transactions={transactions}
            employees={employees}
            projects={prProjects}
            showSpendColumns={false}
            showRejectionColumn
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
  const { addPurchaseRequest, currentUser } = useDemo()
  const navigate = useNavigate()
  const [formSeed, setFormSeed] = useState(0)
  const [formInitial, setFormInitial] = useState<Partial<PurchaseRequest> | undefined>()
  const afterSavePath = userCanAccessPath(currentUser.departments, '/procurement')
    ? '/procurement'
    : '/'

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
      <FormProcedureBar
        mode="create"
        left={
          <Link to={afterSavePath}>
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
        right={
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
        }
      />
      <PrFormPaper
        key={formSeed}
        mode="create"
        initial={formInitial}
        onSubmit={(data) => {
          void addPurchaseRequest(data).then((created) => {
            if (data.status === 'draft') {
              navigate(afterSavePath)
              return
            }
            goAfterFormAction(
              navigate,
              dashboardPath(
                prDashboardQueueId(created.id, created.status, created.financeSignedBy),
              ),
            )
          })
        }}
        submitLabel="Submit purchase request"
      />
    </div>
  )
}

function NewPrBypass() {
  const { addPurchaseRequest, currentUser } = useDemo()
  const navigate = useNavigate()
  const [formSeed, setFormSeed] = useState(0)
  const [formInitial, setFormInitial] = useState<Partial<PurchaseRequest> | undefined>(() =>
    demoToFormInitial(BYPASS_LAPTOP_PR_TEMPLATE),
  )
  const [budgetLine, setBudgetLine] = useState(BYPASS_LAPTOP_PR_TEMPLATE.budgetLine)
  const [projectName, setProjectName] = useState(BYPASS_LAPTOP_PR_TEMPLATE.projectName)
  const afterSavePath = userCanAccessPath(currentUser.departments, '/procurement')
    ? '/procurement'
    : '/'

  function fillWithDummy() {
    const demo = nextDemoPr()
    setBudgetLine(demo.budgetLine)
    setProjectName(demo.projectName)
    setFormInitial(demoToFormInitial(demo))
    setFormSeed((n) => n + 1)
  }

  return (
    <div>
      <FormProcedureBar
        mode="create"
        left={
          <Link to={afterSavePath}>
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
        right={
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
        }
      />
      <PrFormPaper
        key={formSeed}
        mode="create"
        bypassApproval
        initial={formInitial}
        assignedBudgetLine={budgetLine}
        assignedProjectName={projectName}
        onAssignBudgetLine={setBudgetLine}
        onAssignProjectName={setProjectName}
        onSubmit={(data) => {
          void addPurchaseRequest(data).then((created) => {
            goAfterFormAction(
              navigate,
              dashboardPath(
                prDashboardQueueId(created.id, created.status, created.financeSignedBy),
              ),
            )
          })
        }}
        submitLabel="Submit bypass request"
      />
    </div>
  )
}

function EditPr() {
  const { prId } = useParams()
  const navigate = useNavigate()
  const { purchaseRequests, currentUser, updatePurchaseRequest, deletePurchaseRequest, ready } = useDemo()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pr = purchaseRequests.find((p) => p.id === prId)

  if (!ready) return null
  if (!pr) return <Navigate to="/procurement" replace />
  if (pr.status === 'draft' && pr.requester !== currentUser.name) {
    return <Navigate to="/procurement" replace />
  }
  if (!canEditPr(pr, currentUser.name)) return <Navigate to={`/procurement/${pr.id}`} replace />
  if (pr.status === 'draft' && pr.suggestionBaseline) {
    return <Navigate to={`/procurement/${pr.id}/edit-suggestion`} replace />
  }
  if (pr.status !== 'draft') {
    return <Navigate to={`/procurement/${pr.id}`} replace />
  }

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
      <FormProcedureBar
        mode={pr.status === 'draft' ? 'create' : 'edit'}
        left={
          <Link to="/procurement">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
        right={
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
        }
      />
      <PrFormPaper
        mode="edit"
        initial={pr}
        onSubmit={(data) => {
          const next =
            pr.status === 'draft' && data.status === 'submitted'
              ? { ...data, requesterDate: nowStamp() }
              : data
          void updatePurchaseRequest(pr.id, next)
            .then(() => {
              if (next.status === 'draft') {
                navigate(dashboardPath(prDashboardQueueId(pr.id, 'draft')))
                return
              }
              goAfterFormAction(
                navigate,
                dashboardPath(prDashboardQueueId(pr.id, next.status, pr.financeSignedBy)),
              )
            })
            .catch((err: unknown) => {
              window.alert(
                err instanceof Error ? err.message : 'Could not save purchase request.',
              )
            })
        }}
        submitLabel="Submit"
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
    updatePurchaseRequest,
    updatePrStatus,
    ready,
  } = useDemo()
  const [budgetLine, setBudgetLine] = useState('')
  const [projectName, setProjectName] = useState('')
  const [approving, setApproving] = useState(false)
  const [financeSigning, setFinanceSigning] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [metaReadyFor, setMetaReadyFor] = useState<string | null>(null)

  const pr = purchaseRequests.find((p) => p.id === prId)

  if (pr && metaReadyFor !== pr.id) {
    setBudgetLine(pr.budgetLine ?? '')
    setProjectName(pr.projectName ?? '')
    setMetaReadyFor(pr.id)
  }

  if (!ready) return null
  if (!pr) return <Navigate to="/procurement" replace />
  if (pr.status === 'draft' && pr.requester !== currentUser.name) {
    return <Navigate to="/procurement" replace />
  }
  if (
    pr.status === 'draft' &&
    pr.suggestionBaseline &&
    pr.requester === currentUser.name
  ) {
    return <Navigate to={`/procurement/${pr.id}/edit-suggestion`} replace />
  }

  const canApprove = needsMyApproval(pr, currentUser, employees)
  const canSignFinance = needsPrFinanceApproval(pr, currentUser.id, employees)
  const canAct = canApprove || canSignFinance

  function prUpdate(
    extra: Partial<Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>>,
  ) {
    return {
      title: pr.title,
      receiptDate: pr.receiptDate,
      budgetLine: budgetLine.trim(),
      projectName: projectName.trim() || undefined,
      department: pr.department,
      preliminaryExplanation: pr.preliminaryExplanation,
      currency: pr.currency,
      comments: pr.comments,
      requester: pr.requester,
      requesterPosition: pr.requesterPosition,
      requesterDate: pr.requesterDate,
      approverName: pr.approverName,
      approverPosition: pr.approverPosition,
      approverDate: pr.approverDate,
      rejectionReason: pr.rejectionReason,
      rejectedBy: pr.rejectedBy,
      rejectedAt: pr.rejectedAt,
      status: pr.status,
      items: pr.items,
      ...extra,
    }
  }

  async function persistFinanceMeta(nextBudget: string, nextProject: string) {
    setBudgetLine(nextBudget)
    setProjectName(nextProject)
    try {
      await updatePurchaseRequest(
        pr.id,
        prUpdate({
          budgetLine: nextBudget.trim(),
          projectName: nextProject.trim() || undefined,
        }),
      )
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save budget line and project.')
    }
  }

  function handleLmSign() {
    setApproving(true)
    updatePrStatus(pr.id, 'submitted', {
      signSlot: 'lm',
      approverName: currentUser.name,
      approverPosition: currentUser.role,
      approverDate: nowStamp(),
    })
      .then(() => goAfterFormAction(navigate, dashboardPath(prDashboardQueueId(pr.id, 'submitted'))))
      .finally(() => setApproving(false))
  }

  function handleFinanceSign() {
    if (!budgetLine.trim() || !projectName.trim()) return
    setFinanceSigning(true)
    updatePrStatus(pr.id, 'submitted', {
      signSlot: 'finance',
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
    })
      .then(() =>
        goAfterFormAction(
          navigate,
          dashboardPath(prDashboardQueueId(pr.id, 'approved', currentUser.name)),
        ),
      )
      .catch((err) => {
        window.alert(err instanceof Error ? err.message : 'Could not sign purchase request.')
      })
      .finally(() => setFinanceSigning(false))
  }

  return (
    <div>
      <FormProcedureBar
        mode={canAct ? 'review' : 'view'}
        left={
          <Link to="/procurement">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <PrFormPaper
        mode="view"
        initial={pr}
        assignedBudgetLine={budgetLine}
        assignedProjectName={projectName}
        onAssignBudgetLine={(value) => void persistFinanceMeta(value, projectName)}
        onAssignProjectName={(value) => void persistFinanceMeta(budgetLine, value)}
        onLineManagerSign={handleLmSign}
        lineManagerSigning={approving}
        onFinanceSign={handleFinanceSign}
        financeSigning={financeSigning}
        onReject={canAct ? () => setShowRejectDialog(true) : undefined}
        onSuggestEdit={canApprove ? () => navigate(`/procurement/${pr.id}/suggest`) : undefined}
      />
      <RejectReasonDialog
        key={showRejectDialog ? 'open' : 'closed'}
        open={showRejectDialog}
        busy={rejecting}
        onCancel={() => {
          if (!rejecting) setShowRejectDialog(false)
        }}
        onConfirm={(reason) => {
          setRejecting(true)
          const extra = {
            rejectionReason: reason,
            rejectedBy: currentUser.name,
            rejectedAt: new Date().toISOString(),
            status: 'rejected' as const,
          }
          void updatePurchaseRequest(pr.id, prUpdate(extra))
            .then(() => updatePrStatus(pr.id, 'rejected', extra))
            .then(() => {
              setShowRejectDialog(false)
              setRejecting(false)
              goAfterFormAction(navigate, dashboardPath(prDashboardQueueId(pr.id, 'rejected')))
            })
            .catch((err) => {
              window.alert(err instanceof Error ? err.message : 'Could not reject purchase request.')
              setRejecting(false)
            })
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
  return formatDate(value)
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
  const { purchaseRequests, transactions, suppliers, ready } = useDemo()
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

  if (!ready) return null
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

function EditSuggestionPr() {
  const { prId } = useParams()
  const navigate = useNavigate()
  const { purchaseRequests, currentUser, updatePurchaseRequest, ready } = useDemo()
  const pr = purchaseRequests.find((p) => p.id === prId)

  if (!ready) return null
  if (!pr) return <Navigate to="/procurement" replace />
  if (!pr.suggestionBaseline) return <Navigate to={`/procurement/${pr.id}`} replace />
  if (pr.status !== 'draft' || pr.requester !== currentUser.name) {
    return <Navigate to={`/procurement/${pr.id}`} replace />
  }

  const baseline = pr.suggestionBaseline
  const afterSnapshot = prToSuggestionSnapshot(pr)
  const baselineForm: Partial<PurchaseRequest> = {
    ...pr,
    department: baseline.department,
    preliminaryExplanation: baseline.preliminaryExplanation,
    comments: baseline.comments,
    currency: baseline.currency,
    budgetLine: baseline.budgetLine,
    projectName: baseline.projectName,
    items: baseline.items,
  }

  return (
    <div>
      <FormProcedureBar
        mode="editSuggestion"
        left={
          <Link to={dashboardPath(prDashboardQueueId(pr.id, 'draft'))}>
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-soft">
            Raised (Before)
          </p>
          <PrFormPaper
            mode="view"
            initial={baselineForm}
            compareBaseline={baseline}
            compareAfter={afterSnapshot}
            compareSide="before"
            showSignatures={false}
            containerClassName="max-w-none"
          />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-soft">
            Suggested (After)
          </p>
          <PrFormPaper
            mode="editSuggestion"
            initial={pr}
            compareBaseline={baseline}
            compareSide="after"
            showSignatures={false}
            containerClassName="max-w-none"
            submitLabel="Resubmit purchase request"
            onSubmit={(data) => {
              void updatePurchaseRequest(pr.id, {
                ...data,
                status: 'submitted',
                requesterDate: nowStamp(),
                suggestionBaseline: undefined,
              })
                .then(() =>
                  goAfterFormAction(
                    navigate,
                    dashboardPath(prDashboardQueueId(pr.id, 'submitted')),
                  ),
                )
                .catch((err: unknown) => {
                  window.alert(
                    err instanceof Error ? err.message : 'Could not resubmit purchase request.',
                  )
                })
            }}
          />
        </div>
      </div>
    </div>
  )
}

function SuggestEditPr() {
  const { prId } = useParams()
  const navigate = useNavigate()
  const { purchaseRequests, currentUser, employees, updatePurchaseRequest, ready } = useDemo()
  const pr = purchaseRequests.find((p) => p.id === prId)
  const baselineRef = useRef<ReturnType<typeof prToSuggestionSnapshot> | null>(null)
  const [budgetLine, setBudgetLine] = useState('')
  const [projectName, setProjectName] = useState('')
  const [metaReadyFor, setMetaReadyFor] = useState<string | null>(null)

  if (pr && !baselineRef.current) {
    baselineRef.current = prToSuggestionSnapshot(pr)
  }

  if (pr && metaReadyFor !== pr.id) {
    setBudgetLine(pr.budgetLine ?? '')
    setProjectName(pr.projectName ?? '')
    setMetaReadyFor(pr.id)
  }

  if (!ready) return null
  if (!pr) return <Navigate to="/procurement" replace />

  const canApprove = needsMyApproval(pr, currentUser, employees)
  if (!canApprove) {
    return <Navigate to={`/procurement/${pr.id}`} replace />
  }
  if (pr.status !== 'submitted') {
    return <Navigate to={`/procurement/${pr.id}`} replace />
  }

  return (
    <div>
      <FormProcedureBar
        mode="suggest"
        left={
          <Link to={`/procurement/${pr.id}`}>
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <PrFormPaper
        mode="suggest"
        initial={pr}
        assignedBudgetLine={budgetLine}
        assignedProjectName={projectName}
        onAssignBudgetLine={setBudgetLine}
        onAssignProjectName={setProjectName}
        submitLabel="Submit"
        onSubmit={(data) => {
          const baseline = baselineRef.current ?? prToSuggestionSnapshot(pr)
          void updatePurchaseRequest(pr.id, {
            ...data,
            status: 'draft',
            suggestionBaseline: baseline,
            requester: pr.requester,
            requesterPosition: pr.requesterPosition,
            requesterDate: pr.requesterDate,
            approverName: '',
            approverPosition: '',
            approverDate: '',
            financeSignedBy: '',
            financeSignedAt: '',
            rejectionReason: '',
            rejectedBy: '',
            rejectedAt: '',
          })
            .then(() => goAfterFormAction(navigate, dashboardPath(prDashboardQueueId(pr.id, 'draft'))))
            .catch((err: unknown) => {
              window.alert(
                err instanceof Error ? err.message : 'Could not send suggested edit.',
              )
            })
        }}
      />
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
      <Route path=":prId/suggest" element={<SuggestEditPr />} />
      <Route path=":prId/edit-suggestion" element={<EditSuggestionPr />} />
      <Route path=":prId/edit" element={<EditPr />} />
      <Route path=":prId" element={<ViewPr />} />
      <Route path="*" element={<Navigate to="/procurement" replace />} />
    </Routes>
  )
}
