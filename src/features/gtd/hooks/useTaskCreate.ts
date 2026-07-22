import { useQueryClient, useMutation } from '@tanstack/react-query'
import { pb } from '../../../lib/pocketbase';
import type { TasksRecord, TasksResponse } from '../../../lib/pb_types'

export type CreateInboxTaskInput = Omit<TasksRecord,
  'id' | 'created' | 'updated' | 'duedate' | 'memo' | 'priority' | 'project' | 'sort'>

export const useCreateInboxTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // PocketBase の create API を呼び出す処理
    mutationFn: async (newTask: CreateInboxTaskInput) => {
      const record = await pb.collection('tasks').create<TasksResponse>(newTask);
      return record;
    },
    // 作成が成功したら 'tasks' のキャッシュを無効化して自動再取得させる
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxTasks'] });
    },
    onError: (error) => {
      console.error('Taskの作成に失敗しました:', error);
    },
  });
};
