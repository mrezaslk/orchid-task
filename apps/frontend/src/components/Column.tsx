'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import clsx from 'clsx';

interface ColumnProps {
  column: {
    id: string;
    name: string;
  };
  tasks: any[];
}

export function Column({ column, tasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const showTimer = column.name === 'In Progress';

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'bg-gray-50 rounded-lg p-4 min-h-[500px] w-80 flex flex-col',
        isOver && 'bg-blue-50 ring-2 ring-blue-400',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-gray-800">{column.name}</h2>
        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showTimer={showTimer} />
          ))}
        </div>
      </SortableContext>

      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No tasks
        </div>
      )}
    </div>
  );
}

