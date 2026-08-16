import type { PrCurrency, PrItem, PrSuggestionSnapshot } from '../types'

export type { PrSuggestionSnapshot }
export type DiffTone = 'unchanged' | 'changed' | 'removed' | 'added'

export type LineCellKey = 'description' | 'quantity' | 'unitCost' | 'total'

export type PrSuggestionDiff = {
  fields: Record<string, DiffTone>
  lines: Record<string, DiffTone>
  lineCells: Record<string, Partial<Record<LineCellKey, DiffTone>>>
}

const FIELD_KEYS = [
  'department',
  'preliminaryExplanation',
  'comments',
  'currency',
  'budgetLine',
  'projectName',
] as const

function norm(value: string | undefined) {
  return (value ?? '').trim()
}

function itemsEqual(a: PrItem, b: PrItem) {
  return (
    norm(a.description) === norm(b.description) &&
    Number(a.quantity) === Number(b.quantity) &&
    Number(a.unitCost) === Number(b.unitCost)
  )
}

export function prToSuggestionSnapshot(pr: {
  department: string
  preliminaryExplanation: string
  comments?: string
  currency: PrCurrency
  budgetLine: string
  projectName?: string
  items: PrItem[]
}): PrSuggestionSnapshot {
  return {
    department: pr.department,
    preliminaryExplanation: pr.preliminaryExplanation,
    comments: pr.comments,
    currency: pr.currency,
    budgetLine: pr.budgetLine,
    projectName: pr.projectName,
    items: pr.items.map((item) => ({ ...item })),
  }
}

export function computePrSuggestionDiff(
  before: PrSuggestionSnapshot,
  after: PrSuggestionSnapshot,
): PrSuggestionDiff {
  const fields: Record<string, DiffTone> = {}
  for (const key of FIELD_KEYS) {
    const left = norm(before[key])
    const right = norm(after[key])
    if (left === right) {
      fields[key] = 'unchanged'
    } else if (!right && left) {
      fields[key] = 'removed'
    } else if (right && !left) {
      fields[key] = 'added'
    } else {
      fields[key] = 'changed'
    }
  }

  const beforeById = new Map(before.items.map((item) => [item.id, item]))
  const afterById = new Map(after.items.map((item) => [item.id, item]))
  const lines: Record<string, DiffTone> = {}
  const lineCells: Record<string, Partial<Record<LineCellKey, DiffTone>>> = {}

  const allLineCells: LineCellKey[] = ['description', 'quantity', 'unitCost', 'total']

  for (const [id, item] of beforeById) {
    const next = afterById.get(id)
    if (!next) {
      lines[id] = 'removed'
      lineCells[id] = Object.fromEntries(allLineCells.map((cell) => [cell, 'removed'])) as Partial<
        Record<LineCellKey, DiffTone>
      >
    } else if (itemsEqual(item, next)) {
      lines[id] = 'unchanged'
    } else {
      lines[id] = 'changed'
      const cells: Partial<Record<LineCellKey, DiffTone>> = {}
      if (norm(item.description) !== norm(next.description)) {
        cells.description = 'changed'
      }
      if (Number(item.quantity) !== Number(next.quantity)) {
        cells.quantity = 'changed'
      }
      if (Number(item.unitCost) !== Number(next.unitCost)) {
        cells.unitCost = 'changed'
      }
      if (cells.quantity || cells.unitCost) {
        cells.total = 'changed'
      }
      lineCells[id] = cells
    }
  }

  for (const [id] of afterById) {
    if (!beforeById.has(id)) {
      lines[id] = 'added'
      lineCells[id] = Object.fromEntries(allLineCells.map((cell) => [cell, 'added'])) as Partial<
        Record<LineCellKey, DiffTone>
      >
    }
  }

  return { fields, lines, lineCells }
}

export function diffHighlightClass(tone: DiffTone | undefined, side: 'before' | 'after') {
  if (!tone || tone === 'unchanged') return ''
  if (side === 'before') {
    if (tone === 'removed') return 'bg-red-100/90 ring-1 ring-inset ring-red-200'
    if (tone === 'changed') return 'bg-amber-100/90 ring-1 ring-inset ring-amber-200'
    return ''
  }
  if (tone === 'added') return 'bg-emerald-100/90 ring-1 ring-inset ring-emerald-200'
  if (tone === 'changed') return 'bg-amber-100/90 ring-1 ring-inset ring-amber-200'
  return ''
}
