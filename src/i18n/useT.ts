import { useMemo } from 'react';
import type { Language } from '../domain/types';
import { useApp } from '../store/appStore';
import { resolveLanguage, translator, type TFunction } from './i18n';

export function useLanguage(): Language {
  return resolveLanguage(useApp((s) => s.data.settings.language));
}

/** `t` bound to the user's language; re-renders when the language changes. */
export function useT(): { t: TFunction; lang: Language } {
  const lang = useLanguage();
  return useMemo(() => ({ t: translator(lang), lang }), [lang]);
}
