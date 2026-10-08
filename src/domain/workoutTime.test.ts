import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKOUT_TIME, dayPart, isPastWorkoutTime, parseHHMM, toHHMM } from './workoutTime';

const at = (hhmm: string) => new Date(`2026-10-12T${hhmm}:00`).getTime();

describe('workout time', () => {
  it('defaults to 06:30', () => {
    expect(toHHMM(DEFAULT_WORKOUT_TIME)).toBe('06:30');
  });

  it('parses and formats HH:MM', () => {
    expect(parseHHMM('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM('')).toBeNull();
    expect(toHHMM({ hour: 6, minute: 0 })).toBe('06:00');
  });

  it('knows whether the workout time has passed (training before it is still allowed)', () => {
    expect(isPastWorkoutTime(DEFAULT_WORKOUT_TIME, at('06:29'))).toBe(false);
    expect(isPastWorkoutTime(DEFAULT_WORKOUT_TIME, at('06:30'))).toBe(true);
  });

  it('picks the greeting by time of day', () => {
    expect(dayPart(at('06:30'))).toBe('morning');
    expect(dayPart(at('13:00'))).toBe('afternoon');
    expect(dayPart(at('19:00'))).toBe('evening');
  });
});
