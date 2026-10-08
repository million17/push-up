import { useState } from 'react';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Stepper } from '../../components/Stepper';
import { DEFAULT_REST_SECONDS } from '../../domain/defaultPlan';
import { currentDayNumber, isChallengeOver } from '../../domain/schedule';
import { parseHHMM, sameTime, toHHMM, WORKOUT_TIME_PRESETS, workoutTime } from '../../domain/workoutTime';
import { formatTime } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { buildDailyIcs, downloadIcs } from '../../services/calendarExport';
import { now, todayKey } from '../../services/clock';
import { showNotification } from '../../services/reminders';
import { useApp } from '../../store/appStore';
import { useReminder } from '../reminder/useReminder';
import { Toggle } from './Toggle';

/** WORKOUT section: daily reminder, workout time, rest time. */
export function WorkoutSettings() {
  const { t, lang } = useT();
  const data = useApp((s) => s.data);
  const { setWorkoutTime, updateSettings } = useApp.getState();
  const { permission, isOn, enable, disable } = useReminder();
  const [explain, setExplain] = useState(false);
  const time = workoutTime(data.settings);
  const isPreset = WORKOUT_TIME_PRESETS.some((p) => sameTime(p, time));
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const { settings } = data;
  const restSeconds = settings.restSeconds ?? DEFAULT_REST_SECONDS;
  const timeLabel = formatTime(lang, time);

  const toggle = (on: boolean) => {
    if (!on) return disable();
    // Explain first; the browser dialog only appears after "Enable reminder".
    if (permission === 'default') setExplain(true);
    else void enable();
  };

  const addToCalendar = () => {
    if (!data.profile || isChallengeOver(data, todayKey())) return;
    const ics = buildDailyIcs({
      uid: `pushup30-${data.profile.startDate}@push-up-30`,
      title: t('calendarEvent.title'),
      description: t('calendarEvent.description'),
      startDate: todayKey(),
      time,
      days: data.plan.length - currentDayNumber(data.profile, todayKey()) + 1,
      durationMin: 15,
      nowMs: now(),
    });
    downloadIcs(ics, 'push-up-30-reminder.ics');
  };

  return (
    <section className="card settings-group">
      <h2 className="eyebrow">{t('settings.workout')}</h2>

      <Toggle
        label={t('settings.dailyReminder')}
        checked={isOn}
        disabled={permission === 'unsupported' || permission === 'denied'}
        onChange={toggle}
      />
      {permission === 'unsupported' && <p className="muted small">{t('settings.reminderUnsupported')}</p>}
      {permission === 'denied' && <p className="note-warn small">{t('settings.reminderBlocked')}</p>}
      {permission !== 'unsupported' && permission !== 'denied' && (
        <p className="muted small">{t('settings.reminderLimits')}</p>
      )}
      <div className="link-row">
        {data.profile && !isChallengeOver(data, todayKey()) && (
          <button type="button" className="text-btn" onClick={addToCalendar}>
            📅 {t('settings.addToCalendar')}
          </button>
        )}
        {isOn && (
          <button
            type="button"
            className="text-btn"
            onClick={() =>
              void showNotification(
                { title: t('notification.checkTitle'), body: t('notification.checkBody', { time: timeLabel }), startAction: false },
                t('notification.startAction'),
              )
            }
          >
            🔔 {t('settings.sendTest')}
          </button>
        )}
      </div>

      <div className="divider" />

      <div className="row">
        <span>{t('settings.workoutTime')}</span>
        <strong className="schedule-time-sm">{timeLabel}</strong>
      </div>
      <div className="chips" role="radiogroup" aria-label={t('settings.workoutTime')}>
        {WORKOUT_TIME_PRESETS.map((p) => {
          const on = !customOpen && sameTime(p, time);
          return (
            <button
              key={toHHMM(p)}
              type="button"
              role="radio"
              aria-checked={on}
              className={`chip ${on ? 'on' : ''}`}
              onClick={() => {
                setCustomOpen(false);
                setWorkoutTime(p);
              }}
            >
              {formatTime(lang, p)}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={customOpen}
          className={`chip ${customOpen ? 'on' : ''}`}
          onClick={() => setCustomOpen(true)}
        >
          {t('settings.custom')}
        </button>
      </div>
      {customOpen && (
        <input
          type="time"
          className="time-input"
          aria-label={t('settings.customTime')}
          value={toHHMM(time)}
          onChange={(e) => {
            const picked = parseHHMM(e.target.value);
            if (picked) setWorkoutTime(picked);
          }}
        />
      )}

      <div className="divider" />

      <span>{t('settings.restTime')}</span>
      <Stepper
        label={t('settings.restTime')}
        value={restSeconds}
        min={15}
        max={300}
        step={15}
        suffix={t('common.sec')}
        onChange={(v) => updateSettings({ restSeconds: v })}
      />
      {settings.restSeconds !== null && settings.restSeconds !== DEFAULT_REST_SECONDS && (
        <button type="button" className="text-btn" onClick={() => updateSettings({ restSeconds: null })}>
          {t('settings.resetRest', { seconds: DEFAULT_REST_SECONDS })}
        </button>
      )}

      {explain && (
        <ConfirmSheet
          title={t('reminderPrompt.title')}
          message={t('reminderPrompt.body', { time: timeLabel })}
          confirmLabel={t('reminderPrompt.enable')}
          cancelLabel={t('reminderPrompt.notNow')}
          onConfirm={() => {
            setExplain(false);
            void enable();
          }}
          onCancel={() => setExplain(false)}
        />
      )}
    </section>
  );
}
