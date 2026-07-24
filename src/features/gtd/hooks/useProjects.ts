import { useQuery } from "@tanstack/react-query";
import { getActiveProjects } from "../api";

const queryKeyActiveProjects = "activeProjects";

export function useActiveProjects() {
  return useQuery({
    queryKey: [queryKeyActiveProjects],
    queryFn: getActiveProjects,
  });
}