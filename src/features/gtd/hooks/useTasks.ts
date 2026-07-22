import { useQuery } from '@tanstack/react-query'
import { getInboxTasks } from '../api'

export function useInboxTasks() {
  return useQuery({
    queryKey: ['inboxTasks'],
    queryFn: getInboxTasks,
  })
}
