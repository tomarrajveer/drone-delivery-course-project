'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAutoRefreshProps {
  intervalMs?: number;
}

export function AdminAutoRefresh({ intervalMs = 3000 }: AdminAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, router]);

  return null;
}
