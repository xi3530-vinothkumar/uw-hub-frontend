import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import * as Accordion from '@radix-ui/react-accordion'
import {
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Building2,
  Users,
  ShieldCheck,
  MapPin,
  Info,
} from 'lucide-react'
import { useSubmission } from '../hooks/useSubmission'
import { patchProfile, evaluateSubmission } from '../api/client'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import CopeFieldRow from '../components/CopeFieldRow'
import { cn, shortId } from '../lib/utils'
import type { CopeFact } from '../api/client'

// ──────────────────────────────────────────────
// COPE field group definitions
// ──────────────────────────────────────────────

interface CopeGroup {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  fields: string[]
  requiredFields?: string[]
}

const COPE_GROUPS: CopeGroup[] = [
  {
    id: 'construction',
    label: 'Construction',
    description: 'Physical build characteristics',
    icon: <Building2 size={14} />,
    fields: ['construction_type', 'year_built', 'num_stories', 'roof_type', 'roof_age'],
  },
  {
    id: 'occupancy',
    label: 'Occupancy',
    description: 'How the property is used',
    icon: <Users size={14} />,
    fields: ['occupancy_type', 'occupancy_description'],
  },
  {
    id: 'protection',
    label: 'Protection',
    description: 'Fire & security systems',
    icon: <ShieldCheck size={14} />,
    fields: ['sprinklers', 'fire_protection_class', 'alarm_type'],
  },
  {
    id: 'exposure',
    label: 'Exposure',
    description: 'Location & insured values',
    icon: <MapPin size={14} />,
    fields: ['address', 'total_insured_value', 'replacement_cost'],
    requiredFields: ['total_insured_value'],
  },
]

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────

function groupFacts(
  facts: CopeFact[],
  group: CopeGroup,
): CopeFact[] {
  // Return facts that belong to this group, in group field order.
  // Facts not matched to any group field are still shown in the group if
  // they fall alphabetically under it (graceful degradation).
  const indexed = Object.fromEntries(facts.map((f) => [f.fieldName, f]))
  const defined = group.fields
    .map((f) => indexed[f])
    .filter(Boolean) as CopeFact[]
  return defined
}

function groupIssues(facts: CopeFact[], group: CopeGroup): number {
  return groupFacts(facts, group).filter(
    (f) =>
      (f.confidence !== null && f.confidence < 0.6 && !f.overridden) ||
      (group.requiredFields?.includes(f.fieldName) && !f.value && !f.overridden),
  ).length
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function CopeReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: submission, isLoading, isError, refetch } = useSubmission(id)

  // Editing state: one field at a time
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Track pre-edit "original" AI values so we can show them faded post-override
  const [originalValues] = useState<Map<string, string | null>>(() => new Map())

  const [proceeding, setProceeding] = useState(false)
  const [proceedError, setProceedError] = useState<string | null>(null)

  // Default open: first group that has issues, or all
  const [openGroups, setOpenGroups] = useState<string[]>(
    COPE_GROUPS.map((g) => g.id),
  )

  // ── Derived ──────────────────────────────────
  const facts = submission?.copeProfile ?? []

  const { blockingCount, attentionCount } = useMemo(() => {
    let blocking = 0
    let attention = 0
    for (const fact of facts) {
      const isRequired = COPE_GROUPS.flatMap((g) => g.requiredFields ?? []).includes(fact.fieldName)
      if ((fact.confidence !== null && fact.confidence < 0.6 && !fact.overridden) ||
          (isRequired && !fact.value && !fact.overridden)) {
        blocking++
      } else if (fact.confidence !== null && fact.confidence < 0.8 && !fact.overridden) {
        attention++
      }
    }
    return { blockingCount: blocking, attentionCount: attention }
  }, [facts])

  const tivFact = facts.find((f) => f.fieldName === 'total_insured_value')
  const tivMissing = !tivFact?.value && !tivFact?.overridden

  const canProceed = blockingCount === 0 && !tivMissing

  // ── Handlers ─────────────────────────────────

  const handleEdit = (fact: CopeFact) => {
    // Snapshot original before first edit
    if (!originalValues.has(fact.fieldName)) {
      originalValues.set(fact.fieldName, fact.value)
    }
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
      setSaveError(`Could not save "${fieldName.replace(/_/g, ' ')}". Try again.`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setSaveError(null)
  }

  const handleProceed = async () => {
    if (!canProceed) return
    setProceeding(true)
    setProceedError(null)
    try {
      await evaluateSubmission(id!)
      navigate(`/submissions/${id}`)
    } catch {
      setProceedError('Failed to advance submission. Please try again.')
      setProceeding(false)
    }
  }

  // ── Loading / error states ────────────────────

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32 gap-3 text-uw-muted">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading submission…</span>
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
          <Link
            to="/submissions"
            className="text-xs text-uw-accent hover:underline"
          >
            Back to list
          </Link>
        </div>
      </AppShell>
    )
  }

  // ── Render ────────────────────────────────────

  const totalFields = facts.length
  const reviewedFields = facts.filter(
    (f) => f.confidence !== null && f.confidence >= 0.8,
  ).length + facts.filter((f) => f.overridden).length

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* ── Breadcrumb + header ── */}
        <div>
          <Link
            to={`/submissions/${id}`}
            className="inline-flex items-center gap-1 text-2xs text-uw-muted hover:text-uw-text mb-3 transition-colors"
          >
            <ChevronLeft size={12} />
            Back to pipeline
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-2xs font-mono text-uw-muted tabular mb-1">
                {shortId(id!)} · COPE Review
              </p>
              <h1 className="text-lg font-semibold text-uw-text leading-snug">
                Review Extracted Fields
              </h1>
              <p className="text-sm text-uw-muted mt-0.5">
                Verify AI-extracted COPE data. Edit incorrect values before scoring.
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>
        </div>

        {/* ── Summary bar ── */}
        <SummaryBar
          totalFields={totalFields}
          reviewedFields={reviewedFields}
          blockingCount={blockingCount}
          attentionCount={attentionCount}
        />

        {/* ── Attention banner ── */}
        {blockingCount > 0 && (
          <AttentionBanner
            blockingCount={blockingCount}
            tivMissing={tivMissing}
          />
        )}

        {/* ── COPE accordion groups ── */}
        {facts.length === 0 ? (
          <EmptyState />
        ) : (
          <Accordion.Root
            type="multiple"
            value={openGroups}
            onValueChange={setOpenGroups}
            className="space-y-2"
          >
            {COPE_GROUPS.map((group) => {
              const groupFields = groupFacts(facts, group)
              if (groupFields.length === 0) return null
              const issues = groupIssues(facts, group)

              return (
                <CopeGroupSection
                  key={group.id}
                  group={group}
                  facts={groupFields}
                  issues={issues}
                  editing={editing}
                  editValue={editValue}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onSave={handleSave}
                  onValueChange={setEditValue}
                  saving={saving}
                  originalValues={originalValues}
                />
              )
            })}
          </Accordion.Root>
        )}

        {/* ── Save error ── */}
        {saveError && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-2.5">
            <AlertTriangle size={13} className="shrink-0" />
            {saveError}
          </div>
        )}

        {/* ── Proceed footer ── */}
        <ProceedFooter
          canProceed={canProceed}
          blockingCount={blockingCount}
          tivMissing={tivMissing}
          proceeding={proceeding}
          proceedError={proceedError}
          onProceed={handleProceed}
        />
      </div>
    </AppShell>
  )
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function SummaryBar({
  totalFields,
  reviewedFields,
  blockingCount,
  attentionCount,
}: {
  totalFields: number
  reviewedFields: number
  blockingCount: number
  attentionCount: number
}) {
  const pct = totalFields > 0 ? Math.round((reviewedFields / totalFields) * 100) : 0

  return (
    <div className="bg-uw-surface border border-uw-border rounded-lg px-5 py-4 shadow-uw-card">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <Stat
            value={totalFields}
            label="Total fields"
            color="text-uw-text"
          />
          {blockingCount > 0 ? (
            <Stat
              value={blockingCount}
              label={blockingCount === 1 ? 'field needs review' : 'fields need review'}
              color="text-red-400"
              alert
            />
          ) : (
            <Stat
              value={0}
              label="Blocking issues"
              color="text-emerald-400"
            />
          )}
          {attentionCount > 0 && (
            <Stat
              value={attentionCount}
              label={attentionCount === 1 ? 'amber confidence' : 'amber confidence'}
              color="text-amber-400"
            />
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="flex-1 min-w-[80px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs text-uw-muted">Review progress</span>
              <span className="text-2xs tabular text-uw-muted">{pct}%</span>
            </div>
            <div className="h-1 bg-uw-border rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  pct === 100 ? 'bg-emerald-500' : blockingCount > 0 ? 'bg-amber-500' : 'bg-uw-accent',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  color,
  alert = false,
}: {
  value: number
  label: string
  color: string
  alert?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn('text-xl font-semibold tabular leading-none', color)}>
        {value}
      </span>
      <span className={cn('text-xs', alert && value > 0 ? 'text-red-400/80' : 'text-uw-muted')}>
        {label}
      </span>
    </div>
  )
}

function AttentionBanner({
  blockingCount,
  tivMissing,
}: {
  blockingCount: number
  tivMissing: boolean
}) {
  return (
    <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-3.5 text-sm">
      <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-red-300 font-medium">
          {blockingCount} field{blockingCount > 1 ? 's' : ''} require{blockingCount === 1 ? 's' : ''} your attention
        </p>
        <p className="text-red-400/70 text-xs leading-relaxed">
          {tivMissing
            ? 'Total Insured Value is required and must be provided before scoring can proceed.'
            : 'Fields with confidence below 60% must be reviewed or overridden before you can confirm.'}
          {' '}Edit each flagged field to resolve.
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-uw-surface border border-uw-border rounded-lg px-5 py-12 flex flex-col items-center gap-3">
      <Info size={24} className="text-uw-muted/50" />
      <p className="text-sm text-uw-muted text-center">
        No COPE fields have been extracted yet.
        <br />
        The submission may still be processing.
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────
// Accordion group section
// ──────────────────────────────────────────────

function CopeGroupSection({
  group,
  facts,
  issues,
  editing,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onValueChange,
  saving,
  originalValues,
}: {
  group: CopeGroup
  facts: CopeFact[]
  issues: number
  editing: string | null
  editValue: string
  onEdit: (fact: CopeFact) => void
  onCancel: () => void
  onSave: (fieldName: string) => void
  onValueChange: (v: string) => void
  saving: boolean
  originalValues: Map<string, string | null>
}) {
  const allClean = issues === 0

  return (
    <Accordion.Item
      value={group.id}
      className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card overflow-hidden"
    >
      <Accordion.Header>
        <Accordion.Trigger className="group w-full flex items-center justify-between px-5 py-3.5 hover:bg-uw-border/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-uw-accent/40 focus-visible:ring-inset">
          <div className="flex items-center gap-3">
            {/* Icon + group name */}
            <span className={cn(
              'flex items-center justify-center h-6 w-6 rounded text-xs',
              allClean
                ? 'bg-emerald-900/40 text-emerald-400'
                : issues > 0
                ? 'bg-red-900/40 text-red-400'
                : 'bg-uw-border/60 text-uw-muted',
            )}>
              {allClean ? <CheckCircle2 size={13} /> : group.icon}
            </span>

            <div className="text-left">
              <span className="text-sm font-medium text-uw-text">{group.label}</span>
              <span className="ml-2 text-xs text-uw-muted">{group.description}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Issue pill */}
            {issues > 0 && (
              <span className="text-2xs text-red-300 bg-red-950/50 border border-red-800/40 rounded-full px-2 py-0.5 font-medium tabular">
                {issues} {issues === 1 ? 'issue' : 'issues'}
              </span>
            )}
            {allClean && facts.length > 0 && (
              <span className="text-2xs text-emerald-400/70 tabular">
                {facts.length} / {facts.length} clean
              </span>
            )}
            <span className="text-xs text-uw-muted tabular">{facts.length} fields</span>

            <ChevronDown
              size={14}
              className="text-uw-muted transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0"
            />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content className="data-[state=closed]:animate-none overflow-hidden">
        {/* Column header row */}
        <div className="grid grid-cols-[12px_160px_1fr_auto] items-center gap-4 px-4 py-2 border-t border-uw-border bg-uw-bg/40">
          <span /> {/* stripe placeholder */}
          <span className="text-2xs font-medium text-uw-muted uppercase tracking-wider">Field</span>
          <span className="text-2xs font-medium text-uw-muted uppercase tracking-wider">Value · Source</span>
          <span className="w-14" />
        </div>

        <div className="divide-y divide-uw-border/30">
          {facts.map((fact) => (
            <CopeFieldRow
              key={fact.fieldName}
              fact={fact}
              originalValue={originalValues.get(fact.fieldName)}
              isEditing={editing === fact.fieldName}
              editValue={editValue}
              onEdit={() => onEdit(fact)}
              onCancel={onCancel}
              onSave={() => onSave(fact.fieldName)}
              onValueChange={onValueChange}
              saving={saving && editing === fact.fieldName}
              required={group.requiredFields?.includes(fact.fieldName) ?? false}
            />
          ))}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}

// ──────────────────────────────────────────────
// Proceed footer
// ──────────────────────────────────────────────

function ProceedFooter({
  canProceed,
  blockingCount,
  tivMissing,
  proceeding,
  proceedError,
  onProceed,
}: {
  canProceed: boolean
  blockingCount: number
  tivMissing: boolean
  proceeding: boolean
  proceedError: string | null
  onProceed: () => void
}) {
  const blockReason = tivMissing
    ? 'Total Insured Value is required.'
    : blockingCount > 0
    ? `${blockingCount} field${blockingCount > 1 ? 's' : ''} must be reviewed first.`
    : null

  return (
    <div className="border-t border-uw-border/60 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="text-xs text-uw-muted max-w-sm leading-relaxed">
          Once confirmed, the submission advances to peril enrichment and scoring.
          This step cannot be undone.
        </p>
        {blockReason && (
          <p className="text-xs text-red-400/80 flex items-center gap-1.5">
            <AlertTriangle size={11} />
            {blockReason}
          </p>
        )}
        {proceedError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={11} />
            {proceedError}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onProceed}
        disabled={!canProceed || proceeding}
        className={cn(
          'inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded transition-colors shrink-0',
          canProceed && !proceeding
            ? 'bg-uw-accent hover:bg-uw-accent-dim text-white'
            : 'bg-uw-surface text-uw-muted border border-uw-border cursor-not-allowed',
        )}
        aria-disabled={!canProceed || proceeding}
        title={blockReason ?? 'Confirm & proceed to scoring'}
      >
        {proceeding ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <ArrowRight size={15} />
        )}
        {proceeding ? 'Advancing…' : 'Confirm & Continue'}
      </button>
    </div>
  )
}
