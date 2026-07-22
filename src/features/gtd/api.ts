import { pb } from '../../lib/pocketbase'
import type { TasksResponse } from '../../lib/pb_types'


export async function getInboxTasks(): Promise<TasksResponse[]> {
  const result = await pb.collection('tasks').getFullList<TasksResponse>({
    filter: 'status="inbox"',
    sort: 'created'
  })

  return result
}
