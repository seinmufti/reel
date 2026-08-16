import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type BootstrapPayload, type ChoiceMap } from '../api/client'
import { buildEmployeeRainbowIndex } from '../components/ui/PersonAvatar'
import { DEFAULT_LEAVE_ENTITLEMENTS, initialEmployees } from '../data/mockData'
import type {
  Account,
  CashAdvance,
  CashAdvanceStatus,
  Driver,
  Employee,
  Fund,
  Goal,
  InventoryItem,
  LeaveEntitlement,
  LeaveRequest,
  LeaveStatus,
  PrStatus,
  Project,
  PurchaseRequest,
  OpeningBalance,
  Supplier,
  Task,
  TimesheetEntry,
  Transaction,
  TripRequest,
  TripStatus,
  Vehicle,
} from '../types'

const ADMIN_EMPLOYEE_ID = 'emp-zak'

interface DemoContextValue {
  ready: boolean
  error: string | null
  choices: ChoiceMap
  departments: string[]
  prProjects: string[]
  budgetLines: string[]
  currencies: string[]
  purchaseRequests: PurchaseRequest[]
  transactions: Transaction[]
  suppliers: Supplier[]
  cashAdvances: CashAdvance[]
  openingBalances: OpeningBalance[]
  inventory: InventoryItem[]
  leaveRequests: LeaveRequest[]
  leaveEntitlements: LeaveEntitlement[]
  trips: TripRequest[]
  employees: Employee[]
  employeeRainbowIndex: ReadonlyMap<string, number>
  funds: Fund[]
  accounts: Account[]
  projects: Project[]
  goals: Goal[]
  tasks: Task[]
  vehicles: Vehicle[]
  drivers: Driver[]
  timesheets: TimesheetEntry[]
  currentUserId: string
  currentUser: Employee
  setCurrentUserId: (id: string) => void
  updatePrStatus: (
    id: string,
    status: PrStatus,
    extra?: {
      rejectionReason?: string
      rejectedBy?: string
      rejectedAt?: string
      approverName?: string
      approverPosition?: string
      approverDate?: string
      signSlot?: 'lm' | 'finance'
      approvedBy?: string
      approvedAt?: string
      financeSignedBy?: string
      financeSignedAt?: string
    },
  ) => Promise<void>
  recordPrPayment: (id: string) => void
  addPurchaseRequest: (
    pr: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
  ) => Promise<PurchaseRequest>
  updatePurchaseRequest: (
    id: string,
    pr: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
  ) => Promise<void>
  deletePurchaseRequest: (id: string) => Promise<void>
  adjustInventory: (id: string, delta: number) => void
  updateLeaveStatus: (
    id: string,
    status: LeaveStatus,
    extra?: {
      rejectionReason?: string
      rejectedBy?: string
      rejectedAt?: string
      approvedBy?: string
      signSlot?: 'lm' | 'finance' | 'hr'
      approvedAt?: string
    },
  ) => Promise<void>
  addLeaveRequest: (
    leave: Omit<LeaveRequest, 'id'> & { status?: LeaveStatus },
  ) => Promise<LeaveRequest>
  updateTripStatus: (id: string, status: TripStatus) => void
  addTrip: (trip: Omit<TripRequest, 'id' | 'status'>) => void
  addTransaction: (txn: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (id: string, txn: Omit<Transaction, 'id'>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>
  updateSupplier: (id: string, supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
  addCashAdvance: (advance: Omit<CashAdvance, 'id' | 'createdAt'>) => Promise<CashAdvance>
  updateCashAdvanceStatus: (
    id: string,
    status: CashAdvanceStatus,
    extra?: {
      rejectionReason?: string
      rejectedBy?: string
      rejectedAt?: string
      approvedBy?: string
      signSlot?: 'lm' | 'finance' | 'hr'
      approvedAt?: string
    },
  ) => Promise<void>
  deleteCashAdvance: (id: string) => Promise<void>
  upsertOpeningBalance: (
    month: string,
    input: {
      creditUsd?: number
      creditIqd?: number
      bankCreditUsd?: number
      bankCreditIqd?: number
      cashCount?: import('../types').CashCountSnapshot
    },
  ) => Promise<void>
  addEmployee: (
    emp: Omit<Employee, 'id' | 'isAdmin' | 'leaveBalance' | 'startDate'> & {
      leaveBalance?: number
      startDate?: string
    },
  ) => void
  updateEmployee: (
    id: string,
    emp: Omit<Employee, 'id' | 'isAdmin' | 'leaveBalance'> & {
      leaveBalance?: number
    },
  ) => void
  payablePrs: PurchaseRequest[]
}

const DemoContext = createContext<DemoContextValue | null>(null)

function choiceValues(choices: ChoiceMap, category: string, fallback: string[]) {
  const values = (choices[category] ?? []).map((c) => c.value)
  return values.length ? values : fallback
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choices, setChoices] = useState<ChoiceMap>({})
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([])
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveEntitlements, setLeaveEntitlements] = useState<LeaveEntitlement[]>(DEFAULT_LEAVE_ENTITLEMENTS)
  const [trips, setTrips] = useState<TripRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [funds, setFunds] = useState<Fund[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [currentUserId, setCurrentUserIdState] = useState(ADMIN_EMPLOYEE_ID)

  const applyBootstrap = useCallback((data: BootstrapPayload) => {
    setChoices(data.choices)
    setEmployees(data.employees)
    setFunds(data.funds)
    setAccounts(data.accounts)
    setTransactions(data.transactions)
    setSuppliers(data.suppliers ?? [])
    setCashAdvances(data.cashAdvances ?? [])
    setOpeningBalances(data.openingBalances ?? [])
    setPurchaseRequests(data.purchaseRequests)
    setInventory(data.inventory)
    setLeaveRequests(data.leaveRequests)
    setLeaveEntitlements(
      data.leaveEntitlements?.length ? data.leaveEntitlements : DEFAULT_LEAVE_ENTITLEMENTS,
    )
    setTimesheets(data.timesheets)
    setProjects(data.projects)
    setGoals(data.goals)
    setTasks(data.tasks)
    setVehicles(data.vehicles)
    setDrivers(data.drivers)
    setTrips(data.trips)
  }, [])

  const refresh = useCallback(async () => {
    const data = await api.bootstrap()
    applyBootstrap(data)
  }, [applyBootstrap])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.bootstrap()
        if (cancelled) return
        applyBootstrap(data)
        setCurrentUserIdState(data.currentUserId || ADMIN_EMPLOYEE_ID)
        setError(null)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load local database')
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyBootstrap])

  const currentUser = useMemo(() => {
    return (
      employees.find((e) => e.id === currentUserId) ??
      employees.find((e) => e.isAdmin) ??
      employees[0] ??
      initialEmployees[0]
    )
  }, [employees, currentUserId])

  const departments = useMemo(
    () => choiceValues(choices, 'department', ['Finance', 'Procurement', 'Logistics', 'HR', 'Project']),
    [choices],
  )
  const prProjects = useMemo(() => choiceValues(choices, 'pr_project', ['IQ2026', 'SY2026']), [choices])
  const budgetLines = useMemo(() => choiceValues(choices, 'budget_line', ['P.Costs', 'R.Costs']), [choices])
  const currencies = useMemo(() => choiceValues(choices, 'currency', ['USD', 'IQD']), [choices])

  const setCurrentUserId = useCallback((id: string) => {
    setCurrentUserIdState(id)
    void api
      .setCurrentUser(id)
      .then(() => refresh())
      .catch(() => undefined)
  }, [refresh])

  const updatePrStatus = useCallback(
    async (
      id: string,
      status: PrStatus,
      extra?: {
        rejectionReason?: string
        rejectedBy?: string
        rejectedAt?: string
        approverName?: string
        approverPosition?: string
        approverDate?: string
        signSlot?: 'lm' | 'finance'
        approvedBy?: string
        approvedAt?: string
        financeSignedBy?: string
        financeSignedAt?: string
      },
    ) => {
      setPurchaseRequests((prev) =>
        prev.map((pr) => {
          if (pr.id !== id) return pr
          const next = { ...pr, ...extra }
          if (extra?.signSlot === 'lm') {
            next.status = 'submitted'
          } else if (extra?.signSlot === 'finance') {
            next.financeSignedBy = extra.approvedBy ?? extra.financeSignedBy
            next.financeSignedAt = extra.approvedAt ?? extra.financeSignedAt
            if (next.financeSignedBy) {
              next.status = 'approved'
            }
          } else {
            next.status = status
          }
          return next
        }),
      )
      await api.updatePrStatus(id, status, extra)
      await refresh()
    },
    [refresh],
  )

  const recordPrPayment = useCallback(
    (id: string) => {
      void api
        .payPr(id)
        .then(() => refresh())
        .catch(() => undefined)
    },
    [refresh],
  )

  const addPurchaseRequest = useCallback(
    async (input: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>) => {
      const created = await api.createPurchaseRequest(input)
      await refresh()
      return created
    },
    [refresh],
  )

  const updatePurchaseRequest = useCallback(
    async (
      id: string,
      input: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
    ) => {
      await api.updatePurchaseRequest(id, input)
      await refresh()
    },
    [refresh],
  )

  const deletePurchaseRequest = useCallback(
    async (id: string) => {
      await api.deletePurchaseRequest(id)
      await refresh()
    },
    [refresh],
  )

  const adjustInventory = useCallback(
    (id: string, delta: number) => {
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        ),
      )
      void api
        .adjustInventory(id, delta)
        .then(() => refresh())
        .catch(() => undefined)
    },
    [refresh],
  )

  const updateLeaveStatus = useCallback(
    async (
      id: string,
      status: LeaveStatus,
      extra?: {
        rejectionReason?: string
        rejectedBy?: string
        rejectedAt?: string
        approvedBy?: string
        signSlot?: 'lm' | 'finance' | 'hr'
        approvedAt?: string
      },
    ) => {
      setLeaveRequests((prev) =>
        prev.map((lv) => {
          if (lv.id !== id) return lv
          const next = { ...lv }
          if (status === 'rejected') {
            next.status = 'rejected'
            next.rejectionReason = extra?.rejectionReason
            next.rejectedBy = extra?.rejectedBy
            next.rejectedAt = extra?.rejectedAt
            return next
          }
          if (extra?.signSlot === 'lm') {
            next.lmSignedBy = extra.approvedBy
            next.lmSignedAt = extra.approvedAt
          } else if (extra?.signSlot === 'hr') {
            next.hrSignedBy = extra.approvedBy
            next.hrSignedAt = extra.approvedAt
          }
          if (next.lmSignedBy && next.hrSignedBy) {
            next.status = 'approved'
            next.approvedBy = extra?.approvedBy
          }
          return next
        }),
      )
      await api.updateLeaveStatus(id, status, extra)
      await refresh()
    },
    [refresh],
  )

  const addLeaveRequest = useCallback(
    async (input: Omit<LeaveRequest, 'id'> & { status?: LeaveStatus }) => {
      const created = await api.createLeaveRequest({
        ...input,
        status: input.status ?? 'pending',
      })
      setLeaveRequests((prev) => [created, ...prev.filter((lv) => lv.id !== created.id)])
      await refresh()
      return created
    },
    [refresh],
  )

  const updateTripStatus = useCallback(
    (id: string, status: TripStatus) => {
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
      void api
        .updateTripStatus(id, status)
        .then(() => refresh())
        .catch(() => undefined)
    },
    [refresh],
  )

  const addTrip = useCallback(
    (input: Omit<TripRequest, 'id' | 'status'>) => {
      void api
        .createTrip(input)
        .then(() => refresh())
        .catch(() => undefined)
    },
    [refresh],
  )

  const addTransaction = useCallback(
    async (txn: Omit<Transaction, 'id'>) => {
      await api.createTransaction(txn)
      await refresh()
    },
    [refresh],
  )

  const updateTransaction = useCallback(
    async (id: string, input: Omit<Transaction, 'id'>) => {
      await api.updateTransaction(id, input)
      await refresh()
    },
    [refresh],
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      await api.deleteTransaction(id)
      await refresh()
    },
    [refresh],
  )

  const addSupplier = useCallback(
    async (input: Omit<Supplier, 'id' | 'createdAt'>) => {
      const created = await api.createSupplier(input)
      await refresh()
      return created
    },
    [refresh],
  )

  const updateSupplier = useCallback(
    async (id: string, input: Omit<Supplier, 'id' | 'createdAt'>) => {
      await api.updateSupplier(id, input)
      await refresh()
    },
    [refresh],
  )

  const deleteSupplier = useCallback(
    async (id: string) => {
      await api.deleteSupplier(id)
      await refresh()
    },
    [refresh],
  )

  const addCashAdvance = useCallback(
    async (input: Omit<CashAdvance, 'id' | 'createdAt'>) => {
      const created = await api.createCashAdvance({
        ...input,
        status: input.status ?? 'pending',
      })
      await refresh()
      return created
    },
    [refresh],
  )

  const updateCashAdvanceStatus = useCallback(
    async (
      id: string,
      status: CashAdvanceStatus,
      extra?: {
        rejectionReason?: string
        rejectedBy?: string
        rejectedAt?: string
        approvedBy?: string
        signSlot?: 'lm' | 'finance' | 'hr'
        approvedAt?: string
      },
    ) => {
      setCashAdvances((prev) =>
        prev.map((ca) => {
          if (ca.id !== id) return ca
          const next = { ...ca }
          if (status === 'rejected') {
            next.status = 'rejected'
            next.rejectionReason = extra?.rejectionReason
            next.rejectedBy = extra?.rejectedBy
            next.rejectedAt = extra?.rejectedAt
            return next
          }
          if (extra?.signSlot === 'lm') {
            next.lmSignedBy = extra.approvedBy
            next.lmSignedAt = extra.approvedAt
          } else if (extra?.signSlot === 'finance') {
            next.financeSignedBy = extra.approvedBy
            next.financeSignedAt = extra.approvedAt
          }
          if (next.lmSignedBy && next.financeSignedBy) {
            next.status = 'approved'
            next.approvedBy = extra?.approvedBy
          }
          return next
        }),
      )
      await api.updateCashAdvanceStatus(id, status, extra)
      await refresh()
    },
    [refresh],
  )

  const deleteCashAdvance = useCallback(
    async (id: string) => {
      await api.deleteCashAdvance(id)
      await refresh()
    },
    [refresh],
  )

  const upsertOpeningBalance = useCallback(
    async (
      month: string,
      input: {
        creditUsd?: number
        creditIqd?: number
        bankCreditUsd?: number
        bankCreditIqd?: number
        cashCount?: import('../types').CashCountSnapshot
      },
    ) => {
      await api.upsertOpeningBalance(month, input)
      await refresh()
    },
    [refresh],
  )

  const addEmployee = useCallback(
    (
      input: Omit<Employee, 'id' | 'isAdmin' | 'leaveBalance' | 'startDate'> & {
        leaveBalance?: number
        startDate?: string
      },
    ) => {
      void api
        .createEmployee(input)
        .then(() => refresh())
        .catch(() => undefined)
    },
    [refresh],
  )

  const updateEmployee = useCallback(
    (
      id: string,
      input: Omit<Employee, 'id' | 'isAdmin' | 'leaveBalance'> & {
        leaveBalance?: number
      },
    ) => {
      void api
        .updateEmployee(id, input)
        .then(() => refresh())
        .catch(() => undefined)
    },
    [refresh],
  )

  const payablePrs = useMemo(
    () =>
      purchaseRequests.filter(
        (pr) =>
          (pr.status === 'approved' || pr.status === 'ordered') &&
          pr.paymentStatus === 'pending',
      ),
    [purchaseRequests],
  )

  const employeeRainbowIndex = useMemo(
    () => buildEmployeeRainbowIndex(employees),
    [employees],
  )

  const value = useMemo(
    () => ({
      ready,
      error,
      choices,
      departments,
      prProjects,
      budgetLines,
      currencies,
      purchaseRequests,
      transactions,
      suppliers,
      cashAdvances,
      openingBalances,
      inventory,
      leaveRequests,
      leaveEntitlements,
      trips,
      employees,
      employeeRainbowIndex,
      funds,
      accounts,
      projects,
      goals,
      tasks,
      vehicles,
      drivers,
      timesheets,
      currentUserId: currentUser.id,
      currentUser,
      setCurrentUserId,
      updatePrStatus,
      recordPrPayment,
      addPurchaseRequest,
      updatePurchaseRequest,
      deletePurchaseRequest,
      adjustInventory,
      updateLeaveStatus,
      addLeaveRequest,
      updateTripStatus,
      addTrip,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addCashAdvance,
      updateCashAdvanceStatus,
      deleteCashAdvance,
      upsertOpeningBalance,
      addEmployee,
      updateEmployee,
      payablePrs,
    }),
    [
      ready,
      error,
      choices,
      departments,
      prProjects,
      budgetLines,
      currencies,
      purchaseRequests,
      transactions,
      suppliers,
      cashAdvances,
      openingBalances,
      inventory,
      leaveRequests,
      leaveEntitlements,
      trips,
      employees,
      employeeRainbowIndex,
      funds,
      accounts,
      projects,
      goals,
      tasks,
      vehicles,
      drivers,
      timesheets,
      currentUser,
      setCurrentUserId,
      updatePrStatus,
      recordPrPayment,
      addPurchaseRequest,
      updatePurchaseRequest,
      deletePurchaseRequest,
      adjustInventory,
      updateLeaveStatus,
      addLeaveRequest,
      updateTripStatus,
      addTrip,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addCashAdvance,
      updateCashAdvanceStatus,
      deleteCashAdvance,
      upsertOpeningBalance,
      addEmployee,
      updateEmployee,
      payablePrs,
    ],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
