import { useState, useRef, useEffect } from 'react'
import {
  X,
  Clock,
  ChevronDown,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { cn, formatDateTime } from '../lib/utils'
import type { SubmissionEvent } from '../api/client'

// ──────────────────────────────────────────────
// Actor colour definitions
// ──────────────────────────────────────────────

type Actor = 'SYSTEM' | 'AI_WORKER' | 'RULES_ENGINE' | 'UNDERWRITER' | string

interface ActorStyle {
  dot: string
  label: string
  stripe: string // left-border color class
  badge: string  // chip background + text
}

const ACTOR_STYLES: Record<string, ActorStyle> = {
  SYSTEM: {
    dot: 'bg-slate-400',
    label: 'System',
    stripe: 'border-slate-500/60',
    badge: 'bg-slate-800/60 text-slate-300 ring-slate-600/40',
  },
  AI_WORKER: {
    dot: 'bg-sky-400',
    label: 'AI Worker',
    stripe: 'border-sky-600/60',
    badge: 'bg-sky-900/50 text-sky-300 ring-sky-600/40',
  },
  RULES_ENGINE: {
    dot: 'bg-violet-400',
    label: 'Rules Engine',
    stripe: 'border-violet-600/60',
    badge: 'bg-violet-900/50 text-violet-300 ring-violet-600/40',
  },
  UNDERWRITER: {
    dot: 'bg-emerald-400',
    label: 'Underwriter',
    stripe: 'border-emerald-600/60',
    badge: 'bg-emerald-900/50 text-emerald-300 ring-emerald-600/40',
  },
}

function actorStyle(actor: Actor | null): ActorStyle {
  if (!actor) return ACTOR_STYLES.SYSTEM
  return (
    ACTOR_STYLES[actor.toUpperCase()] ?? {
      dot: 'bg-uw-muted',
      label: actor,
      stripe: 'border-uw-border',
      badge: 'bg-uw-surface text-uw-muted ring-uw-border/40',
    }
  )
}

// ──────────────────────────────────────────────
// Single event row
// ──────────────────────────────────────────────

function EventRow({
  event,
  isNew,
}: {
  event: SubmissionEvent
  isNew: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const style = actorStyle(event.actor)

  const hasDetail = Boolean(event.detail || event.errorMessage)

  // Try to pretty-print detail JSON
  let prettyDetail: string | null = null
  if (event.detail) {
    try {
      const parsed = JSON.parse(event.detail)
      prettyDetail = JSON.stringify(parsed, null, 2)
    } catch {
      prettyDetail = event.detail
    }
  }

  return (
    <div
      className={cn(
        'relative pl-4 border-l-2 transition-all duration-300',
        style.stripe,
        isNew && 'animate-slide-in',
      )}
    >
      {/* Connector dot */}
      <span
        className={cn(
          'absolute -left-[5px] top-[7px] h-2 w-2 rounded-full ring-2 ring-uw-bg shrink-0',
          style.dot,
        )}
        aria-hidden
      />

      <div className="pb-4">
        {/* Header row */}
        <div className="flex items-start gap-2 min-w-0">
          {/* Actor chip */}
          <span
            className={cn(
              'inline-flex items-center shrink-0 text-2xs font-medium rounded px-1.5 py-0.5 ring-1',
              style.badge,
            )}
          >
            {style.label}
          </span>

          {/* Event type */}
          <span className="flex-1 min-w-0 text-xs font-medium text-uw-text leading-snug truncate">
            {event.eventType.replace(/_/g, ' ')}
          </span>

          {/* Timestamp */}
          <span className="shrink-0 text-2xs text-uw-muted tabular">
            {formatDateTime(event.createdAt)}
          </span>
        </div>

        {/* Status sub-label */}
        {event.status && (
          <p className="mt-0.5 ml-0 text-2xs text-uw-muted">
            status → <span className="font-mono text-uw-text/70">{event.status}</span>
          </p>
        )}

        {/* Error */}
        {event.errorMessage && (
          <p className="mt-1 text-2xs text-red-400 bg-red-950/30 border border-red-900/40 rounded px-2 py-1 font-mono break-all">
            {event.errorMessage}
          </p>
        )}

        {/* Detail toggle */}
        {hasDetail && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-2xs text-uw-muted hover:text-uw-text transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown size={11} />
            ) : (
              <ChevronRight size={11} />
            )}
            {expanded ? 'hide detail' : 'show detail'}
          </button>
        )}

        {/* Collapsible detail JSON */}
        {expanded && prettyDetail && (
          <pre className="mt-2 text-2xs text-uw-muted/80 bg-uw-bg border border-uw-border/50 rounded p-2 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
            {prettyDetail}
          </pre>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Drawer
// ──────────────────────────────────────────────

interface Props {
  submissionId: string | undefined
  open: boolean
  onClose: () => void
}

export default function EventTimeline({ submissionId, open, onClose }: Props) {
  const { data: events = [] } = useEvents(submissionId)

  // Track which event IDs were present on the previous render so we can
  // highlight newly arrived events with a CSS animation.
  const seenIdsRef = useRef<Set<string>>(new Set())
  const prevCountRef = useRef(0)

  useEffect(() => {
    events.forEach((e) => seenIdsRef.current.add(e.id))
    prevCountRef.current = events.length
  })

  const newIds = new Set(
    events
      .slice(prevCountRef.current) // events added this render cycle
      .map((e) => e.id),
  )

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop — only visible on narrow screens where the drawer overlays */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-uw-bg/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <aside
        role="complementary"
        aria-label="Event timeline"
        className={cn(
          'fixed top-14 right-0 bottom-0 z-40 flex flex-col',
          'w-80 bg-uw-surface border-l border-uw-border shadow-uw-elevated',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-uw-border shrink-0">
          <Activity size={14} className="text-uw-muted" />
          <h2 className="flex-1 text-xs font-medium tracking-wider text-uw-muted uppercase">
            Event Timeline
          </h2>
          <span className="text-2xs text-uw-muted tabular">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="ml-1 p-1 rounded text-uw-muted hover:text-uw-text hover:bg-uw-border/40 transition-colors"
            aria-label="Close timeline"
          >
            <X size={14} />
          </button>
        </div>

        {/* Actor legend */}
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-uw-border/40 shrink-0">
          {(
            [
              'SYSTEM',
              'AI_WORKER',
              'RULES_ENGINE',
              'UNDERWRITER',
            ] as const
          ).map((key) => {
            const s = ACTOR_STYLES[key]
            return (
              <span key={key} className="inline-flex items-center gap-1 text-2xs text-uw-muted">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
                {s.label}
              </span>
            )
          })}
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-uw-muted">
              <Clock size={20} className="text-uw-border" />
              <p className="text-xs">No events yet.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isNew={newIds.has(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
