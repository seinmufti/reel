export type ChoiceMap = Record<string, Array<{ value: string; label: string }>>

export type BootstrapPayload = {
  currentUserId: string
  choices: ChoiceMap
  employees: import('../types').Employee[]
  funds: import('../types').Fund[]
  accounts: import('../types').Account[]
  transactions: import('../types').Transaction[]
  suppliers: import('../types').Supplier[]
  openingBalances: import('../types').OpeningBalance[]
  purchaseRequests: import('../types').PurchaseRequest[]
  inventory: import('../types').InventoryItem[]
  leaveRequests: import('../types').LeaveRequest[]
  timesheets: import('../types').TimesheetEntry[]
  projects: import('../types').Project[]
  goals: import('../types').Goal[]
  tasks: import('../types').Task[]
  vehicles: import('../types').Vehicle[]
  drivers: import('../types').Driver[]
  trips: import('../types').TripRequest[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  bootstrap: () => request<BootstrapPayload>('/api/bootstrap'),
  setCurrentUser: (id: string) =>
    request<{ currentUserId: string }>('/api/session/current-user', {
      method: 'PUT',
      body: JSON.stringify({ id }),
    }),
  createPurchaseRequest: (
    body: Omit<import('../types').PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
  ) =>
    request<import('../types').PurchaseRequest>('/api/purchase-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updatePurchaseRequest: (
    id: string,
    body: Omit<import('../types').PurchaseRequest, 'id' | 'number' | 'paymentStatus' | 'createdAt'>,
  ) =>
    request<import('../types').PurchaseRequest>(`/api/purchase-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deletePurchaseRequest: (id: string) =>
    request<{ ok: boolean; id: string }>(`/api/purchase-requests/${id}`, {
      method: 'DELETE',
    }),
  updatePrStatus: (id: string, status: string) =>
    request<import('../types').PurchaseRequest>(`/api/purchase-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  payPr: (id: string) =>
    request<{
      purchaseRequest: import('../types').PurchaseRequest
      transaction: import('../types').Transaction | null
    }>(`/api/purchase-requests/${id}/pay`, { method: 'POST' }),
  createTransaction: (body: Omit<import('../types').Transaction, 'id'>) =>
    request<import('../types').Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateTransaction: (id: string, body: Omit<import('../types').Transaction, 'id'>) =>
    request<import('../types').Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteTransaction: (id: string) =>
    request<{
      ok: boolean
      id: string
      purchaseRequest: import('../types').PurchaseRequest | null
    }>(`/api/transactions/${id}`, { method: 'DELETE' }),
  createSupplier: (body: Omit<import('../types').Supplier, 'id' | 'createdAt'>) =>
    request<import('../types').Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSupplier: (id: string, body: Omit<import('../types').Supplier, 'id' | 'createdAt'>) =>
    request<import('../types').Supplier>(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteSupplier: (id: string) =>
    request<{ ok: boolean; id: string }>(`/api/suppliers/${id}`, { method: 'DELETE' }),
  upsertOpeningBalance: (
    month: string,
    body: {
      creditUsd?: number
      creditIqd?: number
      bankCreditUsd?: number
      bankCreditIqd?: number
      cashCount?: import('../types').CashCountSnapshot
    },
  ) =>
    request<import('../types').OpeningBalance>(`/api/opening-balances/${month}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  adjustInventory: (id: string, delta: number) =>
    request<import('../types').InventoryItem>(`/api/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    }),
  updateLeaveStatus: (id: string, status: string) =>
    request<import('../types').LeaveRequest>(`/api/leave-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateTripStatus: (id: string, status: string) =>
    request<import('../types').TripRequest>(`/api/trips/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  createTrip: (body: Omit<import('../types').TripRequest, 'id' | 'status'>) =>
    request<import('../types').TripRequest>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createEmployee: (
    body: Omit<import('../types').Employee, 'id' | 'isAdmin' | 'leaveBalance' | 'startDate'> & {
      leaveBalance?: number
      startDate?: string
    },
  ) =>
    request<import('../types').Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateEmployee: (
    id: string,
    body: Omit<import('../types').Employee, 'id' | 'isAdmin' | 'leaveBalance'> & {
      leaveBalance?: number
    },
  ) =>
    request<import('../types').Employee>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
}
