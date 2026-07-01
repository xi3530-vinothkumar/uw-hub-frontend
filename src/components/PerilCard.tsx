import { cn } from '../lib/utils'
import type { PerilExposure } from '../api/client'

// ──────────────────────────────────────────────
// Peril metadata
// ──────────────────────────────────────────────

const PERIL_META: Record<string, { label: string; icon: string }> = {
  flood:      { label: 'Flood',      icon: '🌊' },
  earthquake: { label: 'Earthquake', icon: '🏔️' },
  hurricane:  { label: 'Hurricane',  icon: '🌀' },
  wildfire:   { label: 'Wildfire',   icon: '🔥' },
}

// ──────────────────────────────────────────────
// Severity color mappings
// ──────────────────────────────────────────────

type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNAVAILABLE'

const SEVERITY_STYLES: Record<Severity, {
  bar: string
  badge: string
  border: string
  label: string
}> = {
  LOW:         { bar: 'bg-emerald-500',  badge: 'bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-600/40', border: 'border-emerald-700/30',  label: 'Low' },
  MODERATE:    { bar: 'bg-amber-400',    badge: 'bg-amber-900/50 text-amber-300 ring-1 ring-amber-600/40',       border: 'border-amber-700/30',    label: 'Moderate' },
  HIGH:        { bar: 'bg-orange-500',   badge: 'bg-orange-900/50 text-orange-300 ring-1 ring-orange-600/40',    border: 'border-orange-700/30',   label: 'High' },
  CRITICAL:    { bar: 'bg-red-500',      badge: 'bg-red-900/50 text-red-300 ring-1 ring-red-600/40',             border: 'border-red-700/40',      label: 'Critical' },
  UNAVAILABLE: { bar: 'bg-uw-border',    badge: 'bg-uw-border/60 text-uw-muted ring-1 ring-uw-border',           border: 'border-uw-border',       label: 'Unavailable' },
}

function normalizeSeverity(s: string): Severity {
  const upper = s.toUpperCase() as Severity
  return Object.keys(SEVERITY_STYLES).includes(upper) ? upper : 'UNAVAILABLE'
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

interface Props {
  exposure: PerilExposure
  className?: string
}

export default function PerilCard({ exposure, className }: Props) {
  const sev = normalizeSeverity(exposure.severity)
  const styles = SEVERITY_STYLES[sev]
  const meta = PERIL_META[exposure.peril.toLowerCase()] ?? {
    label: exposure.peril,
    icon: '⚠️',
  }
  const isUnavailable = sev === 'UNAVAILABLE'

  return (
    <div
      className={cn(
        'bg-uw-surface border rounded-lg overflow-hidden shadow-uw-card',
        styles.border,
        className,
      )}
    >
      {/* Severity bar — top accent stripe */}
      <div className={cn('h-0.5 w-full', styles.bar)} />

      <div className="px-4 py-3.5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="text-xl leading-none select-none"
              role="img"
              aria-label={meta.label}
            >
              {meta.icon}
            </span>
            <div>
              <p className="text-xs font-semibold text-uw-text tracking-wide uppercase">
                {meta.label}
              </p>
              {!isUnavailable && (
                <p className="text-2xs text-uw-muted mt-0.5 tabular">
                  Score {exposure.score}
                </p>
              )}
            </div>
          </div>

          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium shrink-0',
              styles.badge,
            )}
          >
            {styles.label}
          </span>
        </div>

        {/* Score bar */}
        {!isUnavailable && (
          <div>
            <div className="h-1.5 w-full bg-uw-border/60 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', styles.bar)}
                style={{ width: `${Math.min(exposure.score, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Rationale */}
        {exposure.rationale && !isUnavailable && (
          <p className="text-2xs text-uw-muted leading-relaxed line-clamp-2">
            {exposure.rationale}
          </p>
        )}

        {isUnavailable && (
          <p className="text-2xs text-uw-muted italic">
            Data unavailable — exposure treated as unknown.
          </p>
        )}

        {/* Provenance tag */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs text-uw-muted/60 font-mono">
            {exposure.isSecondary ? 'secondary' : 'primary'}
          </span>
          <span className="text-2xs font-mono bg-uw-bg border border-uw-border/60 rounded px-1.5 py-0.5 text-uw-muted">
            {exposure.source}
          </span>
        </div>
      </div>
    </div>
  )
}
