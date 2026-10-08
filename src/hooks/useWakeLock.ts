import { useEffect } from 'react';

/** Keeps the screen on while mounted (where supported). */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen');
          if (cancelled) void lock.release();
        }
      } catch {
        /* denied or unsupported */
      }
    };
    void request();
    const onVisible = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);
}
