import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { syncFromOtherTabs } from './store/appStore';
import './styles.css';

syncFromOtherTabs();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('/sw.js');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
