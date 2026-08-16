/** Cursive SVG sized tightly around the signature text. */
const SIGNATURE_FONT =
  'Segoe Script, Brush Script MT, Lucida Handwriting, Apple Chancery, cursive'

function estimateTextWidth(label: string, fontSize: number): number {
  let width = 0
  for (const ch of label) {
    const lower = ch.toLowerCase()
    if ('iljtfr1'.includes(lower)) width += fontSize * 0.38
    else if ('mwMW@'.includes(ch)) width += fontSize * 0.88
    else if (ch === ' ') width += fontSize * 0.35
    else width += fontSize * 0.64
  }
  // Cursive italic overhangs — pad estimate so glyphs aren't clipped.
  return Math.ceil(width * 1.12)
}

export function handwrittenSignatureDataUrl(name: string): string {
  const label = name.trim() || 'Signature'
  const safe = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const size = label.length > 18 ? 42 : label.length > 12 ? 50 : 58
  const textW = estimateTextWidth(label, size)
  const pad = Math.max(4, Math.round(size * 0.08))
  const ascender = Math.round(size * 0.72)
  const descender = Math.round(size * 0.16)
  const vbW = textW + pad * 2
  const vbH = ascender + descender + pad * 2
  const textX = pad
  const textY = pad + ascender
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="0 0 ${vbW} ${vbH}">
  <text x="${textX}" y="${textY}" fill="#6b4c9a" font-size="${size}" font-family="${SIGNATURE_FONT}" font-style="italic">${safe}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
