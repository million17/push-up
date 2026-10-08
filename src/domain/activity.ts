/**
 * Sessions keep a heartbeat (`lastActiveAt`). A gap longer than this means the
 * app was closed or backgrounded and that time should not count as training.
 */
export const INACTIVITY_GAP_MS = 15 * 60_000;

/** A session idle longer than this is not auto-reopened on launch. */
export const AUTO_RESUME_WINDOW_MS = 30 * 60_000;

interface Tracked {
  startedAt: number;
  pausedMs: number;
  lastActiveAt: number;
}

export function touch<T extends Tracked>(s: T, now: number): T {
  const gap = now - s.lastActiveAt;
  if (gap < 0) return { ...s, lastActiveAt: now };
  return {
    ...s,
    pausedMs: gap > INACTIVITY_GAP_MS ? s.pausedMs + gap : s.pausedMs,
    lastActiveAt: now,
  };
}

export function activeElapsedMs(s: Tracked, now: number): number {
  const gap = now - s.lastActiveAt;
  const pendingPause = gap > INACTIVITY_GAP_MS ? gap : 0;
  return Math.max(0, now - s.startedAt - s.pausedMs - pendingPause);
}

export function isRecentlyActive(s: { lastActiveAt: number }, now: number): boolean {
  return now - s.lastActiveAt <= AUTO_RESUME_WINDOW_MS;
}
