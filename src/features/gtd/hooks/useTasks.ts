import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getInboxTasks,  } from '../api'
import type { TasksRecord, TasksResponse } from '../../../lib/pb_types'
import { pb } from '../../../lib/pocketbase';

//////////////////////////////////////////////////////////////////////////////
// inbox query key
const queryKeyInbox = 'inboxTasks'

// /index : inbox tasks
export function useInboxTasks() {
  return useQuery({
    queryKey: [queryKeyInbox],
    queryFn: getInboxTasks,
  })
}

// create inbox tasks
export type CreateInboxTaskInput = Omit<TasksRecord,
  'id' | 'created' | 'updated' | 'duedate' | 'memo' | 'priority' | 'project' | 'sort'>

export const useCreateInboxTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: CreateInboxTaskInput) => {
      const record = await pb.collection('tasks').create<TasksResponse>(newTask);
      return record;
    },
    // 作成が成功したら 'tasks' のキャッシュを無効化して自動再取得させる
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyInbox] });
    },
    onError: (error) => {
      console.error('タスクの作成に失敗しました:', error);
    },
  });
};
//////////////////////////////////////////////////////////////////////////////

