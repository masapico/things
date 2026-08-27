import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLauncher, deleteLauncher, getLaunchers, launchItem, updateLauncher, updateLauncherSorts } from "../api";

export const launcherQueryKey = ["launchers"] as const;

export function useLaunchers() {
  return useQuery({ queryKey: launcherQueryKey, queryFn: getLaunchers });
}

export function useLauncherMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: launcherQueryKey });
  return {
    create: useMutation({ mutationFn: createLauncher, onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateLauncher>[1] }) => updateLauncher(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: deleteLauncher, onSuccess: invalidate }),
    reorder: useMutation({ mutationFn: updateLauncherSorts, onSuccess: invalidate }),
    launch: useMutation({ mutationFn: launchItem }),
  };
}
