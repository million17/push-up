import { ConfirmSheet } from '../../components/ConfirmSheet';
import { workoutTime } from '../../domain/workoutTime';
import { formatTime } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';
import { useReminder } from './useReminder';

/** One-time, explained ask before the browser's notification permission dialog. */
export function ReminderPrompt() {
  const { t, lang } = useT();
  const settings = useApp((s) => s.data.settings);
  const dismiss = useApp((s) => s.dismissReminderPrompt);
  const { shouldPrompt, enable } = useReminder();
  if (!shouldPrompt) return null;

  return (
    <ConfirmSheet
      title={t('reminderPrompt.title')}
      message={t('reminderPrompt.body', { time: formatTime(lang, workoutTime(settings)) })}
      confirmLabel={t('reminderPrompt.enable')}
      cancelLabel={t('reminderPrompt.notNow')}
      onConfirm={() => void enable()}
      onCancel={dismiss}
    />
  );
}
