import type { Language } from '../../domain/types';
import { LANGUAGES } from '../../i18n/i18n';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

const FLAG: Record<Language, string> = { vi: '🇻🇳', en: '🇺🇸' };

/** Full list for Settings; `compact` is a small VI/EN switch for onboarding. */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useT();
  const setLanguage = useApp((s) => s.setLanguage);

  if (compact) {
    return (
      <div className="segmented" role="radiogroup" aria-label={t('settings.language')}>
        {LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={lang === l}
            aria-label={t(`language.${l}`)}
            className={lang === l ? 'on' : ''}
            onClick={() => setLanguage(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="choice-list" role="radiogroup" aria-label={t('settings.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          className={`choice ${lang === l ? 'on' : ''}`}
          onClick={() => setLanguage(l)}
        >
          <span>
            {FLAG[l]} {t(`language.${l}`)}
          </span>
          <span className="choice-mark" aria-hidden="true">
            {lang === l ? '✓' : ''}
          </span>
        </button>
      ))}
    </div>
  );
}
