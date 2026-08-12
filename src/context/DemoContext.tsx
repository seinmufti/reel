import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type ChoiceMap } from '../api/client'
import { initialEmployees } from '../data/mockData'
import type {
  Account,
  Driver,
  Employee,
  Fund,
  Goal,
  InventoryItem,
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
  openingBalances: OpeningBalance[]
  inventory: InventoryItem[]
  leaveRequests: LeaveRequest[]
  trips: TripRequest[]
  employees: Employee[]
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
  updatePrStatus: (id: string, status: PrStatus) => void
  recordPrPayment: (id: string) => void
  addPurchaseRequest: (
    pr: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
  ) => Promise<void>
  updatePurchaseRequest: (
    id: string,
    pr: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
  ) => Promise<void>
  deletePurchaseRequest: (id: string) => Promise<void>
  adjustInventory: (id: string, delta: number) => void
  updateLeaveStatus: (id: string, status: LeaveStatus) => void
  updateTripStatus: (id: string, status: TripStatus) => void
  addTrip: (trip: Omit<TripRequest, 'id' | 'status'>) => void
  addTransaction: (txn: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (id: string, txn: Omit<Transaction, 'id'>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>
  updateSupplier: (id: string, supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
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
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.bootstrap()
        if (cancelled) return
        setChoices(data.choices)
        setEmployees(data.employees)
        setFunds(data.funds)
        setAccounts(data.accounts)
        setTransactions(data.transactions)
        setSuppliers(data.suppliers ?? [])
        setOpeningBalances(data.openingBalances ?? [])
        setPurchaseRequests(data.purchaseRequests)
        setInventory(data.inventory)
        setLeaveRequests(data.leaveRequests)
        setTimesheets(data.timesheets)
        setProjects(data.projects)
        setGoals(data.goals)
        setTasks(data.tasks)
        setVehicles(data.vehicles)
        setDrivers(data.drivers)
        setTrips(data.trips)
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
  }, [])

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
    void api.setCurrentUser(id).catch(() => undefined)
  }, [])

  const updatePrStatus = useCallback((id: string, status: PrStatus) => {
    setPurchaseRequests((prev) => prev.map((pr) => (pr.id === id ? { ...pr, status } : pr)))
    void api.updatePrStatus(id, status).catch(() => undefined)
  }, [])

  const recordPrPayment = useCallback((id: string) => {
    void api
      .payPr(id)
      .then((result) => {
        setPurchaseRequests((prev) =>
          prev.map((pr) => (pr.id === id ? result.purchaseRequest : pr)),
        )
        if (result.transaction) {
          setTransactions((prev) => [result.transaction!, ...prev])
        }
      })
      .catch(() => undefined)
  }, [])

  const addPurchaseRequest = useCallback(
    async (input: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>) => {
      const created = await api.createPurchaseRequest(input)
      setPurchaseRequests((prev) => [created, ...prev])
    },
    [],
  )

  const updatePurchaseRequest = useCallback(
    async (
      id: string,
      input: Omit<PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
    ) => {
      const updated = await api.updatePurchaseRequest(id, input)
      setPurchaseRequests((prev) => prev.map((pr) => (pr.id === id ? updated : pr)))
    },
    [],
  )

  const deletePurchaseRequest = useCallback(async (id: string) => {
    await api.deletePurchaseRequest(id)
    setPurchaseRequests((prev) => prev.filter((pr) => pr.id !== id))
  }, [])

  const adjustInventory = useCallback((id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
      ),
    )
    void api.adjustInventory(id, delta).catch(() => undefined)
  }, [])

  const updateLeaveStatus = useCallback((id: string, status: LeaveStatus) => {
    setLeaveRequests((prev) => prev.map((lv) => (lv.id === id ? { ...lv, status } : lv)))
    void api.updateLeaveStatus(id, status).catch(() => undefined)
  }, [])

  const updateTripStatus = useCallback((id: string, status: TripStatus) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    void api.updateTripStatus(id, status).catch(() => undefined)
  }, [])

  const addTrip = useCallback((input: Omit<TripRequest, 'id' | 'status'>) => {
    void api
      .createTrip(input)
      .then((created) => setTrips((prev) => [created, ...prev]))
      .catch(() => undefined)
  }, [])

  const addTransaction = useCallback(async (txn: Omit<Transaction, 'id'>) => {
    const created = await api.createTransaction(txn)
    setTransactions((prev) => [created, ...prev])
  }, [])

  const updateTransaction = useCallback(async (id: string, input: Omit<Transaction, 'id'>) => {
    const updated = await api.updateTransaction(id, input)
    setTransactions((prev) => prev.map((txn) => (txn.id === id ? updated : txn)))
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    const result = await api.deleteTransaction(id)
    setTransactions((prev) => prev.filter((txn) => txn.id !== id))
    if (result.purchaseRequest) {
      setPurchaseRequests((prev) =>
        prev.map((pr) => (pr.id === result.purchaseRequest!.id ? result.purchaseRequest! : pr)),
      )
    }
  }, [])

  const addSupplier = useCallback(async (input: Omit<Supplier, 'id' | 'createdAt'>) => {
    const created = await api.createSupplier(input)
    setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }, [])

  const updateSupplier = useCallback(async (id: string, input: Omit<Supplier, 'id' | 'createdAt'>) => {
    const updated = await api.updateSupplier(id, input)
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)),
    )
  }, [])

  const deleteSupplier = useCallback(async (id: string) => {
    await api.deleteSupplier(id)
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
  }, [])

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
      const saved = await api.upsertOpeningBalance(month, input)
      setOpeningBalances((prev) => {
        const without = prev.filter((row) => row.month !== saved.month)
        return [...without, saved].sort((a, b) => a.month.localeCompare(b.month))
      })
    },
    [],
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
        .then((created) => setEmployees((prev) => [...prev, created]))
        .catch(() => undefined)
    },
    [],
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
        .then((updated) =>
          setEmployees((prev) => prev.map((emp) => (emp.id === id ? updated : emp))),
        )
        .catch(() => undefined)
    },
    [],
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
      openingBalances,
      inventory,
      leaveRequests,
      trips,
      employees,
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
      updateTripStatus,
      addTrip,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSupplier,
      updateSupplier,
      deleteSupplier,
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
      openingBalances,
      inventory,
      leaveRequests,
      trips,
      employees,
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
      updateTripStatus,
      addTrip,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSupplier,
      updateSupplier,
      deleteSupplier,
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
