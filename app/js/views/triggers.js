// Trigger log: HALT-style tags + free text, browsable history, simple pattern insight.

import { el, toast, fmtDateTime } from '../ui.js';
import { getAll, put, remove } from '../db.js';
import { HALT_TAGS, WEEKDAYS } from '../data/presets.js';
import { markEvent } from '../features/achievements.js';

export async function render(root) {
  const reflecting = location.hash.includes('reflect=1');
  const entries = (await getAll('triggers')).sort((a, b) => b.ts - a.ts);

  root.append(el('h1', {}, 'Triggers'),
    el('p', { class: 'muted' }, 'Spotting what sets off a craving is half the battle. Log it while it’s fresh.'));

  // --- New entry form ---
  const selected = new Set();
  const chips = el('div', { class: 'chips' },
    HALT_TAGS.map((t) => el('button', {
      class: 'chip',
      onclick: (e) => { e.target.classList.toggle('on'); selected.has(t) ? selected.delete(t) : selected.add(t); },
    }, t)));
  const text = el('textarea', {
    placeholder: reflecting
      ? 'What led up to it? Where were you, who with, how were you feeling?'
      : 'Describe the moment — where, who with, what you were feeling…',
  });
  const kindSel = el('select', {},
    el('option', { value: 'craving', selected: !reflecting }, 'A craving I had'),
    el('option', { value: 'slip', selected: reflecting }, 'Reflection on a slip'),
  );
  root.append(el('div', { class: 'card' },
    el('h3', {}, reflecting ? 'Reflect on what happened' : 'Log a trigger'),
    el('label', { class: 'field' }, el('span', {}, 'This is…'), kindSel),
    chips,
    el('label', { class: 'field' }, el('span', {}, 'What happened (optional)'), text),
    el('button', {
      class: 'btn block',
      onclick: async () => {
        if (selected.size === 0 && !text.value.trim()) { toast('Pick a tag or write a note first'); return; }
        await put('triggers', {
          ts: Date.now(), kind: kindSel.value,
          tags: [...selected], text: text.value.trim(),
        });
        await markEvent(kindSel.value === 'slip' ? 'slip-reflected' : 'trigger-logged');
        toast('Logged. Knowledge is armour. 🛡️');
        root.innerHTML = ''; render(root);
      },
    }, 'Save'),
  ));

  // --- Pattern insight ---
  if (entries.length >= 3) {
    const tagCount = {};
    const dayCount = {};
    for (const e of entries) {
      for (const t of e.tags || []) tagCount[t] = (tagCount[t] || 0) + 1;
      const wd = WEEKDAYS[(new Date(e.ts).getDay() + 6) % 7];
      dayCount[wd] = (dayCount[wd] || 0) + 1;
    }
    const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
    const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    const bits = [];
    if (topTag) bits.push(`most common feeling: ${topTag[0]} (${topTag[1]}×)`);
    if (topDay) bits.push(`riskiest day: ${topDay[0]} (${topDay[1]}×)`);
    root.append(el('div', { class: 'card', style: 'background:var(--accent-soft);border-color:transparent' },
      el('strong', {}, '🔍 Your pattern: '), bits.join(' · '),
      el('p', { class: 'muted', style: 'font-size:.82rem;margin:6px 0 0' },
        'Try a plan: “If it’s that moment again, then I’ll…” — decide now, not in the moment.')));
  }

  // --- History ---
  root.append(el('h2', { style: 'margin-top:18px' }, 'History'));
  if (!entries.length) {
    root.append(el('p', { class: 'faint' }, 'Nothing logged yet.'));
    return;
  }
  root.append(el('div', { class: 'card' },
    entries.map((e) => el('div', { class: `t-entry kind-${e.kind}` },
      el('div', { class: 't-when' }, fmtDateTime(e.ts)),
      el('div', { class: 't-tags' },
        el('span', { class: 'kindtag' }, e.kind === 'slip' ? 'slip reflection' : 'craving'),
        (e.tags || []).map((t) => el('span', {}, t))),
      e.text ? el('div', { style: 'font-size:.92rem' }, e.text) : null,
      el('button', {
        class: 'linklike', style: 'font-size:.78rem;padding:2px 0',
        onclick: async () => { await remove('triggers', e.id); root.innerHTML = ''; render(root); },
      }, 'delete'),
    ))));
}
