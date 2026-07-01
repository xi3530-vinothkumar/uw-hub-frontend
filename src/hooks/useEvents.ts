import { useQuery } from '@tanstack/react-query'
import { getEvents, type SubmissionEvent } from '../api/client'
import { TERMINAL_STATES } from '../lib/utils'
import { useSubmission } from './useSubmission'

/**
 * Fetches the event log for a submission and polls while processing is active.
 */
export function useEvents(id: string | undefined) {
  const { data: submission } = useSubmission(id)

  return useQuery<SubmissionEvent[]>({
    queryKey: ['events', id],
    queryFn: () => getEvents(id!),
    enabled: Boolean(id),
    refetchInterval: () => {
      if (!submission) return 3_000
      return TERMINAL_STATES.includes(submission.status) ? false : 3_000
    },
  })
}
