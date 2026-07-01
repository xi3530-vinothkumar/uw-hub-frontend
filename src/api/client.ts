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

export type Band = 'ACCEPT' | 'REFER' | 'DECLINE'

export interface CopeFact {
  fieldName: string
  value: string | null
  confidence: number | null
  sourceSnippet: string | null
  overridden: boolean
}

export interface ScoringFactor {
  factor: string
  weight: number
  rawScore: number
  weightedScore: number
  notes: string | null
}

export interface Decision {
  id: string
  band: Band
  compositeScore: number
  narrative: string | null
  pricingGuidance: string | null
  isCurrent: boolean
  createdAt: string
  factors: ScoringFactor[]
  exposureFlags: string[]
}

export interface SubmissionEvent {
  id: string
  eventType: string
  description: string
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface Submission {
  id: string
  status: SubmissionStatus
  rawText: string | null
  createdAt: string
  updatedAt: string
  profile: CopeFact[] | null
  currentDecision: Decision | null
  photoCount: number
  expressPath: boolean
}

export interface SubmissionSummary {
  id: string
  status: SubmissionStatus
  band: Band | null
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
