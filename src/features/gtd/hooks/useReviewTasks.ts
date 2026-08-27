import { useQuery } from "@tanstack/react-query";
import { getReviewTasks } from "../api";

export const queryKeyReviewTasks = "reviewTasks";

export function useReviewTasks() {
  return useQuery({
    queryKey: [queryKeyReviewTasks],
    queryFn: getReviewTasks,
  });
}
