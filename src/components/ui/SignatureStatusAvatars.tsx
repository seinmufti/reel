import type { SignatureSlot } from '../../lib/signatureSlots'
import { PersonAvatar } from './PersonAvatar'

export function SignatureStatusAvatars({
  slots,
  size = 'sm',
  className = '',
}: {
  slots: SignatureSlot[]
  size?: 'sm' | 'md'
  className?: string
}) {
  if (slots.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {slots.map((slot, i) => (
        <PersonAvatar
          key={`${slot.seed ?? slot.name}-${i}`}
          name={slot.name}
          seed={slot.seed ?? slot.name}
          role={slot.role}
          size={size}
          tooltipPlacement="top"
          decision={
            slot.rejected
              ? 'rejected'
              : slot.skipped
                ? slot.skipReason === 'waiting'
                  ? 'pendingInLine'
                  : 'skipped'
                : slot.requestor && slot.signed
                  ? 'raised'
                  : slot.signed
                    ? 'approved'
                    : 'pending'
          }
        />
      ))}
    </div>
  )
}
