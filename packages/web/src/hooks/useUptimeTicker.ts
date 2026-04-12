import { useEffect } from 'react';
import { useLabStore } from '@/store/useLabStore';

/**
 * Forces a re-render every second so uptime values stay current.
 * Only ticks when at least one service is running.
 */
export function useUptimeTicker() {
  const services = useLabStore((s) => s.services);

  useEffect(() => {
    const hasRunning = [...services.values()].some(
      (s) => s.state === 'running' || s.state === 'starting',
    );
    if (!hasRunning) return;

    // Trigger re-render by touching a harmless store field
    const timer = setInterval(() => {
      useLabStore.setState((prev) => {
        const next = new Map(prev.services);
        for (const [id, svc] of next) {
          if (svc.startedAt && (svc.state === 'running' || svc.state === 'starting')) {
            next.set(id, { ...svc, uptime: Date.now() - svc.startedAt });
          }
        }
        return { services: next };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [services]);
}
