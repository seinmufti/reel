import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { FormProcedureBar } from '../../components/ui/FormProcedureMark'
import { RejectReasonDialog } from '../../components/ui/RejectReasonDialog'
import { SignatureFieldColumn } from '../../components/ui/SignatureMark'
import { useDemo } from '../../context/DemoContext'
import {
  LEAVE_TYPES,
  leaveBalanceForType,
  leaveRequestFitsEntitlement,
} from '../../data/mockData'
import type { Employee } from '../../types'
import { dashboardPath, goAfterFormAction, leaveDashboardQueueId } from '../../lib/dashboardFocus'
import { leaveHrRejected, leaveLmRejected } from '../../lib/signatureSlots'

const slotClass =
  'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] outline-none transition hover:border-slate-soft/40 focus:border-teal focus:shadow-[0_0_0_1px_var(--color-teal)]'

const lockedSlotClass = `${slotClass} !bg-sky-50 text-sky-900/70`

function fieldLabel(text: string, required = false) {
  return (
    <div className="text-[11px] font-semibold leading-tight text-ink/80">
      {text}
      {required ? <span className="text-rose"> *</span> : null}
    </div>
  )
}

function daysBetweenInclusive(start: string, end: string) {
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1
}

function submittedAtFromId(id: string, fallback: string) {
  const stamp = /(\d{10,13})/.exec(id)
  if (stamp) {
    const n = Number(stamp[1])
    if (n > 1e12) return new Date(n).toISOString()
    if (n > 1e9) return new Date(n * 1000).toISOString()
  }
  return fallback
}

function hrSignerFor(employee: Employee, employees: Employee[]) {
  const hrSigners = employees.filter((e) => e.departments.includes('HR') && e.id !== employee.id)
  const dedicatedHr = hrSigners.filter((e) => e.departments.length === 1)
  return dedicatedHr[0] ?? hrSigners.find((e) => !e.isAdmin) ?? hrSigners[0]
}

export function LeaveRequestPage() {
  const navigate = useNavigate()
  const { currentUser, employees, leaveRequests, addLeaveRequest, leaveEntitlements } = useDemo()
  const today = new Date().toISOString().slice(0, 10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<string>('Annual')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState('')

  const manager = employees.find((e) => e.id === currentUser.managerId)
  const hrSigner = hrSignerFor(currentUser, employees)
  const balance = leaveBalanceForType({
    type,
    employeeId: currentUser.id,
    employeeStartDate: currentUser.startDate,
    requests: leaveRequests,
    refDate: startDate,
    entitlements: leaveEntitlements,
  })
  const leavesAvailable = balance?.available ?? 0
  const leavesChosen = daysBetweenInclusive(startDate, endDate)
  const leavesRemaining = leavesAvailable - leavesChosen

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const days = daysBetweenInclusive(startDate, endDate)
    if (!type) {
      setError('Leave type is required.')
      return
    }
    if (days <= 0) {
      setError('End date must be on or after start date.')
      return
    }
    const fitError = leaveRequestFitsEntitlement({
      type,
      employeeId: currentUser.id,
      employeeStartDate: currentUser.startDate,
      startDate,
      endDate,
      requests: leaveRequests,
      entitlements: leaveEntitlements,
    })
    if (fitError) {
      setError(fitError)
      return
    }
    if (!reason.trim()) {
      setError('Reason is required.')
      return
    }
    setSaving(true)
    try {
      const created = await addLeaveRequest({
        employeeId: currentUser.id,
        type,
        startDate,
        endDate,
        days,
        reason: reason.trim(),
        status: 'pending',
      })
      goAfterFormAction(navigate, dashboardPath(leaveDashboardQueueId(created.id, 'pending', false)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit leave request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <FormProcedureBar
        mode="create"
        left={
          <Link to="/">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-lg border-2 border-ink/20 bg-[#fbfcfd] shadow-sm"
    >
      <div className="border-b-2 border-ink/15 bg-teal-soft/30 px-4 py-3 text-center">
        <h2 className="font-display text-xl font-bold text-ink">Leave request</h2>
      </div>

      <div className="flex min-h-[260mm] flex-col space-y-4 p-6 md:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            {fieldLabel('Employee')}
            <input className={lockedSlotClass} readOnly disabled value={currentUser.name} />
          </label>
          <label className="block space-y-1">
            {fieldLabel('Position')}
            <input className={lockedSlotClass} readOnly disabled value={currentUser.role} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            {fieldLabel('Work areas')}
            <input
              className={lockedSlotClass}
              readOnly
              disabled
              value={currentUser.departments.join(', ') || '—'}
            />
          </label>
        </div>

        <label className="block space-y-1">
          {fieldLabel('Leave type', true)}
          <select
            className={slotClass}
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            {fieldLabel('Start date', true)}
            <input
              className={slotClass}
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            {fieldLabel('End date', true)}
            <input
              className={slotClass}
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-md border border-line bg-white px-3 py-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
              Leaves chosen
            </div>
            <div className="mt-1 font-semibold tabular-nums text-ink">{leavesChosen || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
              Leaves available ({type})
            </div>
            <div className="mt-1 font-semibold tabular-nums text-ink">{leavesAvailable}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
              Leaves remaining
            </div>
            <div
              className={`mt-1 font-semibold tabular-nums ${
                leavesRemaining < 0 ? 'text-rose' : 'text-ink'
              }`}
            >
              {leavesChosen ? leavesRemaining : '—'}
            </div>
          </div>
        </div>

        <label className="block flex-1 space-y-1">
          {fieldLabel('Reason', true)}
          <textarea
            className={`${slotClass} min-h-[8rem] resize-y`}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you requesting leave?"
          />
        </label>

        {error ? <p className="text-sm text-rose">{error}</p> : null}

        <div className="mt-auto grid gap-8 pt-8 sm:grid-cols-3 sm:items-stretch">
          <SignatureFieldColumn
            label="Requestor"
            name={currentUser.name}
            position={currentUser.role}
            signed
            date={new Date().toISOString()}
            signature={currentUser.signature}
          />
          <SignatureFieldColumn
            label="Line manager"
            name={manager?.name}
            position={manager?.role}
            vacant={!manager}
            signature={manager?.signature}
          />
          <SignatureFieldColumn
            label="HR"
            name={hrSigner?.name}
            position={hrSigner?.role}
            vacant={!hrSigner}
            signature={hrSigner?.signature}
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
          <Link to="/">
            <Button type="button" variant="cancel" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </div>
    </form>
    </div>
  )
}

export function LeaveRequestView() {
  const { leaveId } = useParams()
  const navigate = useNavigate()
  const { currentUser, employees, leaveRequests, leaveEntitlements, updateLeaveStatus, ready } = useDemo()
  const [signing, setSigning] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const leave = leaveRequests.find((lv) => lv.id === leaveId)
  if (!ready) return null
  if (!leave) return <Navigate to="/hr/leave" replace />

  const employee = employees.find((e) => e.id === leave.employeeId)
  if (!employee) return <Navigate to="/hr/leave" replace />

  const manager = employees.find((e) => e.id === employee.managerId)
  const hrSigner = hrSignerFor(employee, employees)
  const approved = leave.status === 'approved'
  const legacyBothSigned = approved && !leave.lmSignedBy && !leave.hrSignedBy
  const hrSigned = Boolean(leave.hrSignedBy) || legacyBothSigned
  const lmSigned = Boolean(leave.lmSignedBy) || legacyBothSigned
  const hrRejected = leaveHrRejected(leave)
  const lmRejected = leaveLmRejected(leave)
  const canSignLm = leave.status === 'pending' && employee.managerId === currentUser.id && !leave.lmSignedBy
  const canSignHr =
    leave.status === 'pending' &&
    hrSigner?.id === currentUser.id &&
    !leave.hrSignedBy &&
    (manager ? Boolean(leave.lmSignedBy) : true)
  const canAct = canSignLm || canSignHr
  const requestorDate = submittedAtFromId(leave.id, leave.startDate)

  const balance = leaveBalanceForType({
    type: leave.type,
    employeeId: employee.id,
    employeeStartDate: employee.startDate,
    requests: leaveRequests.filter((lv) => lv.id !== leave.id),
    refDate: leave.startDate,
    entitlements: leaveEntitlements,
  })
  const leavesAvailable = balance?.available ?? 0
  const leavesRemaining = leavesAvailable - leave.days

  function handleSign(slot: 'lm' | 'hr') {
    setSigning(true)
    const willComplete = slot === 'hr' || !hrSigner
    void updateLeaveStatus(leave.id, 'approved', {
      signSlot: slot,
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
    })
      .then(() => {
        goAfterFormAction(
          navigate,
          dashboardPath(
            leaveDashboardQueueId(leave.id, willComplete ? 'approved' : 'pending', willComplete),
          ),
        )
      })
      .finally(() => setSigning(false))
  }

  return (
    <div>
      <FormProcedureBar
        mode={canAct ? 'review' : 'view'}
        left={
          <Link to="/hr/leave">
            <Button variant="secondary">Back to list</Button>
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-lg border-2 border-ink/20 bg-[#fbfcfd] shadow-sm">
        <div className="border-b-2 border-ink/15 bg-teal-soft/30 px-4 py-3 text-center">
          <h2 className="font-display text-xl font-bold text-ink">Leave request</h2>
        </div>

        <div className="flex min-h-[260mm] flex-col space-y-4 p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              {fieldLabel('Employee')}
              <input className={lockedSlotClass} readOnly disabled value={employee.name} />
            </label>
            <label className="block space-y-1">
              {fieldLabel('Position')}
              <input className={lockedSlotClass} readOnly disabled value={employee.role} />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              {fieldLabel('Work areas')}
              <input
                className={lockedSlotClass}
                readOnly
                disabled
                value={employee.departments.join(', ') || '—'}
              />
            </label>
          </div>

          <label className="block space-y-1">
            {fieldLabel('Leave type', true)}
            <input className={lockedSlotClass} readOnly disabled value={leave.type} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              {fieldLabel('Start date', true)}
              <input className={lockedSlotClass} type="date" readOnly disabled value={leave.startDate} />
            </label>
            <label className="block space-y-1">
              {fieldLabel('End date', true)}
              <input className={lockedSlotClass} type="date" readOnly disabled value={leave.endDate} />
            </label>
          </div>

          <div className="grid gap-3 rounded-md border border-line bg-white px-3 py-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                Leaves chosen
              </div>
              <div className="mt-1 font-semibold tabular-nums text-ink">{leave.days}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                Leaves available ({leave.type})
              </div>
              <div className="mt-1 font-semibold tabular-nums text-ink">{leavesAvailable}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                Leaves remaining
              </div>
              <div
                className={`mt-1 font-semibold tabular-nums ${
                  leavesRemaining < 0 ? 'text-rose' : 'text-ink'
                }`}
              >
                {leavesRemaining}
              </div>
            </div>
          </div>

          <label className="block flex-1 space-y-1">
            {fieldLabel('Reason', true)}
            <textarea
              className={`${lockedSlotClass} min-h-[8rem] resize-y`}
              readOnly
              disabled
              value={leave.reason}
            />
          </label>

          <label className="block space-y-1">
            {fieldLabel('Rejection message')}
            <textarea
              className={`${lockedSlotClass} min-h-[3.5rem]`}
              readOnly
              disabled
              value={leave.rejectionReason ?? ''}
              placeholder="Filled when this request is rejected"
            />
          </label>

          <div className="mt-auto grid gap-8 pt-8 sm:grid-cols-3 sm:items-stretch">
            <SignatureFieldColumn
              label="Requestor"
              name={employee.name}
              position={employee.role}
              signed
              date={requestorDate}
              signature={employee.signature}
            />
            <SignatureFieldColumn
              label="Line manager"
              name={manager?.name}
              position={manager?.role}
              vacant={!manager}
              signed={lmSigned}
              date={lmRejected ? leave.rejectedAt : leave.lmSignedAt}
              signature={manager?.signature}
              onTapToSign={canSignLm ? () => handleSign('lm') : undefined}
              tapBusy={signing}
              rejectedStamp={lmRejected}
              rejectionReason={lmRejected ? leave.rejectionReason : undefined}
            />
            <SignatureFieldColumn
              label="HR"
              name={hrSigner?.name}
              position={hrSigner?.role}
              vacant={!hrSigner}
              signed={hrSigned}
              date={hrRejected ? leave.rejectedAt : leave.hrSignedAt}
              signature={hrSigner?.signature}
              onTapToSign={canSignHr ? () => handleSign('hr') : undefined}
              tapBusy={signing}
              rejectedStamp={hrRejected}
              rejectionReason={hrRejected ? leave.rejectionReason : undefined}
            />
          </div>

          {canAct ? (
            <div className="flex justify-end border-t border-line pt-4">
              <Button
                type="button"
                variant="danger"
                disabled={signing || rejecting}
                onClick={() => setShowRejectDialog(true)}
              >
                Reject
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <RejectReasonDialog
        key={showRejectDialog ? 'open' : 'closed'}
        open={showRejectDialog}
        busy={rejecting}
        onCancel={() => {
          if (!rejecting) setShowRejectDialog(false)
        }}
        onConfirm={(reason) => {
          setRejecting(true)
          void updateLeaveStatus(leave.id, 'rejected', {
            rejectionReason: reason,
            rejectedBy: currentUser.name,
            rejectedAt: new Date().toISOString(),
          })
            .then(() => {
              setShowRejectDialog(false)
              setRejecting(false)
              goAfterFormAction(navigate, dashboardPath(leaveDashboardQueueId(leave.id, 'rejected', true)))
            })
            .catch((err) => {
              window.alert(err instanceof Error ? err.message : 'Could not reject leave request.')
              setRejecting(false)
            })
        }}
      />
    </div>
  )
}
