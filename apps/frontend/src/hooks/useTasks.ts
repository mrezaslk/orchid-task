import useSWR from 'swr';
import { api } from '@/lib/api';

export function useTasks(boardId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    boardId ? `/tasks?boardId=${boardId}` : null,
    () => api.getTasks(boardId),
    {
      refreshInterval: 5000, // Refresh every 5 seconds to update timers
      revalidateOnFocus: true,
    },
  );

  return {
    tasks: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

