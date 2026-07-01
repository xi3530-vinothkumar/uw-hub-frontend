import { useQuery } from '@tanstack/react-query'
import { getSubmission, type Submission } from '../api/client'
import { TERMINAL_STATES } from '../lib/utils'

/**
 * Fetches a submission and polls every 3 s until a terminal state is reached.
 */
export function useSubmission(id: string | undefined) {
  return useQuery<Submission>({
    queryKey: ['submission', id],
    queryFn: () => getSubmission(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 3_000
      return TERMINAL_STATES.includes(data.status) ? false : 3_000
    },
  })
}
