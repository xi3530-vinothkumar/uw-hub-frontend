import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react'
import { cn } from '../lib/utils'
import type { AuditEntry } from '../api/client'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type SortKey = 'factor' | 'impact' | 'explanation'
type SortDir = 'asc' | 'desc'

interface ExposureFlag {
  code: string
  severity: 'info' | 'warning' | 'error'
  message: string
}

interface Props {
  entries: AuditEntry[]
  exposureFlags?: string | null
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

const SEVERITY_CHIP: Record<ExposureFlag['severity'], string> = {
  info:    'bg-blue-900/30 text-blue-300 ring-1 ring-blue-700/40',
  warning: 'bg-amber-900/30 text-amber-300 ring-1 ring-amber-700/40',
  error:   'bg-red-900/30 text-red-300 ring-1 ring-red-700/40',
}

const SEVERITY_DOT: Record<ExposureFlag['severity'], string> = {
  info:    'bg-blue-400',
  warning: 'bg-amber-400',
  error:   'bg-red-400',
}

/**
 * Parse exposure flags from the JSON string the backend returns.
 * Handles both the new structured format `[{code, severity, message}]`
 * and legacy plain-string arrays.
 */
function parseFlags(raw: string | null | undefined): ExposureFlag[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        // Structured format: [{code, severity, message}]
        if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
          return parsed as ExposureFlag[]
        }
        // Legacy: plain string array → treat all as warnings
        return (parsed as string[]).map((s, i) => ({
          code: `FLAG_${i}`,
          severity: 'warning' as const,
          message: String(s),
        }))
      }
    } catch {
      // fall through
    }
  }
  // Comma-separated legacy fallback
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => ({ code: `FLAG_${i}`, severity: 'warning' as const, message: s }))
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
              key={flag.code}
              className={cn(
                'inline-flex items-center gap-1 text-2xs font-medium rounded-full px-2 py-0.5',
                SEVERITY_CHIP[flag.severity] ?? SEVERITY_CHIP.warning,
              )}
            >
              <span className={cn('h-1 w-1 rounded-full shrink-0', SEVERITY_DOT[flag.severity] ?? SEVERITY_DOT.warning)} />
              {flag.message}
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
