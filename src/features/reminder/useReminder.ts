import { useCallback, useEffect, useState } from 'react';
import { permissionState, requestPermission, type PermissionState } from '../../services/reminders';
import { useApp } from '../../store/appStore';

/**
 * Reminder state for the UI. The reminder only counts as ON when the user
 * enabled it AND the browser allows notifications, so a denied or revoked
 * permission shows as OFF.
 */
export function useReminder() {
  const enabled = useApp((s) => s.data.settings.reminder.enabled);
  const promptAnswered = useApp((s) => s.data.settings.reminder.promptAnswered);
  const setReminderEnabled = useApp((s) => s.setReminderEnabled);
  const [permission, setPermission] = useState<PermissionState>(permissionState);

  // Permission can change in browser settings while the app is in the background.
  useEffect(() => {
    const refresh = () => setPermission(permissionState());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  /** Asks for permission (only from a user tap) and turns the reminder on if granted. */
  const enable = useCallback(async () => {
    const p = await requestPermission();
    setPermission(p);
    setReminderEnabled(p === 'granted');
    return p;
  }, [setReminderEnabled]);

  const disable = useCallback(() => setReminderEnabled(false), [setReminderEnabled]);

  return {
    permission,
    isOn: enabled && permission === 'granted',
    /** Show the "Stay on track" prompt: never answered and the browser can still ask. */
    shouldPrompt: !promptAnswered && !enabled && (permission === 'default' || permission === 'granted'),
    enable,
    disable,
  };
}
