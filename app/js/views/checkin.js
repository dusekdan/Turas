// Evening check-in: three sliders + optional note. Target: under 15 seconds.

import { el, toast } from '../ui.js';
import { getAll, put } from '../db.js';
import { dayKey } from '../calc.js';

const SCALES = [
  { key: 'mood',     label: 'Mood',     lo: '😞', hi: '😄' },
  { key: 'sleep',    label: 'Sleep last night', lo: '🥱', hi: '😴💤' },
  { key: 'cravings', label: 'Cravings today',   lo: 'none', hi: 'strong' },
];

export async function render(root) {
  const today = dayKey(new Date());
  const checkins = await getAll('checkins');
  const existing = checkins.find((c) => c.date === today);

  root.append(el('h1', {}, 'Evening check-in'),
    el('p', { class: 'muted' }, existing ? 'Already done today — you can adjust it.' : 'Three sliders. That’s it.'));

  const values = { mood: existing?.mood ?? 3, sleep: existing?.sleep ?? 3, cravings: existing?.cravings ?? 1 };
  const card = el('div', { class: 'card' });
  for (const s of SCALES) {
    const input = el('input', { type: 'range', min: '1', max: '5', step: '1', value: values[s.key] });
    input.addEventListener('input', () => { values[s.key] = parseInt(input.value, 10); });
    card.append(el('label', { class: 'field' },
      el('span', {}, s.label),
      el('div', { class: 'row', style: 'align-items:center' },
        el('span', { class: 'faint', style: 'flex:0 0 auto;font-size:.85rem' }, s.lo),
        input,
        el('span', { class: 'faint', style: 'flex:0 0 auto;font-size:.85rem' }, s.hi)),
    ));
  }
  const note = el('textarea', { placeholder: 'Anything worth remembering about today? (optional)' }, existing?.note || '');
  card.append(el('label', { class: 'field' }, el('span', {}, 'Note'), note));
  card.append(el('button', {
    class: 'btn block',
    onclick: async () => {
      await put('checkins', {
        id: existing?.id, date: today, ts: Date.now(),
        mood: values.mood, sleep: values.sleep, cravings: values.cravings,
        note: note.value.trim(),
      });
      toast('Checked in. See you tomorrow 🌙');
      location.hash = '#/home';
    },
  }, existing ? 'Update' : 'Done'));
  root.append(card);
}
