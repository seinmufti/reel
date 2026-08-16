import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

const CSS_W = 400
const CSS_H = 110

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(CSS_W / img.width, CSS_H / img.height, 1)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not process image'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function SignatureCapture({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)
  const [error, setError] = useState<string | null>(null)

  function setupCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = CSS_W * dpr
    canvas.height = CSS_H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#6b4c9a'
    ctx.lineWidth = 2.4
    ctx.clearRect(0, 0, CSS_W, CSS_H)
    return ctx
  }

  useEffect(() => {
    const ctx = setupCanvas()
    if (!ctx || !value) return
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(CSS_W / img.width, CSS_H / img.height, 1)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (CSS_W - w) / 2, (CSS_H - h) / 2, w, h)
    }
    img.src = value
  }, [value])

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CSS_W,
      y: ((e.clientY - rect.top) / rect.height) * CSS_H,
    }
  }

  function commit() {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CSS_W}
        height={CSS_H}
        className="h-[110px] w-full max-w-[400px] cursor-crosshair touch-none rounded-md border border-line bg-white"
        onPointerDown={(e) => {
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          drawing.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          const { x, y } = point(e)
          ctx.beginPath()
          ctx.moveTo(x, y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const { x, y } = point(e)
          ctx.lineTo(x, y)
          ctx.stroke()
        }}
        onPointerUp={() => {
          if (!drawing.current) return
          drawing.current = false
          commit()
        }}
        onPointerCancel={() => {
          drawing.current = false
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setError(null)
            void resizeImageToDataUrl(file)
              .then(onChange)
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not upload'))
          }}
        />
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
          Upload image
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setupCanvas()
            onChange('')
            setError(null)
          }}
        >
          Clear
        </Button>
        <span className="text-xs text-slate-soft/70">Draw in the box or upload a signature image.</span>
      </div>
      {error ? <p className="mt-1 text-sm text-rose">{error}</p> : null}
    </div>
  )
}
