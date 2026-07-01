import { useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Pencil, Check, X, Loader2, Quote } from 'lucide-react'
import ConfidenceDots from './ConfidenceDots'
import { cn } from '../lib/utils'
import type { CopeFact } from '../api/client'

interface Props {
  fact: CopeFact
  /** Original AI value before any override (for the faded "AI said…" line) */
  originalValue?: string | null
  isEditing: boolean
  editValue: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onValueChange: (v: string) => void
  saving: boolean
  /** Whether this field is required (e.g. total_insured_value) */
  required?: boolean
}

/** Human-friendly label for a snake_case field name */
function fieldLabel(name: string): string {
  const overrides: Record<string, string> = {
    construction_type: 'Construction Type',
    year_built: 'Year Built',
    num_stories: 'Number of Stories',
    roof_type: 'Roof Type',
    roof_age: 'Roof Age',
    occupancy_type: 'Occupancy Type',
    occupancy_description: 'Occupancy Description',
    sprinklers: 'Sprinklers',
    fire_protection_class: 'Fire Protection Class',
    alarm_type: 'Alarm Type',
    address: 'Address',
    total_insured_value: 'Total Insured Value (TIV)',
    replacement_cost: 'Replacement Cost',
  }
  return overrides[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function CopeFieldRow({
  fact,
  originalValue,
  isEditing,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onValueChange,
  saving,
  required = false,
}: Props) {
  const [snippetExpanded, setSnippetExpanded] = useState(false)

  const isLow = fact.confidence !== null && fact.confidence < 0.6
  const isMedium =
    fact.confidence !== null && fact.confidence >= 0.6 && fact.confidence < 0.8
  const isEmpty = !fact.value

  // A field "blocks" confirm if it has low confidence and hasn't been overridden,
  // or if it's required and empty and hasn't been overridden.
  const isBlocking =
    (isLow && !fact.overridden) || (required && isEmpty && !fact.overridden)

  const stripeColor = isBlocking
    ? 'bg-red-500/70'
    : isMedium && !fact.overridden
    ? 'bg-amber-500/40'
    : fact.overridden
    ? 'bg-uw-accent/40'
    : 'bg-transparent'

  return (
    <div
      className={cn(
        'group flex items-start gap-0 text-sm transition-colors',
        isEditing && 'bg-uw-accent/5',
        isBlocking && !isEditing && 'bg-red-950/20',
      )}
    >
      {/* Left severity stripe */}
      <div className={cn('self-stretch w-0.5 shrink-0', stripeColor)} />

      <div className="flex-1 grid grid-cols-[160px_1fr_auto] items-start gap-4 px-4 py-3.5">
        {/* ── Column 1: Field name + confidence ── */}
        <div className="min-w-0">
          <p className={cn(
            'text-xs font-medium leading-snug',
            required ? 'text-uw-text' : 'text-uw-muted',
            isBlocking && 'text-red-300',
          )}>
            {fieldLabel(fact.fieldName)}
            {required && (
              <span className="ml-1 text-red-400 text-2xs" aria-label="required">*</span>
            )}
          </p>

          <div className="mt-1.5">
            <ConfidenceDots confidence={fact.confidence} />
          </div>

          {/* State badges */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {fact.overridden && (
              <span className="inline-flex items-center gap-1 text-2xs text-uw-accent bg-uw-accent/10 rounded px-1.5 py-0.5 font-medium">
                <Pencil size={9} />
                Edited
              </span>
            )}
            {isBlocking && !fact.overridden && (
              <span className="inline-flex items-center gap-1 text-2xs text-red-300 bg-red-950/40 rounded px-1.5 py-0.5 font-medium ring-1 ring-red-700/40">
                Needs review
              </span>
            )}
          </div>
        </div>

        {/* ── Column 2: Value + source snippet ── */}
        <div className="min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave()
                if (e.key === 'Escape') onCancel()
              }}
              className="w-full bg-uw-bg border border-uw-accent/60 rounded px-2.5 py-1.5 text-xs text-uw-text focus:outline-none focus:border-uw-accent focus:ring-1 focus:ring-uw-accent/20 transition-all"
              aria-label={`Edit ${fieldLabel(fact.fieldName)}`}
            />
          ) : (
            <div>
              {/* Current value */}
              <p className={cn(
                'text-xs leading-relaxed break-words',
                isEmpty
                  ? 'text-uw-muted italic'
                  : isBlocking && !fact.overridden
                  ? 'text-red-200'
                  : 'text-uw-text',
              )}>
                {fact.value ?? 'Not extracted'}
              </p>

              {/* Original AI value (shown faded after override) */}
              {fact.overridden && originalValue && originalValue !== fact.value && (
                <p className="mt-0.5 text-2xs text-uw-muted/60 line-through">
                  AI: {originalValue}
                </p>
              )}

              {/* Source snippet with tooltip / expand */}
              {fact.sourceSnippet && (
                <div className="mt-1.5">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        onClick={() => setSnippetExpanded((v) => !v)}
                        className="flex items-start gap-1 text-left group/snip"
                        aria-label="Toggle source snippet"
                      >
                        <Quote
                          size={9}
                          className="shrink-0 mt-0.5 text-uw-muted/50 group-hover/snip:text-uw-muted transition-colors"
                        />
                        <span className={cn(
                          'text-2xs text-uw-muted/70 italic leading-relaxed transition-colors group-hover/snip:text-uw-muted',
                          !snippetExpanded && 'line-clamp-2',
                        )}>
                          {fact.sourceSnippet}
                        </span>
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        align="start"
                        className="max-w-xs rounded bg-uw-surface border border-uw-border px-3 py-2 text-2xs text-uw-muted shadow-uw-elevated z-50"
                      >
                        Source text from submission
                        <Tooltip.Arrow className="fill-uw-border" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Column 3: Action buttons ── */}
        <div className="flex items-center gap-0.5 pt-0.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="p-1.5 rounded text-emerald-400 hover:bg-emerald-900/30 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                title="Save (Enter)"
                aria-label="Save edit"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded text-uw-muted hover:bg-uw-border/30 hover:text-uw-text transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-uw-border"
                title="Cancel (Esc)"
                aria-label="Cancel edit"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded text-uw-muted opacity-0 group-hover:opacity-100 hover:text-uw-text hover:bg-uw-border/30 transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-uw-border"
              title="Edit value"
              aria-label={`Edit ${fieldLabel(fact.fieldName)}`}
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
