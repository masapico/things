import { pb } from '../../lib/pocketbase'
import type { TasksRecord, TasksResponse } from '../../lib/pb_types'


export async function getInboxTasks(): Promise<TasksResponse[]> {
  const result = await pb.collection('tasks').getFullList<TasksResponse>({
    filter: 'status="inbox"',
    sort: 'created'
  })

  return result
}

export async function addTask(task: Partial<TasksRecord>): Promise<TasksResponse> {
  const result = await pb.collection('tasks').create<TasksResponse>(task)

  return result
}
