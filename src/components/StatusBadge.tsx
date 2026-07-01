import { cn, statusLabel } from '../lib/utils'
import type { SubmissionStatus } from '../api/client'

interface Props {
  status: SubmissionStatus
  className?: string
}

const colorMap: Record<SubmissionStatus, string> = {
  CREATED:            'bg-slate-700 text-slate-200',
  PROCESSING:         'bg-indigo-900/60 text-indigo-300 ring-1 ring-indigo-500/40',
  EXTRACTED:          'bg-sky-900/60 text-sky-300 ring-1 ring-sky-500/40',
  REVIEWED:           'bg-cyan-900/60 text-cyan-300 ring-1 ring-cyan-500/40',
  ENRICHED:           'bg-blue-900/60 text-blue-300 ring-1 ring-blue-500/40',
  SCORED:             'bg-violet-900/60 text-violet-300 ring-1 ring-violet-500/40',
  DECIDED:            'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/40',
  APPROVED:           'bg-emerald-800/70 text-emerald-200 ring-1 ring-emerald-400/50',
  EXPORTED:           'bg-teal-900/60 text-teal-300 ring-1 ring-teal-500/40',
  FAILED_AI:          'bg-red-900/60 text-red-300 ring-1 ring-red-500/40',
  FAILED_ENRICHMENT:  'bg-orange-900/60 text-orange-300 ring-1 ring-orange-500/40',
  FAILED_SCORING:     'bg-rose-900/60 text-rose-300 ring-1 ring-rose-500/40',
}

const spinningStatuses: SubmissionStatus[] = ['PROCESSING', 'ENRICHED', 'SCORED']

export default function StatusBadge({ status, className }: Props) {
  const isSpinning = spinningStatuses.includes(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular',
        colorMap[status],
        className,
      )}
    >
      {isSpinning && (
        <span className="block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {statusLabel(status)}
    </span>
  )
}
