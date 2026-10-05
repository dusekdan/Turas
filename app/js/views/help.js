// Get Help: Irish support resources + withdrawal safety guidance.

import { el } from '../ui.js';

export async function render(root) {
  root.append(
    el('h1', {}, 'Get help'),
    el('div', { class: 'card', style: 'border-color:var(--warm);background:var(--warm-soft)' },
      el('h3', {}, '⚠️ Stopping suddenly can be dangerous'),
      el('p', { style: 'font-size:.9rem' },
        'If you drink heavily every day, or get shakes, sweating, anxiety or nausea when you stop, ',
        el('strong', {}, 'talk to your GP before quitting cold turkey.'),
        ' Alcohol withdrawal can cause seizures and delirium tremens. Medically supported detox is safe, common, and nothing to be embarrassed about.'),
      el('p', { style: 'font-size:.9rem' },
        el('strong', {}, 'Emergency: '), 'if someone who stopped drinking has a seizure, severe confusion or hallucinations — call ', el('strong', {}, '999 or 112'), ' now.')),
    el('div', { class: 'card' },
      el('h3', {}, '📞 HSE Drugs & Alcohol Helpline'),
      el('p', {}, el('a', { href: 'tel:1800459459', style: 'font-size:1.3rem;font-weight:700' }, '1800 459 459')),
      el('p', { class: 'muted', style: 'font-size:.85rem' }, 'Freephone, Monday–Friday 9:30–17:30. Confidential, non-judgemental, for you or someone you’re worried about.')),
    el('div', { class: 'card' },
      el('h3', {}, '🌐 Online supports'),
      linkRow('HSE — alcohol support & self-assessment', 'https://www2.hse.ie/living-well/alcohol/'),
      linkRow('Drinkaware.ie — standard drinks & calculator', 'https://www.drinkaware.ie'),
      linkRow('Alcoholics Anonymous Ireland', 'https://www.alcoholicsanonymous.ie'),
      linkRow('SMART Recovery Ireland', 'https://www.smartrecovery.ie')),
    el('div', { class: 'card' },
      el('h3', {}, 'About Turas'),
      el('p', { class: 'muted', style: 'font-size:.85rem' },
        'Turas is a self-help companion, not a medical device, and it can’t diagnose or treat alcohol dependence. It never sends your data anywhere — everything stays on this phone. If drinking is hurting you or the people around you, please reach for one of the supports above; they’ve heard it all before, and they can help.')),
  );
}

function linkRow(name, href) {
  return el('p', { style: 'font-size:.92rem' }, el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, name));
}
