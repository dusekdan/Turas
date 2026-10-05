// Onboarding wizard: welcome/disclaimer → mode → drinks baseline → goals →
// pledge & reasons → start date.

import { el } from '../ui.js';
import { put, getAll, remove, saveProfile } from '../db.js';
import { baselineWeekly, dayKey } from '../calc.js';
import { HSE_WEEKLY } from '../data/presets.js';
import { editDrink, drinkRow } from './drinkEditor.js';

const state = {
  step: 0,
  mode: 'abstinence',
  sex: null,
  goals: { weeklyBudget: 10, dfDaysTarget: 4 },
  pledge: '',
  reasons: '',
  startDate: dayKey(new Date()),
};

export async function render(root) {
  root.innerHTML = '';
  const steps = [welcome, mode, drinksStep, goals, pledge, startDate];
  const bar = el('div', { class: 'ob-progress' },
    steps.map((_, i) => el('i', { class: i <= state.step ? 'on' : '' })));
  const body = el('div');
  root.append(bar, body);
  await steps[state.step](body, () => {
    state.step = Math.min(state.step + 1, steps.length - 1);
    render(root);
  }, () => {
    state.step = Math.max(state.step - 1, 0);
    render(root);
  });
}

function nav(next, back, nextLabel = 'Continue') {
  return el('div', { class: 'row', style: 'margin-top:20px' },
    back ? el('button', { class: 'btn ghost', onclick: back }, 'Back') : null,
    el('button', { class: 'btn', onclick: next }, nextLabel),
  );
}

async function welcome(body, next) {
  body.append(
    el('div', { class: 'ob-logo' }, '🌊'),
    el('h1', { style: 'text-align:center' }, 'Turas'),
    el('p', { class: 'muted', style: 'text-align:center' }, 'Irish for “journey”. Yours starts here — and everything stays on this phone. No account, no server, no one watching.'),
    el('div', { class: 'card', style: 'margin-top:20px' },
      el('h3', {}, 'Before we begin'),
      el('p', { class: 'muted', style: 'font-size:.88rem' },
        'Turas is not a medical device and doesn’t replace professional help. If you drink heavily every day, or get shakes, sweats or anxiety when you stop, talk to your GP before stopping suddenly — withdrawal can be dangerous. ',
        el('a', { href: '#/help', onclick: (e) => { e.preventDefault(); showHelpNote(body); } }, 'Where to get help'),
      ),
    ),
    nav(next, null, 'I understand — let’s go'),
  );
}

function showHelpNote(body) {
  if (body.querySelector('.help-note')) return;
  body.querySelector('.card').append(
    el('p', { class: 'help-note', style: 'font-size:.88rem' },
      el('strong', {}, 'HSE Drugs & Alcohol Helpline: '), 'freephone 1800 459 459 (Mon–Fri). ',
      'HSE alcohol support: www2.hse.ie/living-well/alcohol. ',
      'If someone has a seizure, severe confusion or hallucinations after stopping: call 999/112.'),
  );
}

async function mode(body, next, back) {
  body.append(
    el('h1', {}, 'What’s your goal?'),
    el('p', { class: 'muted' }, 'You can change this later in Settings.'),
  );
  const options = [
    ['abstinence', '🚀 Quit completely', 'A streak counter, milestones, and support when cravings hit. A slip pauses the streak — never your overall progress.'],
    ['cutdown', '📉 Cut down', 'Log what you drink against your old habits. Weekly budget, drink-free days, and savings vs the old you.'],
  ];
  for (const [val, title, desc] of options) {
    const card = el('div', {
      class: 'card', role: 'button', tabindex: '0',
      style: state.mode === val ? 'outline:2.5px solid var(--accent)' : '',
      onclick: () => { state.mode = val; for (const c of body.querySelectorAll('.card')) c.style.outline = ''; card.style.outline = '2.5px solid var(--accent)'; },
    }, el('h3', {}, title), el('p', { class: 'muted', style: 'font-size:.88rem;margin:0' }, desc));
    body.append(card);
  }
  body.append(nav(next, back));
}

async function drinksStep(body, next, back) {
  const drinks = await getAll('drinks');
  const weekly = baselineWeekly(drinks);
  body.append(
    el('h1', {}, 'What did you usually drink?'),
    el('p', { class: 'muted' }, 'Build your real habits with your real prices — this is what your savings are measured against. Be honest; nobody sees this but you.'),
  );
  const list = el('div', { class: 'card' },
    drinks.length === 0
      ? el('p', { class: 'faint', style: 'text-align:center' }, 'No drinks added yet')
      : drinks.map((d) => drinkRow(d, el('button', {
          class: 'btn subtle small',
          onclick: async () => { await remove('drinks', d.id); rerender(); },
        }, 'Remove'))),
    drinks.length > 0
      ? el('p', { class: 'muted', style: 'font-size:.85rem;margin-top:10px' },
          `Old habits: ~${weekly.std.toFixed(1)} standard drinks and €${weekly.cost.toFixed(2)} per week.`)
      : null,
  );
  const rerender = () => render(body.parentElement);
  body.append(
    list,
    el('button', {
      class: 'btn ghost block',
      onclick: async () => { const d = await editDrink(); if (d) { await put('drinks', d); rerender(); } },
    }, '+ Add a drink'),
    nav(() => {
      if (drinks.length === 0) {
        list.querySelector('p').textContent = 'Add at least one drink so Turas can calculate your savings.';
        return;
      }
      next();
    }, back),
  );
}

async function goals(body, next, back) {
  if (state.mode !== 'cutdown') {
    // Abstinence: just capture sex for HSE context (optional).
    body.append(
      el('h1', {}, 'One optional question'),
      el('p', { class: 'muted' }, 'HSE low-risk guidance differs by sex — used only to show context, never shared.'),
    );
    const sexSel = el('select', {},
      el('option', { value: '' }, 'Prefer not to say'),
      el('option', { value: 'm', selected: state.sex === 'm' }, 'Male (HSE: max 17 std drinks/week)'),
      el('option', { value: 'f', selected: state.sex === 'f' }, 'Female (HSE: max 11 std drinks/week)'),
    );
    body.append(el('label', { class: 'field' }, el('span', {}, 'Sex'), sexSel),
      nav(() => { state.sex = sexSel.value || null; next(); }, back));
    return;
  }
  const drinks = await getAll('drinks');
  const weekly = baselineWeekly(drinks);
  body.append(
    el('h1', {}, 'Set your targets'),
    el('p', { class: 'muted' }, `Your old habits add up to ~${weekly.std.toFixed(1)} standard drinks a week.`),
  );
  const sexSel = el('select', {},
    el('option', { value: '' }, 'Prefer not to say'),
    el('option', { value: 'm' }, 'Male'),
    el('option', { value: 'f' }, 'Female'),
  );
  const budgetIn = el('input', { type: 'number', min: '0', step: '1', value: state.goals.weeklyBudget });
  const dfIn = el('input', { type: 'number', min: '0', max: '7', step: '1', value: state.goals.dfDaysTarget });
  const hseHint = el('p', { class: 'muted', style: 'font-size:.85rem' });
  function refreshHint() {
    const s = sexSel.value;
    hseHint.textContent = s
      ? `HSE low-risk guideline: no more than ${HSE_WEEKLY[s]} standard drinks a week, spread out, with 2+ drink-free days.`
      : 'HSE low-risk guideline: 17 (men) / 11 (women) standard drinks a week at most, with 2+ drink-free days.';
  }
  sexSel.addEventListener('change', refreshHint);
  refreshHint();
  body.append(
    el('label', { class: 'field' }, el('span', {}, 'Sex (for HSE guidance only)'), sexSel),
    el('label', { class: 'field' }, el('span', {}, 'Weekly budget (standard drinks)'), budgetIn),
    hseHint,
    el('label', { class: 'field' }, el('span', {}, 'Drink-free days per week'), dfIn),
    nav(() => {
      state.sex = sexSel.value || null;
      state.goals.weeklyBudget = Math.max(0, parseFloat(budgetIn.value) || 0);
      state.goals.dfDaysTarget = Math.min(7, Math.max(0, parseInt(dfIn.value, 10) || 0));
      next();
    }, back),
  );
}

async function pledge(body, next, back) {
  const pledgeIn = el('textarea', { placeholder: 'e.g. “I’m doing this to be sharp in the mornings and present for my family.”' }, state.pledge);
  const reasonsIn = el('textarea', { placeholder: 'One per line: better sleep, save for the trip to Spain, …' }, state.reasons);
  body.append(
    el('h1', {}, 'Your pledge'),
    el('p', { class: 'muted' }, 'When a craving hits, Turas shows you these words — your own voice, when you need it most.'),
    el('label', { class: 'field' }, el('span', {}, 'Pledge'), pledgeIn),
    el('label', { class: 'field' }, el('span', {}, 'Your reasons (one per line)'), reasonsIn),
    el('p', { class: 'faint', style: 'font-size:.82rem' }, 'Tip: you can add inspirational photos in Settings later — they appear on the back of your pledge card.'),
    nav(() => { state.pledge = pledgeIn.value.trim(); state.reasons = reasonsIn.value; next(); }, back),
  );
}

async function startDate(body, _next, back) {
  const dateIn = el('input', { type: 'date', value: state.startDate, max: dayKey(new Date()) });
  body.append(
    el('h1', {}, state.mode === 'abstinence' ? 'When did your journey start?' : 'When do we start counting?'),
    el('p', { class: 'muted' }, 'Today is grand — but if you already have days behind you, claim them.'),
    el('label', { class: 'field' }, el('span', {}, 'Start date'), dateIn),
    nav(async () => {
      const profile = {
        version: 1,
        onboarded: true,
        mode: state.mode,
        sex: state.sex,
        startDate: dateIn.value || dayKey(new Date()),
        currency: '€',
        pledge: state.pledge,
        reasons: state.reasons.split('\n').map((s) => s.trim()).filter(Boolean),
        goals: state.goals,
        notifications: { enabled: false, hour: 20 },
        treats: [],
        sosTactics: [],
      };
      await saveProfile(profile);
      location.hash = '#/home';
      window.dispatchEvent(new Event('turas:navigate'));
    }, back, 'Begin the journey 🌊'),
  );
}
