import { useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { DayDetail } from './features/day/DayDetail';
import { Onboarding } from './features/onboarding/Onboarding';
import { PlanScreen } from './features/plan/PlanScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { TestResultView } from './features/test/TestResultView';
import { TestScreen } from './features/test/TestScreen';
import { TodayScreen } from './features/today/TodayScreen';
import { WorkoutComplete } from './features/workout/WorkoutComplete';
import { WorkoutScreen } from './features/workout/WorkoutScreen';
import { resolveLanguage, translator } from './i18n/i18n';
import { useLanguage } from './i18n/useT';
import { dueReminder, reminderNotification, showNotification } from './services/reminders';
import { useApp, type Overlay, type Tab } from './store/appStore';

const SCREENS: Record<Tab, () => React.ReactElement | null> = {
  today: TodayScreen,
  progress: ProgressScreen,
  plan: PlanScreen,
  settings: SettingsScreen,
};

export function App() {
  const hasProfile = useApp((s) => !!s.data.profile);
  const tab = useApp((s) => s.tab);
  const overlay = useApp((s) => s.overlay);
  useReminders();
  useDocumentLanguage();
  useOpenFromNotification();

  if (!hasProfile) return <Onboarding />;

  if (overlay) return <OverlayView overlay={overlay} />;

  const Screen = SCREENS[tab];
  return (
    <div className="app">
      <Screen />
      <BottomNav />
    </div>
  );
}

function OverlayView({ overlay }: { overlay: Overlay }) {
  switch (overlay.kind) {
    case 'workout':
      return <WorkoutScreen />;
    case 'workout-complete':
      return <WorkoutComplete logId={overlay.logId} />;
    case 'test':
      return <TestScreen />;
    case 'test-result':
      return <TestResultView resultId={overlay.resultId} />;
    case 'day':
      return <DayDetail day={overlay.day} />;
  }
}

/** Checks for a due reminder while the app is open (foreground or background). */
function useReminders() {
  useEffect(() => {
    const check = () => {
      const { data, markReminderShown } = useApp.getState();
      const reminder = dueReminder(data);
      if (!reminder) return;
      markReminderShown();
      const t = translator(resolveLanguage(data.settings.language));
      void showNotification(reminderNotification(reminder, t), t('notification.startAction'));
    };
    check();
    const id = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
}

function useDocumentLanguage() {
  const lang = useLanguage();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}

/** Tapping a reminder focuses the app; show Today unless a session is running. */
function useOpenFromNotification() {
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'open-today') return;
      const { overlay, setTab } = useApp.getState();
      if (!overlay || overlay.kind === 'day') setTab('today');
    };
    sw.addEventListener('message', onMessage);
    return () => sw.removeEventListener('message', onMessage);
  }, []);
}
