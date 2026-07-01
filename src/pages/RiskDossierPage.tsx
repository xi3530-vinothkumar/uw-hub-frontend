import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ShieldCheck,
  FileText,
  LayoutGrid,
  Camera,
  AlertCircle,
  Info,
  Activity,
} from 'lucide-react'
import { useSubmission } from '../hooks/useSubmission'
import { useEvents } from '../hooks/useEvents'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import BandBadge from '../components/BandBadge'
import PerilCard from '../components/PerilCard'
import AuditTable from '../components/AuditTable'
import EventTimeline from '../components/EventTimeline'
import ApproveExportBar from '../components/ApproveExportBar'
import { cn, shortId, formatDateTime } from '../lib/utils'
import type { Decision, PerilExposure, PhotoResult } from '../api/client'

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const ALL_PERILS = ['flood', 'earthquake', 'hurricane', 'wildfire'] as const

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function RiskDossierPage() {
  const { id } = useParams<{ id: string }>()
  const { data: submission, isLoading, isError, refetch } = useSubmission(id)
  const { data: events } = useEvents(id)
  const [timelineOpen, setTimelineOpen] = useState(false)

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32 gap-3 text-uw-muted">
          <Loader2 size={20} className="animate-spin" />
          Loading dossier…
        </div>
      </AppShell>
    )
  }

  if (isError || !submission) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-sm text-uw-muted">Submission not found.</p>
          <Link to="/submissions" className="text-xs text-uw-accent hover:underline">
            Back to list
          </Link>
        </div>
      </AppShell>
    )
  }

  const decision = submission.currentDecision
  const perils = submission.perilExposures ?? []
  const photos = submission.photoResults ?? []

  // Detect REVIEW_SKIPPED from event log
  const reviewSkipped =
    events?.some((e) => e.eventType === 'REVIEW_SKIPPED') ?? false

  // Stub unavailable perils for perils not returned by the backend
  const perilMap = new Map(perils.map((p) => [p.peril.toLowerCase(), p]))
  const displayPerils: PerilExposure[] = ALL_PERILS.map((key) => {
    if (perilMap.has(key)) return perilMap.get(key)!
    return {
      id: `stub-${key}`,
      peril: key,
      severity: 'UNAVAILABLE',
      score: 0,
      rationale: null,
      source: 'unavailable',
      isSecondary: false,
    }
  })

  return (
    <AppShell>
      {/* Timeline drawer — renders outside the scrollable content column */}
      <EventTimeline
        submissionId={id}
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
      />

      <div className={cn(
        'max-w-7xl mx-auto px-6 py-8 space-y-7 transition-all duration-300',
        timelineOpen && 'lg:mr-80',
      )}>

        {/* ── Page header ── */}
        <div>
          <Link
            to={`/submissions/${id}`}
            className="inline-flex items-center gap-1 text-xs text-uw-muted hover:text-uw-text mb-4 transition-colors"
          >
            <ChevronLeft size={13} /> Back to pipeline
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xs font-mono text-uw-muted tabular mb-1">
                {shortId(submission.id)}
              </p>
              <h1 className="text-2xl font-semibold text-uw-text tracking-tight">
                Risk Dossier
              </h1>
              <p className="text-sm text-uw-muted mt-0.5">
                {formatDateTime(submission.createdAt)}
                {submission.expressPath && (
                  <span className="ml-2 text-2xs font-mono bg-uw-border/60 text-uw-muted rounded px-1.5 py-0.5">
                    EXPRESS
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={submission.status} />
              {decision && (
                <BandBadge
                  band={decision.recommendation}
                  score={decision.compositeScore}
                />
              )}
              {/* Timeline toggle */}
              <button
                onClick={() => setTimelineOpen((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border transition-colors',
                  timelineOpen
                    ? 'bg-uw-accent/10 border-uw-accent/40 text-uw-accent'
                    : 'bg-uw-surface border-uw-border text-uw-muted hover:text-uw-text hover:border-uw-accent/30',
                )}
                aria-pressed={timelineOpen}
                aria-label="Toggle event timeline"
              >
                <Activity size={13} />
                Timeline
                {(events?.length ?? 0) > 0 && (
                  <span className="tabular text-2xs opacity-70">{events!.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Warning banners ── */}
        <div className="space-y-2">
          {reviewSkipped && (
            <div className="flex items-center gap-3 bg-indigo-900/20 border border-indigo-800/40 rounded-lg px-4 py-3 text-sm text-indigo-300">
              <Info size={15} className="shrink-0" />
              <span>
                <span className="font-semibold">REVIEW SKIPPED</span> — this submission
                used express path; COPE fields were not manually confirmed.
              </span>
            </div>
          )}
          {decision && decision.version >= 3 && (
            <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-3 text-sm text-amber-300">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                <span className="font-semibold">Version {decision.version}</span> — this
                decision has been revised multiple times. Review audit trail carefully.
              </span>
            </div>
          )}
        </div>

        {/* ── Approve / Export action bar ── */}
        {decision && (
          <ApproveExportBar
            submissionId={id!}
            decision={decision}
            onActionComplete={refetch}
          />
        )}

        {/* ── No decision guard ── */}
        {!decision ? (
          <div className="text-center py-20 text-uw-muted text-sm">
            No decision available yet.
          </div>
        ) : (
          <div className="space-y-7">

            {/* ── 3-column grid: Decision | Perils | Narrative ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Column 1 — Decision card */}
              <SectionCard
                icon={<ShieldCheck size={15} />}
                title="Decision"
                subtitle={`v${decision.version}`}
              >
                <DecisionColumn decision={decision} />
              </SectionCard>

              {/* Column 2 — Peril exposure cards */}
              <SectionCard
                icon={<LayoutGrid size={15} />}
                title="Peril Exposure"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {displayPerils.map((p) => (
                    <PerilCard key={p.peril} exposure={p} />
                  ))}
                </div>
              </SectionCard>

              {/* Column 3 — Narrative */}
              <SectionCard
                icon={<FileText size={15} />}
                title="Narrative"
              >
                <NarrativeColumn decision={decision} />
              </SectionCard>
            </div>

            {/* ── Scoring audit trail ── */}
            <SectionCard
              icon={<ShieldCheck size={15} />}
              title="Scoring Audit Trail"
            >
              <AuditTable
                entries={decision.auditEntries ?? []}
                exposureFlags={decision.exposureFlags}
              />
            </SectionCard>

            {/* ── Photos ── */}
            {(photos.length > 0 || submission.status === 'APPROVED') && (
              <SectionCard
                icon={<Camera size={15} />}
                title={`Photos${photos.length ? ` (${photos.length})` : ''}`}
              >
                {photos.length === 0 ? (
                  <p className="text-xs text-uw-muted text-center py-4">
                    No photo results recorded.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <PhotoCard key={photo.id} photo={photo} />
                    ))}
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ──────────────────────────────────────────────
// DecisionColumn
// ──────────────────────────────────────────────

function DecisionColumn({ decision }: { decision: Decision }) {
  const score = decision.compositeScore
  const band = decision.recommendation

  const barColor =
    band === 'ACCEPT'
      ? 'bg-emerald-500'
      : band === 'REFER'
      ? 'bg-amber-400'
      : 'bg-red-500'

  const barTrack =
    band === 'ACCEPT'
      ? 'bg-emerald-900/30'
      : band === 'REFER'
      ? 'bg-amber-900/30'
      : 'bg-red-900/30'

  return (
    <div className="space-y-5">
      {/* Score + progress bar */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-4xl font-bold tabular text-uw-text leading-none">
            {score.toFixed(0)}
          </span>
          <span className="text-xs text-uw-muted mb-1">/ 100</span>
        </div>
        <div className={cn('h-2.5 w-full rounded-full overflow-hidden', barTrack)}>
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${Math.min(score, 100)}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="flex items-center justify-between text-2xs text-uw-muted">
          <span>0 — Accept</span>
          <span>50 — Refer</span>
          <span>75+ — Decline</span>
        </div>
      </div>

      {/* Band badge */}
      <div className="space-y-1.5">
        <p className="text-2xs font-medium tracking-wider text-uw-muted uppercase">
          Recommendation
        </p>
        <BandBadge band={band} score={score} className="text-sm px-3 py-1" />
      </div>

      {/* Review status */}
      <div className="space-y-1.5">
        <p className="text-2xs font-medium tracking-wider text-uw-muted uppercase">
          Review status
        </p>
        <ReviewStatusBadge status={decision.reviewStatus} size="md" />
      </div>

      {/* Version */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-uw-muted">Decision version</span>
        <span className="tabular font-semibold text-uw-text">v{decision.version}</span>
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-uw-muted">Decided at</span>
        <span className="text-uw-text tabular text-right">{formatDateTime(decision.createdAt)}</span>
      </div>

      {/* Approved by */}
      {decision.approvedBy && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-uw-muted">Approved by</span>
          <span className="text-emerald-400 font-medium">{decision.approvedBy}</span>
        </div>
      )}

      {/* Determinism disclaimer */}
      <div className="mt-auto pt-2 border-t border-uw-border/40">
        <p className="text-2xs text-uw-muted/60 leading-relaxed">
          Score computed by deterministic rules engine. AI perceives; rules decide.
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// NarrativeColumn
// ──────────────────────────────────────────────

function NarrativeColumn({ decision }: { decision: Decision }) {
  const isTemplate = decision.narrativeSource === 'template'

  return (
    <div className="space-y-4">
      {isTemplate && (
        <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/30 rounded px-3 py-2 text-2xs text-amber-400">
          <AlertCircle size={12} className="shrink-0" />
          Template fallback — narrative generation was skipped or failed.
        </div>
      )}

      {decision.narrative ? (
        <p className="text-sm text-uw-text leading-relaxed whitespace-pre-wrap">
          {decision.narrative}
        </p>
      ) : (
        <p className="text-xs text-uw-muted italic py-2">
          No narrative generated.
        </p>
      )}

      {decision.pricingGuidance && (
        <div className="border-t border-uw-border/40 pt-4 space-y-2">
          <p className="text-2xs font-medium tracking-wider text-uw-muted uppercase">
            Pricing Guidance
          </p>
          <p className="text-sm text-uw-text leading-relaxed">
            {decision.pricingGuidance}
          </p>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// PhotoCard
// ──────────────────────────────────────────────

function PhotoCard({ photo }: { photo: PhotoResult }) {
  const conditionColor =
    photo.conditionScore === null
      ? 'text-uw-muted'
      : photo.conditionScore >= 70
      ? 'text-emerald-400'
      : photo.conditionScore >= 40
      ? 'text-amber-400'
      : 'text-red-400'

  return (
    <div className="bg-uw-bg border border-uw-border rounded-lg overflow-hidden">
      {/* Thumbnail area */}
      <div className="aspect-video bg-uw-border/30 relative flex items-center justify-center">
        {photo.thumbnailUrl ? (
          <img
            src={photo.thumbnailUrl}
            alt={photo.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera size={24} className="text-uw-border" />
        )}
        {photo.failed && (
          <div className="absolute inset-0 bg-red-950/70 flex flex-col items-center justify-center gap-1">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-2xs text-red-300">Analysis failed</span>
          </div>
        )}
        {!photo.failed && photo.conditionScore !== null && (
          <div className="absolute top-2 right-2 bg-uw-bg/90 border border-uw-border rounded px-1.5 py-0.5">
            <span className={cn('text-2xs font-bold tabular', conditionColor)}>
              {photo.conditionScore}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 space-y-2">
        <p className="text-2xs font-mono text-uw-muted truncate" title={photo.filename}>
          {photo.filename}
        </p>

        {!photo.failed && photo.findings && photo.findings.length > 0 && (
          <ul className="space-y-0.5">
            {photo.findings.slice(0, 4).map((finding, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="h-1 w-1 rounded-full bg-uw-muted/60 shrink-0 mt-1.5" />
                <span className="text-2xs text-uw-muted leading-snug">{finding}</span>
              </li>
            ))}
            {photo.findings.length > 4 && (
              <li className="text-2xs text-uw-muted/60 pl-2.5">
                +{photo.findings.length - 4} more
              </li>
            )}
          </ul>
        )}

        {!photo.failed && (!photo.findings || photo.findings.length === 0) && (
          <p className="text-2xs text-uw-muted italic">No findings recorded.</p>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// ReviewStatusBadge
// ──────────────────────────────────────────────

function ReviewStatusBadge({
  status,
  size = 'sm',
}: {
  status: string | null
  size?: 'sm' | 'md'
}) {
  const isApproved = status === 'HUMAN_APPROVED'
  const label = isApproved ? 'Human Approved' : status ?? 'AI Proposed'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
        isApproved
          ? 'bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-600/40'
          : 'bg-amber-900/50 text-amber-300 ring-1 ring-amber-600/40',
      )}
    >
      <span
        className={cn(
          'block h-1.5 w-1.5 rounded-full',
          isApproved ? 'bg-emerald-400' : 'bg-amber-400',
        )}
      />
      {label.replace(/_/g, ' ')}
    </span>
  )
}

// ──────────────────────────────────────────────
// SectionCard
// ──────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-uw-border">
        <span className="text-uw-muted">{icon}</span>
        <h2 className="text-xs font-medium tracking-wider text-uw-muted uppercase flex-1">
          {title}
        </h2>
        {subtitle && (
          <span className="text-2xs font-mono text-uw-muted/70 tabular">{subtitle}</span>
        )}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}
