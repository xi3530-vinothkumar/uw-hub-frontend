import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react'
import { cn } from '../lib/utils'
import type { AuditEntry } from '../api/client'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type SortKey = 'factor' | 'impact' | 'explanation'
type SortDir = 'asc' | 'desc'

interface Props {
  entries: AuditEntry[]
  exposureFlags?: string | null   // comma-separated string from backend
  className?: string
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Gates are identified by impact values like "GATE_*" or by certain factor names. */
function isGate(entry: AuditEntry): boolean {
  return (
    entry.impact.toUpperCase().startsWith('GATE') ||
    entry.factor.toUpperCase().includes('GATE') ||
    entry.impact.toUpperCase() === 'DECLINE' ||
    entry.factor.toUpperCase().includes('CRITICAL') ||
    entry.factor.toUpperCase().includes('MISSING_TIV')
  )
}

/** Parse exposure flags from the comma-separated or JSON string the backend returns. */
function parseFlags(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  // Try JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // fall through
    }
  }
  // Comma-separated
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function impactColor(impact: string): string {
  const upper = impact.toUpperCase()
  if (upper.startsWith('GATE') || upper === 'DECLINE') return 'text-red-400'
  if (upper === 'HIGH' || upper === 'NEGATIVE' || upper.includes('ADVERSE')) return 'text-orange-400'
  if (upper === 'MEDIUM' || upper === 'NEUTRAL') return 'text-amber-400'
  if (upper === 'LOW' || upper === 'POSITIVE' || upper.includes('FAVOURABLE')) return 'text-emerald-400'
  return 'text-uw-muted'
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function AuditTable({ entries, exposureFlags, className }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('factor')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const flags = useMemo(() => parseFlags(exposureFlags), [exposureFlags])

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      // Gates always float to top regardless of sort
      const aGate = isGate(a)
      const bGate = isGate(b)
      if (aGate && !bGate) return -1
      if (!aGate && bGate) return 1

      const aVal = a[sortKey]?.toLowerCase() ?? ''
      const bVal = b[sortKey]?.toLowerCase() ?? ''
      const cmp = aVal.localeCompare(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [entries, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-uw-muted text-center py-6">
        No audit entries recorded.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Exposure flag chips */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-1 text-2xs font-medium bg-amber-900/30 text-amber-300 ring-1 ring-amber-700/40 rounded-full px-2 py-0.5"
            >
              <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0" />
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-uw-border/50">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="border-b border-uw-border/50 bg-uw-bg/60">
              <SortableHeader
                label="Factor"
                sortKey="factor"
                active={sortKey === 'factor'}
                dir={sortDir}
                onToggle={toggleSort}
                className="w-[30%]"
              />
              <SortableHeader
                label="Impact"
                sortKey="impact"
                active={sortKey === 'impact'}
                dir={sortDir}
                onToggle={toggleSort}
                className="w-[18%]"
              />
              <SortableHeader
                label="Explanation"
                sortKey="explanation"
                active={sortKey === 'explanation'}
                dir={sortDir}
                onToggle={toggleSort}
                className="w-auto"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-uw-border/30">
            {sorted.map((entry) => {
              const gate = isGate(entry)
              return (
                <tr
                  key={entry.id}
                  className={cn(
                    'transition-colors',
                    gate
                      ? 'bg-red-950/25 hover:bg-red-950/35'
                      : 'hover:bg-uw-border/10',
                  )}
                >
                  {/* Factor */}
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center gap-2">
                      {gate && (
                        <ShieldAlert
                          size={12}
                          className="text-red-400 shrink-0 mt-0.5"
                          aria-label="Gate rule"
                        />
                      )}
                      <span
                        className={cn(
                          'capitalize leading-snug',
                          gate ? 'font-semibold text-red-300' : 'font-medium text-uw-text',
                        )}
                      >
                        {entry.factor.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>

                  {/* Impact */}
                  <td className="px-3 py-2.5 align-top">
                    <span
                      className={cn(
                        'font-semibold uppercase tracking-wide',
                        gate ? 'text-red-400' : impactColor(entry.impact),
                      )}
                    >
                      {entry.impact}
                    </span>
                  </td>

                  {/* Explanation */}
                  <td className="px-3 py-2.5 align-top text-uw-muted leading-relaxed">
                    {entry.explanation || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// SortableHeader
// ──────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onToggle,
  className,
}: {
  label: string
  sortKey: SortKey
  active: boolean
  dir: SortDir
  onToggle: (k: SortKey) => void
  className?: string
}) {
  return (
    <th className={cn('px-3 py-2 text-left', className)}>
      <button
        onClick={() => onToggle(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 font-medium tracking-wider uppercase text-2xs transition-colors',
          active ? 'text-uw-text' : 'text-uw-muted hover:text-uw-text',
        )}
      >
        {label}
        <span className="flex flex-col -space-y-0.5">
          <ChevronUp
            size={8}
            className={cn(active && dir === 'asc' ? 'text-uw-accent' : 'text-uw-border')}
          />
          <ChevronDown
            size={8}
            className={cn(active && dir === 'desc' ? 'text-uw-accent' : 'text-uw-border')}
          />
        </span>
      </button>
    </th>
  )
}
