import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

type Offset = { x: number; y: number }

const DRAG_THRESHOLD_PX = 6

function readStoredOffset(key: string): Offset {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { x: 0, y: 0 }
    const parsed = JSON.parse(raw) as Offset
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 }
}

type DraggableStampButtonProps = {
  storageKey: string
  canAct: boolean
  applied?: boolean
  busy?: boolean
  onStamp: () => void
  /** Tailwind classes for the default anchor (before drag offset). */
  anchorClassName?: string
}

export function DraggableStampButton({
  storageKey,
  canAct,
  applied = false,
  busy = false,
  onStamp,
  anchorClassName = 'left-[calc(-1.5rem-(100vw-3.5rem-3rem-min(64rem,100vw-3.5rem-3rem))/4)] top-1/2',
}: DraggableStampButtonProps) {
  const [offset, setOffset] = useState<Offset>(() => readStoredOffset(storageKey))
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: Offset; moved: boolean } | null>(
    null,
  )

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(offset))
  }, [offset, storageKey])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: offset,
        moved: false,
      }
    },
    [offset],
  )

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      drag.moved = true
    }
    if (drag.moved) {
      setOffset({ x: drag.origin.x + dx, y: drag.origin.y + dy })
    }
  }, [])

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (!drag.moved && canAct && !busy) {
        onStamp()
      }
    },
    [busy, canAct, onStamp],
  )

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
  }, [])

  return (
    <button
      type="button"
      aria-label={
        canAct ? 'Apply official stamp and sign' : applied ? 'Official stamp applied' : 'Official stamp'
      }
      disabled={busy}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`absolute z-10 h-40 w-40 touch-none rounded-md border-0 bg-transparent p-0 enabled:cursor-grab enabled:active:cursor-grabbing enabled:hover:scale-105 disabled:cursor-default sm:h-44 sm:w-44 ${anchorClassName}`}
      style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
    >
      <img src="/signature-stamp.png" alt="" aria-hidden className="pointer-events-none h-full w-full object-contain" />
    </button>
  )
}
