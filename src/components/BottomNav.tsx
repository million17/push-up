import { useT } from '../i18n/useT';
import { useApp, type Tab } from '../store/appStore';
import { Icon, type IconName } from './Icon';

const TABS: { id: Tab; icon: IconName }[] = [
  { id: 'today', icon: 'today' },
  { id: 'progress', icon: 'progress' },
  { id: 'plan', icon: 'plan' },
  { id: 'settings', icon: 'settings' },
];

export function BottomNav() {
  const { t } = useT();
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  return (
    <nav className="bottom-nav">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item ${tab === item.id ? 'active' : ''}`}
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => setTab(item.id)}
        >
          <Icon name={item.icon} size={22} />
          <span>{t(`nav.${item.id}`)}</span>
        </button>
      ))}
    </nav>
  );
}
