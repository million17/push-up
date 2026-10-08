// Minimal service worker: lets the app show notifications on mobile and
// opens/focuses the app (on Today) when a reminder or its "Start Workout"
// button is tapped. No caching.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients[0];
      if (!client) return self.clients.openWindow('/');
      client.postMessage({ type: 'open-today', action: event.action || null });
      return client.focus();
    }),
  );
});
