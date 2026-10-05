// Cut-down drink log: one-tap logging from the user's own drink list,
// plus today's and this week's running totals.

import { el, toast, fmtMoney, fmtDateTime } from '../ui.js';
import { getAll, put, remove } from '../db.js';
import { dayKey, currentWeek, consumedBetween, drinkTotals } from '../calc.js';

export async function render(root, profile) {
  const [drinks, events] = await Promise.all([getAll('drinks'), getAll('events')]);
  const drinksById = Object.fromEntries(drinks.map((d) => [d.id, d]));
  const today = dayKey(new Date());
  const todayTotals = consumedBetween(events, drinksById, today, today);
  const week = currentWeek(events, drinksById, today);

  root.append(
    el('h1', {}, 'Log a drink'),
    el('p', { class: 'muted' },
      `Today: ${todayTotals.std.toFixed(1)} std drinks · ${fmtMoney(todayTotals.cost, profile.currency)} — ` +
      `this week: ${week.consumed.std.toFixed(1)} std.`),
    el('div', { class: 'card' },
      drinks.map((d) => el('div', { class: 'drink-item' },
        el('div', { class: 'd-emoji' }, d.emoji || '🍺'),
        el('div', { class: 'd-main' },
          el('div', { class: 'd-name' }, d.name),
          el('div', { class: 'd-sub' }, `€${d.price.toFixed(2)} · ${drinkTotals(d).std.toFixed(1)} std`)),
        el('button', {
          class: 'btn small',
          onclick: async () => {
            await put('events', { ts: Date.now(), day: today, drinkId: d.id, qty: 1 });
            toast(`${d.emoji || '🍺'} Logged — honesty is the whole game.`);
            rerender(root, profile);
          },
        }, '+1'),
      )),
    ),
  );

  // Today's entries with undo
  const todays = events.filter((e) => e.day === today).sort((a, b) => b.ts - a.ts);
  if (todays.length) {
    root.append(el('div', { class: 'card' },
      el('h3', {}, 'Logged today'),
      todays.map((ev) => {
        const d = drinksById[ev.drinkId];
        return el('div', { class: 'drink-item' },
          el('div', { class: 'd-emoji' }, d ? d.emoji : '🍷'),
          el('div', { class: 'd-main' },
            el('div', { class: 'd-name' }, `${ev.qty} × ${d ? d.name : 'drink'}`),
            el('div', { class: 'd-sub' }, fmtDateTime(ev.ts))),
          el('button', {
            class: 'btn subtle small',
            onclick: async () => { await remove('events', ev.id); rerender(root, profile); },
          }, 'Undo'),
        );
      }),
    ));
  }
}

function rerender(root, profile) {
  root.innerHTML = '';
  render(root, profile);
}
