'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.push('/board/default-board');
  }, [router]);
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-gray-600">Loading...</div>
    </div>
  );
}
