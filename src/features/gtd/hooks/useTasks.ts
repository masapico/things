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

// create task (汎用: project 指定可能)
export type CreateTaskInput = Omit<
  TasksRecord,
  "id" | "created" | "updated"
>;

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: CreateTaskInput) => {
      const record = await pb
        .collection("tasks")
        .create<TasksResponse>(newTask);
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
    },
    onError: (error) => {
      console.error("タスクの作成に失敗しました:", error);
    },
  });
};

// create inbox task（project 指定不要な簡易版）
export type CreateInboxTaskInput = Omit<
  TasksRecord,
  | "id"
  | "created"
  | "updated"
  | "duedate"
  | "memo"
  | "priority"
  | "project"
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
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
      const updateData: Record<string, unknown> = { status: newStatus };
      // completed ステータスに変更する場合、completed フィールドに現在日時をセット
      if (newStatus === "completed") {
        updateData.completed = new Date().toISOString();
      }
      return await pb
        .collection("tasks")
        .update<TasksResponse>(targetTask.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
    },
    onError: (error) => {
      console.error("タスクの更新に失敗しました:", error);
    },
  });
};

// batch update sort values
export const useUpdateTaskSorts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort: number }[]) => {
      // 同時更新の制約回避のため直列で更新する
      for (const { id, sort } of updates) {
        await pb.collection("tasks").update(id, { sort });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyIndexPage] });
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
    },
    onError: (error) => {
      console.error("タスクの並び替えに失敗しました:", error);
    },
  });
};
