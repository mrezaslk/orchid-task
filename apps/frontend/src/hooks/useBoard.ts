import useSWR from 'swr';
import { api } from '@/lib/api';

export function useBoard(boardId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    boardId ? `/boards/${boardId}` : null,
    () => api.getBoard(boardId),
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    },
  );

  return {
    board: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useBoards() {
  const { data, error, isLoading, mutate } = useSWR('/boards', () => api.getBoards(), {
    refreshInterval: 0,
    revalidateOnFocus: false,
  });
  return {
    boards: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}
