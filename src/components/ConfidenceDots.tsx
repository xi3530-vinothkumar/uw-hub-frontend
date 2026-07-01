import { cn } from '../lib/utils'

interface Props {
  /** 0.0 – 1.0 */
  confidence: number | null
  className?: string
}

/** 5 dots that fill proportionally. Amber < 0.80, red < 0.60. */
export default function ConfidenceDots({ confidence, className }: Props) {
  if (confidence === null) {
    return <span className="text-uw-muted text-2xs tabular">—</span>
  }

  const filled = Math.round(confidence * 5) // 0–5
  const color =
    confidence < 0.6
      ? 'bg-red-400'
      : confidence < 0.8
      ? 'bg-amber-400'
      : 'bg-emerald-400'

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
      aria-label={`Confidence ${(confidence * 100).toFixed(0)} percent`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'block h-2 w-2 rounded-full transition-colors',
            i < filled ? color : 'bg-uw-border',
          )}
        />
      ))}
      <span className="ml-1 text-2xs tabular text-uw-muted">
        {(confidence * 100).toFixed(0)}%
      </span>
    </span>
  )
}
