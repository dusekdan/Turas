// Run with: node tests/calc.test.mjs   (plain asserts — Node 16 compatible)
import assert from 'assert';
import {
  gramsOfAlcohol, stdDrinks, dayKey, parseDay, addDays, diffDays, weekdayIndex,
  weekStart, drinkQtyOn, baselineForDay, baselineWeekly, baselineBetween,
  eventTotals, consumedBetween, savings, streakDays, longestStreak,
  lifetimeStats, currentWeek, recentWeeklyAvgStd, pctReduction, splitMilestones,
} from '../app/js/calc.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
}
const approx = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

/* Alcohol math vs drinkaware.ie reference values */
test('pint of stout (568ml, 4.2%) ≈ 1.9 std drinks', () => approx(stdDrinks(568, 4.2), 1.88, 0.05));
test('Irish pub measure (35.5ml, 40%) ≈ 1.1 std drinks', () => approx(stdDrinks(35.5, 40), 1.12, 0.03));
test('bottle of wine (750ml, 12.5%) ≈ 7.4 std drinks', () => approx(stdDrinks(750, 12.5), 7.4, 0.1));
test('grams: 568ml at 4.2% ≈ 18.8g', () => approx(gramsOfAlcohol(568, 4.2), 18.82, 0.1));

/* Date helpers */
test('dayKey/parseDay roundtrip', () => assert.strictEqual(dayKey(parseDay('2026-03-01')), '2026-03-01'));
test('addDays across month', () => assert.strictEqual(addDays('2026-01-31', 1), '2026-02-01'));
test('addDays across DST (IE: last Sunday of March)', () => assert.strictEqual(addDays('2026-03-28', 2), '2026-03-30'));
test('diffDays', () => assert.strictEqual(diffDays('2026-01-01', '2026-01-31'), 30));
test('weekdayIndex Mon=0', () => assert.strictEqual(weekdayIndex('2026-10-05'), 0)); // a Monday
test('weekStart', () => assert.strictEqual(weekStart('2026-10-04'), '2026-09-28')); // Sun → prev Mon

/* Baseline schedule */
const stout = { id: 's', name: 'stout', volumeMl: 568, abv: 4.2, kcal: 195, price: 6,
  schedule: { type: 'weekly', days: [4, 5], qty: 2 } }; // 2 pints Fri+Sat
const wine = { id: 'w', name: 'wine', volumeMl: 750, abv: 12.5, kcal: 560, price: 11,
  schedule: { type: 'daily', days: [], qty: 1 } };
const byId = { s: stout, w: wine };

test('drinkQtyOn weekly', () => {
  assert.strictEqual(drinkQtyOn(stout, 4), 2);
  assert.strictEqual(drinkQtyOn(stout, 0), 0);
});
test('baselineForDay Friday = 2 stout + 1 wine', () => {
  const t = baselineForDay([stout, wine], 4);
  assert.strictEqual(t.count, 3);
  approx(t.cost, 2 * 6 + 11);
});
test('baselineWeekly cost: 4 stouts + 7 wines', () => approx(baselineWeekly([stout, wine]).cost, 4 * 6 + 7 * 11));
test('baselineBetween one full week equals weekly', () => {
  approx(baselineBetween([stout, wine], '2026-10-05', '2026-10-11').cost, baselineWeekly([stout, wine]).cost);
});
test('baselineBetween inverted range is zero', () => assert.strictEqual(baselineBetween([stout], '2026-10-11', '2026-10-05').cost, 0));

/* Events & savings */
const ev = (day, drinkId, qty = 1) => ({ day, drinkId, qty, ts: 0 });
test('eventTotals with drink', () => approx(eventTotals(ev('2026-10-05', 's'), byId).cost, 6));
test('eventTotals override-only slip', () => {
  const t = eventTotals({ day: 'x', qty: 1, costOverride: 9, stdOverride: 2 }, byId);
  approx(t.cost, 9); approx(t.std, 2);
});
test('savings = baseline − consumed', () => {
  const s = savings([stout, wine], [ev('2026-10-05', 'w')], byId, '2026-10-05', '2026-10-11');
  approx(s.cost, (4 * 6 + 7 * 11) - 11);
});

/* Streaks */
test('streak with no events = days since start', () => assert.strictEqual(streakDays('2026-10-01', [], '2026-10-10'), 9));
test('streak resets day after a slip', () => {
  // slip on the 8th, viewed on the 10th → 1 completed AF day (displayed as "Day 2")
  assert.strictEqual(streakDays('2026-10-01', [ev('2026-10-08', 's')], '2026-10-10'), 1);
  assert.strictEqual(streakDays('2026-10-01', [ev('2026-10-10', 's')], '2026-10-10'), 0);
});
test('longestStreak picks the best run', () => {
  // start 1st, slips on 5th and 6th, today 20th → runs: 4, 0, 14
  assert.strictEqual(longestStreak('2026-10-01', [ev('2026-10-05', 's'), ev('2026-10-06', 's')], '2026-10-20'), 14);
});
test('lifetimeStats counts distinct drinking days', () => {
  const l = lifetimeStats('2026-10-01', [ev('2026-10-05', 's'), ev('2026-10-05', 'w')], '2026-10-10');
  assert.strictEqual(l.totalDays, 10);
  assert.strictEqual(l.drinkingDays, 1);
  assert.strictEqual(l.afDays, 9);
});

/* Cut-down gauges */
test('currentWeek totals and drink-free days', () => {
  const w = currentWeek([ev('2026-10-06', 's', 2)], byId, '2026-10-08'); // week starts Mon 10-05
  assert.strictEqual(w.from, '2026-10-05');
  assert.strictEqual(w.elapsedDays, 4);
  assert.strictEqual(w.drinkFreeDays, 3);
  approx(w.consumed.cost, 12);
});
test('pctReduction clamps 0..1', () => {
  approx(pctReduction(10, 5), 0.5);
  assert.strictEqual(pctReduction(10, 20), 0);
  assert.strictEqual(pctReduction(0, 5), 0);
});
test('recentWeeklyAvgStd scales to a week', () => {
  // 14 days window with one stout-pair event → (2×1.88 std / 14) × 7
  const got = recentWeeklyAvgStd([ev('2026-10-01', 's', 2)], byId, '2026-09-25', '2026-10-08');
  approx(got, (2 * stdDrinks(568, 4.2) / 14) * 7, 0.05);
});

/* Milestones */
test('splitMilestones finds next', () => {
  const ms = [{ days: 1 }, { days: 7 }, { days: 30 }];
  const r = splitMilestones(ms, 7);
  assert.strictEqual(r.done.length, 2);
  assert.strictEqual(r.next.days, 30);
});

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`);
