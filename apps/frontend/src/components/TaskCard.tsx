'use client';

import { formatSecondsToTime } from '@/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    column: {
      name: string;
    };
  };
  showTimer: boolean;
}

export function TaskCard({ task, showTimer }: TaskCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!showTimer) return;
    const interval = setInterval(() => {
      setElapsed(elapsed + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer, elapsed]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-grab',
        'hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 cursor-grabbing',
      )}
    >
      <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
      {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
      {showTimer && (
        <p className="text-sm text-gray-600 mt-2">
          Elapsed time:<span className="font-bold text-green-500"> {elapsed} seconds</span>{' '}
          <span className="text-xs text-gray-500">({formatSecondsToTime(elapsed)})</span>
        </p>
      )}
    </div>
  );
}
