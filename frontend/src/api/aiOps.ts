import api from '@/api'

export type ActionId =
  | 'acknowledge_alert'
  | 'create_incident_timeline_note'
  | 'mute_alert_rule_temporarily'

export type ActionClass = 'platform_action'

export type ActionRequestStatus =
  | 'REQUESTED'
  | 'DRY_RUN_READY'
  | 'CONFIRMED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCEEDED'
  | 'FAILED'

export interface AcknowledgeAlertParams {
  eventId: string
  comment?: string
}

export interface CreateIncidentTimelineNoteParams {
  incidentId: string
  note: string
  visibility?: string
}

export interface MuteAlertRuleTemporarilyParams {
  ruleId: string
  durationSec: number
  reason: string
}

export type ActionRequestInput =
  | {
    actionClass: ActionClass
    actionId: 'acknowledge_alert'
    idempotencyKey: string
    params: AcknowledgeAlertParams
    incidentId?: string
    eventId?: string
    comment?: string
  }
  | {
    actionClass: ActionClass
    actionId: 'create_incident_timeline_note'
    idempotencyKey: string
    params: CreateIncidentTimelineNoteParams
    incidentId?: string
    note?: string
    visibility?: string
  }
  | {
    actionClass: ActionClass
    actionId: 'mute_alert_rule_temporarily'
    idempotencyKey: string
    params: MuteAlertRuleTemporarilyParams
    ruleId?: string
    durationSec?: number
    reason?: string
  }

export interface DryRunResult {
  allowed: boolean
  riskLevel: string
  warnings: string[]
  impact: {
    entities: string[]
    estimatedDurationSec: number
    summary: string
  }
  resolvedParams: Record<string, unknown>
}

export type ExecutionResult = {
  ok?: boolean
  eventId?: string
  noteId?: string
  incidentId?: string
  ruleId?: string
  [key: string]: unknown
}

export interface VerificationResult {
  status: 'pass' | 'fail' | string
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | string
  }>
}

export interface ActionRequestRecord {
  requestId: string
  traceId: string
  actionClass: ActionClass
  actionId: ActionId
  idempotencyKey: string
  status: ActionRequestStatus
  params: Record<string, unknown>
  incidentId: string
  actorId: string
  actorRole: string
  dryRunResult: DryRunResult | null
  resolvedParams: Record<string, unknown> | null
  executionResult: ExecutionResult | null
  verificationResult: VerificationResult | null
  error: {
    code: string
    message: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  requestId: string
  traceId: string
  eventType:
  | 'ACTION_REQUESTED'
  | 'ACTION_DRY_RUN_COMPLETED'
  | 'ACTION_CONFIRMED'
  | 'ACTION_EXECUTION_STARTED'
  | 'ACTION_EXECUTION_COMPLETED'
  | 'ACTION_VERIFICATION_COMPLETED'
  | 'ACTION_COMPLETED'
  timestamp: string
  actorType: string
  actorId: string
  actorRole: string
  actionClass: ActionClass
  actionId: ActionId
  incidentId: string
  statusFrom: string
  statusTo: ActionRequestStatus
  riskLevel: string
  dryRunResult: DryRunResult | null
  resolvedParams: Record<string, unknown> | null
  error: {
    code: string
    message: string
  } | null
}

export const createActionRequest = (input: ActionRequestInput) => {
  return api.post<
    any,
    {
      success: boolean
      data: {
        requestId: string
        status: ActionRequestStatus
        dryRun: DryRunResult
      }
    }
  >('/ai/v2/action-requests', input)
}

export const confirmActionRequest = (requestId: string) => {
  return api.post<
    any,
    {
      success: boolean
      data: {
        requestId: string
        status: ActionRequestStatus
      }
    }
  >(`/ai/v2/action-requests/${requestId}/confirm`, { confirm: true })
}

export const getActionRequest = (requestId: string) => {
  return api.get<any, { success: boolean; data: ActionRequestRecord }>(
    `/ai/v2/action-requests/${requestId}`
  )
}

export const getActionTimeline = (requestId: string) => {
  return api.get<
    any,
    {
      success: boolean
      data: {
        requestId: string
        events: TimelineEvent[]
      }
    }
  >(`/ai/v2/action-requests/${requestId}/timeline`)
}
