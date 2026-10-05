// Progress: calendar heatmap, lifetime stats, milestones, badge wall,
// money-saved treats, and mood/sleep/cravings chart.

import { el, fmtMoney, fmtNum } from '../ui.js';
import { getAll } from '../db.js';
import {
  dayKey, addDays, weekStart, drinkingDays, savings, streakDays,
  longestStreak, lifetimeStats, splitMilestones,
} from '../calc.js';
import { MILESTONES, BADGES, WEEKDAYS } from '../data/presets.js';
import { getEarned } from '../features/achievements.js';

export async function render(root, profile) {
  const [drinks, events, checkins] = await Promise.all([
    getAll('drinks'), getAll('events'), getAll('checkins'),
  ]);
  const drinksById = Object.fromEntries(drinks.map((d) => [d.id, d]));
  const today = dayKey(new Date());
  const sav = savings(drinks, events, drinksById, profile.startDate, today);
  const streak = streakDays(profile.startDate, events, today);
  const life = lifetimeStats(profile.startDate, events, today);

  root.append(el('h1', {}, 'Your progress'));

  // Lifetime stats — these never reset.
  root.append(el('div', { class: 'card accent' },
    el('h2', {}, 'The whole journey'),
    el('div', { class: 'stats' },
      heroStat(fmtNum(life.afDays), 'alcohol-free days'),
      heroStat(fmtMoney(sav.cost, profile.currency), 'saved'),
      heroStat(fmtNum(longestStreak(profile.startDate, events, today)), 'longest streak'),
    ),
    el('p', { style: 'font-size:.82rem;opacity:.85;margin:10px 0 0' },
      'Whatever happens on any single day, these numbers are yours for good.'),
  ));

  root.append(calendarCard(profile, events, today));
  root.append(treatsCard(profile, sav));
  root.append(await badgesCard());
  if (checkins.length >= 2) root.append(chartCard(checkins));
  root.append(milestonesCard(streak));
}

function heroStat(v, k) {
  return el('div', { class: 'stat', style: 'background:rgba(255,255,255,.12);border:none' },
    el('div', { class: 'v', style: 'color:#fff' }, v),
    el('div', { class: 'k', style: 'color:rgba(255,255,255,.75)' }, k));
}

/* ---------- Calendar heatmap: last 12 weeks ---------- */

function calendarCard(profile, events, today) {
  const dd = drinkingDays(events);
  const start = weekStart(addDays(today, -77)); // 12-week window
  const cells = [WEEKDAYS.map((w) => el('div', { class: 'c-head' }, w[0]))];
  let d = start;
  const dayCells = [];
  while (d <= addDays(weekStart(today), 6)) {
    let cls = 'c-day';
    if (d > today) cls += ' future';
    else if (d < profile.startDate) cls += '';
    else if (dd.has(d)) cls += ' drank';
    else cls += d >= addDays(today, -6) ? ' af deep' : ' af';
    dayCells.push(el('div', { class: cls, title: d }, parseInt(d.slice(8), 10)));
    d = addDays(d, 1);
  }
  return el('div', { class: 'card' },
    el('h2', {}, 'Last 12 weeks'),
    el('div', { class: 'cal' }, cells.flat(), dayCells),
    el('p', { class: 'faint', style: 'font-size:.76rem;margin:8px 0 0' },
      '🟩 alcohol-free · 🟥 drank · a red square never erases the green around it.'));
}

/* ---------- Treats ---------- */

function treatsCard(profile, sav) {
  const treats = profile.treats || [];
  const card = el('div', { class: 'card' },
    el('h2', {}, 'Treats you’re saving for'),
    treats.length === 0
      ? el('p', { class: 'muted', style: 'font-size:.88rem' },
          'Give the money a job — add a treat in Settings (“€220 → new runners”) and watch it fill up.')
      : treats.map((t) => {
          const frac = t.cost > 0 ? Math.min(1, sav.cost / t.cost) : 0;
          return el('div', { class: 'treat' },
            el('div', { class: 'g-head' },
              el('span', {}, `🎁 ${t.name}`),
              el('span', {}, frac >= 1 ? 'EARNED! 🎉' : `${fmtMoney(sav.cost, profile.currency)} / ${fmtMoney(t.cost, profile.currency)}`)),
            el('div', { class: 'g-bar' }, el('div', { class: 'g-fill', style: `width:${Math.max(2, frac * 100)}%` })));
        }));
  return card;
}

/* ---------- Badges ---------- */

async function badgesCard() {
  const earned = await getEarned();
  return el('div', { class: 'card' },
    el('h2', {}, 'Badges'),
    el('div', { class: 'badge-wall' },
      BADGES.map((b) => el('div', { class: `badge ${earned[b.id] ? 'earned' : ''}` },
        el('div', { class: 'b-icon' }, b.icon),
        el('div', { class: 'b-name' }, b.name)))));
}

/* ---------- Mood / sleep / cravings chart (hand-rolled SVG) ---------- */

function chartCard(checkins) {
  const data = checkins.slice().sort((a, b) => a.date < b.date ? -1 : 1).slice(-30);
  const W = 520, H = 180, PAD = 24;
  const x = (i) => PAD + (i / Math.max(1, data.length - 1)) * (W - 2 * PAD);
  const y = (v) => H - PAD - ((v - 1) / 4) * (H - 2 * PAD);
  const series = [
    ['mood', 'var(--accent)', 'Mood'],
    ['sleep', 'var(--gold)', 'Sleep'],
    ['cravings', 'var(--warm)', 'Cravings'],
  ];
  let paths = '';
  for (const [key, color] of series) {
    const pts = data.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c[key]).toFixed(1)}`).join(' ');
    paths += `<path d="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const card = el('div', { class: 'card chart-card' },
    el('h2', {}, 'How you’ve been feeling'),
    el('div', { class: 'chips' }, series.map(([, c, name]) =>
      el('span', { class: 'chip small', style: `border-color:${c};color:${c}` }, name))));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--card-border)"/>
    <line x1="${PAD}" y1="${PAD}" x2="${W - PAD}" y2="${PAD}" stroke="var(--card-border)" stroke-dasharray="3 4"/>
    ${paths}`;
  card.append(svg,
    el('p', { class: 'faint', style: 'font-size:.76rem' }, `Last ${data.length} check-ins · scale 1–5`));
  return card;
}

/* ---------- Milestone timeline ---------- */

function milestonesCard(streak) {
  const { next } = splitMilestones(MILESTONES, streak);
  return el('div', { class: 'card' },
    el('h2', {}, 'Body & mind timeline'),
    MILESTONES.map((m) => {
      const cls = streak >= m.days ? 'done' : (next && m.days === next.days ? 'next' : '');
      return el('div', { class: `milestone ${cls}` },
        el('div', { class: 'dot' }),
        el('div', {},
          el('strong', {}, `${m.icon} ${m.title}`),
          el('span', { class: 'faint', style: 'font-size:.78rem' }, `  · day ${m.days}`),
          el('div', { class: 'muted', style: 'font-size:.85rem' }, m.text)));
    }));
}
