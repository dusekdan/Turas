// Badge/achievement engine. Earned badges persist in kv under 'badges'
// as { badgeId: ISO-date } and are never revoked (process over perfection).

import { BADGES } from '../data/presets.js';
import { kvGet, kvSet } from '../db.js';
import { toast, confetti } from '../ui.js';

export async function getEarned() {
  return (await kvGet('badges')) || {};
}

async function award(ids) {
  if (!ids.length) return;
  const earned = await getEarned();
  const fresh = [];
  for (const id of ids) {
    if (!earned[id]) { earned[id] = new Date().toISOString(); fresh.push(id); }
  }
  if (!fresh.length) return;
  await kvSet('badges', earned);
  confetti();
  if (fresh.length > 2) {
    toast(`🏅 ${fresh.length} badges earned — see Progress`, 'gold');
  } else {
    for (const id of fresh) {
      const b = BADGES.find((x) => x.id === id);
      if (b) toast(`${b.icon} Badge earned: ${b.name}`, 'gold');
    }
  }
}

/** Threshold badges. stats: { streak, longestStreak, moneySaved, drinksAvoided, checkinCount } */
export async function checkThresholds(stats) {
  const hit = [];
  for (const b of BADGES) {
    if (b.type === 'streak' && Math.max(stats.streak, stats.longestStreak) >= b.threshold) hit.push(b.id);
    if (b.type === 'money' && stats.moneySaved >= b.threshold) hit.push(b.id);
    if (b.type === 'avoided' && stats.drinksAvoided >= b.threshold) hit.push(b.id);
    if (b.type === 'checkins' && stats.checkinCount >= b.threshold) hit.push(b.id);
  }
  await award(hit);
}

/** Process badges fired by actions: 'sos-complete' | 'trigger-logged' | 'slip-reflected' | 'exported' */
export async function markEvent(eventName) {
  const ids = BADGES.filter((b) => b.event === eventName).map((b) => b.id);
  await award(ids);
}
