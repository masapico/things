import { useQuery } from "@tanstack/react-query";
import { getActiveProjects, getArchivedProjects, getProject } from "../api";

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

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}