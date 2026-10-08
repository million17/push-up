import type { AppData, ReminderSettings } from '../domain/types';
import { parseHHMM } from '../domain/workoutTime';
import { DEFAULT_SETTINGS, emptyData, type Repository } from './repository';

const KEY = 'pushup30:data';
const VERSION = 2;

interface Envelope {
  version: number;
  data: AppData;
}

export class LocalStorageRepository implements Repository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): AppData | null {
    let raw: string | null;
    try {
      raw = this.storage.getItem(KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw) as Envelope);
    } catch (err) {
      console.error('[pushup30] could not read saved data', err);
      return null;
    }
  }

  save(data: AppData): void {
    try {
      this.storage.setItem(KEY, JSON.stringify({ version: VERSION, data } satisfies Envelope));
    } catch (err) {
      console.error('[pushup30] could not save data', err);
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

/** v1 stored the reminder time as "HH:MM" and defaulted to 18:00. */
interface ReminderV1 {
  enabled?: boolean;
  time?: string;
  lastFiredDate?: string | null;
}
const V1_DEFAULT_TIME = '18:00';

/** Upgrades older saved shapes. Fills in fields added after the data was written. */
function migrate(env: Envelope): AppData {
  const base = emptyData();
  const d = env.data ?? {};
  return {
    ...base,
    ...d,
    settings: {
      ...DEFAULT_SETTINGS,
      ...d.settings,
      reminder: migrateReminder(d.settings?.reminder),
    },
  };
}

function migrateReminder(saved: (Partial<ReminderSettings> & ReminderV1) | undefined): ReminderSettings {
  const { time, ...rest } = saved ?? {};
  const reminder = { ...DEFAULT_SETTINGS.reminder, ...rest };
  // Keep a v1 time the user picked; the old 18:00 default becomes the new default.
  const picked = time && time !== V1_DEFAULT_TIME ? parseHHMM(time) : null;
  return picked && saved?.hour === undefined ? { ...reminder, ...picked } : reminder;
}
