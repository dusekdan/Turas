// Shared drink editor sheet (used by onboarding and settings).
// Builds a drink: preset nutrition + the user's own price + old-habit recurrence.

import { el, sheet } from '../ui.js';
import { PRESETS, WEEKDAYS } from '../data/presets.js';
import { stdDrinks } from '../calc.js';

/** Opens the editor; resolves with a drink object or null if cancelled. */
export function editDrink(existing = null) {
  return new Promise((resolve) => {
    const d = existing ? JSON.parse(JSON.stringify(existing)) : {
      emoji: '🍺', name: '', volumeMl: 568, abv: 4.3, kcal: 215, price: 6.5,
      presetId: null,
      schedule: { type: 'weekly', days: [4, 5], qty: 1 },
    };

    const presetSel = el('select', {},
      el('option', { value: '' }, existing ? '— keep current values —' : 'Pick a preset…'),
      ...PRESETS.map((p) => el('option', { value: p.id }, `${p.emoji} ${p.name}`)),
      el('option', { value: 'custom' }, '✏️ Custom drink'),
    );
    const nameIn = el('input', { type: 'text', value: d.name, placeholder: 'e.g. Pint of stout at my local' });
    const volIn = el('input', { type: 'number', step: '1', min: '10', value: d.volumeMl });
    const abvIn = el('input', { type: 'number', step: '0.1', min: '0', max: '96', value: d.abv });
    const kcalIn = el('input', { type: 'number', step: '1', min: '0', value: d.kcal });
    const priceIn = el('input', { type: 'number', step: '0.10', min: '0', value: d.price });
    const stdOut = el('div', { class: 'muted', style: 'font-size:.85rem' });

    function refreshStd() {
      const v = parseFloat(volIn.value) || 0;
      const a = parseFloat(abvIn.value) || 0;
      stdOut.textContent = `≈ ${stdDrinks(v, a).toFixed(1)} standard drinks (Irish, 10 g alcohol each)`;
    }
    volIn.addEventListener('input', refreshStd);
    abvIn.addEventListener('input', refreshStd);
    refreshStd();

    presetSel.addEventListener('change', () => {
      const p = PRESETS.find((x) => x.id === presetSel.value);
      if (!p) return;
      d.presetId = p.id; d.emoji = p.emoji;
      nameIn.value = p.name;
      volIn.value = p.volumeMl; abvIn.value = p.abv; kcalIn.value = p.kcal; priceIn.value = p.price;
      refreshStd();
    });

    const typeSel = el('select', {},
      el('option', { value: 'weekly', selected: d.schedule.type === 'weekly' }, 'On certain days'),
      el('option', { value: 'daily', selected: d.schedule.type === 'daily' }, 'Every day'),
    );
    const qtyIn = el('input', { type: 'number', step: '1', min: '1', value: d.schedule.qty });
    const dayChips = WEEKDAYS.map((w, i) =>
      el('button', {
        type: 'button',
        class: `chip small ${d.schedule.days.includes(i) ? 'on' : ''}`,
        onclick: (e) => {
          const idx = d.schedule.days.indexOf(i);
          if (idx >= 0) d.schedule.days.splice(idx, 1); else d.schedule.days.push(i);
          e.target.classList.toggle('on');
        },
      }, w));
    const daysRow = el('div', { class: 'chips' }, dayChips);
    function refreshDays() { daysRow.classList.toggle('hidden', typeSel.value === 'daily'); }
    typeSel.addEventListener('change', refreshDays);
    refreshDays();

    const form = el('div', {},
      el('h2', {}, existing ? 'Edit drink' : 'Add a drink'),
      el('label', { class: 'field' }, el('span', {}, 'Preset'), presetSel),
      el('label', { class: 'field' }, el('span', {}, 'Name'), nameIn),
      el('div', { class: 'row' },
        el('label', { class: 'field' }, el('span', {}, 'Volume (ml)'), volIn),
        el('label', { class: 'field' }, el('span', {}, 'ABV %'), abvIn),
      ),
      stdOut,
      el('div', { class: 'row' },
        el('label', { class: 'field' }, el('span', {}, 'Calories (kcal)'), kcalIn),
        el('label', { class: 'field' }, el('span', {}, 'Price you pay (€)'), priceIn),
      ),
      el('h3', { style: 'margin-top:14px' }, 'How often did you have this?'),
      el('div', { class: 'row' },
        el('label', { class: 'field' }, el('span', {}, 'Pattern'), typeSel),
        el('label', { class: 'field' }, el('span', {}, 'How many each time'), qtyIn),
      ),
      daysRow,
      el('div', { class: 'row', style: 'margin-top:14px' },
        el('button', { class: 'btn ghost', onclick: () => { s.close(); resolve(null); } }, 'Cancel'),
        el('button', {
          class: 'btn',
          onclick: () => {
            d.name = nameIn.value.trim() || 'My drink';
            d.volumeMl = parseFloat(volIn.value) || 0;
            d.abv = parseFloat(abvIn.value) || 0;
            d.kcal = parseFloat(kcalIn.value) || 0;
            d.price = parseFloat(priceIn.value) || 0;
            d.schedule.type = typeSel.value;
            d.schedule.qty = Math.max(1, parseInt(qtyIn.value, 10) || 1);
            if (d.schedule.type === 'weekly' && d.schedule.days.length === 0) {
              daysRow.scrollIntoView(); return;
            }
            s.close(); resolve(d);
          },
        }, 'Save drink'),
      ),
    );
    const s = sheet(form);
  });
}

/** Render a compact drink row with its schedule summary. */
export function drinkRow(d, actions = null) {
  const sched = d.schedule.type === 'daily'
    ? `${d.schedule.qty} × daily`
    : `${d.schedule.qty} × ${d.schedule.days.map((i) => WEEKDAYS[i]).join(', ')}`;
  return el('div', { class: 'drink-item' },
    el('div', { class: 'd-emoji' }, d.emoji || '🍺'),
    el('div', { class: 'd-main' },
      el('div', { class: 'd-name' }, d.name),
      el('div', { class: 'd-sub' }, `€${d.price.toFixed(2)} · ${stdDrinks(d.volumeMl, d.abv).toFixed(1)} std · ${sched}`),
    ),
    actions,
  );
}
