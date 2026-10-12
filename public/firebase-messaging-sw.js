/* Receives browser push notifications while the admin panel is closed.
 * The Firebase web config arrives as query parameters when the page registers
 * this worker (see lib/web-push.ts), so no secrets or build step are needed. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});
// Initialising messaging lets the SDK show notification-type messages itself.
firebase.messaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.FCM_MSG?.fcmOptions?.link
    || event.notification.data?.link
    || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});
