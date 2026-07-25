import { useQuery } from "@tanstack/react-query";
import { getProjectTasks } from "../api";

export const queryKeyProjectTasks = "projectTasks";

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: [queryKeyProjectTasks, projectId],
    queryFn: () => getProjectTasks(projectId),
    enabled: !!projectId,
  });
}