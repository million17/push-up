import { useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Stepper } from '../../components/Stepper';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';
import { LanguageSwitch } from './LanguageSwitch';
import { Toggle } from './Toggle';
import { WorkoutSettings } from './WorkoutSettings';

export function SettingsScreen() {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const { updateSettings, setGoal, resetChallenge } = useApp.getState();
  const { settings, profile } = data;
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <main className="screen">
      <header className="screen-header">
        <h1 className="day-title">{t('settings.title')}</h1>
      </header>

      <WorkoutSettings />

      <section className="card settings-group">
        <h2 className="card-title">{t('settings.language')}</h2>
        <LanguageSwitch />
      </section>

      <section className="card settings-group">
        <h2 className="card-title">{t('settings.goal')}</h2>
        <Stepper
          label={t('settings.goal')}
          value={profile?.goal ?? 50}
          min={Math.max(5, (profile?.initialMax ?? 0) + 1)}
          max={200}
          step={5}
          suffix={t('common.reps')}
          onChange={setGoal}
        />
        <p className="muted small">{t('settings.startingMax', { count: profile?.initialMax ?? 0 })}</p>
      </section>

      <section className="card settings-group">
        <h2 className="card-title">{t('settings.cues')}</h2>
        <Toggle label={t('settings.sound')} checked={settings.sound} onChange={(sound) => updateSettings({ sound })} />
        <Toggle
          label={t('settings.vibration')}
          checked={settings.vibration}
          onChange={(vibration) => updateSettings({ vibration })}
        />
      </section>

      <section className="card settings-group">
        <h2 className="card-title">{t('settings.challenge')}</h2>
        <Button variant="danger" block onClick={() => setConfirmReset(true)}>
          {t('settings.reset')}
        </Button>
      </section>

      {confirmReset && (
        <ConfirmSheet
          title={t('settings.resetTitle')}
          message={t('settings.resetMessage')}
          confirmLabel={t('settings.resetConfirm')}
          danger
          onConfirm={() => {
            setConfirmReset(false);
            resetChallenge();
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </main>
  );
}
