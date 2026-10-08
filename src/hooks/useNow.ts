import { useEffect, useState } from 'react';
import { now } from '../services/clock';

/** Re-renders every `intervalMs` and when the page becomes visible again. */
export function useNow(intervalMs = 1000): number {
  const [t, setT] = useState(now);
  useEffect(() => {
    const update = () => setT(now());
    const id = window.setInterval(update, intervalMs);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [intervalMs]);
  return t;
}
