import type { NavigateFunction } from 'react-router-dom'
import type { PurchaseRequest } from '../types'

export type DashboardQueueKind = 'pr' | 'lv' | 'ca'

export function dashboardQueueId(
  kind: DashboardQueueKind,
  entityId: string,
  outcome: boolean,
): string {
  return outcome ? `${kind}-out-${entityId}` : `${kind}-${entityId}`
}

/** Draft returned to requestor after a reviewer suggested edits. */
export function isPrSuggestionDraft(
  pr: Pick<PurchaseRequest, 'status' | 'suggestionBaseline'>,
): boolean {
  return pr.status === 'draft' && Boolean(pr.suggestionBaseline)
}

/** Where the requestor should open a PR from dashboard or lists. */
export function prRequestorHref(
  pr: Pick<PurchaseRequest, 'id' | 'status' | 'suggestionBaseline'>,
): string {
  const href = isPrSuggestionDraft(pr)
    ? `/procurement/${pr.id}/edit-suggestion`
    : pr.status === 'draft'
      ? `/procurement/${pr.id}/edit`
      : `/procurement/${pr.id}`
  return href
}

export function dashboardPath(queueId: string): string {
  const params = new URLSearchParams({ highlight: queueId })
  return `/?${params.toString()}`
}

/** After submit/sign/reject — replace history so Back cannot reopen the editor. */
export function goAfterFormAction(navigate: NavigateFunction, path: string) {
  navigate(path, { replace: true })
}

export function dashboardItemDomId(queueId: string): string {
  return `dashboard-item-${queueId}`
}

export function prDashboardQueueId(
  entityId: string,
  status: string,
  financeSignedBy?: string,
): string {
  const outcome =
    status === 'rejected' || (status === 'approved' && Boolean(financeSignedBy))
  return dashboardQueueId('pr', entityId, outcome)
}

export function leaveDashboardQueueId(
  entityId: string,
  status: string,
  willComplete: boolean,
): string {
  const outcome = status === 'rejected' || (status === 'approved' && willComplete)
  return dashboardQueueId('lv', entityId, outcome)
}

export function cashAdvanceDashboardQueueId(
  entityId: string,
  status: string,
  willComplete: boolean,
): string {
  const outcome = status === 'rejected' || (status === 'approved' && willComplete)
  return dashboardQueueId('ca', entityId, outcome)
}
