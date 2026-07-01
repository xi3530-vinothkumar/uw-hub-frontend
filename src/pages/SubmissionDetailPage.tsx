import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useSubmission } from '../hooks/useSubmission'
import { useEvents } from '../hooks/useEvents'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import BandBadge from '../components/BandBadge'
import { cn, formatDateTime, shortId, FAILED_STATES } from '../lib/utils'
import type { SubmissionStatus } from '../api/client'

// ──────────────────────────────────────────────
// Pipeline step definitions
// ──────────────────────────────────────────────

type StepState = 'pending' | 'active' | 'done' | 'error'

interface Step {
  key: string
  label: string
  description: string
}

const STEPS: Step[] = [
  { key: 'extract', label: 'Extract',  description: 'AI extracts COPE facts from the submission text and photos' },
  { key: 'review',  label: 'Review',   description: 'Underwriter reviews and confirms extracted fields' },
  { key: 'enrich',  label: 'Enrich',   description: 'Geocoding, flood zone, seismic and wildfire data pulled' },
  { key: 'score',   label: 'Score',    description: 'Deterministic rules engine computes the composite risk score' },
  { key: 'decide',  label: 'Decide',   description: 'Final band and pricing guidance generated; awaiting approval' },
]

function statusToStepIndex(status: SubmissionStatus): number {
  const map: Record<SubmissionStatus, number> = {
    CREATED:           -1,
    PROCESSING:         0,
    EXTRACTED:          1,
    REVIEWED:           2,
    ENRICHED:           2,
    SCORED:             3,
    DECIDED:            4,
    APPROVED:           4,
    EXPORTED:           4,
    FAILED_AI:          0,
    FAILED_ENRICHMENT:  2,
    FAILED_SCORING:     3,
  }
  return map[status] ?? -1
}

function getStepState(
  stepIndex: number,
  activeIndex: number,
  status: SubmissionStatus,
): StepState {
  const isFailed = FAILED_STATES.includes(status)
  if (isFailed && stepIndex === activeIndex) return 'error'
  if (stepIndex < activeIndex) return 'done'
  if (stepIndex === activeIndex) return 'active'
  return 'pending'
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: submission, isLoading, isError } = useSubmission(id)
  const { data: events } = useEvents(id)
  const [showEvents, setShowEvents] = useState(false)

  // Auto-redirect on key status changes
  useEffect(() => {
    if (!submission) return
    const { status, expressPath } = submission
    if (status === 'EXTRACTED' && !expressPath) {
      navigate(`/submissions/${id}/review`)
    } else if (status === 'DECIDED' || status === 'APPROVED') {
      navigate(`/submissions/${id}/dossier`)
    }
  }, [submission, id, navigate])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32 gap-3 text-uw-muted">
          <Loader2 size={20} className="animate-spin" />
          Loading submission…
        </div>
      </AppShell>
    )
  }

  if (isError || !submission) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-uw-muted">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-sm">Submission not found.</p>
          <Link to="/submissions" className="text-xs text-uw-accent hover:underline">
            Back to list
          </Link>
        </div>
      </AppShell>
    )
  }

  const activeIndex = statusToStepIndex(submission.status)
  const isFailed = FAILED_STATES.includes(submission.status)

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xs font-mono text-uw-muted tabular mb-1">
              {shortId(submission.id)}
            </p>
            <h1 className="text-xl font-semibold text-uw-text">Pipeline Status</h1>
            <p className="text-sm text-uw-muted mt-0.5">
              {submission.expressPath ? 'Express (no mid-pipeline review)' : 'Step-by-step review'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={submission.status} />
            {submission.currentDecision && (
              <BandBadge
                band={submission.currentDecision.recommendation}
                score={submission.currentDecision.compositeScore}
              />
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card overflow-hidden">
          <div className="divide-y divide-uw-border/50">
            {STEPS.map((step, i) => {
              const state = getStepState(i, activeIndex, submission.status)
              return (
                <StepRow
                  key={step.key}
                  step={step}
                  state={state}
                  isLast={i === STEPS.length - 1}
                />
              )
            })}
          </div>
        </div>

        {/* Failure banner */}
        {isFailed && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-3 text-sm text-red-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Pipeline failed — {submission.status}</p>
              <p className="text-xs text-red-400/80 mt-0.5">
                Check the event log below for details. The submission can be resubmitted if needed.
              </p>
            </div>
          </div>
        )}

        {/* Processing notice */}
        {submission.status === 'PROCESSING' && (
          <div className="flex items-center gap-2 text-sm text-uw-muted bg-uw-surface/50 border border-uw-border rounded-lg px-4 py-3">
            <Loader2 size={15} className="animate-spin text-indigo-400" />
            AI is extracting COPE facts — this usually takes 20–60 s.
          </div>
        )}

        {/* CTA for EXTRACTED step-by-step */}
        {submission.status === 'EXTRACTED' && !submission.expressPath && (
          <div className="bg-sky-900/20 border border-sky-800/40 rounded-lg px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-sky-300">Extraction complete</p>
              <p className="text-xs text-sky-400/70 mt-0.5">
                Review and confirm the extracted COPE data before scoring.
              </p>
            </div>
            <Link
              to={`/submissions/${id}/review`}
              className="inline-flex items-center gap-1.5 bg-uw-accent hover:bg-uw-accent-dim text-white text-sm font-medium px-4 py-2 rounded transition-colors shrink-0"
            >
              Review COPE <ChevronRight size={15} />
            </Link>
          </div>
        )}

        {/* Event log toggle */}
        <div className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card overflow-hidden">
          <button
            onClick={() => setShowEvents((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-uw-border/20 transition-colors"
          >
            <div className="flex items-center gap-2 text-uw-muted">
              <Clock size={14} />
              <span className="font-medium text-uw-text">Event Log</span>
              {events && (
                <span className="text-2xs text-uw-muted">
                  {events.length} event{events.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {showEvents ? (
              <ChevronUp size={15} className="text-uw-muted" />
            ) : (
              <ChevronDown size={15} className="text-uw-muted" />
            )}
          </button>

          {showEvents && (
            <div className="border-t border-uw-border divide-y divide-uw-border/40 max-h-80 overflow-y-auto">
              {!events || events.length === 0 ? (
                <p className="px-4 py-6 text-xs text-uw-muted text-center">
                  No events recorded yet.
                </p>
              ) : (
                [...events].reverse().map((ev) => (
                  <div key={ev.id} className="px-4 py-2.5 flex items-start gap-3">
                    <span className="text-2xs font-mono text-uw-muted tabular mt-0.5 shrink-0">
                      {formatDateTime(ev.createdAt)}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-uw-text">{ev.eventType}</p>
                      <p className="text-2xs text-uw-muted mt-0.5">{ev.detail ?? ev.eventType}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// ──────────────────────────────────────────────
// StepRow sub-component
// ──────────────────────────────────────────────

function StepRow({
  step,
  state,
  isLast,
}: {
  step: Step
  state: StepState
  isLast: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 px-5 py-4 transition-colors',
        state === 'active' && 'bg-uw-border/20',
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {state === 'done' && (
          <CheckCircle2 size={20} className="text-emerald-400" />
        )}
        {state === 'active' && (
          <Loader2 size={20} className="text-uw-accent animate-spin" />
        )}
        {state === 'error' && (
          <AlertTriangle size={20} className="text-red-400" />
        )}
        {state === 'pending' && (
          <Circle size={20} className="text-uw-border" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            state === 'done' && 'text-uw-text',
            state === 'active' && 'text-uw-text',
            state === 'error' && 'text-red-300',
            state === 'pending' && 'text-uw-muted',
          )}
        >
          {step.label}
        </p>
        <p className="text-xs text-uw-muted mt-0.5">{step.description}</p>
      </div>

      {/* Connector hint */}
      {!isLast && (
        <ChevronRight size={14} className="text-uw-border shrink-0 mt-1" />
      )}
    </div>
  )
}
