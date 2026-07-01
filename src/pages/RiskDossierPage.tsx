import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Loader2,
  AlertTriangle,
  ChevronLeft,
  CheckCircle2,
  Download,
  ThumbsUp,
  Shield,
  BarChart3,
  FileText,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import { useSubmission } from '../hooks/useSubmission'
import { approveDecision, exportSubmission } from '../api/client'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import BandBadge from '../components/BandBadge'
import { cn, shortId, formatDateTime, pct } from '../lib/utils'

export default function RiskDossierPage() {
  const { id } = useParams<{ id: string }>()
  const { data: submission, isLoading, isError, refetch } = useSubmission(id)
  const [approving, setApproving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleApprove = async () => {
    setApproving(true)
    setActionError(null)
    try {
      await approveDecision(id!)
      await refetch()
    } catch {
      setActionError('Approval failed. Please try again.')
    } finally {
      setApproving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setActionError(null)
    try {
      await exportSubmission(id!)
    } catch {
      setActionError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

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
  const isApproved = submission.status === 'APPROVED' || submission.status === 'EXPORTED'

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link
            to={`/submissions/${id}`}
            className="inline-flex items-center gap-1 text-xs text-uw-muted hover:text-uw-text mb-3 transition-colors"
          >
            <ChevronLeft size={13} /> Back to pipeline
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xs font-mono text-uw-muted tabular mb-1">
                {shortId(submission.id)}
              </p>
              <h1 className="text-xl font-semibold text-uw-text">Risk Dossier</h1>
              <p className="text-sm text-uw-muted mt-0.5">
                {formatDateTime(submission.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={submission.status} />
              {decision && (
                <BandBadge
                  band={decision.band}
                  score={decision.compositeScore}
                />
              )}
            </div>
          </div>
        </div>

        {/* Approval / Export actions */}
        {decision && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-uw-surface border border-uw-border rounded-lg shadow-uw-card">
            <div className="flex-1 min-w-0">
              {isApproved ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 size={16} />
                  Decision approved — export is available
                </div>
              ) : (
                <p className="text-sm text-uw-muted">
                  Decision is <span className="text-uw-text font-medium">AI_PROPOSED</span>. An underwriter must approve before export.
                </p>
              )}
            </div>
            {!isApproved && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className={cn(
                  'inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded transition-colors',
                  approving && 'opacity-60 cursor-not-allowed',
                )}
              >
                {approving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ThumbsUp size={14} />
                )}
                Approve Decision
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={!isApproved || exporting}
              title={!isApproved ? 'Approve the decision first' : undefined}
              className={cn(
                'inline-flex items-center gap-2 bg-uw-surface border border-uw-border text-sm font-medium px-4 py-2 rounded transition-colors',
                isApproved
                  ? 'text-uw-text hover:bg-uw-border/40'
                  : 'text-uw-muted cursor-not-allowed opacity-50',
                exporting && 'opacity-60 cursor-not-allowed',
              )}
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Export PDF
            </button>
          </div>
        )}

        {actionError && (
          <p className="text-xs text-red-400 text-center">{actionError}</p>
        )}

        {!decision ? (
          <div className="text-center py-16 text-uw-muted text-sm">
            No decision available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left col: score + narrative */}
            <div className="md:col-span-2 space-y-5">
              {/* Score summary card */}
              <Section icon={<BarChart3 size={15} />} title="Risk Score">
                <div className="flex items-center gap-6 py-2">
                  <div className="text-center">
                    <p className="text-4xl font-bold tabular text-uw-text leading-none">
                      {decision.compositeScore.toFixed(1)}
                    </p>
                    <p className="text-2xs text-uw-muted mt-1">composite</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {decision.factors.map((f) => (
                      <div key={f.factor}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-uw-muted capitalize">
                            {f.factor.replace(/_/g, ' ')}
                          </span>
                          <span className="tabular text-uw-text">
                            {f.weightedScore.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-uw-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-uw-accent rounded-full"
                            style={{
                              width: `${Math.min(
                                (f.weightedScore / decision.compositeScore) * 100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Factor audit trail */}
              <Section icon={<Shield size={15} />} title="Factor Audit Trail">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left border-b border-uw-border/50">
                        <th className="pb-2 text-uw-muted font-medium">Factor</th>
                        <th className="pb-2 text-uw-muted font-medium text-right tabular">Weight</th>
                        <th className="pb-2 text-uw-muted font-medium text-right tabular">Raw</th>
                        <th className="pb-2 text-uw-muted font-medium text-right tabular">Weighted</th>
                        <th className="pb-2 text-uw-muted font-medium pl-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-uw-border/30">
                      {decision.factors.map((f) => (
                        <tr key={f.factor}>
                          <td className="py-2 text-uw-text capitalize">
                            {f.factor.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2 text-right tabular text-uw-muted">
                            {pct(f.weight)}
                          </td>
                          <td className="py-2 text-right tabular text-uw-muted">
                            {f.rawScore.toFixed(2)}
                          </td>
                          <td className="py-2 text-right tabular text-uw-text font-medium">
                            {f.weightedScore.toFixed(2)}
                          </td>
                          <td className="py-2 pl-3 text-uw-muted max-w-[16rem] truncate">
                            {f.notes ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Narrative */}
              {decision.narrative && (
                <Section icon={<FileText size={15} />} title="Narrative">
                  <p className="text-sm text-uw-text leading-relaxed whitespace-pre-wrap">
                    {decision.narrative}
                  </p>
                </Section>
              )}
            </div>

            {/* Right col: band, pricing, exposure */}
            <div className="space-y-5">
              {/* Band */}
              <Section icon={<Shield size={15} />} title="Recommendation">
                <div className="flex flex-col items-start gap-2 py-1">
                  <BandBadge band={decision.band} score={decision.compositeScore} />
                  <p className="text-xs text-uw-muted">
                    Based on deterministic rules engine output. AI-proposed — requires underwriter approval.
                  </p>
                </div>
              </Section>

              {/* Pricing guidance */}
              {decision.pricingGuidance && (
                <Section icon={<BarChart3 size={15} />} title="Pricing Guidance">
                  <p className="text-sm text-uw-text leading-relaxed">
                    {decision.pricingGuidance}
                  </p>
                </Section>
              )}

              {/* Exposure flags */}
              {decision.exposureFlags && decision.exposureFlags.length > 0 && (
                <Section icon={<MapPin size={15} />} title="Exposure Flags">
                  <ul className="space-y-1.5">
                    {decision.exposureFlags.map((flag) => (
                      <li
                        key={flag}
                        className="flex items-start gap-2 text-xs text-amber-300"
                      >
                        <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-400" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ──────────────────────────────────────────────
// Section card
// ──────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-uw-border">
        <span className="text-uw-muted">{icon}</span>
        <h2 className="text-xs font-medium tracking-wider text-uw-muted uppercase">
          {title}
        </h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}
