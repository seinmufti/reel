import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')
const dbPath = path.join(dataDir, 'reel.db')

export type ChoiceRow = {
  id: string
  category: string
  value: string
  label: string
  sort_order: number
}

export function openDb() {
  fs.mkdirSync(dataDir, { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  seedIfEmpty(db)
  ensureLaptopBypassPr(db)
  return db
}

export function getDbPath() {
  return dbPath
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS choices (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(category, value)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      departments_json TEXT NOT NULL,
      email TEXT NOT NULL,
      start_date TEXT NOT NULL,
      salary REAL NOT NULL,
      leave_balance REAL NOT NULL,
      manager_id TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS funds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      donor TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      account_id TEXT,
      fund_id TEXT,
      category TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      supplier_id TEXT,
      invoice_ref TEXT,
      purchase_request_id TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sector TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      budget_line TEXT NOT NULL,
      project_id TEXT,
      project_name TEXT,
      department TEXT NOT NULL,
      preliminary_explanation TEXT NOT NULL,
      currency TEXT NOT NULL,
      comments TEXT,
      requester TEXT NOT NULL,
      requester_position TEXT NOT NULL,
      requester_date TEXT NOT NULL,
      approver_name TEXT,
      approver_position TEXT,
      approver_date TEXT,
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pr_items (
      id TEXT PRIMARY KEY,
      purchase_request_id TEXT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      delivery_date_place TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      quantity REAL NOT NULL,
      reorder_level REAL NOT NULL,
      unit TEXT NOT NULL,
      linked_pr_id TEXT
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days REAL NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      week_of TEXT NOT NULL,
      project_id TEXT,
      project_name TEXT,
      hours REAL NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      donor TEXT,
      fund_id TEXT,
      status TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      progress REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      target_date TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      assignee TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      license_no TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      purpose TEXT NOT NULL,
      destination TEXT NOT NULL,
      requester TEXT NOT NULL,
      vehicle_id TEXT,
      driver_id TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opening_balances (
      month TEXT PRIMARY KEY,
      credit_usd REAL NOT NULL DEFAULT 0,
      credit_iqd REAL NOT NULL DEFAULT 0
    );
  `)

  ensureColumn(db, 'purchase_requests', 'approver_name', 'TEXT')
  ensureColumn(db, 'purchase_requests', 'approver_position', 'TEXT')
  ensureColumn(db, 'purchase_requests', 'approver_date', 'TEXT')
  ensureColumn(db, 'transactions', 'currency', `TEXT NOT NULL DEFAULT 'USD'`)
  ensureColumn(db, 'transactions', 'debit', 'REAL NOT NULL DEFAULT 0')
  ensureColumn(db, 'transactions', 'credit', 'REAL NOT NULL DEFAULT 0')
  ensureColumn(db, 'transactions', 'supplier_id', 'TEXT')
  ensureColumn(db, 'transactions', 'invoice_ref', 'TEXT')
  ensureColumn(db, 'transactions', 'created_at', `TEXT NOT NULL DEFAULT ''`)
  // Backfill creation time from txn-<ms> ids when missing
  db.prepare(
    `UPDATE transactions
     SET created_at = CASE
       WHEN id LIKE 'txn-%' AND length(substr(id, 5)) >= 10
         THEN datetime(CAST(substr(id, 5) AS INTEGER) / 1000, 'unixepoch')
       ELSE created_at
     END
     WHERE created_at IS NULL OR created_at = ''`,
  ).run()
  ensureColumn(db, 'suppliers', 'sector', `TEXT NOT NULL DEFAULT ''`)
  ensureColumn(db, 'suppliers', 'created_at', `TEXT NOT NULL DEFAULT ''`)
  ensureColumn(db, 'opening_balances', 'cash_count_json', `TEXT NOT NULL DEFAULT ''`)
  ensureColumn(db, 'opening_balances', 'bank_credit_usd', `REAL NOT NULL DEFAULT 0`)
  ensureColumn(db, 'opening_balances', 'bank_credit_iqd', `REAL NOT NULL DEFAULT 0`)
}

function ensureColumn(db: Database.Database, table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}

function seedIfEmpty(db: Database.Database) {
  const empCount = db.prepare('SELECT COUNT(*) AS n FROM employees').get() as { n: number }
  if (empCount.n > 0) return

  const insertChoice = db.prepare(
    `INSERT INTO choices (id, category, value, label, sort_order) VALUES (@id, @category, @value, @label, @sort_order)`,
  )

  const choiceSeed: Array<[string, string, string, number]> = [
    ['department', 'Finance', 'Finance', 1],
    ['department', 'Procurement', 'Procurement', 2],
    ['department', 'Logistics', 'Logistics', 3],
    ['department', 'HR', 'HR', 4],
    ['department', 'Project', 'Project', 5],
    ['pr_project', 'IQ2026', 'IQ2026', 1],
    ['pr_project', 'SY2026', 'SY2026', 2],
    ['budget_line', 'P.Costs', 'P.Costs', 1],
    ['budget_line', 'R.Costs', 'R.Costs', 2],
    ['currency', 'USD', 'USD', 1],
    ['currency', 'IQD', 'IQD', 2],
    ['pr_status', 'draft', 'Draft', 1],
    ['pr_status', 'submitted', 'Submitted', 2],
    ['pr_status', 'approved', 'Approved', 3],
    ['pr_status', 'rejected', 'Rejected', 4],
    ['pr_status', 'ordered', 'Ordered', 5],
    ['payment_status', 'pending', 'Pending', 1],
    ['payment_status', 'paid', 'Paid', 2],
    ['leave_status', 'pending', 'Pending', 1],
    ['leave_status', 'approved', 'Approved', 2],
    ['leave_status', 'rejected', 'Rejected', 3],
    ['trip_status', 'requested', 'Requested', 1],
    ['trip_status', 'approved', 'Approved', 2],
    ['trip_status', 'in_progress', 'In progress', 3],
    ['trip_status', 'completed', 'Completed', 4],
    ['trip_status', 'cancelled', 'Cancelled', 5],
    ['fund_type', 'restricted', 'Restricted', 1],
    ['fund_type', 'unrestricted', 'Unrestricted', 2],
    ['transaction_type', 'income', 'Income', 1],
    ['transaction_type', 'expense', 'Expense', 2],
    ['project_status', 'active', 'Active', 1],
    ['project_status', 'planned', 'Planned', 2],
    ['project_status', 'closed', 'Closed', 3],
    ['task_status', 'todo', 'To do', 1],
    ['task_status', 'in_progress', 'In progress', 2],
    ['task_status', 'done', 'Done', 3],
    ['vehicle_status', 'available', 'Available', 1],
    ['vehicle_status', 'on_trip', 'On trip', 2],
    ['vehicle_status', 'maintenance', 'Maintenance', 3],
    ['driver_status', 'available', 'Available', 1],
    ['driver_status', 'on_trip', 'On trip', 2],
    ['driver_status', 'off_duty', 'Off duty', 3],
    ['timesheet_status', 'draft', 'Draft', 1],
    ['timesheet_status', 'submitted', 'Submitted', 2],
    ['timesheet_status', 'approved', 'Approved', 3],
  ]

  const seed = db.transaction(() => {
    for (const [category, value, label, sort_order] of choiceSeed) {
      insertChoice.run({
        id: `choice-${category}-${value}`,
        category,
        value,
        label,
        sort_order,
      })
    }

    const departments = choiceSeed
      .filter(([c]) => c === 'department')
      .map(([, v]) => v)

    db.prepare(
      `INSERT INTO employees (
        id, name, role, departments_json, email, start_date, salary, leave_balance, manager_id, is_admin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'emp-zak',
      'Zak',
      'Coordinator of Iraq',
      JSON.stringify(departments),
      'zak@reel.org',
      '2020-03-01',
      3500,
      12,
      null,
      1,
    )

    db.prepare(`INSERT INTO app_meta (key, value) VALUES (?, ?)`).run('current_user_id', 'emp-zak')
    db.prepare(`INSERT INTO app_meta (key, value) VALUES (?, ?)`).run('schema_version', '1')
  })

  seed()
}

function nextPrNumberInDb(db: Database.Database): string {
  const row = db
    .prepare(`SELECT number FROM purchase_requests ORDER BY number DESC LIMIT 1`)
    .get() as { number: string } | undefined
  if (!row?.number) return 'PR.001'
  const match = row.number.match(/(\d+)$/)
  const next = match ? Number(match[1]) + 1 : 1
  return `PR.${String(next).padStart(3, '0')}`
}

/** Bypass PR: 10 laptops, 3 line items, USD 7,000 total. */
function ensureLaptopBypassPr(db: Database.Database) {
  const existing = db
    .prepare(`SELECT id FROM purchase_requests WHERE id = ?`)
    .get('pr-bypass-laptops') as { id: string } | undefined
  if (existing) return

  const today = new Date().toISOString().slice(0, 10)
  const explanation =
    'Bypass purchase of 10 field laptops for monitoring and MEAL teams — deliver to Erbil HQ IT.'
  const items: Array<[string, string, number, number]> = [
    ['pri-laptop-dell', 'Dell Latitude 5440 — 14", 16GB RAM, 512GB SSD', 4, 700],
    ['pri-laptop-lenovo', 'Lenovo ThinkPad L14 — 14", 16GB RAM, 512GB SSD', 3, 700],
    ['pri-laptop-hp', 'HP ProBook 450 G10 — 15.6", 16GB RAM, 512GB SSD', 3, 700],
  ]

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO purchase_requests (
        id, number, title, receipt_date, budget_line, project_id, project_name, department,
        preliminary_explanation, currency, comments, requester, requester_position, requester_date,
        approver_name, approver_position, approver_date,
        status, payment_status, created_at
      ) VALUES (
        @id, @number, @title, @receipt_date, @budget_line, NULL, @project_name, @department,
        @preliminary_explanation, @currency, @comments, @requester, @requester_position, @requester_date,
        @approver_name, @approver_position, @approver_date,
        @status, @payment_status, @created_at
      )`,
    ).run({
      id: 'pr-bypass-laptops',
      number: nextPrNumberInDb(db),
      title: explanation.slice(0, 80),
      receipt_date: today,
      budget_line: 'P.Costs',
      project_name: 'IQ2026',
      department: 'Procurement',
      preliminary_explanation: explanation,
      currency: 'USD',
      comments: 'Bypass approved — standard REEL laptop spec for field staff.',
      requester: 'Zak',
      requester_position: 'Coordinator of Iraq',
      requester_date: today,
      approver_name: 'Zak',
      approver_position: 'Coordinator of Iraq',
      approver_date: today,
      status: 'approved',
      payment_status: 'pending',
      created_at: today,
    })

    const insertItem = db.prepare(
      `INSERT INTO pr_items (
        id, purchase_request_id, description, delivery_date_place, quantity, unit_cost, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    items.forEach(([id, description, quantity, unitCost], index) => {
      insertItem.run(id, 'pr-bypass-laptops', description, '', quantity, unitCost, index)
    })
  })

  insert()
}
