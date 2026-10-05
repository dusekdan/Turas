// Pure calculation functions — no DOM, no storage. Unit-tested in tests/calc.test.mjs.
// Units: Irish standard drink = 10 g pure alcohol. Ethanol density 0.789 g/ml.

export function gramsOfAlcohol(volumeMl, abv) {
  return volumeMl * (abv / 100) * 0.789;
}

export function stdDrinks(volumeMl, abv) {
  return gramsOfAlcohol(volumeMl, abv) / 10;
}

/* ---------- Local-date helpers (all day math in local time) ---------- */

export function dayKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function diffDays(fromKey, toKey) {
  return Math.round((parseDay(toKey) - parseDay(fromKey)) / 86400000);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(key) {
  return (parseDay(key).getDay() + 6) % 7;
}

/** Day key of the Monday of the week containing `key`. */
export function weekStart(key) {
  return addDays(key, -weekdayIndex(key));
}

/* ---------- Baseline schedule ----------
 * drink: { id, volumeMl, abv, kcal, price,
 *          schedule: { type: 'daily'|'weekly', days: [0..6], qty } }
 */

export function drinkQtyOn(drink, wdIdx) {
  const s = drink.schedule;
  if (!s || !s.qty) return 0;
  if (s.type === 'daily') return s.qty;
  return (s.days || []).includes(wdIdx) ? s.qty : 0;
}

export function drinkTotals(drink, qty = 1) {
  return {
    count: qty,
    cost: (drink.price || 0) * qty,
    std: stdDrinks(drink.volumeMl, drink.abv) * qty,
    kcal: (drink.kcal || 0) * qty,
  };
}

function addInto(acc, t) {
  acc.count += t.count; acc.cost += t.cost; acc.std += t.std; acc.kcal += t.kcal;
  return acc;
}

export function emptyTotals() {
  return { count: 0, cost: 0, std: 0, kcal: 0 };
}

export function baselineForDay(drinks, wdIdx) {
  return drinks.reduce((acc, d) => addInto(acc, drinkTotals(d, drinkQtyOn(d, wdIdx))), emptyTotals());
}

export function baselineWeekly(drinks) {
  const acc = emptyTotals();
  for (let wd = 0; wd < 7; wd++) addInto(acc, baselineForDay(drinks, wd));
  return acc;
}

/** Baseline totals between two day keys inclusive. */
export function baselineBetween(drinks, fromKey, toKey) {
  const n = diffDays(fromKey, toKey);
  if (n < 0) return emptyTotals();
  const perWd = [];
  for (let wd = 0; wd < 7; wd++) perWd.push(baselineForDay(drinks, wd));
  const acc = emptyTotals();
  for (let i = 0; i <= n; i++) addInto(acc, perWd[weekdayIndex(addDays(fromKey, i))]);
  return acc;
}

/* ---------- Consumption events ----------
 * event: { id, ts (epoch ms), day (YYYY-MM-DD), drinkId?, qty,
 *          costOverride?, stdOverride?, kcalOverride? }
 * Slips without an itemised drink carry overrides (or zeros).
 */

export function eventTotals(ev, drinksById) {
  const d = ev.drinkId ? drinksById[ev.drinkId] : null;
  const qty = ev.qty || 1;
  if (d) {
    const t = drinkTotals(d, qty);
    if (ev.costOverride != null) t.cost = ev.costOverride;
    return t;
  }
  return {
    count: qty,
    cost: ev.costOverride || 0,
    std: ev.stdOverride || 0,
    kcal: ev.kcalOverride || 0,
  };
}

export function consumedBetween(events, drinksById, fromKey, toKey) {
  const acc = emptyTotals();
  for (const ev of events) {
    if (ev.day >= fromKey && ev.day <= toKey) addInto(acc, eventTotals(ev, drinksById));
  }
  return acc;
}

/** Money / drinks / kcal saved = baseline since start minus what was actually consumed. */
export function savings(drinks, events, drinksById, startKey, todayKey) {
  const base = baselineBetween(drinks, startKey, todayKey);
  const used = consumedBetween(events, drinksById, startKey, todayKey);
  return {
    cost: base.cost - used.cost,
    count: base.count - used.count,
    std: base.std - used.std,
    kcal: base.kcal - used.kcal,
    baseline: base,
    consumed: used,
  };
}

/* ---------- Streaks ---------- */

export function drinkingDays(events) {
  return new Set(events.map((e) => e.day));
}

/** Alcohol-free days completed since the last drinking day (or start).
 *  Day of a slip counts as day 0; "Day N" display is streakDays + 1. */
export function streakDays(startKey, events, todayKey) {
  let anchor = startKey;
  for (const ev of events) {
    if (ev.day >= anchor && ev.day <= todayKey) {
      const after = addDays(ev.day, 1);
      if (after > anchor) anchor = after;
    }
  }
  return anchor > todayKey ? 0 : diffDays(anchor, todayKey);
}

export function longestStreak(startKey, events, todayKey) {
  const days = [...drinkingDays(events)].filter((d) => d >= startKey && d <= todayKey).sort();
  let best = 0;
  let prev = addDays(startKey, -1);
  for (const d of days) {
    best = Math.max(best, diffDays(prev, d) - 1);
    prev = d;
  }
  best = Math.max(best, diffDays(prev, todayKey));
  return best;
}

export function lifetimeStats(startKey, events, todayKey) {
  const total = diffDays(startKey, todayKey) + 1;
  const dd = [...drinkingDays(events)].filter((d) => d >= startKey && d <= todayKey).length;
  return { totalDays: total, drinkingDays: dd, afDays: total - dd };
}

/* ---------- Cut-down gauges ---------- */

export function currentWeek(events, drinksById, todayKey) {
  const from = weekStart(todayKey);
  const consumed = consumedBetween(events, drinksById, from, todayKey);
  const dd = new Set(events.filter((e) => e.day >= from && e.day <= todayKey).map((e) => e.day));
  const elapsed = diffDays(from, todayKey) + 1;
  return { from, consumed, drinkFreeDays: elapsed - dd.size, elapsedDays: elapsed };
}

/** Average weekly std drinks over up to the last 28 days (whole days, min 7). */
export function recentWeeklyAvgStd(events, drinksById, startKey, todayKey) {
  let from = addDays(todayKey, -27);
  if (from < startKey) from = startKey;
  const days = diffDays(from, todayKey) + 1;
  const used = consumedBetween(events, drinksById, from, todayKey);
  return (used.std / days) * 7;
}

export function pctReduction(baselineWeeklyStd, recentWeeklyStd) {
  if (baselineWeeklyStd <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - recentWeeklyStd / baselineWeeklyStd));
}

/* ---------- Milestones ---------- */

export function splitMilestones(milestones, streak) {
  const done = milestones.filter((m) => streak >= m.days);
  const upcoming = milestones.filter((m) => streak < m.days);
  return { done, next: upcoming[0] || null, upcoming };
}
