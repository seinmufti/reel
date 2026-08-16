import { useState } from 'react'
import { Button } from './Button'

export function RejectReasonDialog({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  busy?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-reason-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
      >
        <h3 id="reject-reason-title" className="font-display text-lg font-semibold text-ink">
          Rejection message
        </h3>
        <textarea
          className="mt-3 min-h-[7rem] w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-teal"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Write the rejection message"
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {busy ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </div>
    </div>
  )
}
