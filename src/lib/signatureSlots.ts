import type { CashAdvance, Employee, LeaveRequest, PurchaseRequest } from '../types'

export type SignatureSlot = {
  name: string
  seed?: string
  role?: string
  /** Person who submitted / raised the request */
  requestor?: boolean
  signed: boolean
  rejected: boolean
  /** Workflow stopped — rejection upstream or not their turn yet */
  skipped?: boolean
  skipReason?: 'rejected' | 'waiting'
}

export function financeSignerFor(employee: { id: string }, employees: Employee[]) {
  const inFinance = employees.filter((e) => e.departments.includes('Finance') && e.id !== employee.id)
  const dedicated = inFinance.filter((e) => e.departments.length === 1)
  return dedicated[0] ?? inFinance.find((e) => !e.isAdmin) ?? inFinance[0]
}

export function hrSignerFor(employee: { id: string }, employees: Employee[]) {
  const hrSigners = employees.filter((e) => e.departments.includes('HR') && e.id !== employee.id)
  const dedicatedHr = hrSigners.filter((e) => e.departments.length === 1)
  return dedicatedHr[0] ?? hrSigners.find((e) => !e.isAdmin) ?? hrSigners[0]
}

function managerFor(employee: Employee | undefined, employees: Employee[]) {
  if (!employee?.managerId) return undefined
  return employees.find((e) => e.id === employee.managerId)
}

/** PR line manager rejected before signing. */
export function prLmRejected(pr: PurchaseRequest): boolean {
  return pr.status === 'rejected' && !pr.approverName
}

/** PR finance rejected after line manager signed. */
export function prFinanceRejected(pr: PurchaseRequest): boolean {
  return pr.status === 'rejected' && Boolean(pr.approverName) && !pr.financeSignedBy
}

/** Leave line manager rejected before signing. */
export function leaveLmRejected(leave: LeaveRequest): boolean {
  return leave.status === 'rejected' && !leave.lmSignedBy
}

/** Leave HR rejected after line manager signed. */
export function leaveHrRejected(leave: LeaveRequest): boolean {
  return leave.status === 'rejected' && Boolean(leave.lmSignedBy) && !leave.hrSignedBy
}

/** Cash advance line manager rejected before signing. */
export function cashAdvanceLmRejected(ca: CashAdvance): boolean {
  return ca.status === 'rejected' && !ca.lmSignedBy
}

/** Cash advance finance rejected after line manager signed. */
export function cashAdvanceFinanceRejected(ca: CashAdvance): boolean {
  return ca.status === 'rejected' && Boolean(ca.lmSignedBy) && !ca.financeSignedBy
}

/** Only the next unsigned signer is pending; after rejection or out-of-order slots are skipped. */
function finalizeSignatureSlots(slots: SignatureSlot[]): SignatureSlot[] {
  let blockRemaining = false
  let pendingAssigned = false

  return slots.map((slot) => {
    if (blockRemaining && !slot.signed && !slot.rejected) {
      return { ...slot, skipped: true, skipReason: 'rejected' as const }
    }

    if (slot.rejected) {
      blockRemaining = true
      return slot
    }

    if (slot.signed) {
      return slot
    }

    if (!pendingAssigned) {
      pendingAssigned = true
      return slot
    }

    return { ...slot, skipped: true, skipReason: 'waiting' as const }
  })
}

/** True when this employee is the next signer in the chain. */
export function isTurnForEmployee(slots: SignatureSlot[], employeeId: string): boolean {
  return slots.some(
    (slot) => slot.seed === employeeId && !slot.signed && !slot.rejected && !slot.skipped,
  )
}

function employeeByName(name: string | undefined, employees: Employee[]) {
  if (!name?.trim()) return undefined
  return employees.find((e) => e.name === name.trim())
}

/** Submitted PR awaiting line-manager signature from this employee. */
export function needsPrLmApproval(
  pr: PurchaseRequest,
  employeeId: string,
  employees: Employee[],
): boolean {
  if (pr.status !== 'submitted') return false
  const requester = employeeByName(pr.requester, employees)
  if (!requester || requester.id === employeeId) return false
  const manager = managerFor(requester, employees)
  return manager?.id === employeeId && !pr.approverName
}

/** PR awaiting finance signature from this employee (after line manager signed, when one exists). */
export function needsPrFinanceApproval(
  pr: PurchaseRequest,
  employeeId: string,
  employees: Employee[],
): boolean {
  if (pr.status === 'rejected' || pr.status === 'draft') return false
  const requester = employeeByName(pr.requester, employees)
  if (!requester || requester.id === employeeId) return false
  const finance = financeSignerFor(requester, employees)
  if (!finance || finance.id !== employeeId) return false
  if (pr.financeSignedBy) return false
  const manager = managerFor(requester, employees)
  if (manager && !pr.approverName) return false
  return pr.status === 'submitted' || pr.status === 'approved'
}

/** True when this employee is the next PR signer (LM or finance). */
export function needsPrApproval(
  pr: PurchaseRequest,
  employeeId: string,
  employees: Employee[],
): boolean {
  return (
    needsPrLmApproval(pr, employeeId, employees) ||
    needsPrFinanceApproval(pr, employeeId, employees)
  )
}

/** Pending leave awaiting LM or HR signature from this employee. */
export function needsLeaveSignature(
  leave: LeaveRequest,
  employeeId: string,
  employees: Employee[],
): boolean {
  if (leave.status !== 'pending') return false
  const emp = employees.find((e) => e.id === leave.employeeId)
  if (!emp || emp.id === employeeId) return false

  const manager = managerFor(emp, employees)
  const hr = hrSignerFor(emp, employees)

  if (manager?.id === employeeId && !leave.lmSignedBy) return true
  if (
    hr?.id === employeeId &&
    !leave.hrSignedBy &&
    (manager ? Boolean(leave.lmSignedBy) : true)
  ) {
    return true
  }
  return false
}

/** Pending cash advance awaiting LM or finance signature from this employee. */
export function needsCashAdvanceSignature(
  ca: CashAdvance,
  employeeId: string,
  employees: Employee[],
): boolean {
  if ((ca.status || 'pending') !== 'pending') return false
  const recipient = employeeByName(ca.recipient, employees)
  if (!recipient || recipient.id === employeeId) return false

  const manager = managerFor(recipient, employees)
  const finance = financeSignerFor(recipient, employees)

  if (manager?.id === employeeId && !ca.lmSignedBy) return true
  if (
    finance?.id === employeeId &&
    !ca.financeSignedBy &&
    (manager ? Boolean(ca.lmSignedBy) : true)
  ) {
    return true
  }
  return false
}

export function prSignatureSlots(pr: PurchaseRequest, employees: Employee[]): SignatureSlot[] {
  const requester = employees.find((e) => e.name === pr.requester)
  const manager = managerFor(requester, employees)
  const finance = requester ? financeSignerFor(requester, employees) : undefined
  const lmName = pr.approverName ?? manager?.name
  const lmRejected = prLmRejected(pr)
  const financeRejected = prFinanceRejected(pr)

  const slots: SignatureSlot[] = [
    {
      name: pr.requester,
      seed: requester?.id,
      role: requester?.role ?? pr.requesterPosition,
      requestor: true,
      signed: pr.status !== 'draft',
      rejected: false,
    },
  ]

  if (lmName || manager) {
    const name = lmName ?? manager!.name
    slots.push({
      name,
      seed: manager?.id ?? employees.find((e) => e.name === name)?.id,
      role: pr.approverPosition ?? manager?.role,
      signed: Boolean(pr.approverName),
      rejected: lmRejected,
    })
  }

  if (finance) {
    slots.push({
      name: finance.name,
      seed: finance.id,
      role: finance.role,
      signed: Boolean(pr.financeSignedBy),
      rejected: financeRejected,
    })
  }

  return finalizeSignatureSlots(slots)
}

export function leaveSignatureSlots(leave: LeaveRequest, employees: Employee[]): SignatureSlot[] {
  const emp = employees.find((e) => e.id === leave.employeeId)
  if (!emp) return []

  const manager = managerFor(emp, employees)
  const hr = hrSignerFor(emp, employees)
  const legacyBothSigned =
    leave.status === 'approved' && !leave.lmSignedBy && !leave.hrSignedBy
  const lmRejected = leaveLmRejected(leave)
  const hrRejected = leaveHrRejected(leave)

  const slots: SignatureSlot[] = [
    {
      name: emp.name,
      seed: emp.id,
      role: emp.role,
      requestor: true,
      signed: true,
      rejected: false,
    },
  ]

  if (manager) {
    slots.push({
      name: manager.name,
      seed: manager.id,
      role: manager.role,
      signed: Boolean(leave.lmSignedBy) || legacyBothSigned,
      rejected: lmRejected,
    })
  }

  if (hr) {
    slots.push({
      name: hr.name,
      seed: hr.id,
      role: hr.role,
      signed: Boolean(leave.hrSignedBy) || legacyBothSigned,
      rejected: hrRejected,
    })
  }

  return finalizeSignatureSlots(slots)
}

export function cashAdvanceSignatureSlots(ca: CashAdvance, employees: Employee[]): SignatureSlot[] {
  const recipient = employees.find((e) => e.name === ca.recipient)
  if (!recipient) return []

  const manager = managerFor(recipient, employees)
  const finance = financeSignerFor(recipient, employees)
  const legacyBothSigned = ca.status === 'approved' && !ca.lmSignedBy && !ca.financeSignedBy
  const lmRejected = cashAdvanceLmRejected(ca)
  const financeRejected = cashAdvanceFinanceRejected(ca)

  const slots: SignatureSlot[] = [
    {
      name: recipient.name,
      seed: recipient.id,
      role: recipient.role,
      requestor: true,
      signed: true,
      rejected: false,
    },
  ]

  if (manager) {
    slots.push({
      name: manager.name,
      seed: manager.id,
      role: manager.role,
      signed: Boolean(ca.lmSignedBy) || legacyBothSigned,
      rejected: lmRejected,
    })
  }

  if (finance) {
    slots.push({
      name: finance.name,
      seed: finance.id,
      role: finance.role,
      signed: Boolean(ca.financeSignedBy) || legacyBothSigned,
      rejected: financeRejected,
    })
  }

  return finalizeSignatureSlots(slots)
}
