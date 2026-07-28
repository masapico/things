import { useQuery } from "@tanstack/react-query";
import { getClipsByIds } from "../api";

/** clip ID 配列から clip 実データを取得する。enabled が true の時のみフェッチ */
export function useClipsByIds(ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: ["clips", "byIds", ids],
    queryFn: () => getClipsByIds(ids),
    enabled: enabled && ids.length > 0,
  });
}
