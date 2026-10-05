import { getProfile, requestPersistence } from './db.js';
import { scheduleInSession } from './features/notifications.js';
import * as onboarding from './views/onboarding.js';
import * as home from './views/home.js';
import * as log from './views/log.js';
import * as sos from './views/sos.js';
import * as triggers from './views/triggers.js';
import * as checkin from './views/checkin.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';
import * as help from './views/help.js';

const routes = {
  '/onboarding': onboarding,
  '/home': home,
  '/log': log,
  '/sos': sos,
  '/triggers': triggers,
  '/checkin': checkin,
  '/progress': progress,
  '/settings': settings,
  '/help': help,
};

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
const sosFab = document.getElementById('sos-fab');

sosFab.addEventListener('click', () => { location.hash = '#/sos'; });

let currentView = null;

async function render() {
  // Let the outgoing view stop its timers etc. — covers the browser/Android
  // back button and tab clicks, not just explicit close buttons.
  if (currentView && typeof currentView.teardown === 'function') currentView.teardown();
  const profile = await getProfile();
  let path = (location.hash.replace(/^#/, '') || '/home').split('?')[0];
  if (!profile || !profile.onboarded) path = '/onboarding';
  const view = routes[path] || home;
  currentView = view;

  const chrome = path !== '/onboarding' && path !== '/sos';
  tabbar.classList.toggle('hidden', path === '/onboarding');
  sosFab.classList.toggle('hidden', !chrome);
  tabbar.querySelector('[data-tab="log"]').classList.toggle(
    'hidden', !profile || profile.mode !== 'cutdown');
  for (const a of tabbar.querySelectorAll('a')) {
    a.classList.toggle('active', `#/${a.dataset.tab}` === `#${path}`);
  }

  viewEl.innerHTML = '';
  viewEl.classList.remove('view');
  void viewEl.offsetWidth; // restart entry animation
  viewEl.classList.add('view');
  await view.render(viewEl, profile);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
window.addEventListener('turas:navigate', render);

(async function start() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  requestPersistence();
  const profile = await getProfile();
  if (profile && profile.notifications && profile.notifications.enabled) {
    scheduleInSession(profile.notifications.hour || 20);
  }
  render();
})();
