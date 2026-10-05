// Progress: pageable calendar heatmap, lifetime stats, milestones (incl. custom),
// condensed badge wall, money-saved treats, and mood/sleep/cravings chart.

import { el, fmtMoney, fmtNum, sheet, toast } from '../ui.js';
import { getAll } from '../db.js';
import {
  dayKey, addDays, weekStart, drinkingDays, savings, streakDays,
  longestStreak, lifetimeStats, splitMilestones,
} from '../calc.js';
import { BADGES, WEEKDAYS } from '../data/presets.js';
import { getEarned } from '../features/achievements.js';
import { allMilestones, addCustomMilestone, removeCustomMilestone } from '../features/milestones.js';

export async function render(root, profile) {
  const [drinks, events, checkins] = await Promise.all([
    getAll('drinks'), getAll('events'), getAll('checkins'),
  ]);
  const drinksById = Object.fromEntries(drinks.map((d) => [d.id, d]));
  const today = dayKey(new Date());
  const sav = savings(drinks, events, drinksById, profile.startDate, today);
  const streak = streakDays(profile.startDate, events, today);
  const longest = longestStreak(profile.startDate, events, today);
  const life = lifetimeStats(profile.startDate, events, today);

  root.append(el('h1', {}, 'Your progress'));

  // Lifetime stats — these never reset.
  root.append(el('div', { class: 'card accent' },
    el('h2', {}, 'The whole journey'),
    el('div', { class: 'stats' },
      heroStat(fmtNum(life.afDays), 'alcohol-free days'),
      heroStat(fmtMoney(sav.cost, profile.currency), 'saved'),
      heroStat(fmtNum(longest), 'longest streak'),
    ),
    el('p', { style: 'font-size:.82rem;opacity:.85;margin:10px 0 0' },
      'Whatever happens on any single day, these numbers are yours for good.'),
  ));

  root.append(calendarCard(profile, events, today));
  root.append(treatsCard(profile, sav));
  root.append(await badgesCard({
    streak, longest, moneySaved: sav.cost, drinksAvoided: sav.count, checkinCount: checkins.length,
  }));
  if (checkins.length >= 2) root.append(chartCard(checkins));
  root.append(await milestonesCard(root, profile, streak));
}

function heroStat(v, k) {
  return el('div', { class: 'stat', style: 'background:rgba(255,255,255,.12);border:none' },
    el('div', { class: 'v', style: 'color:#fff' }, v),
    el('div', { class: 'k', style: 'color:rgba(255,255,255,.75)' }, k));
}

/* ---------- Calendar heatmap: 6-week pages, swipe + buttons ---------- */

const WEEKS_SHOWN = 6;

function calendarCard(profile, events, today) {
  const dd = drinkingDays(events);
  let offsetWeeks = 0; // 0 = page ending at the current week

  const title = el('h2', { style: 'margin:0' });
  const grid = el('div', { class: 'cal' });
  const back = el('button', { class: 'cal-nav', 'aria-label': 'Earlier weeks', onclick: () => { offsetWeeks += WEEKS_SHOWN; draw(); } }, '‹');
  const fwd = el('button', { class: 'cal-nav', 'aria-label': 'Later weeks', onclick: () => { offsetWeeks = Math.max(0, offsetWeeks - WEEKS_SHOWN); draw(); } }, '›');

  function draw() {
    fwd.disabled = offsetWeeks === 0;
    const lastWeek = addDays(weekStart(today), -7 * offsetWeeks);
    const start = addDays(lastWeek, -7 * (WEEKS_SHOWN - 1));
    const end = addDays(lastWeek, 6);
    const fmt = (k) => new Date(k).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
    title.textContent = offsetWeeks === 0 ? `Last ${WEEKS_SHOWN} weeks` : `${fmt(start)} – ${fmt(end)}`;
    grid.innerHTML = '';
    grid.append(...WEEKDAYS.map((w) => el('div', { class: 'c-head' }, w[0])));
    let d = start;
    while (d <= end) {
      let cls = 'c-day';
      if (d > today) cls += ' future';
      else if (d < profile.startDate) cls += '';
      else if (dd.has(d)) cls += ' drank';
      else cls += d >= addDays(today, -6) ? ' af deep' : ' af';
      grid.append(el('div', { class: cls, title: d }, parseInt(d.slice(8), 10)));
      d = addDays(d, 1);
    }
  }
  draw();

  // Swipe left/right to page through weeks.
  let touchX = null;
  grid.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  grid.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (dx > 40) { offsetWeeks += WEEKS_SHOWN; draw(); }           // swipe right → past
    else if (dx < -40 && offsetWeeks > 0) { offsetWeeks = Math.max(0, offsetWeeks - WEEKS_SHOWN); draw(); }
  }, { passive: true });

  return el('div', { class: 'card' },
    el('div', { class: 'card-head' }, title, el('div', { class: 'cal-navs' }, back, fwd)),
    grid,
    el('p', { class: 'faint', style: 'font-size:.76rem;margin:8px 0 0' },
      '🟩 alcohol-free · 🟥 drank · swipe to see other weeks. A red square never erases the green around it.'));
}

/* ---------- Treats ---------- */

function treatsCard(profile, sav) {
  const treats = profile.treats || [];
  return el('div', { class: 'card' },
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
}

/* ---------- Badges: last 3 earned + next 3 up + "see all" ---------- */

function badgeTile(b, isEarned) {
  return el('div', { class: `badge ${isEarned ? 'earned' : ''}` },
    el('div', { class: 'b-icon' }, b.icon),
    el('div', { class: 'b-name' }, b.name));
}

function badgeProgress(b, stats) {
  const value = { streak: stats.streak, money: stats.moneySaved, avoided: stats.drinksAvoided, checkins: stats.checkinCount }[b.type];
  if (value == null || !b.threshold) return -1; // process badges: no measurable progress
  return Math.min(1, Math.max(0, value / b.threshold));
}

async function badgesCard(stats) {
  const earned = await getEarned();
  const earnedList = BADGES.filter((b) => earned[b.id])
    .sort((a, b) => (earned[b.id] < earned[a.id] ? -1 : 1))
    .slice(0, 3);
  const upNext = BADGES.filter((b) => !earned[b.id])
    .map((b) => ({ b, p: badgeProgress(b, stats) }))
    .sort((x, y) => y.p - x.p)
    .slice(0, 3)
    .map((x) => x.b);

  const card = el('div', { class: 'card' },
    el('div', { class: 'card-head' },
      el('h2', { style: 'margin:0' }, 'Badges'),
      el('button', {
        class: 'linklike', style: 'font-size:.82rem',
        onclick: () => sheet(el('div', {},
          el('h2', {}, `All badges (${Object.keys(earned).length}/${BADGES.length})`),
          el('div', { class: 'badge-wall' }, BADGES.map((b) => badgeTile(b, !!earned[b.id]))))),
      }, 'See all →')));

  if (earnedList.length) {
    card.append(el('p', { class: 'faint badge-sub' }, 'Recently earned'),
      el('div', { class: 'badge-wall' }, earnedList.map((b) => badgeTile(b, true))));
  }
  if (upNext.length) {
    card.append(el('p', { class: 'faint badge-sub' }, 'Coming up next'),
      el('div', { class: 'badge-wall' }, upNext.map((b) => badgeTile(b, false))));
  }
  return card;
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

/* ---------- Milestone timeline (built-in + custom) ---------- */

async function milestonesCard(root, profile, streak) {
  const milestones = await allMilestones();
  const { next } = splitMilestones(milestones, streak);
  const rerender = () => { root.innerHTML = ''; render(root, profile); };

  return el('div', { class: 'card' },
    el('div', { class: 'card-head' },
      el('h2', { style: 'margin:0' }, 'Body & mind timeline'),
      el('button', { class: 'linklike', style: 'font-size:.82rem', onclick: () => addMilestoneSheet(rerender) }, '+ add your own')),
    milestones.map((m) => {
      const cls = streak >= m.days ? 'done' : (next && m.days === next.days ? 'next' : '');
      return el('div', { class: `milestone ${cls}` },
        el('div', { class: 'dot' }),
        el('div', { style: 'flex:1' },
          el('strong', {}, `${m.icon} ${m.title}`),
          el('span', { class: 'faint', style: 'font-size:.78rem' }, `  · day ${m.days}`),
          m.text ? el('div', { class: 'muted', style: 'font-size:.85rem' }, m.text) : null),
        m.custom ? el('button', {
          class: 'linklike', style: 'font-size:.76rem;flex:0 0 auto',
          onclick: async () => { await removeCustomMilestone(m.id); rerender(); },
        }, 'delete') : null);
    }));
}

function addMilestoneSheet(onSaved) {
  const daysIn = el('input', { type: 'number', min: '1', step: '1', placeholder: 'e.g. 100' });
  const titleIn = el('input', { type: 'text', placeholder: 'e.g. Sister’s wedding, sober' });
  const textIn = el('textarea', { placeholder: 'Why this day matters (optional)' });
  const s = sheet(el('div', {},
    el('h2', {}, 'Your own milestone'),
    el('label', { class: 'field' }, el('span', {}, 'Day of the journey'), daysIn),
    el('label', { class: 'field' }, el('span', {}, 'Title'), titleIn),
    el('label', { class: 'field' }, el('span', {}, 'Note'), textIn),
    el('div', { class: 'row' },
      el('button', { class: 'btn ghost', onclick: () => s.close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: async () => {
        const days = parseInt(daysIn.value, 10);
        const title = titleIn.value.trim();
        if (!(days > 0) || !title) { toast('Give it a day number and a title'); return; }
        await addCustomMilestone({ days, title, text: textIn.value.trim() });
        s.close(); toast('Milestone added 📌');
        onSaved();
      } }, 'Add')),
  ));
}
