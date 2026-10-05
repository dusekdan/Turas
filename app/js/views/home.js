// Home dashboard. Abstinence: hero streak + slip flow. Cut-down: three gauges.

import { el, sheet, fmtMoney, fmtNum, toast } from '../ui.js';
import { getAll, put } from '../db.js';
import {
  dayKey, savings, streakDays, longestStreak, lifetimeStats, splitMilestones,
  currentWeek, baselineWeekly, recentWeeklyAvgStd, pctReduction,
} from '../calc.js';
import { MILESTONES, HSE_WEEKLY, BADGES } from '../data/presets.js';
import { checkThresholds, getEarned } from '../features/achievements.js';

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

  await checkThresholds({
    streak, longestStreak: longest,
    moneySaved: sav.cost, drinksAvoided: sav.count, checkinCount: checkins.length,
  });

  root.append(el('p', { class: 'faint', style: 'margin:0 0 2px;font-weight:650' },
    greeting()));

  if (profile.mode === 'abstinence') {
    renderHero(root, profile, streak, drinks, events);
  } else {
    renderGauges(root, profile, drinks, events, drinksById, today, streak);
  }

  // Shared stats
  root.append(el('div', { class: 'stats' },
    stat(fmtMoney(sav.cost, profile.currency), 'saved'),
    stat(fmtNum(Math.max(0, sav.count)), 'drinks avoided'),
    stat(fmtNum(Math.max(0, sav.kcal)), 'kcal avoided'),
  ));
  root.append(el('div', { class: 'stats', style: 'margin-top:10px' },
    stat(fmtNum(life.afDays), 'alcohol-free days'),
    stat(fmtNum(longest), 'longest streak'),
    stat(fmtNum(life.totalDays), 'days on journey'),
  ));

  // Next milestone
  const { next, done } = splitMilestones(MILESTONES, streak);
  if (next) {
    root.append(el('div', { class: 'card', style: 'margin-top:14px' },
      el('h3', {}, 'Next up for your body'),
      el('div', { class: 'milestone next' },
        el('div', { class: 'dot' }),
        el('div', {},
          el('strong', {}, `${next.icon} ${next.title}`),
          el('div', { class: 'muted', style: 'font-size:.85rem' }, next.text),
          el('div', { class: 'faint', style: 'font-size:.8rem;margin-top:3px' },
            `${next.days - streak} day${next.days - streak === 1 ? '' : 's'} away`),
        )),
      done.length
        ? el('p', { class: 'faint', style: 'font-size:.8rem;margin:8px 0 0' },
            `✓ ${done.length} milestone${done.length === 1 ? '' : 's'} already reached — see Progress`)
        : null,
    ));
  }

  // Next badge teaser
  const earned = await getEarned();
  const nextBadge = BADGES.find((b) => b.type === 'streak' && !earned[b.id]);
  if (nextBadge) {
    root.append(el('p', { class: 'faint', style: 'text-align:center;font-size:.84rem' },
      `${nextBadge.icon} “${nextBadge.name}” badge: ${Math.max(0, nextBadge.threshold - streak)} days away`));
  }

  // Daily check-in nudge
  const doneToday = checkins.some((c) => c.date === today);
  if (!doneToday) {
    root.append(el('a', { class: 'btn subtle block', href: '#/checkin', style: 'margin-top:10px' },
      '🌙 Evening check-in (15 seconds)'));
  }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function stat(v, k) {
  return el('div', { class: 'stat' }, el('div', { class: 'v' }, v), el('div', { class: 'k' }, k));
}

/* ---------- Abstinence hero + slip flow ---------- */

function renderHero(root, profile, streak, drinks, events) {
  const dayNum = el('div', { class: 'day-count' }, String(streak + 1));
  const hero = el('div', { class: 'card accent hero' },
    el('div', { class: 'day-label' }, 'Day'),
    dayNum,
    el('div', { class: 'day-label' }, 'of your journey'),
    el('button', {
      class: 'linklike', style: 'color:rgba(255,255,255,.8);margin-top:12px',
      onclick: () => slipFlow(root, profile, drinks, dayNum),
    }, 'I had a drink'),
  );
  root.append(hero);
}

function slipFlow(root, profile, drinks, dayNum) {
  const picked = new Map(); // drinkId -> qty
  const list = el('div', {},
    drinks.map((d) => {
      const count = el('span', { class: 'muted', style: 'min-width:22px;text-align:center;font-weight:700' }, '0');
      return el('div', { class: 'drink-item' },
        el('div', { class: 'd-emoji' }, d.emoji || '🍺'),
        el('div', { class: 'd-main' },
          el('div', { class: 'd-name' }, d.name),
          el('div', { class: 'd-sub' }, `€${d.price.toFixed(2)}`)),
        el('div', { class: 'qty-btns' },
          el('button', { onclick: () => { const q = Math.max(0, (picked.get(d.id) || 0) - 1); picked.set(d.id, q); count.textContent = q; } }, '−'),
          count,
          el('button', { onclick: () => { const q = (picked.get(d.id) || 0) + 1; picked.set(d.id, q); count.textContent = q; } }, '+'),
        ));
    }));

  const s = sheet(el('div', {},
    el('h2', {}, 'It happens.'),
    el('p', { class: 'muted' }, 'A slip is data, not failure. Log it honestly — your lifetime progress stays yours, always.'),
    list,
    el('div', { class: 'row', style: 'margin-top:14px' },
      el('button', { class: 'btn ghost', onclick: () => s.close() }, 'Never mind'),
      el('button', {
        class: 'btn warm',
        onclick: async () => {
          const now = Date.now();
          let any = false;
          for (const [drinkId, qty] of picked) {
            if (qty > 0) { any = true; await put('events', { ts: now, day: dayKey(new Date()), drinkId, qty }); }
          }
          if (!any) await put('events', { ts: now, day: dayKey(new Date()), qty: 1, stdOverride: 0, costOverride: 0 });
          s.close();
          animateReset(root, dayNum);
        },
      }, 'Log it & reset streak'),
    ),
  ));
}

function animateReset(root, dayNum) {
  dayNum.classList.add('resetting');
  setTimeout(() => {
    dayNum.textContent = '1';
    dayNum.classList.remove('resetting');
    toast('Day 1. The journey continues — you’ve lost nothing you learned. 🌊');
    // Quiet reflect offer below the hero — never a forced dialog.
    const hero = dayNum.closest('.hero');
    if (hero && !hero.querySelector('.reflect-offer')) {
      hero.append(el('a', {
        class: 'linklike reflect-offer',
        style: 'color:rgba(255,255,255,.85)',
        href: '#/triggers?reflect=1',
      }, 'Want to reflect on what led to it?'));
    }
  }, 450);
}

/* ---------- Cut-down gauges ---------- */

function renderGauges(root, profile, drinks, events, drinksById, today, streak) {
  const week = currentWeek(events, drinksById, today);
  const baseWeek = baselineWeekly(drinks);
  const budget = profile.goals.weeklyBudget || 0;
  const dfTarget = profile.goals.dfDaysTarget || 0;
  const recent = recentWeeklyAvgStd(events, drinksById, profile.startDate, today);
  const reduction = pctReduction(baseWeek.std, recent);
  const hse = profile.sex ? HSE_WEEKLY[profile.sex] : null;

  const card = el('div', { class: 'card' },
    el('h2', {}, 'This week'),
    gauge('Weekly budget', `${week.consumed.std.toFixed(1)} / ${budget} std drinks`,
      budget > 0 ? week.consumed.std / budget : 0, week.consumed.std > budget),
    gauge('Drink-free days', `${week.drinkFreeDays} / ${dfTarget} days`,
      dfTarget > 0 ? week.drinkFreeDays / dfTarget : 0, false),
    gauge('Cut vs old habits (4-wk avg)', `${Math.round(reduction * 100)}% less than before`,
      reduction, false),
    hse ? el('p', { class: 'faint', style: 'font-size:.8rem;margin:6px 0 0' },
      `HSE low-risk guideline: max ${hse} standard drinks/week, spread out, 2+ drink-free days.`) : null,
    el('a', { class: 'btn block', href: '#/log', style: 'margin-top:12px' }, '✎ Log a drink'),
  );
  root.append(card);

  if (streak > 0) {
    root.append(el('p', { class: 'muted', style: 'text-align:center;font-size:.9rem' },
      `🌱 ${streak} drink-free day${streak === 1 ? '' : 's'} in a row right now`));
  }
}

function gauge(name, valueText, frac, over) {
  return el('div', { class: `gauge ${over ? 'over' : ''}` },
    el('div', { class: 'g-head' }, el('span', {}, name), el('span', {}, valueText)),
    el('div', { class: 'g-bar' },
      el('div', { class: 'g-fill', style: `width:${Math.min(100, Math.max(2, frac * 100))}%` })),
  );
}
