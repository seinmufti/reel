import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { Messages } from 'primereact/messages'
import { Tooltip } from 'primereact/tooltip'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { Table, Td, Th } from '../../components/ui/Table'
import { WrappingSelect } from '../../components/ui/WrappingSelect'
import { useDemo } from '../../context/DemoContext'
import { formatDate } from '../../data/mockData'
import type { CashCountSnapshot, PrCurrency, Supplier, Transaction } from '../../types'
import {
  CashCountSection,
  CASH_COUNT_IQD_DENOMS,
  CASH_COUNT_USD_DENOMS,
  sumCashCountDenoms,
} from './CashCountSection'
import { CashAdvancesSection } from './CashAdvancesSection'

type FinanceTab = 'ledger' | 'suppliers' | 'advances'
type CashView = 'cashbook' | 'cashcount' | 'bankbook'
type LedgerBook = 'cash' | 'bank'

const INVOICE_COMPANY = 'NLYS'

const CASHBOOK_COLUMNS = [
  { key: 'ref', width: 72, min: 56 },
  { key: 'date', width: 148, min: 128 },
  { key: 'description', width: 280, min: 140 },
  // Sized for $ + 5 digits (e.g. 99,999.00); longer amounts wrap
  { key: 'debitUsd', width: 112, min: 112 },
  { key: 'creditUsd', width: 112, min: 112 },
  { key: 'balanceUsd', width: 112, min: 112 },
  // IQD label is wider than $; still keep compact — long amounts wrap
  { key: 'debitIqd', width: 112, min: 100 },
  { key: 'creditIqd', width: 112, min: 100 },
  { key: 'balanceIqd', width: 112, min: 100 },
  { key: 'supplier', width: 88, min: 72 },
  { key: 'pr', width: 72, min: 52 },
  { key: 'actions', width: 44, min: 40 },
] as const

const LEDGER_COL_WIDTHS_KEY = 'reel.finance.ledgerColWidths'

function loadLedgerColWidths(): number[] {
  const defaults = CASHBOOK_COLUMNS.map((col) => col.width)
  try {
    const raw = localStorage.getItem(LEDGER_COL_WIDTHS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length !== CASHBOOK_COLUMNS.length) return defaults
    return parsed.map((value, index) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return defaults[index]
      return Math.max(CASHBOOK_COLUMNS[index].min, Math.round(n))
    })
  } catch {
    return defaults
  }
}

function saveLedgerColWidths(widths: number[]) {
  try {
    localStorage.setItem(LEDGER_COL_WIDTHS_KEY, JSON.stringify(widths))
  } catch {
    // ignore quota / private mode
  }
}

function CashbookTh({
  children,
  className = '',
  resizable = false,
  resizing = false,
  onResizeStart,
}: {
  children?: ReactNode
  className?: string
  resizable?: boolean
  resizing?: boolean
  onResizeStart?: (e: ReactMouseEvent) => void
}) {
  return (
    <th
      className={`relative border-b border-line bg-mist px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wide text-slate-soft ${className}`}
    >
      {children}
      {resizable ? (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize column"
          onMouseDown={onResizeStart}
          className={`absolute inset-y-0 -right-1 z-20 w-2.5 cursor-col-resize touch-none select-none ${
            resizing ? 'bg-teal/15' : 'hover:bg-teal/10'
          }`}
        >
          <span
            className={`pointer-events-none absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 ${
              resizing ? 'w-0.5 bg-teal' : 'bg-slate-soft/50'
            }`}
          />
        </span>
      ) : null}
    </th>
  )
}

function parseFinanceTab(value: string | null): FinanceTab {
  if (value === 'suppliers') return 'suppliers'
  if (value === 'advances') return 'advances'
  return 'ledger'
}

const FINANCE_TABS: { id: FinanceTab; label: string }[] = [
  { id: 'ledger', label: 'Ledger' },
  { id: 'advances', label: 'Cash Advances' },
  { id: 'suppliers', label: 'Suppliers' },
]

function FinanceMainTabs({
  tab,
  onTabChange,
}: {
  tab: FinanceTab
  onTabChange: (tab: FinanceTab) => void
}) {
  return (
    <div
      className="inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm"
      role="tablist"
      aria-label="Finance sections"
    >
      {FINANCE_TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onTabChange(id)}
          className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
            tab === id
              ? 'bg-teal text-white shadow-sm'
              : 'text-slate-soft hover:bg-mist hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function parseCashView(params: URLSearchParams): CashView {
  const view = params.get('view')
  if (view === 'cashcount' || params.get('tab') === 'cashcount') return 'cashcount'
  if (view === 'bankbook') return 'bankbook'
  return 'cashbook'
}

function isBankRef(ref?: string) {
  return /\.bb$/i.test(ref ?? '')
}

/** e.g. NLYS.8.26 for August 2026 */
function invoiceRefPrefix(dateInput: Date | string = new Date()) {
  const date =
    typeof dateInput === 'string' ? new Date(`${dateInput.slice(0, 10)}T00:00:00`) : dateInput
  const month = date.getMonth() + 1
  const year = String(date.getFullYear()).slice(-2)
  return `${INVOICE_COMPANY}.${month}.${year}`
}

/** Next ref: NLYS.8.26.#1 (cash) or NLYS.8.26.#1.bb (bank) */
function nextInvoiceRef(
  transactions: Transaction[],
  dateInput: Date | string = new Date(),
  book: LedgerBook = 'cash',
) {
  const prefix = invoiceRefPrefix(dateInput)
  const pattern =
    book === 'bank'
      ? new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.#(\\d+)\\.bb$`, 'i')
      : new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.#(\\d+)$`, 'i')
  let max = 0
  for (const txn of transactions) {
    const match = txn.invoiceRef?.match(pattern)
    if (match) max = Math.max(max, Number(match[1]))
  }
  const n = `${prefix}.#${max + 1}`
  return book === 'bank' ? `${n}.bb` : n
}

function compareInvoiceRefs(a?: string, b?: string) {
  const left = a ?? ''
  const right = b ?? ''
  const pattern = /^NLYS\.(\d{1,2})\.(\d{2})\.#(\d+)(\.bb)?$/i
  const matchA = left.match(pattern)
  const matchB = right.match(pattern)
  if (matchA && matchB) {
    const yearDiff = Number(matchA[2]) - Number(matchB[2])
    if (yearDiff !== 0) return yearDiff
    const monthDiff = Number(matchA[1]) - Number(matchB[1])
    if (monthDiff !== 0) return monthDiff
    const numDiff = Number(matchA[3]) - Number(matchB[3])
    if (numDiff !== 0) return numDiff
    return (matchA[4] ? 1 : 0) - (matchB[4] ? 1 : 0)
  }
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

function isValidInvoiceRef(ref: string) {
  return /^NLYS\.\d{1,2}\.\d{2}\.#\d+(\.bb)?$/i.test(ref)
}

/** Display as #n or #n.bb; full ref stays available for tooltips */
function invoiceRefId(ref: string) {
  const match = ref.match(/#(\d+)(\.bb)?$/i)
  return match ? `#${match[1]}${match[2] ?? ''}` : ref
}

function hasOpenSelectOverlay() {
  const panels = document.querySelectorAll<HTMLElement>(
    '.p-dropdown-panel, .p-autocomplete-panel, .p-multiselect-panel',
  )
  for (const panel of panels) {
    const style = getComputedStyle(panel)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      continue
    }
    const rect = panel.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return true
  }
  return false
}

type CashbookDummyTemplate = {
  description: string
  currency: PrCurrency
  debit: number
}

const CASHBOOK_DUMMY_TEMPLATES: CashbookDummyTemplate[] = [
  {
    description: 'Office stationery restock — A4 paper and pens for Erbil hub',
    currency: 'USD',
    debit: 186.5,
  },
  {
    description: 'Printer toner cartridges for HQ admin wing',
    currency: 'USD',
    debit: 450,
  },
  {
    description: 'Diesel fuel top-up for logistics convoy to Dohuk',
    currency: 'USD',
    debit: 312.75,
  },
  {
    description: 'Venue rental for MEAL workshop — Erbil (2 days)',
    currency: 'USD',
    debit: 440,
  },
  {
    description: 'Accounting software annual license renewal',
    currency: 'USD',
    debit: 420,
  },
  {
    description: 'Hygiene kit packing materials for Al-Hasakah distribution',
    currency: 'IQD',
    debit: 2_850_000,
  },
  {
    description: 'Vehicle spare parts — oil filters and brake pads (Hilux)',
    currency: 'IQD',
    debit: 1_275_000,
  },
  {
    description: 'Donor-visit visibility materials — banners and folders',
    currency: 'IQD',
    debit: 975_000,
  },
  {
    description: 'First-aid kit top-up for field bases',
    currency: 'IQD',
    debit: 640_000,
  },
  {
    description: 'Internet and SIM top-up for field monitoring team',
    currency: 'USD',
    debit: 95.25,
  },
]

function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

type EntryFormFill = {
  description: string
  supplierId: string
  purchaseRequestId: string
  currency: PrCurrency
  debit: number
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

function formatAmountNumber(amount: number, currency: PrCurrency) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: currency === 'IQD' ? 0 : 2,
    maximumFractionDigits: currency === 'IQD' ? 0 : 2,
  })
}

function parseAmountInput(raw: string) {
  const n = Number(raw.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

/** Format user typing with thousands separators. Returns null to reject invalid input. */
function formatTypedAmount(raw: string, currency: PrCurrency): string | null {
  const cleaned = raw.replace(/,/g, '')
  if (cleaned === '') return ''

  if (currency === 'IQD') {
    if (!/^\d*$/.test(cleaned)) return null
    return Number(cleaned).toLocaleString('en-US', { maximumFractionDigits: 0 })
  }

  if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return null
  if (cleaned.startsWith('.')) {
    const [, decPart] = cleaned.split('.')
    return decPart !== undefined ? `0.${decPart}` : '0.'
  }
  const [intPart, decPart] = cleaned.split('.')
  if (intPart === '') return ''
  const formattedInt = Number(intPart).toLocaleString('en-US')
  if (cleaned.includes('.')) {
    return decPart !== undefined ? `${formattedInt}.${decPart}` : `${formattedInt}.`
  }
  return formattedInt
}

function FormattedAmountInput({
  name,
  currency,
  defaultValue,
  placeholder = '0',
}: {
  name: string
  currency: PrCurrency
  defaultValue?: number
  placeholder?: string
}) {
  const [display, setDisplay] = useState(() =>
    defaultValue ? formatAmountNumber(defaultValue, currency) : '',
  )

  useEffect(() => {
    setDisplay(defaultValue ? formatAmountNumber(defaultValue, currency) : '')
  }, [defaultValue, currency])

  return (
    <>
      <input type="hidden" name={name} value={display ? String(parseAmountInput(display)) : ''} />
      <input
        className={inputClass}
        type="text"
        inputMode={currency === 'USD' ? 'decimal' : 'numeric'}
        value={display}
        onChange={(e) => {
          const next = formatTypedAmount(e.target.value, currency)
          if (next !== null) setDisplay(next)
        }}
        placeholder={placeholder}
      />
    </>
  )
}

function formatCash(amount: number, currency: PrCurrency) {
  if (!amount) return '—'
  return `${currency} ${formatAmountNumber(amount, currency)}`
}

function CashAmountCell({
  amount,
  currency,
  showZero = false,
  className = '',
}: {
  amount: number
  currency: PrCurrency
  showZero?: boolean
  className?: string
}) {
  if (!showZero && !amount) {
    return <span className="block text-center opacity-50">—</span>
  }
  const unit = currency === 'USD' ? '$' : currency
  return (
    <div className={`flex w-full flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 tabular-nums ${className}`}>
      <span className="shrink-0 text-left">{unit}</span>
      <span className="min-w-0 max-w-full text-right break-all">{formatAmountNumber(amount, currency)}</span>
    </div>
  )
}

function formatWeekday(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return ''
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function CashbookDateCell({ value }: { value: string }) {
  const weekday = formatWeekday(value)
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{formatDate(value)}</span>
      {weekday ? <span className="text-[11px] font-normal opacity-70">{weekday}</span> : null}
    </span>
  )
}

export function FinancePage() {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    purchaseRequests,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    openingBalances,
    upsertOpeningBalance,
  } = useDemo()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseFinanceTab(searchParams.get('tab'))
  const cashView = parseCashView(searchParams)
  const ledgerBook: LedgerBook = cashView === 'bankbook' ? 'bank' : 'cash'
  const entryFocusId = searchParams.get('entry')
  const monthParam = searchParams.get('month')

  const [editingEntry, setEditingEntry] = useState<Transaction | null>(null)
  const [showEntry, setShowEntry] = useState(false)
  const [entryDraftMounted, setEntryDraftMounted] = useState(false)
  const [entryFormEpoch, setEntryFormEpoch] = useState(0)
  const [entryFill, setEntryFill] = useState<EntryFormFill | null>(null)
  const [entryPurchaseRequestId, setEntryPurchaseRequestId] = useState<string | null>(null)
  const [entrySupplierId, setEntrySupplierId] = useState('')
  const [entryInvoiceRef, setEntryInvoiceRef] = useState('')
  const [entryError, setEntryError] = useState<string | null>(null)
  const [savingEntry, setSavingEntry] = useState(false)
  const [cashbookColWidths, setCashbookColWidths] = useState<number[]>(loadLedgerColWidths)
  const cashbookColWidthsRef = useRef(cashbookColWidths)
  cashbookColWidthsRef.current = cashbookColWidths
  const [resizingCol, setResizingCol] = useState<number | null>(null)

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [showSupplier, setShowSupplier] = useState(false)
  const [supplierDraftMounted, setSupplierDraftMounted] = useState(false)
  const [supplierFormEpoch, setSupplierFormEpoch] = useState(0)
  const [supplierError, setSupplierError] = useState<string | null>(null)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [supplierNameSeed, setSupplierNameSeed] = useState('')
  const [selectSupplierOnSave, setSelectSupplierOnSave] = useState(false)

  const [pendingDeleteTxn, setPendingDeleteTxn] = useState<Transaction | null>(null)
  const [pendingDeleteSupplier, setPendingDeleteSupplier] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [ledgerMonth, setLedgerMonth] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) return monthParam
    return new Date().toISOString().slice(0, 7)
  })
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null)
  const pendingEntryFocusRef = useRef<string | null>(entryFocusId)
  const [showBankOpening, setShowBankOpening] = useState(false)
  const [bankOpeningError, setBankOpeningError] = useState<string | null>(null)
  const [savingBankOpening, setSavingBankOpening] = useState(false)
  const messagesRef = useRef<Messages>(null)
  const cashbookTooltipRef = useRef<Tooltip>(null)

  const selectablePrs = purchaseRequests

  function viewSearchParams(view: CashView): Record<string, string> {
    if (view === 'cashcount') return { view: 'cashcount' }
    if (view === 'bankbook') return { view: 'bankbook' }
    return {}
  }

  function setTab(next: FinanceTab) {
    if (next === 'suppliers') {
      setSearchParams({ tab: 'suppliers' })
      return
    }
    if (next === 'advances') {
      setSearchParams({ tab: 'advances' })
      return
    }
    setSearchParams(viewSearchParams(cashView))
  }

  function setCashView(next: CashView) {
    setSearchParams(viewSearchParams(next))
  }

  function shiftLedgerMonth(delta: number) {
    const [yearStr, monthStr] = ledgerMonth.split('-')
    const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1)
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setLedgerMonth(next)
  }

  function startCashbookColResize(index: number, e: ReactMouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = cashbookColWidthsRef.current[index] ?? CASHBOOK_COLUMNS[index].width
    const minWidth = CASHBOOK_COLUMNS[index].min
    setResizingCol(index)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const nextWidth = Math.max(minWidth, startWidth + (ev.clientX - startX))
      setCashbookColWidths((prev) => {
        if (prev[index] === nextWidth) return prev
        const next = [...prev]
        next[index] = nextWidth
        return next
      })
    }

    const onUp = () => {
      setResizingCol(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      saveLedgerColWidths(cashbookColWidthsRef.current)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /** Hide modal but keep form DOM so typed values survive reopen. */
  function dismissEntry() {
    setShowEntry(false)
    setEntryError(null)
  }

  /** Wipe typed values and restore defaults for the current new/edit session. */
  function resetEntryForm() {
    setEntryError(null)
    setEntryFill(null)
    if (editingEntry) {
      setEntryInvoiceRef(editingEntry.invoiceRef ?? '')
    } else {
      setEntryInvoiceRef(nextInvoiceRef(transactions, new Date(), ledgerBook))
    }
    setEntryFormEpoch((n) => n + 1)
  }

  function fillEntryWithDummy() {
    const supplier = pickRandom(suppliers)
    const pr = pickRandom(selectablePrs)
    if (!supplier || !pr) {
      setEntryError('Add a supplier and a purchase request before using dummy fill.')
      return
    }
    const template = pickRandom(CASHBOOK_DUMMY_TEMPLATES)!
    setEntryFill({
      description: template.description,
      supplierId: supplier.id,
      purchaseRequestId: pr.id,
      currency: template.currency,
      debit: template.debit,
    })
    setEntryError(null)
    if (!editingEntry) {
      setEntryInvoiceRef(nextInvoiceRef(transactions, new Date(), ledgerBook))
    }
    setEntryFormEpoch((n) => n + 1)
  }

  /** Clear draft after a successful save. */
  function clearEntryDraft() {
    setShowEntry(false)
    setEntryDraftMounted(false)
    setEditingEntry(null)
    setEntryFill(null)
    setEntryError(null)
    setEntryInvoiceRef('')
    setEntryFormEpoch((n) => n + 1)
  }

  function openNewEntry() {
    setEntryError(null)
    if (entryDraftMounted && editingEntry === null) {
      setShowEntry(true)
      return
    }
    setEditingEntry(null)
    setEntryFill(null)
    setEntryInvoiceRef(nextInvoiceRef(transactions, new Date(), ledgerBook))
    setEntryFormEpoch((n) => n + 1)
    setEntryDraftMounted(true)
    setShowEntry(true)
  }

  function openEditEntry(txn: Transaction) {
    setEntryError(null)
    if (entryDraftMounted && editingEntry?.id === txn.id) {
      setShowEntry(true)
      return
    }
    setEditingEntry(txn)
    setEntryFill(null)
    setEntryInvoiceRef(txn.invoiceRef ?? '')
    setEntryFormEpoch((n) => n + 1)
    setEntryDraftMounted(true)
    setShowEntry(true)
  }

  function dismissSupplier() {
    setShowSupplier(false)
    setSupplierError(null)
  }

  function clearSupplierDraft() {
    setShowSupplier(false)
    setSupplierDraftMounted(false)
    setEditingSupplier(null)
    setSupplierError(null)
    setSupplierNameSeed('')
    setSelectSupplierOnSave(false)
    setSupplierFormEpoch((n) => n + 1)
  }

  function openNewSupplier(nameSeed = '') {
    setSupplierError(null)
    setSupplierNameSeed(nameSeed.trim())
    if (supplierDraftMounted && editingSupplier === null) {
      setShowSupplier(true)
      return
    }
    setEditingSupplier(null)
    setSupplierFormEpoch((n) => n + 1)
    setSupplierDraftMounted(true)
    setShowSupplier(true)
  }

  function openNewSupplierFromFilter(query: string) {
    setSelectSupplierOnSave(true)
    setSupplierError(null)
    setSupplierNameSeed(query.trim())
    setEditingSupplier(null)
    setSupplierFormEpoch((n) => n + 1)
    setSupplierDraftMounted(true)
    setShowSupplier(true)
  }

  function openEditSupplier(supplier: Supplier) {
    setSupplierError(null)
    if (supplierDraftMounted && editingSupplier?.id === supplier.id) {
      setShowSupplier(true)
      return
    }
    setEditingSupplier(supplier)
    setSupplierFormEpoch((n) => n + 1)
    setSupplierDraftMounted(true)
    setShowSupplier(true)
  }

  useEffect(() => {
    const anyOpen =
      showEntry ||
      showSupplier ||
      showBankOpening ||
      Boolean(pendingDeleteTxn) ||
      Boolean(pendingDeleteSupplier)
    if (!anyOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (savingEntry || savingSupplier || savingBankOpening || deleting) return
      // Let open select overlays close first; don't dismiss the modal.
      if (hasOpenSelectOverlay()) return
      e.preventDefault()
      // Close frontmost overlay first (DOM order / stacking: delete → bank → supplier → entry).
      if (pendingDeleteSupplier) {
        setPendingDeleteSupplier(null)
        setDeleteError(null)
        return
      }
      if (pendingDeleteTxn) {
        setPendingDeleteTxn(null)
        setDeleteError(null)
        return
      }
      if (showBankOpening) {
        setShowBankOpening(false)
        setBankOpeningError(null)
        return
      }
      if (showSupplier) {
        dismissSupplier()
        return
      }
      if (showEntry) {
        dismissEntry()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    showEntry,
    showSupplier,
    showBankOpening,
    pendingDeleteTxn,
    pendingDeleteSupplier,
    savingEntry,
    savingSupplier,
    savingBankOpening,
    deleting,
  ])

  async function handleEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEntryError(null)
    const fd = new FormData(e.currentTarget)

    const invoiceRef = String(fd.get('invoiceRef') || '').trim()
    if (!invoiceRef || !isValidInvoiceRef(invoiceRef)) {
                    setEntryError('Invoice ref is required (e.g. NLYS.8.26.#1 or NLYS.8.26.#1.bb).')
      return
    }

    const date = String(fd.get('date') || '').trim()
    if (!date) {
      setEntryError('Date is required.')
      return
    }

    const supplierId = String(fd.get('supplierId') || '').trim()

    const purchaseRequestId = String(fd.get('purchaseRequestId') || '').trim()
    if (entryPurchaseRequestId === null || entryPurchaseRequestId === '') {
      setEntryError('Purchase request is required.')
      return
    }
    if (!supplierId) {
      setEntryError('Supplier is required.')
      return
    }

    const description = String(fd.get('description') || '').trim()
    if (!description) {
      setEntryError('Description is required.')
      return
    }

    const debitUsd = parseAmountInput(String(fd.get('debitUsd') || ''))
    const creditUsd = parseAmountInput(String(fd.get('creditUsd') || ''))
    const debitIqd = parseAmountInput(String(fd.get('debitIqd') || ''))
    const creditIqd = parseAmountInput(String(fd.get('creditIqd') || ''))
    const usdFilled = debitUsd > 0 || creditUsd > 0
    const iqdFilled = debitIqd > 0 || creditIqd > 0
    if (usdFilled && iqdFilled) {
      setEntryError('Enter amounts in either USD or IQD, not both.')
      return
    }
    if (!usdFilled && !iqdFilled) {
      setEntryError('Enter at least one debit or credit amount.')
      return
    }
    const currency: PrCurrency = usdFilled ? 'USD' : 'IQD'
    const debit = usdFilled ? debitUsd : debitIqd
    const credit = usdFilled ? creditUsd : creditIqd
    if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
      setEntryError('Enter either a debit or a credit amount (not both).')
      return
    }

    const payload = {
      date,
      description,
      currency,
      debit,
      credit,
      supplierId: supplierId || undefined,
      invoiceRef,
      purchaseRequestId: purchaseRequestId || undefined,
      type: (credit > 0 ? 'income' : 'expense') as Transaction['type'],
      amount: Math.max(debit, credit),
    }
    setSavingEntry(true)
    try {
      if (editingEntry) {
        await updateTransaction(editingEntry.id, payload)
      } else {
        await addTransaction(payload)
        messagesRef.current?.show({
          severity: 'success',
          summary: 'Entry added',
          detail: 'New cashbook entry posted.',
          life: 3500,
          closable: true,
          icon: 'pi pi-check',
        })
      }
      clearEntryDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save entry.'
      setEntryError(message.replace(/<[^>]+>/g, ' ').trim() || 'Could not save entry.')
    } finally {
      setSavingEntry(false)
    }
  }

  async function handleSaveSupplier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSupplierError(null)
    setSavingSupplier(true)
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || '').trim()
    if (!name) {
      setSupplierError('Name is required.')
      setSavingSupplier(false)
      return
    }
    const sector = String(fd.get('sector') || '').trim()
    if (!sector) {
      setSupplierError('Sector is required.')
      setSavingSupplier(false)
      return
    }
    const payload = {
      name,
      sector,
      contact: String(fd.get('contact') || '').trim(),
      notes: String(fd.get('notes') || '').trim(),
    }
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload)
      } else {
        const created = await addSupplier(payload)
        if (selectSupplierOnSave) {
          setEntrySupplierId(created.id)
        }
      }
      clearSupplierDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save supplier.'
      setSupplierError(message.replace(/<[^>]+>/g, ' ').trim() || 'Could not save supplier.')
    } finally {
      setSavingSupplier(false)
    }
  }

  async function confirmDeleteTxn() {
    if (!pendingDeleteTxn) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTransaction(pendingDeleteTxn.id)
      setPendingDeleteTxn(null)
      clearEntryDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete transaction.'
      setDeleteError(message.replace(/<[^>]+>/g, ' ').trim() || 'Could not delete transaction.')
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDeleteSupplier() {
    if (!pendingDeleteSupplier) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSupplier(pendingDeleteSupplier.id)
      setPendingDeleteSupplier(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete supplier.'
      setDeleteError(message.replace(/<[^>]+>/g, ' ').trim() || 'Could not delete supplier.')
    } finally {
      setDeleting(false)
    }
  }

  const entryFormKey = `${editingEntry?.id ?? 'new-entry'}-${entryFormEpoch}`
  const supplierFormKey = `${editingSupplier?.id ?? 'new-supplier'}-${supplierFormEpoch}`
  const supplierLocked = !entryPurchaseRequestId

  useEffect(() => {
    const prId = entryFill?.purchaseRequestId ?? editingEntry?.purchaseRequestId
    const supplierId = entryFill?.supplierId ?? editingEntry?.supplierId ?? ''
    if (entryFill || editingEntry) {
      setEntryPurchaseRequestId(prId ?? '')
      setEntrySupplierId(prId ? supplierId : '')
    } else {
      setEntryPurchaseRequestId(null)
      setEntrySupplierId('')
    }
  }, [entryFormKey, entryFill, editingEntry])

  const monthTransactions = transactions.filter((txn) => {
    if (txn.date.slice(0, 7) !== ledgerMonth) return false
    return isBankRef(txn.invoiceRef) === (ledgerBook === 'bank')
  })
  const openingBalance = openingBalances.find((row) => row.month === ledgerMonth) ?? {
    month: ledgerMonth,
    creditUsd: 0,
    creditIqd: 0,
    bankCreditUsd: 0,
    bankCreditIqd: 0,
  }
  const openingBalanceDate = `${ledgerMonth}-01`

  // Cash opening = beginning cash count. Bank opening = editable bank credits.
  const beginCashUsd = openingBalance.cashCount?.beginUsd
  const beginCashIqd = openingBalance.cashCount?.beginIqd
  const openingBalanceUsd =
    ledgerBook === 'cash'
      ? sumCashCountDenoms(CASH_COUNT_USD_DENOMS, beginCashUsd)
      : openingBalance.bankCreditUsd || 0
  const openingBalanceIqd =
    ledgerBook === 'cash'
      ? sumCashCountDenoms(CASH_COUNT_IQD_DENOMS, beginCashIqd)
      : openingBalance.bankCreditIqd || 0

  const saveCashCount = useCallback(
    async (input: {
      creditUsd: number
      creditIqd: number
      cashCount: CashCountSnapshot
    }) => {
      await upsertOpeningBalance(ledgerMonth, input)
    },
    [ledgerMonth, upsertOpeningBalance],
  )

  const saveBankOpening = useCallback(
    async (input: { bankCreditUsd: number; bankCreditIqd: number }) => {
      await upsertOpeningBalance(ledgerMonth, input)
    },
    [ledgerMonth, upsertOpeningBalance],
  )

  async function handleSaveBankOpening(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBankOpeningError(null)
    const fd = new FormData(e.currentTarget)
    const bankCreditUsd = Math.max(0, Number(fd.get('bankCreditUsd')) || 0)
    const bankCreditIqd = Math.max(0, Number(fd.get('bankCreditIqd')) || 0)
    setSavingBankOpening(true)
    try {
      await saveBankOpening({ bankCreditUsd, bankCreditIqd })
      setShowBankOpening(false)
    } catch (err) {
      setBankOpeningError(err instanceof Error ? err.message : 'Could not save opening balance.')
    } finally {
      setSavingBankOpening(false)
    }
  }

  const cashbookTotals = (() => {
    let debitUsd = 0
    let creditUsd = openingBalanceUsd
    let debitIqd = 0
    let creditIqd = openingBalanceIqd
    for (const txn of monthTransactions) {
      if (txn.currency === 'USD') {
        debitUsd += txn.debit || 0
        creditUsd += txn.credit || 0
      } else if (txn.currency === 'IQD') {
        debitIqd += txn.debit || 0
        creditIqd += txn.credit || 0
      }
    }
    return { debitUsd, creditUsd, debitIqd, creditIqd }
  })()

  const ledgerRows = [...monthTransactions].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date)
    if (dateDiff !== 0) return dateDiff
    const refDiff = compareInvoiceRefs(a.invoiceRef, b.invoiceRef)
    if (refDiff !== 0) return refDiff
    const createdDiff = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    if (createdDiff !== 0) return createdDiff
    return a.id.localeCompare(b.id)
  })

  const ledgerRowsWithBalances = (() => {
    let balanceUsd = openingBalanceUsd
    let balanceIqd = openingBalanceIqd
    return ledgerRows.map((txn) => {
      const usdDebit = txn.currency === 'USD' ? txn.debit || 0 : 0
      const usdCredit = txn.currency === 'USD' ? txn.credit || 0 : 0
      const iqdDebit = txn.currency === 'IQD' ? txn.debit || 0 : 0
      const iqdCredit = txn.currency === 'IQD' ? txn.credit || 0 : 0
      balanceUsd += usdCredit - usdDebit
      balanceIqd += iqdCredit - iqdDebit
      return { txn, usdDebit, usdCredit, iqdDebit, iqdCredit, balanceUsd, balanceIqd }
    })
  })()

  const closingBalanceUsd =
    ledgerRowsWithBalances.at(-1)?.balanceUsd ?? openingBalanceUsd
  const closingBalanceIqd =
    ledgerRowsWithBalances.at(-1)?.balanceIqd ?? openingBalanceIqd
  const cashbookTableMinWidth = cashbookColWidths.reduce((sum, width) => sum + width, 0)

  // PrimeReact Tooltip only binds on update, not mount — rebind when ledger DOM remounts.
  useEffect(() => {
    if (tab !== 'ledger' || (cashView !== 'cashbook' && cashView !== 'bankbook')) return
    cashbookTooltipRef.current?.updateTargetEvents()
  }, [tab, cashView, ledgerMonth, ledgerRowsWithBalances])

  async function copyInvoiceRef(fullRef: string) {
    try {
      await navigator.clipboard.writeText(fullRef)
      messagesRef.current?.clear()
      messagesRef.current?.show({
        severity: 'success',
        summary: 'Copied',
        detail: fullRef,
        life: 2500,
        closable: true,
        icon: 'pi pi-check',
      })
    } catch {
      messagesRef.current?.clear()
      messagesRef.current?.show({
        severity: 'error',
        summary: 'Copy failed',
        detail: 'Could not copy the reference to the clipboard.',
        life: 3500,
        closable: true,
        icon: 'pi pi-times',
      })
    }
  }

  useEffect(() => {
    if (entryFocusId) pendingEntryFocusRef.current = entryFocusId
  }, [entryFocusId])

  useEffect(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam) && monthParam !== ledgerMonth) {
      setLedgerMonth(monthParam)
    }
  }, [monthParam, ledgerMonth])

  useEffect(() => {
    const focusId = pendingEntryFocusRef.current
    if (!focusId || tab !== 'ledger') return
    if (cashView !== 'cashbook' && cashView !== 'bankbook') return

    let cancelled = false
    let clearHighlight: number | undefined

    const tryFocus = () => {
      if (cancelled) return false
      const row = document.getElementById(`ledger-entry-${focusId}`)
      if (!row) return false
      pendingEntryFocusRef.current = null
      setHighlightedEntryId(focusId)
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearHighlight = window.setTimeout(() => {
        if (!cancelled) setHighlightedEntryId(null)
      }, 4000)
      setSearchParams(
        (prev) => {
          if (!prev.get('entry') && !prev.get('month')) return prev
          const next = new URLSearchParams(prev)
          next.delete('entry')
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
  }, [tab, cashView, ledgerMonth, ledgerRowsWithBalances.length, setSearchParams])

  return (
    <div>
      <div className="finance-messages pointer-events-none fixed right-4 top-4 z-[3000] w-[min(24rem,calc(100vw-2rem))]">
        <div className="pointer-events-auto">
          <Messages ref={messagesRef} />
        </div>
      </div>
      <PageHeader
        title="Finance & Accounting"
        tabs={<FinanceMainTabs tab={tab} onTabChange={setTab} />}
        actions={
          tab === 'ledger' && (cashView === 'cashbook' || cashView === 'bankbook') ? (
            <Button type="button" onClick={openNewEntry}>
              New entry
            </Button>
          ) : tab === 'suppliers' ? (
            <Button type="button" onClick={() => openNewSupplier()}>
              Add supplier
            </Button>
          ) : tab === 'advances' ? (
            <Link to="/finance/cash-advance/new">
              <Button type="button">New cash advance</Button>
            </Link>
          ) : null
        }
      />

      {tab === 'ledger' ? (
        <Panel
          leading={
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm"
                role="tablist"
                aria-label="Cash count, cashbook, or bankbook"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={cashView === 'cashcount'}
                  onClick={() => setCashView('cashcount')}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                    cashView === 'cashcount'
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-slate-soft hover:bg-mist hover:text-ink'
                  }`}
                >
                  Cash count
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cashView === 'cashbook'}
                  onClick={() => setCashView('cashbook')}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                    cashView === 'cashbook'
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-slate-soft hover:bg-mist hover:text-ink'
                  }`}
                >
                  Cashbook
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cashView === 'bankbook'}
                  onClick={() => setCashView('bankbook')}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                    cashView === 'bankbook'
                      ? 'bg-rose-900 text-white shadow-sm'
                      : 'text-slate-soft hover:bg-mist hover:text-ink'
                  }`}
                >
                  Bankbook
                </button>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-slate-soft">Month</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  title="Previous month"
                  onClick={() => shiftLedgerMonth(-1)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink shadow-sm hover:bg-mist"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M10 3.5L5.5 8 10 12.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <input
                  type="month"
                  className={`${inputClass} w-auto min-w-[9.5rem]`}
                  value={ledgerMonth}
                  onChange={(e) => setLedgerMonth(e.target.value)}
                  aria-label="Filter by month and year"
                />
                <button
                  type="button"
                  aria-label="Next month"
                  title="Next month"
                  onClick={() => shiftLedgerMonth(1)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink shadow-sm hover:bg-mist"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M6 3.5L10.5 8 6 12.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          }
        >
          {cashView === 'cashbook' || cashView === 'bankbook' ? (
          <div className="overflow-x-auto">
              <Tooltip
                ref={cashbookTooltipRef}
                target=".cashbook-invoice-ref, .cashbook-pr-link"
                position="top"
              />
              <Table
                className={`table-fixed [&_th]:align-middle [&_th]:whitespace-normal [&_th]:break-words [&_td]:align-middle [&_td]:whitespace-normal [&_td]:break-words [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-line [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-line/70 [&_tbody>tr:not(:first-child):nth-child(even)]:bg-slate-100 [&_tbody>tr:not(:first-child):nth-child(odd)]:bg-white ${
                  resizingCol !== null ? 'select-none' : ''
                }`}
                style={{ width: cashbookTableMinWidth, minWidth: cashbookTableMinWidth }}
              >
                <colgroup>
                  {cashbookColWidths.map((width, index) => (
                    <col key={CASHBOOK_COLUMNS[index].key} style={{ width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {(
                      [
                        ['Ref', 'text-center'],
                        ['Date', 'text-center'],
                        ['Description', ''],
                        ['Debit USD', 'text-center'],
                        ['Credit USD', 'text-center'],
                        ['Balance USD', 'text-center'],
                        ['Debit IQD', 'text-center'],
                        ['Credit IQD', 'text-center'],
                        ['Balance IQD', 'text-center'],
                        ['Supplier', 'text-center'],
                        ['PR', 'text-center'],
                      ] as const
                    ).map(([label, align], index) => (
                      <CashbookTh
                        key={CASHBOOK_COLUMNS[index].key}
                        className={`!bg-slate-200 !text-slate-600 ${align}`}
                        resizable
                        resizing={resizingCol === index}
                        onResizeStart={(e) => startCashbookColResize(index, e)}
                      >
                        {label}
                      </CashbookTh>
                    ))}
                    <CashbookTh className="!bg-slate-200 text-center" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-sky-600 text-white [&_td]:!text-white">
                    <Td className="text-center font-mono text-xs" />
                    <Td className="text-center">
                      <CashbookDateCell value={openingBalanceDate} />
                    </Td>
                    <Td className="font-medium">Opening Balance</Td>
                    <Td className="whitespace-nowrap" />
                    <Td className="font-bold">
                      <CashAmountCell amount={openingBalanceUsd} currency="USD" showZero />
                    </Td>
                    <Td className="!bg-rose-900 !text-white">
                      <CashAmountCell amount={openingBalanceUsd} currency="USD" showZero />
                    </Td>
                    <Td className="whitespace-nowrap" />
                    <Td className="font-bold">
                      <CashAmountCell amount={openingBalanceIqd} currency="IQD" showZero />
                    </Td>
                    <Td className="!bg-rose-900 !text-white">
                      <CashAmountCell amount={openingBalanceIqd} currency="IQD" showZero />
                    </Td>
                    <Td className="text-center" />
                    <Td className="text-center" />
                    <Td className="text-center !px-1">
                      {ledgerBook === 'bank' ? (
                        <button
                          type="button"
                          aria-label="Edit opening balance"
                          title="Edit"
                          onClick={() => {
                            setBankOpeningError(null)
                            setShowBankOpening(true)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/40 bg-white text-ink hover:bg-mist"
                        >
                          <PencilIcon />
                        </button>
                      ) : null}
                    </Td>
                  </tr>
                  {ledgerRowsWithBalances.map(
                    ({ txn, usdDebit, usdCredit, iqdDebit, iqdCredit, balanceUsd, balanceIqd }) => {
                    const linkedPr = purchaseRequests.find((p) => p.id === txn.purchaseRequestId)
                    const supplier = suppliers.find((s) => s.id === txn.supplierId)
                    return (
                      <tr
                        key={txn.id}
                        id={`ledger-entry-${txn.id}`}
                        className={
                          highlightedEntryId === txn.id
                            ? 'relative z-[1] shadow-[inset_0_0_0_2px_var(--color-teal)]'
                            : undefined
                        }
                      >
                        <Td className="text-center font-mono text-xs">
                          {txn.invoiceRef ? (
                            <span
                              className="cashbook-invoice-ref cursor-copy"
                              data-pr-tooltip={txn.invoiceRef}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                void copyInvoiceRef(txn.invoiceRef!)
                              }}
                            >
                              {invoiceRefId(txn.invoiceRef)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </Td>
                        <Td className="text-center">
                          <CashbookDateCell value={txn.date} />
                        </Td>
                        <Td>{txn.description}</Td>
                        <Td className="!text-rose">
                          <CashAmountCell amount={usdDebit} currency="USD" />
                        </Td>
                        <Td className="!text-emerald">
                          <CashAmountCell amount={usdCredit} currency="USD" />
                        </Td>
                        <Td className="!bg-rose-900 font-medium !text-white">
                          <CashAmountCell amount={balanceUsd} currency="USD" showZero />
                        </Td>
                        <Td className="!text-rose">
                          <CashAmountCell amount={iqdDebit} currency="IQD" />
                        </Td>
                        <Td className="!text-emerald">
                          <CashAmountCell amount={iqdCredit} currency="IQD" />
                        </Td>
                        <Td className="!bg-rose-900 font-medium !text-white">
                          <CashAmountCell amount={balanceIqd} currency="IQD" showZero />
                        </Td>
                        <Td className="text-center">{supplier?.name ?? '—'}</Td>
                        <Td className="text-center">
                          {linkedPr ? (
                            <Link
                              to={`/procurement/${linkedPr.id}`}
                              className="cashbook-pr-link font-medium text-teal hover:underline"
                              data-pr-tooltip={linkedPr.title}
                            >
                              {linkedPr.number}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </Td>
                        <Td className="text-center !px-1">
                          <button
                            type="button"
                            aria-label={`Edit entry ${txn.description}`}
                            title="Edit"
                            onClick={() => openEditEntry(txn)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-mist"
                          >
                            <PencilIcon />
                          </button>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      className="bg-rose-900 px-3 py-5 align-middle text-sm text-white"
                    >
                      Totals
                    </td>
                    <td className="bg-rose-900 px-3 py-5 align-middle text-sm text-white">
                      <CashAmountCell amount={cashbookTotals.debitUsd} currency="USD" />
                    </td>
                    <td className="bg-rose-900 px-3 py-5 align-middle text-sm text-white">
                      <CashAmountCell amount={cashbookTotals.creditUsd} currency="USD" />
                    </td>
                    <td className="bg-rose-900 px-3 py-5 align-middle text-sm text-white">
                      <CashAmountCell amount={closingBalanceUsd} currency="USD" showZero />
                    </td>
                    <td className="bg-rose-900 px-3 py-5 align-middle text-sm text-white">
                      <CashAmountCell amount={cashbookTotals.debitIqd} currency="IQD" />
                    </td>
                    <td className="bg-rose-900 px-3 py-5 align-middle text-sm text-white">
                      <CashAmountCell amount={cashbookTotals.creditIqd} currency="IQD" />
                    </td>
                    <td className="bg-rose-900 px-3 py-5 align-middle text-sm text-white">
                      <CashAmountCell amount={closingBalanceIqd} currency="IQD" showZero />
                    </td>
                    <td colSpan={3} className="bg-rose-900 px-3 py-5" />
                  </tr>
                </tfoot>
              </Table>
            </div>
          ) : (
            <CashCountSection
              month={ledgerMonth}
              cashCount={openingBalance.cashCount}
              accountingUsd={closingBalanceUsd}
              accountingIqd={closingBalanceIqd}
              onSave={saveCashCount}
            />
          )}
        </Panel>
      ) : null}

      {tab === 'advances' ? <CashAdvancesSection /> : null}

      {tab === 'suppliers' ? (
        <Panel title="Suppliers">
          {suppliers.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No suppliers yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Sector</Th>
                  <Th>Contact</Th>
                  <Th>Notes</Th>
                  <Th>Date added</Th>
                  <Th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <Td className="font-medium">{supplier.name}</Td>
                    <Td>{supplier.sector || '—'}</Td>
                    <Td>{supplier.contact || '—'}</Td>
                    <Td>{supplier.notes || '—'}</Td>
                    <Td className="whitespace-nowrap">
                      {supplier.createdAt ? formatDate(supplier.createdAt) : '—'}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Edit ${supplier.name}`}
                          title="Edit"
                          onClick={() => openEditSupplier(supplier)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-mist"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${supplier.name}`}
                          title="Delete"
                          onClick={() => {
                            setDeleteError(null)
                            setPendingDeleteSupplier(supplier)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-rose text-white hover:bg-rose-700"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : null}

      {entryDraftMounted ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${
            showEntry ? '' : 'pointer-events-none invisible'
          }`}
          role="presentation"
          aria-hidden={!showEntry}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            tabIndex={showEntry ? 0 : -1}
            onClick={dismissEntry}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-dialog-title"
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id="entry-dialog-title" className="font-display text-lg font-semibold text-ink">
                {editingEntry ? 'Edit cashbook entry' : 'New cashbook entry'}
              </h2>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={fillEntryWithDummy}
                  disabled={savingEntry}
                  aria-label="Fill with dummy"
                  title="Fill with dummy"
                  className="!px-2 !py-1 leading-none"
                >
                  <span aria-hidden className="text-2xl leading-none">
                    🤪
                  </span>
                </Button>
                <button
                  type="button"
                  aria-label="Close"
                  title="Close"
                  disabled={savingEntry}
                  onClick={dismissEntry}
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
            </div>
            <form
              key={entryFormKey}
              className="mt-4 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => void handleEntry(e)}
            >
              <Field label="Invoice ref" required>
                <input type="hidden" name="invoiceRef" value={entryInvoiceRef} />
                <input
                  className={`${inputClass} cursor-not-allowed bg-mist/50`}
                  disabled
                  readOnly
                  value={entryInvoiceRef}
                  placeholder={ledgerBook === 'bank' ? 'NLYS.8.26.#1.bb' : 'NLYS.8.26.#1'}
                />
              </Field>
              <Field label="Date" required>
                <input
                  className={inputClass}
                  type="date"
                  name="date"
                  required
                  defaultValue={editingEntry?.date ?? new Date().toISOString().slice(0, 10)}
                  onChange={(e) => {
                    if (!editingEntry) {
                      setEntryInvoiceRef(nextInvoiceRef(transactions, e.target.value, ledgerBook))
                    }
                  }}
                />
              </Field>
              <Field label="Purchase request" required>
                <WrappingSelect
                  name="purchaseRequestId"
                  required
                  filter
                  value={entryPurchaseRequestId}
                  onValueChange={(next) => {
                    setEntryPurchaseRequestId(next)
                    if (!next) setEntrySupplierId('')
                  }}
                  placeholder="-Select a PR-"
                  options={[
                    { value: '', label: 'null' },
                    ...selectablePrs.map((pr) => ({
                      value: pr.id,
                      label: `${pr.number} — ${pr.title}`,
                      selectedLabel: pr.number,
                    })),
                  ]}
                />
              </Field>
              <Field label="Supplier" required>
                <WrappingSelect
                  name="supplierId"
                  required={!supplierLocked}
                  filter
                  value={entrySupplierId}
                  onValueChange={setEntrySupplierId}
                  disabled={supplierLocked}
                  placeholder={supplierLocked ? 'null' : 'Select supplier'}
                  emptyFilterAction={{
                    label: 'Create new supplier',
                    onAction: openNewSupplierFromFilter,
                  }}
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: s.sector ? `${s.name} — ${s.sector}` : s.name,
                  }))}
                />
              </Field>
              <Field label="Description" className="sm:col-span-2" required>
                <input
                  className={inputClass}
                  name="description"
                  required
                  defaultValue={entryFill?.description ?? editingEntry?.description ?? ''}
                  placeholder="what the purchase was for?"
                />
              </Field>
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 sm:gap-0">
                <p className="sm:col-span-2 text-[13px] font-medium text-slate-soft">
                  Amounts <span className="text-rose">*</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-2 sm:pr-4">
                  <Field label="Debit USD">
                    <FormattedAmountInput
                      name="debitUsd"
                      currency="USD"
                      defaultValue={
                        entryFill
                          ? entryFill.currency === 'USD'
                            ? entryFill.debit
                            : undefined
                          : editingEntry?.currency === 'USD' && editingEntry.debit
                            ? editingEntry.debit
                            : undefined
                      }
                    />
                  </Field>
                  <Field label="Credit USD">
                    <FormattedAmountInput
                      name="creditUsd"
                      currency="USD"
                      defaultValue={
                        entryFill
                          ? undefined
                          : editingEntry?.currency === 'USD' && editingEntry.credit
                            ? editingEntry.credit
                            : undefined
                      }
                    />
                  </Field>
                </div>
                <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <Field label="Debit IQD">
                    <FormattedAmountInput
                      name="debitIqd"
                      currency="IQD"
                      defaultValue={
                        entryFill
                          ? entryFill.currency === 'IQD'
                            ? entryFill.debit
                            : undefined
                          : editingEntry?.currency === 'IQD' && editingEntry.debit
                            ? editingEntry.debit
                            : undefined
                      }
                    />
                  </Field>
                  <Field label="Credit IQD">
                    <FormattedAmountInput
                      name="creditIqd"
                      currency="IQD"
                      defaultValue={
                        entryFill
                          ? undefined
                          : editingEntry?.currency === 'IQD' && editingEntry.credit
                            ? editingEntry.credit
                            : undefined
                      }
                    />
                  </Field>
                </div>
              </div>
              {suppliers.length === 0 ? (
                <p className="text-sm text-slate-soft/70 sm:col-span-2">
                  Add a supplier on the Suppliers tab before posting an entry.
                </p>
              ) : null}
              {entryError ? <p className="text-sm text-rose sm:col-span-2">{entryError}</p> : null}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="danger" onClick={resetEntryForm} disabled={savingEntry}>
                    Reset
                  </Button>
                  {editingEntry ? (
                    <Button
                      type="button"
                      variant="cancel"
                      disabled={savingEntry}
                      onClick={() => {
                        setDeleteError(null)
                        setPendingDeleteTxn(editingEntry)
                      }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  disabled={suppliers.length === 0 || selectablePrs.length === 0 || savingEntry}
                >
                  {savingEntry ? 'Saving…' : editingEntry ? 'Save changes' : 'Post entry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {supplierDraftMounted ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${
            showSupplier ? '' : 'pointer-events-none invisible'
          }`}
          role="presentation"
          aria-hidden={!showSupplier}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            tabIndex={showSupplier ? 0 : -1}
            onClick={dismissSupplier}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-dialog-title"
            className="relative z-10 w-full max-w-lg rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            <h2 id="supplier-dialog-title" className="font-display text-lg font-semibold text-ink">
              {editingSupplier ? 'Edit supplier' : 'Add supplier'}
            </h2>
            <form
              key={supplierFormKey}
              className="mt-4 grid gap-4"
              onSubmit={(e) => void handleSaveSupplier(e)}
            >
              <Field label="Name">
                <input
                  className={inputClass}
                  name="name"
                  required
                  defaultValue={editingSupplier?.name ?? supplierNameSeed}
                  placeholder="Supplier name"
                />
              </Field>
              <Field label="Sector">
                <input
                  className={inputClass}
                  name="sector"
                  required
                  defaultValue={editingSupplier?.sector ?? ''}
                  placeholder="What they work in (e.g. Office supplies)"
                />
              </Field>
              <Field label="Contact">
                <input
                  className={inputClass}
                  name="contact"
                  defaultValue={editingSupplier?.contact ?? ''}
                  placeholder="Phone or email"
                />
              </Field>
              <Field label="Notes">
                <textarea
                  className={inputClass}
                  name="notes"
                  rows={3}
                  defaultValue={editingSupplier?.notes ?? ''}
                  placeholder="Optional notes"
                />
              </Field>
              {supplierError ? <p className="text-sm text-rose">{supplierError}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={dismissSupplier}
                  disabled={savingSupplier}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSupplier}>
                  {savingSupplier ? 'Saving…' : editingSupplier ? 'Save changes' : 'Save supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showBankOpening ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            onClick={() => {
              if (!savingBankOpening) {
                setShowBankOpening(false)
                setBankOpeningError(null)
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-opening-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            <h2 id="bank-opening-title" className="font-display text-lg font-semibold text-ink">
              Edit opening balance
            </h2>
            <p className="mt-1 text-sm text-slate-soft">{formatDate(openingBalanceDate)} · credits only</p>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleSaveBankOpening(e)}>
              <Field label="Credit USD">
                <input
                  className={inputClass}
                  type="number"
                  name="bankCreditUsd"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={openingBalance.bankCreditUsd || 0}
                />
              </Field>
              <Field label="Credit IQD">
                <input
                  className={inputClass}
                  type="number"
                  name="bankCreditIqd"
                  min="0"
                  step="1"
                  required
                  defaultValue={openingBalance.bankCreditIqd || 0}
                />
              </Field>
              {bankOpeningError ? (
                <p className="sm:col-span-2 text-sm text-rose">{bankOpeningError}</p>
              ) : null}
              <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowBankOpening(false)
                    setBankOpeningError(null)
                  }}
                  disabled={savingBankOpening}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingBankOpening}>
                  {savingBankOpening ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDeleteTxn ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            onClick={() => {
              if (!deleting) setPendingDeleteTxn(null)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-txn-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            <h2 id="delete-txn-title" className="font-display text-lg font-semibold text-ink">
              Delete entry?
            </h2>
            <p className="mt-2 text-sm text-slate-soft">
              This will permanently remove this cashbook entry
              {pendingDeleteTxn.purchaseRequestId ? ' and mark the linked PR as unpaid again' : ''}.
            </p>
            {deleteError ? <p className="mt-3 text-sm text-rose">{deleteError}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingDeleteTxn(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void confirmDeleteTxn()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            onClick={() => {
              if (!deleting) setPendingDeleteSupplier(null)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-supplier-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            <h2 id="delete-supplier-title" className="font-display text-lg font-semibold text-ink">
              Delete supplier?
            </h2>
            <p className="mt-2 text-sm text-slate-soft">
              This will permanently remove <span className="font-semibold">{pendingDeleteSupplier.name}</span>.
            </p>
            {deleteError ? <p className="mt-3 text-sm text-rose">{deleteError}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingDeleteSupplier(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void confirmDeleteSupplier()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
