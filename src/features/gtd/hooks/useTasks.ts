import { useQuery } from '@tanstack/react-query'
import { getInboxTasks } from '../api'

export function useInboxTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: getInboxTasks,
  })
}
