import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContexts, createContext, updateContext, deleteContext } from "../api";
import type { ContextsRecord } from "../../../lib/pb_types";

const queryKey = "contexts";

export function useContexts() {
  return useQuery({
    queryKey: [queryKey],
    queryFn: getContexts,
  });
}

export function useCreateContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Pick<ContextsRecord, "name" | "sort">) => {
      return await createContext(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (error) => {
      console.error("Context creation failed:", error);
    },
  });
}

export function useUpdateContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<ContextsRecord, "name" | "sort">>;
    }) => {
      return await updateContext(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (error) => {
      console.error("Context update failed:", error);
    },
  });
}

export function useDeleteContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteContext(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (error) => {
      console.error("Context deletion failed:", error);
    },
  });
}
