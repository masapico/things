import { useInfiniteQuery } from "@tanstack/react-query";
import { getClipsPage } from "../api";

export function useClips() {
  return useInfiniteQuery({
    queryKey: ["clips"],
    queryFn: getClipsPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}