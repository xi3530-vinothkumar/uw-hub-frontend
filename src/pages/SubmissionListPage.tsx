import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, FileText, AlertCircle, RefreshCw } from 'lucide-react'
import { listSubmissions } from '../api/client'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import BandBadge from '../components/BandBadge'
import { formatDateTime, shortId } from '../lib/utils'

export default function SubmissionListPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['submissions'],
    queryFn: listSubmissions,
    refetchInterval: 10_000,
  })

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-uw-text">Submissions</h1>
            <p className="text-sm text-uw-muted mt-0.5">
              Commercial property underwriting pipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded text-uw-muted hover:text-uw-text hover:bg-uw-surface transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw
                size={16}
                className={isFetching ? 'animate-spin' : ''}
              />
            </button>
            <Link
              to="/submissions/new"
              className="inline-flex items-center gap-2 bg-uw-accent hover:bg-uw-accent-dim text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              <Plus size={16} />
              New Submission
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="bg-uw-surface border border-uw-border rounded-lg overflow-hidden shadow-uw-card">
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-uw-muted">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading submissions…
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center gap-3 py-20 text-uw-muted">
              <AlertCircle size={18} className="text-red-400" />
              <span className="text-sm">Could not load submissions.</span>
              <button
                onClick={() => refetch()}
                className="text-sm text-uw-accent hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && (!data || data.length === 0) && (
            <EmptyState />
          )}

          {data && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-uw-border text-left">
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-uw-muted uppercase">
                      ID
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-uw-muted uppercase">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-uw-muted uppercase">
                      Band
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-uw-muted uppercase tabular">
                      Score
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-uw-muted uppercase">
                      Path
                    </th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wider text-uw-muted uppercase tabular">
                      Created
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-uw-border/50">
                  {data.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-uw-border/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-uw-muted tabular">
                        {shortId(s.id)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {s.band ? (
                          <BandBadge
                            band={s.band}
                            score={s.compositeScore ?? undefined}
                          />
                        ) : (
                          <span className="text-uw-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 tabular text-uw-muted text-xs">
                        {s.compositeScore !== null
                          ? s.compositeScore.toFixed(1)
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.expressPath ? (
                          <span className="text-xs text-violet-400">Express</span>
                        ) : (
                          <span className="text-xs text-uw-muted">Step-by-step</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-uw-muted tabular">
                        {formatDateTime(s.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/submissions/${s.id}`}
                          className="text-xs text-uw-accent hover:text-white hover:underline transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-uw-border/40">
        <FileText size={24} className="text-uw-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-uw-text">No submissions yet</p>
        <p className="text-xs text-uw-muted mt-1 max-w-xs">
          Create your first submission to start the underwriting pipeline.
        </p>
      </div>
      <Link
        to="/submissions/new"
        className="inline-flex items-center gap-2 bg-uw-accent hover:bg-uw-accent-dim text-white text-sm font-medium px-4 py-2 rounded transition-colors mt-1"
      >
        <Plus size={16} />
        New Submission
      </Link>
    </div>
  )
}
