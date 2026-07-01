import { useState } from 'react'
import {
  CheckCircle2,
  Download,
  Loader2,
  ThumbsUp,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { approveDecision, exportSubmission, patchProfile } from '../api/client'
import { cn, formatDateTime } from '../lib/utils'
import type { Decision, Band } from '../api/client'

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function bandLabel(band: Band): string {
  return band.charAt(0) + band.slice(1).toLowerCase() // "Accept" / "Refer" / "Decline"
}

// ──────────────────────────────────────────────
// Confirm dialog
// ──────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string
  body: string
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-uw-bg/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm bg-uw-surface border border-uw-border rounded-lg shadow-uw-elevated p-6 space-y-4 mx-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 id="confirm-title" className="text-sm font-semibold text-uw-text">
              {title}
            </h3>
            <p className="text-xs text-uw-muted leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-uw-muted hover:text-uw-text bg-transparent border border-uw-border rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-3 py-1.5 text-xs font-medium text-white rounded transition-colors',
              confirmClass,
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Status pill
// ──────────────────────────────────────────────

function ReviewStatusPill({ status }: { status: string | null }) {
  const isApproved = status === 'HUMAN_APPROVED'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 ring-1',
        isApproved
          ? 'bg-emerald-900/50 text-emerald-300 ring-emerald-600/40'
          : 'bg-amber-900/50 text-amber-300 ring-amber-600/40',
      )}
    >
      <span
        className={cn(
          'block h-1.5 w-1.5 rounded-full',
          isApproved ? 'bg-emerald-400' : 'bg-amber-400',
        )}
      />
      {(status ?? 'AI_PROPOSED').replace(/_/g, ' ')}
    </span>
  )
}

// ──────────────────────────────────────────────
// Tooltip wrapper (simple CSS-only)
// ──────────────────────────────────────────────

function Tooltip({
  tip,
  children,
}: {
  tip: string
  children: React.ReactNode
}) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap
          bg-uw-bg border border-uw-border text-uw-muted text-2xs rounded px-2 py-1
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
        role="tooltip"
      >
        {tip}
      </span>
    </span>
  )
}

// ──────────────────────────────────────────────
// ApproveExportBar
// ──────────────────────────────────────────────

interface Props {
  submissionId: string
  decision: Decision
  onActionComplete: () => void // triggers refetch in parent
}

type Dialog = 'approve' | 'reopen' | null

export default function ApproveExportBar({
  submissionId,
  decision,
  onActionComplete,
}: Props) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isApproved = decision.reviewStatus === 'HUMAN_APPROVED'
  const canApprove = decision.reviewStatus === 'AI_PROPOSED'
  const band = decision.recommendation

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      onActionComplete()
    } catch {
      setActionError('Action failed. Please try again.')
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  const confirmApprove = () => run(() => approveDecision(submissionId))

  const confirmReopen = () =>
    run(() =>
      // Patching any profile field triggers re-review; use a sentinel field
      patchProfile(submissionId, '__reopen__', 'true'),
    )

  const handleExport = () =>
    run(() => exportSubmission(submissionId))

  return (
    <>
      {/* ── Confirm dialogs ── */}
      {dialog === 'approve' && (
        <ConfirmDialog
          title={`Approve ${bandLabel(band)} recommendation`}
          body={`You are approving this ${bandLabel(band)} recommendation. This action is logged and irreversible.`}
          confirmLabel="Approve"
          confirmClass="bg-emerald-700 hover:bg-emerald-600"
          onConfirm={confirmApprove}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog === 'reopen' && (
        <ConfirmDialog
          title="Reopen for review"
          body="This will revoke approval and create a new decision version for re-scoring. The current approval will be voided."
          confirmLabel="Reopen"
          confirmClass="bg-amber-700 hover:bg-amber-600"
          onConfirm={confirmReopen}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* ── Footer bar ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-uw-surface border border-uw-border rounded-lg shadow-uw-card">

        {/* Left side — decision summary */}
        <div className="flex flex-1 min-w-0 items-center gap-3 flex-wrap">
          <span className="text-sm text-uw-muted">
            Decision:{' '}
            <span className="font-semibold text-uw-text">{band}</span>
          </span>
          <span className="text-uw-border">·</span>
          <ReviewStatusPill status={decision.reviewStatus} />

          {isApproved && decision.approvedAt && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={13} />
              Approved
              {decision.approvedBy ? ` by ${decision.approvedBy}` : ''}
              {' at '}
              {formatDateTime(decision.approvedAt)}
            </span>
          )}
        </div>

        {/* Right side — action buttons */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Approve button — shown when AI_PROPOSED */}
          {canApprove && (
            <button
              onClick={() => setDialog('approve')}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded transition-colors',
                busy && 'opacity-60 cursor-not-allowed',
              )}
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ThumbsUp size={14} />
              )}
              Approve Decision
            </button>
          )}

          {/* Export button — always visible, disabled until approved */}
          {isApproved ? (
            <button
              onClick={handleExport}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-2 bg-uw-surface border border-uw-border text-sm font-medium px-4 py-2 rounded transition-colors text-uw-text hover:bg-uw-border/40',
                busy && 'opacity-60 cursor-not-allowed',
              )}
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Export JSON
            </button>
          ) : (
            <Tooltip tip="Approve the decision first">
              <span
                className="inline-flex items-center gap-2 bg-uw-surface border border-uw-border text-sm font-medium px-4 py-2 rounded text-uw-muted opacity-50 cursor-not-allowed select-none"
                aria-disabled="true"
              >
                <Download size={14} />
                Export JSON
              </span>
            </Tooltip>
          )}

          {/* Reopen for review — shown when HUMAN_APPROVED */}
          {isApproved && (
            <button
              onClick={() => setDialog('reopen')}
              disabled={busy}
              className={cn(
                'inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded transition-colors',
                'text-uw-muted hover:text-amber-300 hover:bg-amber-900/20 border border-uw-border hover:border-amber-800/40',
                busy && 'opacity-60 cursor-not-allowed',
              )}
              title="Revoke approval and re-score"
            >
              <RotateCcw size={14} />
              Reopen
            </button>
          )}
        </div>

        {/* Error message */}
        {actionError && (
          <p className="w-full text-xs text-red-400 mt-1">{actionError}</p>
        )}
      </div>
    </>
  )
}
