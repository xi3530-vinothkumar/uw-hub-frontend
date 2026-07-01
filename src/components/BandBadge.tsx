import { cn } from '../lib/utils'
import type { Band } from '../api/client'

interface Props {
  band: Band
  score?: number
  className?: string
}

const styleMap: Record<Band, string> = {
  ACCEPT:  'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/40',
  REFER:   'bg-amber-900/60 text-amber-300 ring-1 ring-amber-500/40',
  DECLINE: 'bg-red-900/60 text-red-300 ring-1 ring-red-500/40',
}

const dotMap: Record<Band, string> = {
  ACCEPT:  'bg-emerald-400',
  REFER:   'bg-amber-400',
  DECLINE: 'bg-red-400',
}

export default function BandBadge({ band, score, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular',
        styleMap[band],
        className,
      )}
    >
      <span className={cn('block h-1.5 w-1.5 rounded-full', dotMap[band])} />
      {band}
      {score !== undefined && (
        <span className="ml-0.5 opacity-70">{score.toFixed(1)}</span>
      )}
    </span>
  )
}
