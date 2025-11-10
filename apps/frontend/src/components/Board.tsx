/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { useState } from 'react';

// @ts-ignore
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';

import { useBoard } from '@/hooks/useBoard';
import { useTasks } from '@/hooks/useTasks';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { api } from '@/lib/api';

interface BoardProps {
  boardId: string;
}

export function Board({ boardId }: BoardProps) {
  const { board, isLoading: boardLoading } = useBoard(boardId);
  const { tasks, mutate: mutateTasks } = useTasks(boardId);
  const [activeTask, setActiveTask] = useState<any>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t: any) => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetColumnId = over.id as string;

    const task = tasks.find((t: any) => t.id === taskId);
    if (!task || task.columnId === targetColumnId) return;

    // Optimistic update
    const optimisticTasks = tasks.map((t: any) =>
      t.id === taskId ? { ...t, columnId: targetColumnId } : t,
    );
    await mutateTasks(optimisticTasks, false);

    try {
      await api.moveTask(taskId, targetColumnId);
      await mutateTasks();
    } catch (error) {
      console.error('Failed to move task:', error);
      await mutateTasks();
    }
  };

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Board not found</div>
      </div>
    );
  }

  const columns = board.columns || [];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
      </header>

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full">
            {columns.map((column: any) => {
              const columnTasks = tasks.filter((task: any) => task.columnId === column.id);
              return <Column key={column.id} column={column} tasks={columnTasks} />;
            })}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} showTimer={true} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
