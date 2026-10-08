import type { RestTimer } from './types';

export function startTimer(durationMs: number, now: number): RestTimer {
  return { durationMs, endsAt: now + durationMs, remainingMs: null };
}

export function remainingMs(t: RestTimer, now: number): number {
  // Clamp to the duration: a UI clock sampled slightly before the timer started must not show 01:31 for a 90s rest.
  if (t.endsAt !== null) return Math.min(t.durationMs, Math.max(0, t.endsAt - now));
  return Math.max(0, t.remainingMs ?? 0);
}

export function isPaused(t: RestTimer): boolean {
  return t.endsAt === null;
}

export function isFinished(t: RestTimer, now: number): boolean {
  return remainingMs(t, now) <= 0;
}

export function pauseTimer(t: RestTimer, now: number): RestTimer {
  if (isPaused(t)) return t;
  return { ...t, endsAt: null, remainingMs: remainingMs(t, now) };
}

export function resumeTimer(t: RestTimer, now: number): RestTimer {
  if (!isPaused(t)) return t;
  return { ...t, endsAt: now + (t.remainingMs ?? 0), remainingMs: null };
}

/** Adds (or removes, if negative) time. Never goes below zero. */
export function adjustTimer(t: RestTimer, deltaMs: number, now: number): RestTimer {
  const next = Math.max(0, remainingMs(t, now) + deltaMs);
  const durationMs = Math.max(t.durationMs + deltaMs, next);
  return isPaused(t)
    ? { ...t, durationMs, remainingMs: next }
    : { ...t, durationMs, endsAt: now + next };
}

/** Countdown display: rounds up so the clock shows 0:00 only when time is up. */
export function formatCountdown(ms: number): string {
  return formatClock(Math.ceil(ms / 1000));
}

/** Stopwatch display: rounds down. */
export function formatElapsed(ms: number): string {
  return formatClock(Math.floor(ms / 1000));
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`;
}
