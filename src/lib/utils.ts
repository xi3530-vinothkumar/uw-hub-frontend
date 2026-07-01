import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SubmissionStatus } from '../api/client'

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Statuses that indicate no further polling is needed. */
export const TERMINAL_STATES: SubmissionStatus[] = [
  'DECIDED',
  'APPROVED',
  'EXPORTED',
  'FAILED_AI',
  'FAILED_ENRICHMENT',
  'FAILED_SCORING',
]

/** Statuses that indicate a failure. */
export const FAILED_STATES: SubmissionStatus[] = [
  'FAILED_AI',
  'FAILED_ENRICHMENT',
  'FAILED_SCORING',
]

/** Map a status to a human-readable label. */
export function statusLabel(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    CREATED: 'Created',
    PROCESSING: 'Processing',
    EXTRACTED: 'Extracted',
    REVIEWED: 'Reviewed',
    ENRICHED: 'Enriched',
    SCORED: 'Scored',
    DECIDED: 'Decided',
    APPROVED: 'Approved',
    EXPORTED: 'Exported',
    FAILED_AI: 'AI Failed',
    FAILED_ENRICHMENT: 'Enrichment Failed',
    FAILED_SCORING: 'Scoring Failed',
  }
  return map[status] ?? status
}

/** Format a UTC ISO string to a local short date-time. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Shorten a UUID to its first 8 characters for display. */
export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

/** Format a number as a percentage string. */
export function pct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
