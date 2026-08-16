import { useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { PersonAvatar } from '../../components/ui/PersonAvatar'
import { SignatureCapture } from '../../components/ui/SignatureCapture'
import { SignatureStatusAvatars } from '../../components/ui/SignatureStatusAvatars'
import { Table, Td, Th } from '../../components/ui/Table'
import { leaveSignatureSlots } from '../../lib/signatureSlots'
import { useDemo } from '../../context/DemoContext'
import {
  accruedLeaveBalance,
  directReports,
  employeeDepth,
  employeesInOrgOrder,
  formatMoney,
  formatDate,
  payrollForEmployees,
} from '../../data/mockData'
import type { Employee } from '../../types'
import { LeaveRequestPage, LeaveRequestView } from './LeaveRequestPage'

type Tab = 'people' | 'leave' | 'timesheets' | 'payroll' | 'form'
type PeopleView = 'list' | 'tree'

const HR_TABS = [
  ['people', 'Employees', '/hr'],
  ['leave', 'Leaves', '/hr/leave'],
  ['timesheets', 'Timesheets', '/hr/timesheets'],
  ['payroll', 'Payroll', '/hr/payroll'],
] as const

function tabFromPath(pathname: string): Tab {
  if (pathname.endsWith('/leave')) return 'leave'
  if (pathname.endsWith('/timesheets')) return 'timesheets'
  if (pathname.endsWith('/payroll')) return 'payroll'
  if (pathname.endsWith('/new') || pathname.endsWith('/edit')) return 'form'
  return 'people'
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TreeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="3.5" r="1.6" fill="currentColor" />
      <circle cx="4" cy="12.5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12.5" r="1.6" fill="currentColor" />
      <path d="M8 5.2V8M8 8H4v2.8M8 8h4v2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ViewSwitch({
  value,
  onChange,
}: {
  value: PeopleView
  onChange: (view: PeopleView) => void
}) {
  return (
    <div
      className="inline-flex rounded-md border border-line bg-mist/60 p-0.5"
      role="group"
      aria-label="Employee view"
    >
      <button
        type="button"
        title="List view"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={`inline-flex h-8 w-8 items-center justify-center rounded transition ${
          value === 'list' ? 'bg-white text-teal shadow-sm' : 'text-slate-soft/70 hover:text-ink'
        }`}
      >
        <ListIcon />
      </button>
      <button
        type="button"
        title="Tree view"
        aria-pressed={value === 'tree'}
        onClick={() => onChange('tree')}
        className={`inline-flex h-8 w-8 items-center justify-center rounded transition ${
          value === 'tree' ? 'bg-white text-teal shadow-sm' : 'text-slate-soft/70 hover:text-ink'
        }`}
      >
        <TreeIcon />
      </button>
    </div>
  )
}

function OrgTreeCard({
  employee,
  employees,
}: {
  employee: Employee
  employees: Employee[]
}) {
  const manager = employees.find((e) => e.id === employee.managerId)
  const reports = directReports(employee.id, employees)

  return (
    <div className="group relative flex w-[9.5rem] flex-col items-center text-center">
      <PersonAvatar
        name={employee.name}
        seed={employee.id}
        showTooltip={false}
        className="mb-2"
      />
      <div className="text-sm font-semibold leading-tight text-ink">{employee.name}</div>
      <div className="mt-0.5 text-xs leading-snug text-slate-soft/75">{employee.role}</div>
      <div className="pointer-events-none absolute left-full top-0 z-20 ml-2 w-52 rounded-lg border border-line bg-white p-3 text-left opacity-0 shadow-lg transition group-hover:opacity-100">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <span>{employee.name}</span>
          {employee.isAdmin ? <Badge tone="rose">Admin</Badge> : null}
        </div>
        <div className="mt-0.5 text-xs text-slate-soft/80">{employee.role}</div>
        {employee.email ? (
          <div className="mt-2 text-xs text-slate-soft/70">{employee.email}</div>
        ) : null}
        <div className="mt-2 text-xs text-slate-soft/70">
          Reports to: {manager?.name ?? '—'}
        </div>
        <div className="mt-0.5 text-xs text-slate-soft/70">
          Direct reports: {reports.length > 0 ? reports.map((r) => r.name).join(', ') : '—'}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {employee.departments.map((dept) => (
            <Badge key={dept} tone="teal">
              {dept}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

function OrgTreeBranch({
  employee,
  employees,
}: {
  employee: Employee
  employees: Employee[]
  isRoot?: boolean
}) {
  const reports = directReports(employee.id, employees)

  return (
    <div className="flex flex-col items-center">
      <OrgTreeCard employee={employee} employees={employees} />
      {reports.length > 0 ? (
        <>
          <div className="h-4 w-px bg-line" aria-hidden />
          <div className="flex items-start justify-center">
            {reports.map((child, index) => (
              <div key={child.id} className="relative flex flex-col items-center px-3">
                {reports.length > 1 ? (
                  <div
                    className={`absolute top-0 h-px bg-line ${
                      index === 0
                        ? 'left-1/2 right-0'
                        : index === reports.length - 1
                          ? 'left-0 right-1/2'
                          : 'left-0 right-0'
                    }`}
                    aria-hidden
                  />
                ) : null}
                <div className="h-4 w-px bg-line" aria-hidden />
                <OrgTreeBranch employee={child} employees={employees} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function OrgTreeView({ employees }: { employees: Employee[] }) {
  const roots = employees.filter((e) => !e.managerId || !employees.some((m) => m.id === e.managerId))

  if (roots.length === 0) {
    return <p className="text-sm text-slate-soft/70">No employees to show.</p>
  }

  return (
    <div className="flex min-h-[16rem] flex-wrap items-start justify-center gap-10 overflow-x-auto py-4">
      {roots.map((root) => (
        <OrgTreeBranch key={root.id} employee={root} employees={employees} isRoot />
      ))}
    </div>
  )
}

function EmployeeForm({
  mode,
  employee,
  employees,
  departments,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  employee?: Employee
  employees: Employee[]
  departments: string[]
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  const managerOptions = employees.filter((emp) => emp.id !== employee?.id)
  const defaultManager = employee?.managerId ?? (employee?.isAdmin ? '' : 'emp-zak')
  const [signature, setSignature] = useState(employee?.signature ?? '')

  return (
    <Panel title={mode === 'create' ? 'Create employee' : `Edit employee — ${employee?.name}`}>
      <form key={employee?.id ?? 'new'} className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <Field label="Name" className="sm:col-span-2">
          <input
            className={inputClass}
            name="name"
            required
            placeholder="Full name"
            defaultValue={employee?.name}
          />
        </Field>
        <Field label="Role" className="sm:col-span-2">
          <input
            className={inputClass}
            name="role"
            required
            placeholder="e.g. Finance Assistant"
            defaultValue={employee?.role}
          />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 block text-sm font-medium text-slate-soft">
            Departments (work areas)
          </legend>
          <div className="flex flex-wrap gap-3 rounded-md border border-line bg-paper/60 px-3 py-3">
            {departments.map((dept) => (
              <label
                key={dept}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:border-teal"
              >
                <input
                  type="checkbox"
                  name={`dept-${dept}`}
                  className="h-4 w-4 accent-teal"
                  defaultChecked={employee?.departments.includes(dept)}
                />
                {dept}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-soft/70">
            Check which modules this person can work in.
          </p>
        </fieldset>
        <Field label="Email (optional)" className="sm:col-span-2">
          <input
            className={inputClass}
            name="email"
            type="email"
            placeholder="name@reel.org"
            defaultValue={employee?.email}
          />
        </Field>
        {employee?.isAdmin ? (
          <Field label="Reports to">
            <input className={inputClass} value="— (Admin)" disabled readOnly />
          </Field>
        ) : (
          <Field label="Reports to">
            <select className={inputClass} name="managerId" required defaultValue={defaultManager}>
              {managerOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Start date">
          <input
            className={inputClass}
            name="startDate"
            type="date"
            required
            defaultValue={employee?.startDate ?? new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Salary (USD)" className="sm:col-span-2">
          <input
            className={inputClass}
            name="salary"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={employee?.salary ?? 1500}
          />
        </Field>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-slate-soft">Signature</span>
          <SignatureCapture value={signature} onChange={setSignature} />
          <input type="hidden" name="signature" value={signature} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">{mode === 'create' ? 'Create employee' : 'Save changes'}</Button>
        </div>
      </form>
    </Panel>
  )
}

export function HrPage() {
  return (
    <Routes>
      <Route path="leave/new" element={<LeaveRequestPage />} />
      <Route path="leave/:leaveId" element={<LeaveRequestView />} />
      <Route path="new" element={<HrShell />} />
      <Route path=":employeeId/edit" element={<HrShell />} />
      <Route path="leave" element={<HrShell />} />
      <Route path="timesheets" element={<HrShell />} />
      <Route path="payroll" element={<HrShell />} />
      <Route index element={<HrShell />} />
      <Route path="*" element={<Navigate to="/hr" replace />} />
    </Routes>
  )
}

function HrShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { employeeId } = useParams()
  const {
    leaveRequests,
    employees,
    addEmployee,
    updateEmployee,
    departments,
    timesheets,
    currentUser,
  } = useDemo()
  const isAdmin = Boolean(currentUser.isAdmin)
  const tab = tabFromPath(pathname)
  const [peopleView, setPeopleView] = useState<PeopleView>('list')
  const editingId = tab === 'form' && employeeId ? employeeId : null
  const payroll = payrollForEmployees(employees)
  const editingEmployee = employees.find((e) => e.id === editingId)

  function readForm(fd: FormData) {
    const selectedDepts = departments.filter((dept) => fd.get(`dept-${dept}`) === 'on')
    return {
      selectedDepts,
      name: String(fd.get('name')).trim(),
      role: String(fd.get('role')).trim(),
      email: String(fd.get('email')).trim(),
      salary: Number(fd.get('salary')),
      startDate: String(fd.get('startDate')),
      managerId: String(fd.get('managerId') || '') || undefined,
      signature: String(fd.get('signature') || ''),
    }
  }

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isAdmin) return
    const data = readForm(new FormData(e.currentTarget))
    if (data.selectedDepts.length === 0) {
      window.alert('Select at least one department / work area.')
      return
    }
    addEmployee({
      name: data.name,
      role: data.role,
      departments: [...data.selectedDepts],
      email: data.email,
      salary: data.salary,
      startDate: data.startDate,
      managerId: data.managerId,
      signature: data.signature || undefined,
    })
    navigate('/hr')
  }

  function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingId || !editingEmployee) return
    const data = readForm(new FormData(e.currentTarget))
    if (data.selectedDepts.length === 0) {
      window.alert('Select at least one department / work area.')
      return
    }
    updateEmployee(editingId, {
      name: data.name,
      role: data.role,
      departments: [...data.selectedDepts],
      email: data.email,
      salary: data.salary,
      startDate: data.startDate,
      managerId: editingEmployee.isAdmin ? undefined : data.managerId,
      signature: data.signature || undefined,
    })
    navigate('/hr')
  }

  function openCreate() {
    if (!isAdmin) return
    navigate('/hr/new')
  }

  function openEdit(id: string) {
    navigate(`/hr/${id}/edit`)
  }

  const formMode = editingId ? 'edit' : 'create'
  const showForm = tab === 'form' && (Boolean(editingId) || isAdmin)

  if (pathname.endsWith('/edit') && editingId && !editingEmployee) {
    return <Navigate to="/hr" replace />
  }
  if (pathname.endsWith('/new') && !isAdmin) {
    return <Navigate to="/hr" replace />
  }

  return (
    <div>
      <PageHeader
        title="Human Resources"
        actions={
          showForm ? (
            <Button variant="cancel" onClick={() => navigate('/hr')}>
              Cancel
            </Button>
          ) : isAdmin ? (
            <Button onClick={openCreate}>New employee</Button>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          HR_TABS
        ).map(([id, label, to]) => (
          <Button
            key={id}
            variant={tab === id || (id === 'people' && showForm) ? 'primary' : 'secondary'}
            onClick={() => navigate(to)}
          >
            {label}
          </Button>
        ))}
      </div>

      {showForm ? (
        formMode === 'edit' && editingEmployee ? (
          <EmployeeForm
            mode="edit"
            employee={editingEmployee}
            employees={employees}
            departments={departments}
            onSubmit={handleUpdate}
          />
        ) : (
          <EmployeeForm
            mode="create"
            employees={employees}
            departments={departments}
            onSubmit={handleCreate}
          />
        )
      ) : null}

      {tab === 'people' ? (
        <Panel
          title="Org chart — managerial hierarchy"
          actions={<ViewSwitch value={peopleView} onChange={setPeopleView} />}
        >
          {peopleView === 'list' ? (
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Role</Th>
                  <Th>Work areas</Th>
                  <Th>Reports to</Th>
                  <Th className="text-right">Leave Balance</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {employeesInOrgOrder(employees).map((emp) => {
                  const depth = employeeDepth(emp, employees)
                  const manager = employees.find((e) => e.id === emp.managerId)
                  return (
                    <tr key={emp.id}>
                      <Td>
                        <div
                          className="flex items-center gap-2 font-medium"
                          style={{ paddingLeft: `${depth * 1.5}rem` }}
                        >
                          {depth > 0 ? (
                            <span className="text-slate-soft/40 select-none" aria-hidden>
                              └
                            </span>
                          ) : null}
                          <span>{emp.name}</span>
                          {emp.isAdmin ? <Badge tone="rose">Admin</Badge> : null}
                        </div>
                      </Td>
                      <Td>{emp.role}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {emp.departments.map((dept) => (
                            <Badge key={dept} tone="teal">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </Td>
                      <Td>{manager ? manager.name : <span className="text-slate-soft/50">—</span>}</Td>
                      <Td className="text-right">{accruedLeaveBalance(emp.startDate)} days</Td>
                      <Td className="text-right">
                        <Button variant="secondary" onClick={() => openEdit(emp.id)}>
                          Edit
                        </Button>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          ) : (
            <OrgTreeView employees={employees} />
          )}
        </Panel>
      ) : null}

      {tab === 'leave' ? (
        <Panel title="Leave requests">
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No leave requests yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Type</Th>
                  <Th>Dates</Th>
                  <Th>Days</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((lv) => {
                  const emp = employees.find((e) => e.id === lv.employeeId)
                  return (
                    <tr key={lv.id}>
                      <Td className="font-medium">{emp?.name}</Td>
                      <Td>{lv.type}</Td>
                      <Td>
                        {formatDate(lv.startDate)} → {formatDate(lv.endDate)}
                      </Td>
                      <Td>{lv.days}</Td>
                      <Td>{lv.reason}</Td>
                      <Td>
                        <div className="flex flex-col items-start gap-2">
                          <Badge tone={statusTone(lv.status)}>{lv.status}</Badge>
                          <SignatureStatusAvatars slots={leaveSignatureSlots(lv, employees)} />
                        </div>
                      </Td>
                      <Td className="text-right">
                        <Link to={`/hr/leave/${lv.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : null}

      {tab === 'timesheets' ? (
        <Panel title="Weekly timesheets">
          {timesheets.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No timesheets yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Week of</Th>
                  <Th>Project</Th>
                  <Th className="text-right">Hours</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((ts) => {
                  const emp = employees.find((e) => e.id === ts.employeeId)
                  return (
                    <tr key={ts.id}>
                      <Td className="font-medium">{emp?.name}</Td>
                      <Td>{formatDate(ts.weekOf)}</Td>
                      <Td>{ts.projectName ?? 'Operations / admin'}</Td>
                      <Td className="text-right font-semibold">{ts.hours}</Td>
                      <Td>
                        <Badge tone={statusTone(ts.status)}>{ts.status}</Badge>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : null}

      {tab === 'payroll' ? (
        <Panel title="Salary register — July 2026">
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Work areas</Th>
                <Th className="text-right">Gross</Th>
                <Th className="text-right">Deductions</Th>
                <Th className="text-right">Net</Th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((row) => {
                const emp = employees.find((e) => e.id === row.employeeId)
                return (
                  <tr key={row.id}>
                    <Td className="font-medium">{emp?.name}</Td>
                    <Td>{emp?.departments.join(', ')}</Td>
                    <Td className="text-right">{formatMoney(row.gross)}</Td>
                    <Td className="text-right">{formatMoney(row.deductions)}</Td>
                    <Td className="text-right font-semibold">{formatMoney(row.net)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Panel>
      ) : null}
    </div>
  )
}
