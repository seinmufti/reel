export type FundType = 'restricted' | 'unrestricted'

export type TransactionType = 'income' | 'expense'

export type PrStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered'

export type PaymentStatus = 'pending' | 'paid'

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type TripStatus = 'requested' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

export interface Fund {
  id: string
  name: string
  type: FundType
  balance: number
  donor?: string
}

export interface Account {
  id: string
  code: string
  name: string
  category: string
}

export type PrCurrency = 'USD' | 'IQD'

export interface Transaction {
  id: string
  date: string
  description: string
  /** Cashbook currency for debit/credit columns */
  currency: PrCurrency
  debit: number
  credit: number
  supplierId?: string
  /** e.g. NLYS.8.26.#1 — company.month.year.#seq (seq resets each month) */
  invoiceRef?: string
  purchaseRequestId?: string
  /** Derived: debit → expense, credit → income */
  type: TransactionType
  /** Derived: max(debit, credit) */
  amount: number
  /** ISO datetime when the entry was created */
  createdAt?: string
  accountId?: string
  fundId?: string
  category?: string
}

/** Denomination quantity maps keyed by face value (as string for JSON). */
export type CashCountDenoms = Record<string, number>

export interface CashCountSnapshot {
  beginUsd: CashCountDenoms
  beginIqd: CashCountDenoms
  endUsd: CashCountDenoms
  endIqd: CashCountDenoms
  projectLabel: string
}

export interface OpeningBalance {
  /** YYYY-MM */
  month: string
  /** Beginning-of-month cash count USD total (cashbook opening credit). */
  creditUsd: number
  /** Beginning-of-month cash count IQD total (cashbook opening credit). */
  creditIqd: number
  /** Bankbook opening credit USD (editable). */
  bankCreditUsd: number
  /** Bankbook opening credit IQD (editable). */
  bankCreditIqd: number
  cashCount?: CashCountSnapshot
}

export interface Supplier {
  id: string
  name: string
  /** What the supplier works in / industry */
  sector: string
  contact: string
  notes: string
  /** Date the supplier was added (YYYY-MM-DD) */
  createdAt: string
}

export interface PrItem {
  id: string
  description: string
  /** Expected delivery date & place */
  deliveryDatePlace: string
  quantity: number
  unitCost: number
}

export interface PurchaseRequest {
  id: string
  number: string
  /** Short label for lists — usually preliminary explanation */
  title: string
  receiptDate: string
  budgetLine: string
  projectId?: string
  projectName?: string
  department: string
  preliminaryExplanation: string
  currency: PrCurrency
  comments?: string
  requester: string
  requesterPosition: string
  requesterDate: string
  /** Filled when line manager approves */
  approverName?: string
  approverPosition?: string
  approverDate?: string
  status: PrStatus
  paymentStatus: PaymentStatus
  createdAt: string
  items: PrItem[]
}

export interface InventoryItem {
  id: string
  sku: string
  name: string
  location: string
  quantity: number
  reorderLevel: number
  unit: string
  linkedPrId?: string
}

export interface Employee {
  id: string
  name: string
  role: string
  /** Modules / work areas this employee can access */
  departments: string[]
  email: string
  startDate: string
  salary: number
  leaveBalance: number
  managerId?: string
  /** Protected account — cannot be removed */
  isAdmin?: boolean
}

export interface LeaveRequest {
  id: string
  employeeId: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  reason: string
}

export interface TimesheetEntry {
  id: string
  employeeId: string
  weekOf: string
  projectId?: string
  projectName?: string
  hours: number
  status: 'draft' | 'submitted' | 'approved'
}

export interface PayrollRow {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions: number
  net: number
}

export interface Project {
  id: string
  name: string
  code: string
  donor?: string
  fundId?: string
  status: 'active' | 'planned' | 'closed'
  startDate: string
  endDate: string
  progress: number
}

export interface Goal {
  id: string
  projectId: string
  title: string
  targetDate: string
  done: boolean
}

export interface Task {
  id: string
  projectId: string
  title: string
  assignee: string
  status: TaskStatus
  dueDate: string
}

export interface Vehicle {
  id: string
  plate: string
  make: string
  model: string
  year: number
  status: 'available' | 'on_trip' | 'maintenance'
}

export interface Driver {
  id: string
  name: string
  licenseNo: string
  phone: string
  status: 'available' | 'on_trip' | 'off_duty'
}

export interface TripRequest {
  id: string
  purpose: string
  destination: string
  requester: string
  vehicleId?: string
  driverId?: string
  startDate: string
  endDate: string
  status: TripStatus
}
