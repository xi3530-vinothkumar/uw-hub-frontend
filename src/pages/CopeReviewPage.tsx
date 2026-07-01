import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Loader2, AlertTriangle, Check, Pencil, X, ChevronLeft, ArrowRight } from 'lucide-react'
import { useSubmission } from '../hooks/useSubmission'
import { patchProfile, evaluateSubmission } from '../api/client'
import AppShell from '../components/AppShell'
import ConfidenceDots from '../components/ConfidenceDots'
import StatusBadge from '../components/StatusBadge'
import { cn, shortId } from '../lib/utils'
import type { CopeFact } from '../api/client'

export default function CopeReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: submission, isLoading, isError, refetch } = useSubmission(id)
  const [editing, setEditing] = useState<string | null>(null) // fieldName being edited
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [proceeding, setProceeding] = useState(false)

  const handleEdit = (fact: CopeFact) => {
    setEditing(fact.fieldName)
    setEditValue(fact.value ?? '')
    setSaveError(null)
  }

  const handleSave = async (fieldName: string) => {
    setSaving(true)
    setSaveError(null)
    try {
      await patchProfile(id!, fieldName, editValue)
      setEditing(null)
      await refetch()
    } catch {
      setSaveError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleProceed = async () => {
    setProceeding(true)
    try {
      await evaluateSubmission(id!)
      navigate(`/submissions/${id}`)
    } catch {
      setProceeding(false)
    }
  }

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

  const facts = submission.profile ?? []
  const lowConfidence = facts.filter(
    (f) => f.confidence !== null && f.confidence < 0.6,
  )

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link
            to={`/submissions/${id}`}
            className="inline-flex items-center gap-1 text-xs text-uw-muted hover:text-uw-text mb-3 transition-colors"
          >
            <ChevronLeft size={13} /> Back to pipeline
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xs font-mono text-uw-muted tabular mb-1">{shortId(id!)}</p>
              <h1 className="text-xl font-semibold text-uw-text">COPE Review</h1>
              <p className="text-sm text-uw-muted mt-0.5">
                Review AI-extracted fields. Edit any incorrect values before scoring.
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>
        </div>

        {/* Low confidence warning */}
        {lowConfidence.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-3 text-sm text-amber-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>
              <span className="font-medium">{lowConfidence.length} field{lowConfidence.length > 1 ? 's' : ''}</span>{' '}
              have low confidence (&lt;60%). Review these carefully before proceeding.
            </p>
          </div>
        )}

        {/* COPE table */}
        <div className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card overflow-hidden">
          <div className="px-5 py-3 border-b border-uw-border">
            <h2 className="text-xs font-medium tracking-wider text-uw-muted uppercase">
              Extracted COPE Fields
            </h2>
          </div>
          {facts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-uw-muted text-center">
              No fields extracted yet.
            </p>
          ) : (
            <div className="divide-y divide-uw-border/40">
              {facts.map((fact) => (
                <FactRow
                  key={fact.fieldName}
                  fact={fact}
                  isEditing={editing === fact.fieldName}
                  editValue={editValue}
                  onEdit={() => handleEdit(fact)}
                  onCancel={() => setEditing(null)}
                  onSave={() => handleSave(fact.fieldName)}
                  onValueChange={setEditValue}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <p className="text-xs text-red-400 text-center">{saveError}</p>
        )}

        {/* Proceed button */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-uw-muted max-w-sm">
            Once you proceed, the submission will be enriched with peril data and scored.
            This cannot be undone.
          </p>
          <button
            onClick={handleProceed}
            disabled={proceeding}
            className={cn(
              'inline-flex items-center gap-2 bg-uw-accent hover:bg-uw-accent-dim text-white text-sm font-medium px-5 py-2.5 rounded transition-colors',
              proceeding && 'opacity-60 cursor-not-allowed',
            )}
          >
            {proceeding ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ArrowRight size={15} />
            )}
            Proceed to Scoring
          </button>
        </div>
      </div>
    </AppShell>
  )
}

// ──────────────────────────────────────────────
// FactRow sub-component
// ──────────────────────────────────────────────

function FactRow({
  fact,
  isEditing,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onValueChange,
  saving,
}: {
  fact: CopeFact
  isEditing: boolean
  editValue: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onValueChange: (v: string) => void
  saving: boolean
}) {
  const isLow = fact.confidence !== null && fact.confidence < 0.6
  const isMedium = fact.confidence !== null && fact.confidence >= 0.6 && fact.confidence < 0.8

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_1fr_auto] items-start gap-4 px-5 py-3.5 text-sm',
        isEditing && 'bg-uw-border/10',
        isLow && 'border-l-2 border-red-500/50',
        !isLow && isMedium && 'border-l-2 border-amber-500/30',
        !isLow && !isMedium && 'border-l-2 border-transparent',
      )}
    >
      {/* Field name + confidence */}
      <div>
        <p className="text-xs font-medium text-uw-text capitalize">
          {fact.fieldName.replace(/_/g, ' ')}
        </p>
        <div className="mt-1">
          <ConfidenceDots confidence={fact.confidence} />
        </div>
        {fact.overridden && (
          <span className="mt-1 inline-block text-2xs text-amber-400 bg-amber-900/20 rounded px-1.5 py-0.5">
            Overridden
          </span>
        )}
      </div>

      {/* Value / edit field */}
      <div>
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full bg-uw-bg border border-uw-accent/60 rounded px-2 py-1 text-xs text-uw-text focus:outline-none focus:border-uw-accent"
          />
        ) : (
          <div>
            <p className="text-xs text-uw-text">
              {fact.value ?? <span className="text-uw-muted italic">Not extracted</span>}
            </p>
            {fact.sourceSnippet && (
              <p className="mt-1 text-2xs text-uw-muted italic line-clamp-2">
                "{fact.sourceSnippet}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-0.5">
        {isEditing ? (
          <>
            <button
              onClick={onSave}
              disabled={saving}
              className="p-1.5 rounded text-emerald-400 hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
              title="Save"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 rounded text-uw-muted hover:bg-uw-border/30 hover:text-uw-text transition-colors"
              title="Cancel"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-uw-muted hover:text-uw-text hover:bg-uw-border/30 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
