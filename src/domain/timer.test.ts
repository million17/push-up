import { describe, expect, it } from 'vitest';
import { adjustTimer, formatCountdown, formatElapsed, isFinished, pauseTimer, remainingMs, resumeTimer, startTimer } from './timer';

describe('rest timer', () => {
  const t0 = 1_000_000;

  it('counts down from the timestamp, so a reload mid-rest keeps the right time', () => {
    const t = startTimer(90_000, t0);
    // Simulates "reload" — only the persisted object and a fresh now are used.
    const reloaded = JSON.parse(JSON.stringify(t));
    expect(remainingMs(reloaded, t0 + 30_500)).toBe(59_500);
    expect(formatCountdown(remainingMs(reloaded, t0 + 30_500))).toBe('01:00');
    expect(isFinished(reloaded, t0 + 90_000)).toBe(true);
  });

  it('pauses and resumes without losing time', () => {
    let t = startTimer(90_000, t0);
    t = pauseTimer(t, t0 + 10_000);
    expect(remainingMs(t, t0 + 500_000)).toBe(80_000);
    t = resumeTimer(t, t0 + 500_000);
    expect(remainingMs(t, t0 + 510_000)).toBe(70_000);
  });

  it('adds and removes 15 seconds, never below zero', () => {
    let t = startTimer(90_000, t0);
    t = adjustTimer(t, 15_000, t0);
    expect(remainingMs(t, t0)).toBe(105_000);
    t = adjustTimer(t, -15_000, t0 + 100_000);
    expect(remainingMs(t, t0 + 100_000)).toBe(0);
    const p = adjustTimer(pauseTimer(startTimer(90_000, t0), t0), -15_000, t0 + 1000);
    expect(remainingMs(p, t0 + 99_999)).toBe(75_000);
  });

  it('formats clocks', () => {
    expect(formatCountdown(89_001)).toBe('01:30');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatElapsed(522_900)).toBe('08:42');
    expect(formatElapsed(3_723_000)).toBe('1:02:03');
  });
});

describe('stale clock', () => {
  it('never shows more than the rest duration', () => {
    const t = startTimer(90_000, 1000);
    expect(formatCountdown(remainingMs(t, 750))).toBe('01:30');
  });
});
