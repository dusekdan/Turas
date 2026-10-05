// SOS: craving timer + urge-surfing script + pledge playing card that flips
// to reveal the user's inspirational images. Ends with "I'm calm".

import { el, toast } from '../ui.js';
import { getAll, getProfile, saveProfile } from '../db.js';
import { URGE_SCRIPT } from '../data/presets.js';
import { markEvent } from '../features/achievements.js';

const TIMER_SECONDS = 20 * 60;
let timerHandle = null;
let lineTimer = null;

/** Called by the router when navigating away (close button, back button, tabs). */
export function teardown() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  if (lineTimer) { clearInterval(lineTimer); lineTimer = null; }
}

export async function render(root, profile) {
  const images = await getAll('images');

  root.append(el('button', {
    class: 'linklike', style: 'float:right', onclick: () => { location.hash = '#/home'; },
  }, '✕ close'));
  root.append(el('h1', {}, 'Ride it out'),
    el('p', { class: 'muted' }, 'Cravings peak and pass — almost always within 20 minutes. Stay here with us.'));

  // Previously successful tactic, resurfaced first.
  const best = (profile.sosTactics || []).slice().sort((a, b) => b.count - a.count)[0];
  if (best) {
    root.append(el('div', { class: 'card', style: 'background:var(--gold-soft);border-color:var(--gold)' },
      el('strong', {}, '💡 Worked for you before: '), best.name));
  }

  root.append(buildTimer());

  const scriptLine = el('p', { class: 'muted', style: 'text-align:center;min-height:3.2em;font-style:italic' }, URGE_SCRIPT[0]);
  root.append(scriptLine);
  let lineIdx = 0;
  lineTimer = setInterval(() => {
    lineIdx = (lineIdx + 1) % URGE_SCRIPT.length;
    scriptLine.style.opacity = 0;
    setTimeout(() => { scriptLine.textContent = URGE_SCRIPT[lineIdx]; scriptLine.style.opacity = 1; }, 300);
  }, 14000);
  scriptLine.style.transition = 'opacity .3s ease';

  root.append(el('h2', { style: 'text-align:center;margin-top:22px' }, 'Your pledge'),
    el('p', { class: 'faint', style: 'text-align:center;font-size:.82rem;margin-top:-6px' },
      images.length ? 'Tap the card' : 'Tap the card — add photos in Settings to see them here'),
    buildPledgeCard(profile, images));

  root.append(el('button', {
    class: 'btn block', style: 'margin-top:24px',
    onclick: () => { teardown(); calmFlow(root, profile); },
  }, '🕊️ I’m calm now'));
}

/* ---------- 20-minute ring ---------- */

function buildTimer() {
  const R = 84, C = 2 * Math.PI * R;
  const num = el('div', { class: 't-num' });
  const svgWrap = el('div', { class: 'timer-ring' });
  svgWrap.innerHTML =
    `<svg width="190" height="190" viewBox="0 0 190 190">
       <circle cx="95" cy="95" r="${R}" fill="none" stroke="var(--accent-soft)" stroke-width="12"/>
       <circle id="t-prog" cx="95" cy="95" r="${R}" fill="none" stroke="var(--accent)" stroke-width="12"
         stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/>
     </svg>`;
  svgWrap.append(num);
  const progEl = svgWrap.querySelector('#t-prog');
  let left = TIMER_SECONDS;
  function tick() {
    const m = Math.floor(left / 60), s = left % 60;
    num.innerHTML = `${m}:${String(s).padStart(2, '0')}<small>the wave is passing</small>`;
    progEl.style.strokeDashoffset = C * (1 - left / TIMER_SECONDS);
    if (left <= 0) {
      clearInterval(timerHandle);
      num.innerHTML = `🏄<small>you surfed it</small>`;
    }
    left--;
  }
  tick();
  timerHandle = setInterval(tick, 1000);
  return el('div', { class: 'timer-wrap' }, svgWrap);
}

/* ---------- Pledge playing card ---------- */

function buildPledgeCard(profile, images) {
  const reasons = (profile.reasons || []);
  const pledgeText = profile.pledge || 'I choose how this story goes.';
  const urls = images.map((im) => im.blob ? URL.createObjectURL(im.blob) : im.url);

  // Back face: card-coloured bands top & bottom; image (if any) in between,
  // with a reason in the bottom band. No images → the reason takes centre stage.
  const backImg = el('img', { alt: '', class: urls.length ? '' : 'hidden' });
  const bigReason = el('div', { class: `pledge-text pledge-back-main ${urls.length ? 'hidden' : ''}` });
  const bottomReason = el('div', { class: 'pledge-back-reason' });
  const back = el('div', { class: 'pledge-face back' },
    el('div', { class: 'pledge-band' }),
    backImg,
    bigReason,
    el('div', { class: 'pledge-band' }, bottomReason),
  );

  const card = el('div', { class: 'pledge-card' },
    el('div', { class: 'pledge-face front' },
      el('span', { class: 'corner tl' }, 'T♥'),
      el('div', { class: 'pledge-text' }, pledgeText),
      el('span', { class: 'corner br' }, 'T♥'),
    ),
    back,
  );

  let imgIdx = Math.floor(Math.random() * Math.max(1, urls.length));
  let lastReason = -1;
  function nextReason() {
    if (!reasons.length) return '🌊 One wave at a time.';
    if (reasons.length === 1) return `“${reasons[0]}”`;
    let i;
    do { i = (Math.random() * reasons.length) | 0; } while (i === lastReason);
    lastReason = i;
    return `“${reasons[i]}”`;
  }
  function refreshBack() {
    const reason = nextReason();
    if (urls.length) {
      backImg.src = urls[imgIdx % urls.length];
      imgIdx++;
      bottomReason.textContent = reason;
    } else {
      bigReason.textContent = reason;
      bottomReason.textContent = '';
    }
  }
  refreshBack();

  let flips = 0;
  card.addEventListener('click', () => {
    flips++;
    if (flips % 2 === 0) {
      // Returning to the pledge; swap in the next image/reason mid-flip.
      setTimeout(refreshBack, 700);
    }
    const wobble = (Math.random() * 10 - 5).toFixed(1);
    card.style.transform = `rotateY(${flips * 180}deg) rotateZ(${flips % 2 ? wobble : 0}deg)`;
  });

  return el('div', { class: 'pledge-scene' }, card);
}

/* ---------- Calm → what worked ---------- */

const TACTIC_OPTIONS = ['The timer', 'The pledge card', 'Breathing', 'Went for a walk', 'Texted someone', 'Food / water', 'Distraction'];

function calmFlow(root, profile) {
  root.innerHTML = '';
  root.append(el('h1', {}, 'Wave surfed. 🏄'),
    el('p', { class: 'muted' }, 'What helped? Turas will offer it first next time.'));
  const chips = el('div', { class: 'chips' },
    TACTIC_OPTIONS.map((t) => el('button', {
      class: 'chip',
      onclick: (e) => e.target.classList.toggle('on'),
    }, t)));
  root.append(chips, el('button', {
    class: 'btn block', style: 'margin-top:16px',
    onclick: async () => {
      const selected = [...chips.querySelectorAll('.chip.on')].map((c) => c.textContent);
      const p = await getProfile();
      p.sosTactics = p.sosTactics || [];
      for (const name of selected) {
        const t = p.sosTactics.find((x) => x.name === name);
        if (t) t.count++; else p.sosTactics.push({ name, count: 1 });
      }
      await saveProfile(p);
      await markEvent('sos-complete');
      toast('Noted. Proud of you. 🌊');
      location.hash = '#/home';
    },
  }, 'Done'));
}
