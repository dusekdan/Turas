// Milestones = built-in health timeline + the user's own custom ones
// (stored in kv under 'customMilestones', included in export/import).

import { kvGet, kvSet, newId } from '../db.js';
import { MILESTONES } from '../data/presets.js';

export async function getCustomMilestones() {
  return (await kvGet('customMilestones')) || [];
}

export async function addCustomMilestone({ days, title, text }) {
  const list = await getCustomMilestones();
  list.push({ id: newId(), days, title, text: text || '', custom: true, icon: '📌' });
  await kvSet('customMilestones', list);
}

export async function removeCustomMilestone(id) {
  const list = (await getCustomMilestones()).filter((m) => m.id !== id);
  await kvSet('customMilestones', list);
}

/** Built-in + custom, sorted by day. */
export async function allMilestones() {
  const custom = await getCustomMilestones();
  return [...MILESTONES, ...custom].sort((a, b) => a.days - b.days);
}
