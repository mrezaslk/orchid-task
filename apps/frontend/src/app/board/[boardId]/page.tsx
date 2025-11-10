'use client';

import { use } from 'react';
import { Board } from '@/components/Board';

export default function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = use(params);

  return (
    <div className="relative h-screen">
      <Board boardId={boardId} />
    </div>
  );
}
