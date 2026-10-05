// Settings: drinks & schedule, goals/mode, pledge & images, treats,
// notifications, export/import, help, danger zone.

import { el, toast, sheet, fmtMoney } from '../ui.js';
import { getAll, put, remove, getProfile, saveProfile, wipeAll, newId } from '../db.js';
import { baselineWeekly } from '../calc.js';
import { editDrink, drinkRow } from './drinkEditor.js';
import { downloadExport, importBackup } from '../features/exportImport.js';
import { enableReminders, disableReminders, notificationsSupported } from '../features/notifications.js';

export async function render(root, profile) {
  root.append(el('h1', {}, 'Settings'));
  root.append(await drinksCard(root, profile));
  root.append(goalsCard(root, profile));
  root.append(pledgeCard(profile));
  root.append(await imagesCard(root));
  root.append(treatsCard(root, profile));
  root.append(notifyCard(profile));
  root.append(dataCard());
  root.append(el('div', { class: 'card' },
    el('h2', {}, 'Help & about'),
    el('a', { class: 'btn subtle block', href: '#/help' }, '🆘 Get help with drinking'),
    el('p', { class: 'faint', style: 'font-size:.78rem;margin-top:10px' },
      'Turas v1 · not a medical device · all data lives only on this device. ',
      'Turas is Irish for “journey”.')));
}

/* ---------- Drinks ---------- */

async function drinksCard(root, profile) {
  const drinks = await getAll('drinks');
  const weekly = baselineWeekly(drinks);
  const rerender = () => { root.innerHTML = ''; render(root, profile); };
  return el('div', { class: 'card' },
    el('h2', {}, 'Your drinks & old habits'),
    el('p', { class: 'muted', style: 'font-size:.85rem' },
      `Savings are measured against these: ~${weekly.std.toFixed(1)} std drinks / ${fmtMoney(weekly.cost, profile.currency)} a week.`),
    drinks.map((d) => drinkRow(d, el('div', { class: 'row', style: 'flex:0 0 auto;gap:6px' },
      el('button', { class: 'btn subtle small', onclick: async () => { const nd = await editDrink(d); if (nd) { await put('drinks', nd); rerender(); } } }, 'Edit'),
      el('button', { class: 'btn ghost small', onclick: async () => { await remove('drinks', d.id); rerender(); } }, '✕'),
    ))),
    el('button', { class: 'btn ghost block', style: 'margin-top:10px', onclick: async () => {
      const d = await editDrink(); if (d) { await put('drinks', d); rerender(); }
    } }, '+ Add a drink'));
}

/* ---------- Mode & goals ---------- */

function goalsCard(root, profile) {
  const modeSel = el('select', {},
    el('option', { value: 'abstinence', selected: profile.mode === 'abstinence' }, '🚀 Quit completely'),
    el('option', { value: 'cutdown', selected: profile.mode === 'cutdown' }, '📉 Cut down'));
  const budgetIn = el('input', { type: 'number', min: '0', step: '1', value: profile.goals?.weeklyBudget ?? 10 });
  const dfIn = el('input', { type: 'number', min: '0', max: '7', value: profile.goals?.dfDaysTarget ?? 4 });
  const dateIn = el('input', { type: 'date', value: profile.startDate });
  return el('div', { class: 'card' },
    el('h2', {}, 'Goal'),
    el('label', { class: 'field' }, el('span', {}, 'Mode'), modeSel),
    el('div', { class: 'row' },
      el('label', { class: 'field' }, el('span', {}, 'Weekly budget (std drinks)'), budgetIn),
      el('label', { class: 'field' }, el('span', {}, 'Drink-free days / week'), dfIn)),
    el('label', { class: 'field' }, el('span', {}, 'Journey start date'), dateIn),
    el('button', { class: 'btn block', onclick: async () => {
      profile.mode = modeSel.value;
      profile.goals = {
        weeklyBudget: Math.max(0, parseFloat(budgetIn.value) || 0),
        dfDaysTarget: Math.min(7, Math.max(0, parseInt(dfIn.value, 10) || 0)),
      };
      if (dateIn.value) profile.startDate = dateIn.value;
      await saveProfile(profile);
      toast('Saved');
      window.dispatchEvent(new Event('turas:navigate'));
    } }, 'Save goal'));
}

/* ---------- Pledge ---------- */

function pledgeCard(profile) {
  const pledgeIn = el('textarea', {}, profile.pledge || '');
  const reasonsIn = el('textarea', { placeholder: 'One per line' }, (profile.reasons || []).join('\n'));
  return el('div', { class: 'card' },
    el('h2', {}, 'Pledge & reasons'),
    el('label', { class: 'field' }, el('span', {}, 'Pledge (front of your SOS card)'), pledgeIn),
    el('label', { class: 'field' }, el('span', {}, 'Reasons'), reasonsIn),
    el('button', { class: 'btn block', onclick: async () => {
      profile.pledge = pledgeIn.value.trim();
      profile.reasons = reasonsIn.value.split('\n').map((s) => s.trim()).filter(Boolean);
      await saveProfile(profile);
      toast('Saved');
    } }, 'Save pledge'));
}

/* ---------- Inspirational images ---------- */

async function imagesCard(root) {
  const images = await getAll('images');
  const rerender = async () => { root.innerHTML = ''; render(root, await getProfile()); };
  const fileIn = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  fileIn.addEventListener('change', async () => {
    for (const f of fileIn.files) {
      if (f.size > 4 * 1024 * 1024) { toast(`${f.name} is over 4 MB — pick a smaller one`); continue; }
      await put('images', { id: newId(), name: f.name, blob: f });
    }
    toast('Image(s) added');
    rerender();
  });
  const urlIn = el('input', { type: 'url', placeholder: 'https://… (needs internet to display)' });
  return el('div', { class: 'card' },
    el('h2', {}, 'Inspirational images'),
    el('p', { class: 'muted', style: 'font-size:.85rem' },
      'Shown on the back of your pledge card when a craving hits. Uploaded photos are stored on-device and work offline.'),
    images.length ? el('div', { class: 'thumbs' },
      images.map((im) => {
        const src = im.blob ? URL.createObjectURL(im.blob) : im.url;
        return el('div', { class: 'th' },
          el('img', { src, alt: im.name || '' }),
          el('button', { onclick: async () => { await remove('images', im.id); rerender(); } }, '✕'));
      })) : null,
    el('div', { class: 'row', style: 'margin-top:10px' },
      el('button', { class: 'btn subtle', onclick: () => fileIn.click() }, '📷 Upload photo'),
      el('button', { class: 'btn ghost', onclick: async () => {
        const u = urlIn.value.trim();
        if (!/^https?:\/\//.test(u)) { toast('Enter a full https:// image URL'); return; }
        await put('images', { id: newId(), url: u });
        urlIn.value = '';
        toast('Image added'); rerender();
      } }, '🔗 Add URL')),
    el('label', { class: 'field' }, el('span', {}, 'Image URL'), urlIn),
    fileIn);
}

/* ---------- Treats ---------- */

function treatsCard(root, profile) {
  const nameIn = el('input', { type: 'text', placeholder: 'e.g. New runners' });
  const costIn = el('input', { type: 'number', min: '1', step: '1', placeholder: '120' });
  const rerender = () => { root.innerHTML = ''; render(root, profile); };
  return el('div', { class: 'card' },
    el('h2', {}, 'Treats'),
    el('p', { class: 'muted', style: 'font-size:.85rem' }, 'Give your saved money a job. Progress shows on the Progress tab.'),
    (profile.treats || []).map((t) => el('div', { class: 'drink-item' },
      el('div', { class: 'd-emoji' }, '🎁'),
      el('div', { class: 'd-main' }, el('div', { class: 'd-name' }, t.name),
        el('div', { class: 'd-sub' }, fmtMoney(t.cost, profile.currency))),
      el('button', { class: 'btn ghost small', onclick: async () => {
        profile.treats = profile.treats.filter((x) => x.id !== t.id);
        await saveProfile(profile); rerender();
      } }, '✕'))),
    el('div', { class: 'row' },
      el('label', { class: 'field' }, el('span', {}, 'Treat'), nameIn),
      el('label', { class: 'field' }, el('span', {}, 'Cost (€)'), costIn)),
    el('button', { class: 'btn subtle block', onclick: async () => {
      const name = nameIn.value.trim(); const cost = parseFloat(costIn.value);
      if (!name || !(cost > 0)) { toast('Give the treat a name and a cost'); return; }
      profile.treats = profile.treats || [];
      profile.treats.push({ id: newId(), name, cost });
      await saveProfile(profile); rerender();
    } }, '+ Add treat'));
}

/* ---------- Notifications ---------- */

function notifyCard(profile) {
  const supported = notificationsSupported();
  const enabled = profile.notifications?.enabled;
  const hourIn = el('input', { type: 'number', min: '0', max: '23', value: profile.notifications?.hour ?? 20 });
  const btn = el('button', { class: `btn block ${enabled ? 'ghost' : ''}`, onclick: async () => {
    if (!supported) return;
    if (profile.notifications?.enabled) {
      await disableReminders();
      profile.notifications.enabled = false;
      toast('Reminders off');
    } else {
      const hour = Math.min(23, Math.max(0, parseInt(hourIn.value, 10) || 20));
      const ok = await enableReminders(hour);
      if (!ok) { toast('Notifications were not allowed by the browser'); return; }
      profile.notifications = { enabled: true, hour };
      toast('Evening reminder on 🌙');
    }
    await saveProfile(profile);
    window.dispatchEvent(new Event('turas:navigate'));
  } }, enabled ? 'Turn off reminders' : 'Turn on evening reminder');
  return el('div', { class: 'card' },
    el('h2', {}, 'Check-in reminder'),
    supported
      ? el('div', {},
          el('label', { class: 'field' }, el('span', {}, 'Remind me around (hour, 0–23)'), hourIn), btn,
          el('p', { class: 'faint', style: 'font-size:.78rem;margin-top:8px' },
            'Background reminders work best on Android with Turas installed to the home screen.'))
      : el('p', { class: 'muted' }, 'This browser doesn’t support notifications. The home screen will nudge you instead.'));
}

/* ---------- Data: export / import / wipe ---------- */

function dataCard() {
  const fileIn = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      const s = sheet(el('div', {},
        el('h2', {}, 'Replace everything?'),
        el('p', { class: 'muted' }, `This will replace ALL current data with the backup from ${json.exportedAt?.slice(0, 10) || 'unknown date'}. This cannot be undone.`),
        el('div', { class: 'row' },
          el('button', { class: 'btn ghost', onclick: () => s.close() }, 'Cancel'),
          el('button', { class: 'btn danger', onclick: async () => {
            try {
              await importBackup(json);
              s.close();
              toast('Backup restored ✓');
              location.hash = '#/home';
              window.dispatchEvent(new Event('turas:navigate'));
            } catch (e) { toast(e.message); }
          } }, 'Replace & restore'))));
    } catch { toast('That file isn’t valid JSON'); }
    fileIn.value = '';
  });
  return el('div', { class: 'card' },
    el('h2', {}, 'Your data'),
    el('p', { class: 'muted', style: 'font-size:.85rem' },
      'Everything lives only on this device. Export a backup before changing phones — and now and then, just in case.'),
    el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: () => downloadExport().then(() => toast('Backup downloaded 🧳')) }, '⬇ Export'),
      el('button', { class: 'btn ghost', onclick: () => fileIn.click() }, '⬆ Import')),
    fileIn,
    el('details', { style: 'margin-top:14px' },
      el('summary', { style: 'cursor:pointer;color:var(--danger);font-size:.85rem' }, 'Danger zone'),
      el('p', { class: 'muted', style: 'font-size:.82rem' }, 'Erase everything and start from scratch.'),
      el('button', { class: 'btn danger', onclick: () => {
        const s = sheet(el('div', {},
          el('h2', {}, 'Erase everything?'),
          el('p', { class: 'muted' }, 'All drinks, history, badges and images will be permanently deleted from this device.'),
          el('div', { class: 'row' },
            el('button', { class: 'btn ghost', onclick: () => s.close() }, 'Keep my data'),
            el('button', { class: 'btn danger', onclick: async () => {
              await wipeAll(); s.close();
              location.hash = '#/onboarding';
              window.dispatchEvent(new Event('turas:navigate'));
            } }, 'Erase it all'))));
      } }, 'Start over')));
}
