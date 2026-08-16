import cors from 'cors'
import express from 'express'
import { ensureLeaveRejectionColumns, ensurePrRejectionColumns, getDbPath, openDb } from './db.js'
import { handwrittenSignatureDataUrl } from './signature.js'
import { leaveRequestFitsEntitlement, LEAVE_TYPES } from '../src/data/mockData'

const db = openDb()
const app = express()
const PORT = Number(process.env.API_PORT || 8787)

app.use(cors())
app.use(express.json({ limit: '6mb' }))

function meta(key: string) {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value
}

function employeeHasLineManager(employeeName: string): boolean {
  const row = db
    .prepare('SELECT manager_id FROM employees WHERE name = ?')
    .get(String(employeeName || '').trim()) as { manager_id: string | null } | undefined
  return Boolean(row?.manager_id)
}

function setMeta(key: string, value: string) {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value)
}

function mapEmployee(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    departments: JSON.parse(row.departments_json as string) as string[],
    email: row.email as string,
    startDate: row.start_date as string,
    salary: row.salary as number,
    leaveBalance: row.leave_balance as number,
    managerId: (row.manager_id as string | null) ?? undefined,
    isAdmin: Boolean(row.is_admin),
    signature: (row.signature as string | null) || undefined,
  }
}

function mapPr(row: Record<string, unknown>) {
  const items = db
    .prepare(
      `SELECT * FROM pr_items WHERE purchase_request_id = ? ORDER BY sort_order ASC, id ASC`,
    )
    .all(row.id as string)
    .map((item) => {
      const i = item as Record<string, unknown>
      return {
        id: i.id as string,
        description: i.description as string,
        deliveryDatePlace: i.delivery_date_place as string,
        quantity: i.quantity as number,
        unitCost: i.unit_cost as number,
      }
    })

  return {
    id: row.id as string,
    number: row.number as string,
    title: row.title as string,
    receiptDate: row.receipt_date as string,
    budgetLine: row.budget_line as string,
    projectId: (row.project_id as string | null) ?? undefined,
    projectName: (row.project_name as string | null) ?? undefined,
    department: row.department as string,
    preliminaryExplanation: row.preliminary_explanation as string,
    currency: row.currency as string,
    comments: (row.comments as string | null) ?? undefined,
    requester: row.requester as string,
    requesterPosition: row.requester_position as string,
    requesterDate: row.requester_date as string,
    approverName: (row.approver_name as string | null) ?? undefined,
    approverPosition: (row.approver_position as string | null) ?? undefined,
    approverDate: (row.approver_date as string | null) ?? undefined,
    financeSignedBy: (row.finance_signed_by as string | null) ?? undefined,
    financeSignedAt: (row.finance_signed_at as string | null) ?? undefined,
    rejectionReason: (row.rejection_reason as string | null) ?? undefined,
    rejectedBy: (row.rejected_by as string | null) ?? undefined,
    rejectedAt: (row.rejected_at as string | null) ?? undefined,
    status: row.status as string,
    paymentStatus: row.payment_status as string,
    createdAt: row.created_at as string,
    items,
    suggestionBaseline: parseSuggestionBaseline(row.suggestion_baseline),
  }
}

function parseSuggestionBaseline(raw: unknown) {
  if (!raw || typeof raw !== 'string') return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return undefined
    if (!Array.isArray(parsed.items)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

function mapLeaveRequest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    type: row.type as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    days: row.days as number,
    status: row.status as string,
    reason: row.reason as string,
    rejectionReason: (row.rejection_reason as string | null) ?? undefined,
    rejectedBy: (row.rejected_by as string | null) ?? undefined,
    rejectedAt: (row.rejected_at as string | null) ?? undefined,
    approvedBy: (row.approved_by as string | null) ?? undefined,
    lmSignedBy: (row.lm_signed_by as string | null) ?? undefined,
    lmSignedAt: (row.lm_signed_at as string | null) ?? undefined,
    hrSignedBy: (row.hr_signed_by as string | null) ?? undefined,
    hrSignedAt: (row.hr_signed_at as string | null) ?? undefined,
  }
}

function mapTxn(row: Record<string, unknown>) {
  const legacyAmount = Number(row.amount) || 0
  const legacyType = String(row.type || 'expense')
  let debit = Number(row.debit) || 0
  let credit = Number(row.credit) || 0
  if (debit === 0 && credit === 0 && legacyAmount > 0) {
    if (legacyType === 'income') credit = legacyAmount
    else debit = legacyAmount
  }
  const amount = Math.max(debit, credit)
  const type = credit > 0 && debit === 0 ? 'income' : 'expense'
  return {
    id: row.id as string,
    date: row.date as string,
    description: row.description as string,
    currency: ((row.currency as string) || 'USD') as 'USD' | 'IQD',
    debit,
    credit,
    supplierId: (row.supplier_id as string | null) ?? undefined,
    invoiceRef: (row.invoice_ref as string | null) ?? undefined,
    purchaseRequestId: (row.purchase_request_id as string | null) ?? undefined,
    type,
    amount,
    accountId: (row.account_id as string | null) ?? undefined,
    fundId: (row.fund_id as string | null) ?? undefined,
    category: (row.category as string | null) ?? undefined,
    createdAt: String(row.created_at ?? ''),
  }
}

function mapSupplier(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    sector: String(row.sector ?? ''),
    contact: String(row.contact ?? ''),
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? ''),
  }
}

function mapCashAdvance(row: Record<string, unknown>) {
  const id = row.id as string
  const items = db
    .prepare(
      `SELECT * FROM cash_advance_items WHERE cash_advance_id = ? ORDER BY sort_order ASC, id ASC`,
    )
    .all(id) as Array<Record<string, unknown>>
  return {
    id,
    recipient: String(row.recipient ?? ''),
    amount: Number(row.amount) || 0,
    currency: row.currency === 'IQD' ? 'IQD' : 'USD',
    dateFrom: String(row.date_from ?? ''),
    dateTo: String(row.date_to ?? ''),
    status: (row.status as string) || 'pending',
    createdAt: String(row.created_at ?? ''),
    rejectionReason: (row.rejection_reason as string | null) ?? undefined,
    rejectedBy: (row.rejected_by as string | null) ?? undefined,
    rejectedAt: (row.rejected_at as string | null) ?? undefined,
    approvedBy: (row.approved_by as string | null) ?? undefined,
    lmSignedBy: (row.lm_signed_by as string | null) ?? undefined,
    lmSignedAt: (row.lm_signed_at as string | null) ?? undefined,
    financeSignedBy: (row.finance_signed_by as string | null) ?? undefined,
    financeSignedAt: (row.finance_signed_at as string | null) ?? undefined,
    items: items.map((item) => ({
      id: item.id as string,
      purchaseRequestId: (item.purchase_request_id as string | null) ?? undefined,
      prNumber: (item.pr_number as string | null) ?? undefined,
      description: String(item.description ?? ''),
      debitUsd: Number(item.debit_usd) || 0,
      debitIqd: Number(item.debit_iqd) || 0,
    })),
  }
}

function parseCashCountJson(raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const asDenoms = (value: unknown) => {
      if (!value || typeof value !== 'object') return {}
      const out: Record<string, number> = {}
      for (const [key, qty] of Object.entries(value as Record<string, unknown>)) {
        const n = Math.max(0, Math.floor(Number(qty) || 0))
        if (n > 0) out[key] = n
      }
      return out
    }
    return {
      beginUsd: asDenoms(parsed.beginUsd),
      beginIqd: asDenoms(parsed.beginIqd),
      endUsd: asDenoms(parsed.endUsd),
      endIqd: asDenoms(parsed.endIqd),
      projectLabel: String(parsed.projectLabel ?? 'REEL') || 'REEL',
    }
  } catch {
    return undefined
  }
}

function mapOpeningBalance(row: Record<string, unknown>) {
  const cashCount = parseCashCountJson(row.cash_count_json)
  return {
    month: row.month as string,
    creditUsd: Number(row.credit_usd) || 0,
    creditIqd: Number(row.credit_iqd) || 0,
    bankCreditUsd: Number(row.bank_credit_usd) || 0,
    bankCreditIqd: Number(row.bank_credit_iqd) || 0,
    ...(cashCount ? { cashCount } : {}),
  }
}

function bootstrap() {
  const choicesRows = db
    .prepare(`SELECT * FROM choices ORDER BY category ASC, sort_order ASC, value ASC`)
    .all() as Array<Record<string, unknown>>

  const choices: Record<string, Array<{ value: string; label: string }>> = {}
  for (const row of choicesRows) {
    const category = row.category as string
    if (!choices[category]) choices[category] = []
    choices[category].push({ value: row.value as string, label: row.label as string })
  }

  return {
    currentUserId: meta('current_user_id') ?? 'emp-zak',
    choices,
    employees: db.prepare('SELECT * FROM employees ORDER BY is_admin DESC, name ASC').all().map((r) => mapEmployee(r as Record<string, unknown>)),
    funds: db.prepare('SELECT * FROM funds ORDER BY name ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        name: row.name as string,
        type: row.type as string,
        balance: row.balance as number,
        donor: (row.donor as string | null) ?? undefined,
      }
    }),
    accounts: db.prepare('SELECT * FROM accounts ORDER BY code ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        code: row.code as string,
        name: row.name as string,
        category: row.category as string,
      }
    }),
    transactions: db
      .prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC')
      .all()
      .map((r) => mapTxn(r as Record<string, unknown>)),
    suppliers: db
      .prepare('SELECT * FROM suppliers ORDER BY name ASC')
      .all()
      .map((r) => mapSupplier(r as Record<string, unknown>)),
    openingBalances: db
      .prepare('SELECT * FROM opening_balances ORDER BY month ASC')
      .all()
      .map((r) => mapOpeningBalance(r as Record<string, unknown>)),
    purchaseRequests: db
      .prepare('SELECT * FROM purchase_requests ORDER BY created_at DESC, number DESC')
      .all()
      .map((r) => mapPr(r as Record<string, unknown>)),
    inventory: db.prepare('SELECT * FROM inventory ORDER BY name ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        sku: row.sku as string,
        name: row.name as string,
        location: row.location as string,
        quantity: row.quantity as number,
        reorderLevel: row.reorder_level as number,
        unit: row.unit as string,
        linkedPrId: (row.linked_pr_id as string | null) ?? undefined,
      }
    }),
    leaveRequests: db.prepare('SELECT * FROM leave_requests ORDER BY start_date DESC').all().map((r) => {
      return mapLeaveRequest(r as Record<string, unknown>)
    }),
    leaveEntitlements: db.prepare('SELECT * FROM leave_entitlements ORDER BY leave_type ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        type: row.leave_type as string,
        days: row.days as number,
        period: row.period as string,
      }
    }),
    timesheets: db.prepare('SELECT * FROM timesheets ORDER BY week_of DESC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        employeeId: row.employee_id as string,
        weekOf: row.week_of as string,
        projectId: (row.project_id as string | null) ?? undefined,
        projectName: (row.project_name as string | null) ?? undefined,
        hours: row.hours as number,
        status: row.status as string,
      }
    }),
    projects: db.prepare('SELECT * FROM projects ORDER BY code ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        name: row.name as string,
        code: row.code as string,
        donor: (row.donor as string | null) ?? undefined,
        fundId: (row.fund_id as string | null) ?? undefined,
        status: row.status as string,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        progress: row.progress as number,
      }
    }),
    goals: db.prepare('SELECT * FROM goals ORDER BY target_date ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        projectId: row.project_id as string,
        title: row.title as string,
        targetDate: row.target_date as string,
        done: Boolean(row.done),
      }
    }),
    tasks: db.prepare('SELECT * FROM tasks ORDER BY due_date ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        projectId: row.project_id as string,
        title: row.title as string,
        assignee: row.assignee as string,
        status: row.status as string,
        dueDate: row.due_date as string,
      }
    }),
    vehicles: db.prepare('SELECT * FROM vehicles ORDER BY plate ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        plate: row.plate as string,
        make: row.make as string,
        model: row.model as string,
        year: row.year as number,
        status: row.status as string,
      }
    }),
    drivers: db.prepare('SELECT * FROM drivers ORDER BY name ASC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        name: row.name as string,
        licenseNo: row.license_no as string,
        phone: row.phone as string,
        status: row.status as string,
      }
    }),
    trips: db.prepare('SELECT * FROM trips ORDER BY start_date DESC').all().map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        purpose: row.purpose as string,
        destination: row.destination as string,
        requester: row.requester as string,
        vehicleId: (row.vehicle_id as string | null) ?? undefined,
        driverId: (row.driver_id as string | null) ?? undefined,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        status: row.status as string,
      }
    }),
    cashAdvances: db
      .prepare('SELECT * FROM cash_advances ORDER BY created_at DESC, id DESC')
      .all()
      .map((r) => mapCashAdvance(r as Record<string, unknown>)),
  }
}

function nextPrNumber(): string {
  const row = db
    .prepare(`SELECT number FROM purchase_requests ORDER BY number DESC LIMIT 1`)
    .get() as { number: string } | undefined
  if (!row?.number) return 'PR.001'
  const match = row.number.match(/(\d+)$/)
  const next = match ? Number(match[1]) + 1 : 1
  return `PR.${String(next).padStart(3, '0')}`
}

function prTotal(items: Array<{ quantity: number; unitCost: number }>) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: getDbPath() })
})

app.get('/api/bootstrap', (_req, res) => {
  res.json(bootstrap())
})

app.put('/api/session/current-user', (req, res) => {
  const id = String(req.body?.id || '')
  const exists = db.prepare('SELECT id FROM employees WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ error: 'Employee not found' })
  setMeta('current_user_id', id)
  res.json({ currentUserId: id })
})

app.post('/api/purchase-requests', (req, res) => {
  const body = req.body ?? {}
  const id = `pr-${Date.now()}`
  const number = nextPrNumber()
  const createdAt = new Date().toISOString().slice(0, 10)
  const items = Array.isArray(body.items) ? body.items : []

  const insertPr = db.prepare(`
    INSERT INTO purchase_requests (
      id, number, title, receipt_date, budget_line, project_id, project_name, department,
      preliminary_explanation, currency, comments, requester, requester_position, requester_date,
      approver_name, approver_position, approver_date,
      status, payment_status, created_at
    ) VALUES (
      @id, @number, @title, @receipt_date, @budget_line, @project_id, @project_name, @department,
      @preliminary_explanation, @currency, @comments, @requester, @requester_position, @requester_date,
      @approver_name, @approver_position, @approver_date,
      @status, @payment_status, @created_at
    )
  `)
  const insertItem = db.prepare(`
    INSERT INTO pr_items (
      id, purchase_request_id, description, delivery_date_place, quantity, unit_cost, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const run = db.transaction(() => {
    insertPr.run({
      id,
      number,
      title: String(body.title || ''),
      receipt_date: String(body.receiptDate || createdAt),
      budget_line: String(body.budgetLine || ''),
      project_id: body.projectId ?? null,
      project_name: body.projectName ?? null,
      department: String(body.department || ''),
      preliminary_explanation: String(body.preliminaryExplanation || ''),
      currency: String(body.currency || 'USD'),
      comments: body.comments ?? null,
      requester: String(body.requester || ''),
      requester_position: String(body.requesterPosition || ''),
      requester_date: String(body.requesterDate || createdAt),
      approver_name: body.approverName ? String(body.approverName) : null,
      approver_position: body.approverPosition ? String(body.approverPosition) : null,
      approver_date: body.approverDate ? String(body.approverDate) : null,
      status: String(body.status || 'submitted'),
      payment_status: 'pending',
      created_at: createdAt,
    })
    items.forEach((item: Record<string, unknown>, index: number) => {
      insertItem.run(
        String(item.id || `pri-${Date.now()}-${index}`),
        id,
        String(item.description || ''),
        String(item.deliveryDatePlace || ''),
        Number(item.quantity) || 0,
        Number(item.unitCost) || 0,
        index,
      )
    })
  })
  run()

  const created = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  res.status(201).json(mapPr(created))
})

app.put('/api/purchase-requests/:id', (req, res) => {
  ensurePrRejectionColumns(db)
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'PR not found' })

  const existingStatus = String(existing.status || '')
  if (String(existing.payment_status || '') === 'paid') {
    return res.status(400).json({ error: 'Paid PRs cannot be edited' })
  }

  const body = req.body ?? {}
  const items = Array.isArray(body.items) ? body.items : []
  let nextStatus = String(body.status || existingStatus)
  if (existingStatus === 'approved' || existingStatus === 'ordered') {
    nextStatus = existingStatus
  }

  const updatePr = db.prepare(`
    UPDATE purchase_requests SET
      title = @title,
      receipt_date = @receipt_date,
      budget_line = @budget_line,
      project_id = @project_id,
      project_name = @project_name,
      department = @department,
      preliminary_explanation = @preliminary_explanation,
      currency = @currency,
      comments = @comments,
      requester = @requester,
      requester_position = @requester_position,
      requester_date = @requester_date,
      approver_name = @approver_name,
      approver_position = @approver_position,
      approver_date = @approver_date,
      rejection_reason = @rejection_reason,
      rejected_by = @rejected_by,
      rejected_at = @rejected_at,
      finance_signed_by = @finance_signed_by,
      finance_signed_at = @finance_signed_at,
      suggestion_baseline = @suggestion_baseline,
      status = @status
    WHERE id = @id
  `)
  const deleteItems = db.prepare(`DELETE FROM pr_items WHERE purchase_request_id = ?`)
  const insertItem = db.prepare(`
    INSERT INTO pr_items (
      id, purchase_request_id, description, delivery_date_place, quantity, unit_cost, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const run = db.transaction(() => {
    updatePr.run({
      id,
      title: String(body.title || ''),
      receipt_date: String(body.receiptDate || existing.receipt_date),
      budget_line: String(body.budgetLine ?? existing.budget_line ?? ''),
      project_id: body.projectId ?? existing.project_id ?? null,
      project_name: body.projectName ?? existing.project_name ?? null,
      department: String(body.department || ''),
      preliminary_explanation: String(body.preliminaryExplanation || ''),
      currency: String(body.currency || 'USD'),
      comments: body.comments ?? null,
      requester: String(body.requester || existing.requester),
      requester_position: String(body.requesterPosition || existing.requester_position),
      requester_date: String(body.requesterDate || existing.requester_date),
      approver_name:
        body.approverName !== undefined
          ? body.approverName || null
          : (existing.approver_name ?? null),
      approver_position:
        body.approverPosition !== undefined
          ? body.approverPosition || null
          : (existing.approver_position ?? null),
      approver_date:
        body.approverDate !== undefined
          ? body.approverDate || null
          : (existing.approver_date ?? null),
      rejection_reason:
        body.rejectionReason !== undefined
          ? body.rejectionReason || null
          : (existing.rejection_reason ?? null),
      rejected_by:
        body.rejectedBy !== undefined
          ? body.rejectedBy || null
          : (existing.rejected_by ?? null),
      rejected_at:
        body.rejectedAt !== undefined
          ? body.rejectedAt || null
          : (existing.rejected_at ?? null),
      finance_signed_by:
        body.financeSignedBy !== undefined
          ? body.financeSignedBy || null
          : (existing.finance_signed_by ?? null),
      finance_signed_at:
        body.financeSignedAt !== undefined
          ? body.financeSignedAt || null
          : (existing.finance_signed_at ?? null),
      suggestion_baseline:
        body.suggestionBaseline !== undefined
          ? body.suggestionBaseline
            ? JSON.stringify(body.suggestionBaseline)
            : null
          : (existing.suggestion_baseline ?? null),
      status: nextStatus,
    })
    deleteItems.run(id)
    items.forEach((item: Record<string, unknown>, index: number) => {
      insertItem.run(
        String(item.id || `pri-${Date.now()}-${index}`),
        id,
        String(item.description || ''),
        String(item.deliveryDatePlace || ''),
        Number(item.quantity) || 0,
        Number(item.unitCost) || 0,
        index,
      )
    })
  })
  try {
    run()
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' })
  }

  const updated = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  const mapped = mapPr(updated)
  res.json(mapped)
})

app.delete('/api/purchase-requests/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'PR not found' })

  const status = String(existing.status || '')
  if (status === 'approved' || status === 'ordered') {
    return res.status(400).json({ error: 'Approved PRs cannot be deleted' })
  }

  const run = db.transaction(() => {
    db.prepare(`DELETE FROM pr_items WHERE purchase_request_id = ?`).run(id)
    db.prepare(`DELETE FROM purchase_requests WHERE id = ?`).run(id)
  })
  run()

  res.json({ ok: true, id })
})

app.patch('/api/purchase-requests/:id/status', (req, res) => {
  ensurePrRejectionColumns(db)
  const id = req.params.id
  const status = String(req.body?.status || '')
  if (status === 'rejected') {
    const rejectionReason = String(req.body?.rejectionReason || '').trim()
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection message is required' })
    }
    const rejectedBy = String(req.body?.rejectedBy || '').trim() || null
    const rejectedAt = String(req.body?.rejectedAt || '') || new Date().toISOString()
    try {
      const result = db
        .prepare(
          `UPDATE purchase_requests SET status = ?, rejection_reason = ?, rejected_by = ?, rejected_at = ? WHERE id = ?`,
        )
        .run(status, rejectionReason, rejectedBy, rejectedAt, id)
      if (!result.changes) return res.status(404).json({ error: 'PR not found' })
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Reject failed' })
    }
  } else if (status === 'approved' || status === 'submitted') {
    ensurePrRejectionColumns(db)
    const signSlot = String(req.body?.signSlot || '').trim()
    if (signSlot === 'lm' || signSlot === 'finance') {
      const current = db
        .prepare('SELECT approver_name, finance_signed_by, requester FROM purchase_requests WHERE id = ?')
        .get(id) as
        | { approver_name: string | null; finance_signed_by: string | null; requester: string }
        | undefined
      if (!current) return res.status(404).json({ error: 'PR not found' })

      const requesterHasManager = employeeHasLineManager(current.requester)

      if (signSlot === 'finance' && requesterHasManager && !current.approver_name) {
        return res.status(400).json({ error: 'Line manager must sign before finance' })
      }

      if (signSlot === 'lm') {
        const approverName = String(req.body?.approverName || '').trim() || null
        const approverPosition = String(req.body?.approverPosition || '').trim() || null
        const approverDate =
          String(req.body?.approverDate || '').trim() || new Date().toISOString().slice(0, 10)
        const result = db
          .prepare(
            `UPDATE purchase_requests SET status = 'submitted', approver_name = ?, approver_position = ?, approver_date = ? WHERE id = ?`,
          )
          .run(approverName, approverPosition, approverDate, id)
        if (!result.changes) return res.status(404).json({ error: 'PR not found' })
      } else {
        const financeSignedBy = String(req.body?.approvedBy || req.body?.financeSignedBy || '').trim() || null
        const financeSignedAt = String(req.body?.approvedAt || req.body?.financeSignedAt || '') || new Date().toISOString()
        db.prepare(
          `UPDATE purchase_requests SET finance_signed_by = ?, finance_signed_at = ? WHERE id = ?`,
        ).run(financeSignedBy, financeSignedAt, id)
        const signed = db
          .prepare('SELECT approver_name, finance_signed_by FROM purchase_requests WHERE id = ?')
          .get(id) as
          | { approver_name: string | null; finance_signed_by: string | null }
          | undefined
        if (!signed) return res.status(404).json({ error: 'PR not found' })
        if (signed.finance_signed_by && (!requesterHasManager || signed.approver_name)) {
          db.prepare(`UPDATE purchase_requests SET status = 'approved' WHERE id = ?`).run(id)
        }
      }
    } else if (status === 'approved') {
      const approverName = String(req.body?.approverName || '').trim() || null
      const approverPosition = String(req.body?.approverPosition || '').trim() || null
      const approverDate = String(req.body?.approverDate || '').trim() || new Date().toISOString().slice(0, 10)
      const result = db
        .prepare(
          `UPDATE purchase_requests SET status = ?, approver_name = ?, approver_position = ?, approver_date = ? WHERE id = ?`,
        )
        .run(status, approverName, approverPosition, approverDate, id)
      if (!result.changes) return res.status(404).json({ error: 'PR not found' })
    } else {
      const result = db.prepare(`UPDATE purchase_requests SET status = ? WHERE id = ?`).run(status, id)
      if (!result.changes) return res.status(404).json({ error: 'PR not found' })
    }
  } else {
    const result = db.prepare(`UPDATE purchase_requests SET status = ? WHERE id = ?`).run(status, id)
    if (!result.changes) return res.status(404).json({ error: 'PR not found' })
  }
  const row = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as Record<string, unknown>
  res.json(mapPr(row))
})

function nextInvoiceRef(dateStr: string): string {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  const month = date.getMonth() + 1
  const year = String(date.getFullYear()).slice(-2)
  const prefix = `NLYS.${month}.${year}`
  const rows = db
    .prepare(`SELECT invoice_ref FROM transactions WHERE invoice_ref IS NOT NULL AND invoice_ref LIKE ?`)
    .all(`${prefix}.#%`) as Array<{ invoice_ref: string }>
  let max = 0
  const pattern = new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.#(\\d+)$`, 'i')
  for (const row of rows) {
    const match = String(row.invoice_ref).match(pattern)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${prefix}.#${max + 1}`
}

app.post('/api/purchase-requests/:id/pay', (req, res) => {
  const id = req.params.id
  const pr = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!pr) return res.status(404).json({ error: 'PR not found' })
  if (pr.payment_status === 'paid') {
    return res.json({
      purchaseRequest: mapPr(pr),
      transaction: null,
    })
  }

  const mapped = mapPr(pr)
  const amount = prTotal(mapped.items)
  const txnId = `txn-${Date.now()}`
  const date = new Date().toISOString().slice(0, 10)
  const fundId =
    mapped.projectId === 'proj-2' ? 'fund-4' : mapped.projectId === 'proj-3' ? 'fund-3' : 'fund-2'
  const nextStatus = mapped.status === 'approved' ? 'ordered' : mapped.status
  const currency = mapped.currency === 'IQD' ? 'IQD' : 'USD'
  const invoiceRef = nextInvoiceRef(date)
  const createdAt = new Date().toISOString()

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO transactions (
        id, date, description, type, amount, account_id, fund_id, category,
        currency, debit, credit, supplier_id, invoice_ref, purchase_request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      txnId,
      date,
      `Payment for ${mapped.number} — ${mapped.title}`,
      'expense',
      amount,
      'acc-3',
      fundId,
      'Program Supplies',
      currency,
      amount,
      0,
      null,
      invoiceRef,
      id,
      createdAt,
    )
    db.prepare(
      `UPDATE purchase_requests SET payment_status = 'paid', status = ? WHERE id = ?`,
    ).run(nextStatus, id)
  })
  run()

  const updated = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txnId) as Record<string, unknown>
  res.json({
    purchaseRequest: mapPr(updated),
    transaction: mapTxn(txn),
  })
})

app.post('/api/transactions', (req, res) => {
  const body = req.body ?? {}
  const id = `txn-${Date.now()}`
  const debit = Number(body.debit) || 0
  const credit = Number(body.credit) || 0
  const amount = Math.max(debit, credit, Number(body.amount) || 0)
  const type =
    credit > 0 && debit === 0 ? 'income' : String(body.type || 'expense')
  const currency = body.currency === 'IQD' ? 'IQD' : 'USD'
  // Older DBs require NOT NULL on these; cashbook entries don't collect them.
  const accountId = body.accountId ? String(body.accountId) : 'acc-cash'
  const fundId = body.fundId ? String(body.fundId) : 'fund-general'
  const category = body.category ? String(body.category) : 'Cashbook'
  const createdAt = new Date().toISOString()

  db.prepare(
    `INSERT INTO transactions (
      id, date, description, type, amount, account_id, fund_id, category,
      currency, debit, credit, supplier_id, invoice_ref, purchase_request_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    String(body.date || new Date().toISOString().slice(0, 10)),
    String(body.description || ''),
    type,
    amount,
    accountId,
    fundId,
    category,
    currency,
    debit,
    credit,
    body.supplierId ? String(body.supplierId) : null,
    body.invoiceRef ? String(body.invoiceRef) : null,
    body.purchaseRequestId ? String(body.purchaseRequestId) : null,
    createdAt,
  )
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapTxn(row))
})

app.get('/api/suppliers', (_req, res) => {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all() as Array<
    Record<string, unknown>
  >
  res.json(rows.map(mapSupplier))
})

app.post('/api/suppliers', (req, res) => {
  const body = req.body ?? {}
  const id = `sup-${Date.now()}`
  const createdAt = new Date().toISOString().slice(0, 10)
  db.prepare(
    `INSERT INTO suppliers (id, name, sector, contact, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    String(body.name || '').trim(),
    String(body.sector || '').trim(),
    String(body.contact || '').trim(),
    String(body.notes || '').trim(),
    createdAt,
  )
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapSupplier(row))
})

app.get('/api/cash-advances', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM cash_advances ORDER BY created_at DESC, id DESC')
    .all() as Array<Record<string, unknown>>
  res.json(rows.map(mapCashAdvance))
})

app.post('/api/cash-advances', (req, res) => {
  const body = req.body ?? {}
  const id = `ca-${Date.now()}`
  const createdAt = new Date().toISOString().slice(0, 10)
  const items = Array.isArray(body.items) ? body.items : []
  const currency = body.currency === 'IQD' ? 'IQD' : 'USD'

  const insertAdvance = db.prepare(`
    INSERT INTO cash_advances (id, recipient, amount, currency, date_from, date_to, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertItem = db.prepare(`
    INSERT INTO cash_advance_items (
      id, cash_advance_id, purchase_request_id, pr_number, description, debit_usd, debit_iqd, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const run = db.transaction(() => {
    insertAdvance.run(
      id,
      String(body.recipient || '').trim(),
      Number(body.amount) || 0,
      currency,
      String(body.dateFrom || body.dateTo || createdAt),
      String(body.dateTo || createdAt),
      String(body.status || 'pending'),
      createdAt,
    )
    items.forEach((item: Record<string, unknown>, index: number) => {
      insertItem.run(
        String(item.id || `cai-${Date.now()}-${index}`),
        id,
        item.purchaseRequestId ? String(item.purchaseRequestId) : null,
        item.prNumber ? String(item.prNumber) : null,
        String(item.description || '').trim(),
        Number(item.debitUsd) || 0,
        Number(item.debitIqd) || 0,
        index,
      )
    })
  })
  run()

  const row = db.prepare('SELECT * FROM cash_advances WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapCashAdvance(row))
})

app.patch('/api/cash-advances/:id/status', (req, res) => {
  const id = req.params.id
  const status = String(req.body?.status || '')
  if (status === 'rejected') {
    const rejectionReason = String(req.body?.rejectionReason || '').trim()
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection message is required' })
    }
    const rejectedBy = String(req.body?.rejectedBy || '').trim() || null
    const rejectedAt = String(req.body?.rejectedAt || '') || new Date().toISOString()
    const result = db
      .prepare(
        `UPDATE cash_advances SET status = ?, rejection_reason = ?, rejected_by = ?, rejected_at = ? WHERE id = ?`,
      )
      .run(status, rejectionReason, rejectedBy, rejectedAt, id)
    if (!result.changes) return res.status(404).json({ error: 'Cash advance not found' })
  } else {
    const signSlot = String(req.body?.signSlot || '').trim()
    const approvedBy = String(req.body?.approvedBy || '').trim() || null
    const approvedAt = String(req.body?.approvedAt || '') || new Date().toISOString()
    if (signSlot === 'lm' || signSlot === 'finance') {
      const current = db
        .prepare('SELECT lm_signed_by, finance_signed_by FROM cash_advances WHERE id = ?')
        .get(id) as
        | { lm_signed_by: string | null; finance_signed_by: string | null }
        | undefined
      if (!current) return res.status(404).json({ error: 'Cash advance not found' })
      if (signSlot === 'finance' && !current.lm_signed_by) {
        return res.status(400).json({ error: 'Line manager must sign before finance' })
      }
      if (signSlot === 'lm') {
        db.prepare(`UPDATE cash_advances SET lm_signed_by = ?, lm_signed_at = ? WHERE id = ?`).run(
          approvedBy,
          approvedAt,
          id,
        )
      } else {
        db.prepare(
          `UPDATE cash_advances SET finance_signed_by = ?, finance_signed_at = ? WHERE id = ?`,
        ).run(approvedBy, approvedAt, id)
      }
      const signed = db.prepare('SELECT lm_signed_by, finance_signed_by FROM cash_advances WHERE id = ?').get(id) as
        | { lm_signed_by: string | null; finance_signed_by: string | null }
        | undefined
      if (!signed) return res.status(404).json({ error: 'Cash advance not found' })
      if (signed.lm_signed_by && signed.finance_signed_by) {
        db.prepare(`UPDATE cash_advances SET status = 'approved', approved_by = ? WHERE id = ?`).run(
          approvedBy,
          id,
        )
      }
    } else {
      const result = approvedBy
        ? db
            .prepare(`UPDATE cash_advances SET status = ?, approved_by = ? WHERE id = ?`)
            .run(status, approvedBy, id)
        : db.prepare('UPDATE cash_advances SET status = ? WHERE id = ?').run(status, id)
      if (!result.changes) return res.status(404).json({ error: 'Cash advance not found' })
    }
  }
  const row = db.prepare('SELECT * FROM cash_advances WHERE id = ?').get(id) as Record<string, unknown>
  res.json(mapCashAdvance(row))
})

app.delete('/api/cash-advances/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT id FROM cash_advances WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Cash advance not found' })
  const run = db.transaction(() => {
    db.prepare('DELETE FROM cash_advance_items WHERE cash_advance_id = ?').run(id)
    db.prepare('DELETE FROM cash_advances WHERE id = ?').run(id)
  })
  run()
  res.json({ ok: true, id })
})

app.put('/api/suppliers/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Supplier not found' })
  const body = req.body ?? {}
  db.prepare(
    `UPDATE suppliers SET name = ?, sector = ?, contact = ?, notes = ? WHERE id = ?`,
  ).run(
    String(body.name || '').trim(),
    String(body.sector || '').trim(),
    String(body.contact || '').trim(),
    String(body.notes || '').trim(),
    id,
  )
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Record<string, unknown>
  res.json(mapSupplier(row))
})

app.delete('/api/suppliers/:id', (req, res) => {
  const id = req.params.id
  const result = db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(id)
  if (!result.changes) return res.status(404).json({ error: 'Supplier not found' })
  res.json({ ok: true, id })
})

app.put('/api/opening-balances/:month', (req, res) => {
  const month = String(req.params.month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Month must be YYYY-MM' })
  }
  const body = req.body ?? {}
  const existing = db.prepare('SELECT * FROM opening_balances WHERE month = ?').get(month) as
    | Record<string, unknown>
    | undefined
  const creditUsd =
    body.creditUsd !== undefined
      ? Math.max(0, Number(body.creditUsd) || 0)
      : Number(existing?.credit_usd) || 0
  const creditIqd =
    body.creditIqd !== undefined
      ? Math.max(0, Number(body.creditIqd) || 0)
      : Number(existing?.credit_iqd) || 0
  const bankCreditUsd =
    body.bankCreditUsd !== undefined
      ? Math.max(0, Number(body.bankCreditUsd) || 0)
      : Number(existing?.bank_credit_usd) || 0
  const bankCreditIqd =
    body.bankCreditIqd !== undefined
      ? Math.max(0, Number(body.bankCreditIqd) || 0)
      : Number(existing?.bank_credit_iqd) || 0
  let cashCountJson =
    typeof existing?.cash_count_json === 'string' ? existing.cash_count_json : ''
  if (body.cashCount && typeof body.cashCount === 'object') {
    const normalized = parseCashCountJson(JSON.stringify(body.cashCount))
    cashCountJson = normalized ? JSON.stringify(normalized) : ''
  }
  db.prepare(
    `INSERT INTO opening_balances
      (month, credit_usd, credit_iqd, bank_credit_usd, bank_credit_iqd, cash_count_json)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET
       credit_usd = excluded.credit_usd,
       credit_iqd = excluded.credit_iqd,
       bank_credit_usd = excluded.bank_credit_usd,
       bank_credit_iqd = excluded.bank_credit_iqd,
       cash_count_json = excluded.cash_count_json`,
  ).run(month, creditUsd, creditIqd, bankCreditUsd, bankCreditIqd, cashCountJson)
  const row = db.prepare('SELECT * FROM opening_balances WHERE month = ?').get(month) as Record<
    string,
    unknown
  >
  res.json(mapOpeningBalance(row))
})

app.put('/api/transactions/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'Transaction not found' })

  const body = req.body ?? {}
  const debit = Number(body.debit) || 0
  const credit = Number(body.credit) || 0
  const amount = Math.max(debit, credit, Number(body.amount) || 0)
  const type = credit > 0 && debit === 0 ? 'income' : String(body.type || 'expense')
  const currency = body.currency === 'IQD' ? 'IQD' : 'USD'

  db.prepare(
    `UPDATE transactions SET
      date = ?, description = ?, type = ?, amount = ?,
      currency = ?, debit = ?, credit = ?,
      supplier_id = ?, invoice_ref = ?, purchase_request_id = ?
    WHERE id = ?`,
  ).run(
    String(body.date || existing.date),
    String(body.description || ''),
    type,
    amount,
    currency,
    debit,
    credit,
    body.supplierId ? String(body.supplierId) : null,
    body.invoiceRef ? String(body.invoiceRef) : null,
    body.purchaseRequestId ?? null,
    id,
  )
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, unknown>
  res.json(mapTxn(row))
})

app.delete('/api/transactions/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'Transaction not found' })

  const prId = (existing.purchase_request_id as string | null) ?? null
  let purchaseRequest: ReturnType<typeof mapPr> | null = null

  const run = db.transaction(() => {
    db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id)
    if (prId) {
      const pr = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(prId) as
        | Record<string, unknown>
        | undefined
      if (pr) {
        const nextStatus = pr.status === 'ordered' ? 'approved' : pr.status
        db.prepare(
          `UPDATE purchase_requests SET payment_status = 'pending', status = ? WHERE id = ?`,
        ).run(nextStatus, prId)
        const updated = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(prId) as Record<
          string,
          unknown
        >
        purchaseRequest = mapPr(updated)
      }
    }
  })
  run()

  res.json({ ok: true, id, purchaseRequest })
})

app.patch('/api/inventory/:id', (req, res) => {
  const id = req.params.id
  const delta = Number(req.body?.delta) || 0
  const row = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!row) return res.status(404).json({ error: 'Item not found' })
  const quantity = Math.max(0, Number(row.quantity) + delta)
  db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(quantity, id)
  res.json({
    id,
    sku: row.sku,
    name: row.name,
    location: row.location,
    quantity,
    reorderLevel: row.reorder_level,
    unit: row.unit,
    linkedPrId: row.linked_pr_id ?? undefined,
  })
})

app.patch('/api/leave-requests/:id/status', (req, res) => {
  ensureLeaveRejectionColumns(db)
  const id = req.params.id
  const status = String(req.body?.status || '')
  if (status === 'rejected') {
    const rejectionReason = String(req.body?.rejectionReason || '').trim()
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection message is required' })
    }
    const rejectedBy = String(req.body?.rejectedBy || '').trim() || null
    const rejectedAt = String(req.body?.rejectedAt || '') || new Date().toISOString()
    const result = db
      .prepare(
        `UPDATE leave_requests SET status = ?, rejection_reason = ?, rejected_by = ?, rejected_at = ? WHERE id = ?`,
      )
      .run(status, rejectionReason, rejectedBy, rejectedAt, id)
    if (!result.changes) return res.status(404).json({ error: 'Leave request not found' })
  } else {
    const signSlot = String(req.body?.signSlot || '').trim()
    const approvedBy = String(req.body?.approvedBy || '').trim() || null
    const approvedAt = String(req.body?.approvedAt || '') || new Date().toISOString()
    if (signSlot === 'lm' || signSlot === 'hr') {
      const current = db
        .prepare('SELECT lm_signed_by, hr_signed_by FROM leave_requests WHERE id = ?')
        .get(id) as
        | { lm_signed_by: string | null; hr_signed_by: string | null }
        | undefined
      if (!current) return res.status(404).json({ error: 'Leave request not found' })
      if (signSlot === 'hr' && !current.lm_signed_by) {
        return res.status(400).json({ error: 'Line manager must sign before HR' })
      }
      if (signSlot === 'lm') {
        db.prepare(`UPDATE leave_requests SET lm_signed_by = ?, lm_signed_at = ? WHERE id = ?`).run(
          approvedBy,
          approvedAt,
          id,
        )
      } else {
        db.prepare(`UPDATE leave_requests SET hr_signed_by = ?, hr_signed_at = ? WHERE id = ?`).run(
          approvedBy,
          approvedAt,
          id,
        )
      }
      const signed = db.prepare('SELECT lm_signed_by, hr_signed_by FROM leave_requests WHERE id = ?').get(id) as
        | { lm_signed_by: string | null; hr_signed_by: string | null }
        | undefined
      if (!signed) return res.status(404).json({ error: 'Leave request not found' })
      if (signed.lm_signed_by && signed.hr_signed_by) {
        db.prepare(`UPDATE leave_requests SET status = 'approved', approved_by = ? WHERE id = ?`).run(
          approvedBy,
          id,
        )
      }
    } else {
      const result = approvedBy
        ? db
            .prepare(`UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?`)
            .run(status, approvedBy, id)
        : db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?').run(status, id)
      if (!result.changes) return res.status(404).json({ error: 'Leave request not found' })
    }
  }
  const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as Record<string, unknown>
  res.json(mapLeaveRequest(row))
})

app.post('/api/leave-requests', (req, res) => {
  const body = req.body ?? {}
  const id = `leave-${Date.now()}`
  const employeeId = String(body.employeeId || '')
  const type = String(body.type || '').trim()
  const startDate = String(body.startDate || '')
  const endDate = String(body.endDate || '')
  const days = Number(body.days ?? 0)
  const reason = String(body.reason || '').trim()
  const status = String(body.status || 'pending')
  if (!employeeId || !type || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'Missing required leave fields' })
  }
  if (!(LEAVE_TYPES as readonly string[]).includes(type)) {
    return res.status(400).json({ error: 'Invalid leave type' })
  }
  const employee = db.prepare('SELECT start_date FROM employees WHERE id = ?').get(employeeId) as
    | { start_date: string }
    | undefined
  if (!employee) return res.status(400).json({ error: 'Employee not found' })
  const entitlements = db.prepare('SELECT * FROM leave_entitlements').all().map((r) => {
    const row = r as Record<string, unknown>
    return {
      type: row.leave_type as string,
      days: row.days as number,
      period: row.period as 'year' | 'month' | 'accrual_month',
    }
  })
  const existing = db.prepare('SELECT * FROM leave_requests WHERE employee_id = ?').all(employeeId).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      type: row.type as string,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      days: row.days as number,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reason: row.reason as string,
    }
  })
  const fitError = leaveRequestFitsEntitlement({
    type,
    employeeId,
    employeeStartDate: employee.start_date,
    startDate,
    endDate,
    requests: existing,
    entitlements,
  })
  if (fitError) return res.status(400).json({ error: fitError })
  db.prepare(
    `INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, days, status, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, employeeId, type, startDate, endDate, days, status, reason)
  const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapLeaveRequest(row))
})

app.patch('/api/trips/:id/status', (req, res) => {
  const id = req.params.id
  const status = String(req.body?.status || '')
  const result = db.prepare('UPDATE trips SET status = ? WHERE id = ?').run(status, id)
  if (!result.changes) return res.status(404).json({ error: 'Trip not found' })
  const row = db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as Record<string, unknown>
  res.json({
    id: row.id,
    purpose: row.purpose,
    destination: row.destination,
    requester: row.requester,
    vehicleId: row.vehicle_id ?? undefined,
    driverId: row.driver_id ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  })
})

app.post('/api/trips', (req, res) => {
  const body = req.body ?? {}
  const id = `trip-${Date.now()}`
  db.prepare(
    `INSERT INTO trips (
      id, purpose, destination, requester, vehicle_id, driver_id, start_date, end_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested')`,
  ).run(
    id,
    String(body.purpose || ''),
    String(body.destination || ''),
    String(body.requester || ''),
    body.vehicleId ?? null,
    body.driverId ?? null,
    String(body.startDate || ''),
    String(body.endDate || ''),
  )
  const row = db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json({
    id: row.id,
    purpose: row.purpose,
    destination: row.destination,
    requester: row.requester,
    vehicleId: row.vehicle_id ?? undefined,
    driverId: row.driver_id ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  })
})

app.post('/api/employees', (req, res) => {
  const body = req.body ?? {}
  const id = `emp-${Date.now()}`
  const departments = Array.isArray(body.departments) ? body.departments : []
  db.prepare(
    `INSERT INTO employees (
      id, name, role, departments_json, email, start_date, salary, leave_balance, manager_id, is_admin, signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    id,
    String(body.name || ''),
    String(body.role || ''),
    JSON.stringify(departments),
    String(body.email || ''),
    String(body.startDate || new Date().toISOString().slice(0, 10)),
    Number(body.salary) || 0,
    Number(body.leaveBalance ?? 15),
    body.managerId ?? null,
    typeof body.signature === 'string' && body.signature.startsWith('data:image/')
      ? body.signature
      : handwrittenSignatureDataUrl(String(body.name || '')),
  )
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapEmployee(row))
})

app.put('/api/employees/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'Employee not found' })
  const body = req.body ?? {}
  const departments = Array.isArray(body.departments) ? body.departments : []
  const isAdmin = Boolean(existing.is_admin)
  const signature =
    typeof body.signature === 'string'
      ? body.signature.startsWith('data:image/')
        ? body.signature
        : null
      : ((existing.signature as string | null) ?? null)
  db.prepare(
    `UPDATE employees SET
      name = ?, role = ?, departments_json = ?, email = ?, start_date = ?,
      salary = ?, leave_balance = ?, manager_id = ?, signature = ?
     WHERE id = ?`,
  ).run(
    String(body.name || existing.name),
    String(body.role || existing.role),
    JSON.stringify(departments),
    String(body.email || existing.email),
    String(body.startDate || existing.start_date),
    Number(body.salary ?? existing.salary),
    Number(body.leaveBalance ?? existing.leave_balance),
    isAdmin ? null : (body.managerId ?? null),
    signature,
    id,
  )
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Record<string, unknown>
  res.json(mapEmployee(row))
})

app.listen(PORT, () => {
  console.log(`REEL local API http://localhost:${PORT}`)
  console.log(`SQLite database ${getDbPath()}`)
})
