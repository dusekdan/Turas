// Check-in reminders. Local-only PWA: no push server, so we use
//  1) Periodic Background Sync (Chrome/Android, installed PWA) for background nudges,
//  2) an in-session timer while the app is open,
//  3) a gentle in-app banner fallback everywhere else.

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function enableReminders(hour = 20) {
  const perm = await requestPermission();
  if (perm !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      await reg.periodicSync.register('checkin-reminder', { minInterval: 12 * 60 * 60 * 1000 });
    }
  } catch { /* periodic sync unavailable — in-session timer still works */ }
  scheduleInSession(hour);
  return true;
}

export async function disableReminders() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) await reg.periodicSync.unregister('checkin-reminder');
  } catch { /* ignore */ }
  if (sessionTimer) clearTimeout(sessionTimer);
}

let sessionTimer = null;

/** While the app is open, fire the reminder at the configured hour. */
export function scheduleInSession(hour) {
  if (sessionTimer) clearTimeout(sessionTimer);
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  sessionTimer = setTimeout(async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('Evening check-in 🌙', {
      body: 'How was today? Fifteen seconds is all it takes.',
      icon: 'icons/icon-192.png',
      tag: 'turas-checkin',
      data: { url: './index.html#/checkin' },
    });
    scheduleInSession(hour);
  }, next - now);
}
