import type { DateKey, TimeOfDay } from '../domain/types';

/**
 * Reminder fallback that works without the app running: a daily calendar
 * event with an alarm, imported into the phone's calendar (.ics).
 */

export interface DailyEvent {
  uid: string;
  title: string;
  description: string;
  startDate: DateKey;
  time: TimeOfDay;
  /** Number of daily occurrences. */
  days: number;
  durationMin: number;
  nowMs: number;
}

export function buildDailyIcs(e: DailyEvent): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = e.startDate.replaceAll('-', '');
  const stamp = new Date(e.nowMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Push-up 30//Workout reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp}`,
    // Floating local time: rings at the same wall-clock time wherever the phone is.
    `DTSTART:${date}T${pad(e.time.hour)}${pad(e.time.minute)}00`,
    `DURATION:PT${e.durationMin}M`,
    `RRULE:FREQ=DAILY;COUNT=${Math.max(1, e.days)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(e.description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${escapeText(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Opens/downloads the .ics; on iOS and Android this offers "Add to Calendar". */
export function downloadIcs(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
