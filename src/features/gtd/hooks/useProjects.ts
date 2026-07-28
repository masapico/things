import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActiveProjects,
  getArchivedProjects,
  getProject,
  getProjectTaskCounts,
  duplicateProject,
  type DuplicateProjectInput,
} from "../api";
import { pb } from "../../../lib/pocketbase";
import type { ProjectsResponse } from "../../../lib/pb_types";

const queryKeyActiveProjects = "activeProjects";
const queryKeyArchivedProjects = "archivedProjects";

export function useActiveProjects() {
  return useQuery({
    queryKey: [queryKeyActiveProjects],
    queryFn: getActiveProjects,
  });
}

export function useArchivedProjects() {
  return useQuery({
    queryKey: [queryKeyArchivedProjects],
    queryFn: getArchivedProjects,
  });
}

export function useProjectTaskCounts() {
  return useQuery({
    queryKey: ["projectTaskCounts"],
    queryFn: getProjectTaskCounts,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}

/** プロジェクトとタスクを複製する */
export function useDuplicateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceProjectId,
      input,
    }: {
      sourceProjectId: string;
      input: DuplicateProjectInput;
    }) => {
      return await duplicateProject(sourceProjectId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyActiveProjects] });
      queryClient.invalidateQueries({ queryKey: [queryKeyArchivedProjects] });
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
      queryClient.invalidateQueries({ queryKey: ["projectTaskCounts"] });
    },
    onError: (error) => {
      console.error("プロジェクトの複製に失敗しました:", error);
    },
  });
}

/** プロジェクトの reviewToggle を切り替え（updated も更新される） */
export function useToggleReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: ProjectsResponse) => {
      return await pb
        .collection("projects")
        .update<ProjectsResponse>(project.id, {
          reviewToggle: !project.reviewToggle,
        });
    },
    onSuccess: (_data, project) => {
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: [queryKeyActiveProjects] });
      queryClient.invalidateQueries({ queryKey: [queryKeyArchivedProjects] });
    },
    onError: (error) => {
      console.error("レビュー状態の更新に失敗しました:", error);
    },
  });
}