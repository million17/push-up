import { describe, expect, it } from 'vitest';
import { buildDailyIcs } from './calendarExport';

describe('buildDailyIcs', () => {
  it('builds a daily event with an alarm at the workout time', () => {
    const ics = buildDailyIcs({
      uid: 'abc@pushup30',
      title: '💪 Push-up workout',
      description: 'Open the app, then start; go',
      startDate: '2026-10-08',
      time: { hour: 6, minute: 30 },
      days: 23,
      durationMin: 15,
      nowMs: Date.UTC(2026, 9, 8, 1, 2, 3),
    });
    const lines = ics.split('\r\n');
    expect(lines).toContain('DTSTART:20261008T063000');
    expect(lines).toContain('RRULE:FREQ=DAILY;COUNT=23');
    expect(lines).toContain('DTSTAMP:20261008T010203Z');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(lines).toContain('DESCRIPTION:Open the app\\, then start\; go');
  });
});
