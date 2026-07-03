import axios from 'axios'

// ──────────────────────────────────────────────
// Axios instance
// ──────────────────────────────────────────────
export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ──────────────────────────────────────────────
// Domain types (mirrors Java DTOs)
// ──────────────────────────────────────────────
export type SubmissionStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'REVIEWED'
  | 'ENRICHED'
  | 'SCORED'
  | 'DECIDED'
  | 'APPROVED'
  | 'EXPORTED'
  | 'FAILED_AI'
  | 'FAILED_ENRICHMENT'
  | 'FAILED_SCORING'

export type Band = 'Accept' | 'Refer' | 'Decline' | 'ACCEPT' | 'REFER' | 'DECLINE'

export interface CopeFact {
  fieldName: string
  value: string | null
  confidence: number | null
  sourceSnippet: string | null
  overridden: boolean
}

export interface AuditEntry {
  id: string
  factor: string
  impact: string
  explanation: string
}

export interface Decision {
  id: string
  version: number
  isCurrent: boolean
  compositeScore: number
  recommendation: Band
  narrative: string | null
  narrativeSource: string | null   // "llm" | "template"
  pricingGuidance: string | null
  exposureFlags: string | null     // comma-separated or JSON string from backend
  reviewStatus: string | null      // "AI_PROPOSED" | "HUMAN_APPROVED"
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  auditEntries: AuditEntry[]
}


export interface PerilExposure {
  id: string
  peril: string        // "flood" | "earthquake" | "hurricane" | "wildfire"
  severity: string     // "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNAVAILABLE"
  score: number
  rationale: string | null
  source: string       // "FEMA NFHL" | "USGS" | "mocked" | "unavailable"
  isSecondary: boolean
}

export interface PhotoResult {
  id: string
  filename: string
  conditionScore: number | null    // 0–100
  findings: string[]
  failed: boolean
  thumbnailUrl: string | null
}

export interface SubmissionEvent {
  id: string
  taskId: string | null
  eventType: string
  status: string | null
  actor: string | null
  detail: string | null
  errorMessage: string | null
  createdAt: string
}

export interface Submission {
  id: string
  status: SubmissionStatus
  rawText: string | null
  failureReason: string | null
  lastActivityAt: string | null
  createdAt: string
  updatedAt: string
  expressPath: boolean
  copeProfile: CopeFact[] | null
  currentDecision: Decision | null
  events: SubmissionEvent[] | null
  // Enrichment data returned as part of submission detail
  perilExposures: PerilExposure[] | null
  photoResults: PhotoResult[] | null
}

export interface SubmissionSummary {
  id: string
  status: SubmissionStatus
  recommendation: Band | null
  compositeScore: number | null
  createdAt: string
  expressPath: boolean
}

// ──────────────────────────────────────────────
// API functions
// ──────────────────────────────────────────────

export async function createSubmission(
  rawText: string,
  expressPath: boolean,
  photos?: File[],
): Promise<Submission> {
  const form = new FormData()
  form.append('rawText', rawText)
  form.append('expressPath', String(expressPath))
  if (photos) {
    photos.forEach((f) => form.append('photos', f))
  }
  const res = await api.post<Submission>('/submissions', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getSubmission(id: string): Promise<Submission> {
  const res = await api.get<Submission>(`/submissions/${id}`)
  return res.data
}

export async function listSubmissions(): Promise<SubmissionSummary[]> {
  const res = await api.get<SubmissionSummary[]>('/submissions')
  return res.data
}

export async function getEvents(id: string): Promise<SubmissionEvent[]> {
  const res = await api.get<SubmissionEvent[]>(`/submissions/${id}/events`)
  return res.data
}

export async function extractSubmission(id: string): Promise<void> {
  await api.post(`/submissions/${id}/extract`)
}

export async function evaluateSubmission(id: string): Promise<void> {
  await api.post(`/submissions/${id}/evaluate`)
}

/**
 * Confirm COPE review and advance the submission to enrichment.
 *
 * This is the step-by-step path: POST /submissions/{id}/enrich calls
 * republishPendingTask on the orchestrator which, for a submission in
 * EXTRACTED state, calls skipReview to transition it to REVIEWED and
 * immediately starts peril enrichment. Use this from the CopeReviewPage
 * "Confirm & Continue" action.
 *
 * Do NOT use evaluateSubmission() here — that endpoint (POST /evaluate)
 * calls evaluateExpress() which expects DRAFT status and starts the full
 * express pipeline from scratch.
 */
export async function confirmCOPEReview(id: string): Promise<void> {
  await api.post(`/submissions/${id}/enrich`)
}

export async function patchProfile(
  id: string,
  fieldName: string,
  value: string,
): Promise<void> {
  await api.patch(`/submissions/${id}/profile`, { fieldName, value })
}

export async function approveDecision(id: string): Promise<void> {
  await api.post(`/submissions/${id}/decision/approve`)
}

export async function exportSubmission(id: string): Promise<void> {
  const res = await api.post(
    `/submissions/${id}/export`,
    {},
    { responseType: 'blob' },
  )
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `submission-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
