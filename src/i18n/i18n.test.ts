import { describe, expect, it } from 'vitest';
import { detectLanguage, DICTIONARIES, LANGUAGES, translate } from './i18n';

function leaves(node: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === 'string') out[prefix + k] = v;
    else Object.assign(out, leaves(v, `${prefix}${k}.`));
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

describe('locales', () => {
  const en = leaves(DICTIONARIES.en);

  it.each(LANGUAGES)('%s has exactly the same keys as en, none empty', (lang) => {
    const dict = leaves(DICTIONARIES[lang]);
    expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
    expect(Object.entries(dict).filter(([, v]) => !v.trim())).toEqual([]);
  });

  it.each(LANGUAGES)('%s uses the same {{placeholders}} as en', (lang) => {
    const dict = leaves(DICTIONARIES[lang]);
    for (const key of Object.keys(en)) expect([key, placeholders(dict[key])]).toEqual([key, placeholders(en[key])]);
  });
});

describe('translate', () => {
  it('interpolates without translating the values', () => {
    expect(translate('en', 'common.dayOf', { current: 12, total: 30 })).toBe('Day 12 / 30');
    expect(translate('vi', 'common.dayOf', { current: 12, total: 30 })).toBe('Ngày 12 / 30');
  });

  it('picks plural forms by count', () => {
    expect(translate('en', 'progress.streakDays', { count: 1 })).toBe('1 day');
    expect(translate('en', 'progress.streakDays', { count: 4 })).toBe('4 days');
    expect(translate('vi', 'progress.streakDays', { count: 4 })).toBe('4 ngày');
  });
});

describe('detectLanguage', () => {
  it('uses Vietnamese for vi browsers and English otherwise', () => {
    expect(detectLanguage(['vi-VN', 'en'])).toBe('vi');
    expect(detectLanguage(['vi'])).toBe('vi');
    expect(detectLanguage(['en-GB'])).toBe('en');
    expect(detectLanguage(['fr-FR', 'vi'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
