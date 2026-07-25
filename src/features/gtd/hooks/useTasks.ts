import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getIndexPageTasks } from "../api";
import type { TasksRecord, TasksResponse } from "../../../lib/pb_types";
import { pb } from "../../../lib/pocketbase";

const queryKeyIndexPage = "indexPageTasks";

// Index Page Tasks
export function useIndexPageTasks() {
  return useQuery({
    queryKey: [queryKeyIndexPage],
    queryFn: getIndexPageTasks,
  });
}

// create inbox task
export type CreateInboxTaskInput = Omit<
  TasksRecord,
  | "id"
  | "created"
  | "updated"
  | "duedate"
  | "memo"
  | "priority"
  | "project"
  | "sort"
>;

export const useCreateInboxTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: CreateInboxTaskInput) => {
      const record = await pb
        .collection("tasks")
        .create<TasksResponse>(newTask);
      return record;
    },
    // 作成が成功したら 'tasks' のキャッシュを無効化して自動再取得させる
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
    },
    onError: (error) => {
      console.error("タスクの作成に失敗しました:", error);
    },
  });
};

// inbox task: change status
export const useChangeStatusInboxTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetTask,
      newStatus,
    }: {
      targetTask: TasksResponse;
      newStatus: string;
    }) => {
      return await pb
        .collection("tasks")
        .update<TasksResponse>(targetTask.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
    },
    onError: (error) => {
      console.error("タスクのステータス変更に失敗しました:", error);
    },
  });
};

// inbox task: delete
export const useDeleteInboxTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetTask: TasksResponse) => {
      return await pb.collection("tasks").delete(targetTask.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
    },
    onError: (error) => {
      console.error("タスクの削除に失敗しました:", error);
    },
  });
};

// update task
export type UpdateTaskInput = {
  id: string;
  title?: string;
  memo?: string;
  priority?: string;
  duedate?: string;
  project?: string;
  contexts?: string[];
  clips?: string[];
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...data } = input;
      return await pb.collection("tasks").update<TasksResponse>(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
    },
    onError: (error) => {
      console.error("タスクの更新に失敗しました:", error);
    },
  });
};
