import type { Language } from '../domain/types';
import en from '../locales/en/common.json';
import vi from '../locales/vi/common.json';

/**
 * Tiny i18n: nested JSON dictionaries per language, `{{name}}` interpolation
 * and `key_one` / `key_other` plurals (picked with Intl.PluralRules when a
 * numeric `count` param is passed). To add a language: add
 * `locales/<code>/common.json`, register it below and extend `Language`.
 */

type Dict = typeof en;

export const DICTIONARIES: Record<Language, Dict> = { en, vi };
export const LANGUAGES: readonly Language[] = ['vi', 'en'];
export const FALLBACK_LANGUAGE: Language = 'en';

/** BCP 47 locale used for dates, times and plural rules. */
export const LOCALES: Record<Language, string> = { en: 'en-US', vi: 'vi-VN' };

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
type StripPlural<K> = K extends `${infer Base}_${'one' | 'other'}` ? Base : K;

export type TKey = StripPlural<Leaves<Dict>>;
export type TParams = Record<string, string | number>;
export type TFunction = (key: TKey, params?: TParams) => string;

/** Picks `vi` or `en` from the browser's preferred languages; anything else → `en`. */
export function detectLanguage(preferred: readonly string[] = browserLanguages()): Language {
  const first = preferred[0]?.toLowerCase() ?? '';
  return LANGUAGES.find((l) => first === l || first.startsWith(`${l}-`)) ?? FALLBACK_LANGUAGE;
}

export function resolveLanguage(saved: Language | null | undefined): Language {
  return saved && saved in DICTIONARIES ? saved : detectLanguage();
}

export function translate(lang: Language, key: TKey, params?: TParams): string {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES[FALLBACK_LANGUAGE];
  let raw: string | undefined;
  if (typeof params?.count === 'number') {
    const form = pluralRules(lang).select(params.count);
    raw = lookup(dict, `${key}_${form}`) ?? lookup(dict, `${key}_other`);
  }
  raw ??= lookup(dict, key) ?? lookup(DICTIONARIES[FALLBACK_LANGUAGE], key);
  if (raw === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key "${key}" (${lang})`);
    return key;
  }
  return interpolate(raw, params);
}

export function translator(lang: Language): TFunction {
  return (key, params) => translate(lang, key, params);
}

function interpolate(text: string, params?: TParams): string {
  if (!params) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function lookup(dict: unknown, path: string): string | undefined {
  let node = dict;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

const rulesCache = new Map<Language, Intl.PluralRules>();
function pluralRules(lang: Language): Intl.PluralRules {
  let rules = rulesCache.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALES[lang]);
    rulesCache.set(lang, rules);
  }
  return rules;
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}
