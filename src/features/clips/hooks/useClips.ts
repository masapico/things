import { useQuery } from "@tanstack/react-query";
import { getClips } from "../api";

export function useClips() {
  return useQuery({
    queryKey: ["clips"],
    queryFn: getClips,
  });
}
