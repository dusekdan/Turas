// Irish drink presets. Nutrition verified against drinkaware.ie / HSE figures.
// 1 Irish standard drink = 10 g pure alcohol. Prices are editable defaults
// (CSO CPI + Dublin pint trackers, late 2025); users set their own real price.

export const PRESETS = [
  { id: 'stout-pint',   emoji: '🍺', name: 'Pint of stout',          volumeMl: 568, abv: 4.2,  kcal: 195, price: 6.10 },
  { id: 'lager-pint',   emoji: '🍺', name: 'Pint of lager',          volumeMl: 568, abv: 4.3,  kcal: 215, price: 6.50 },
  { id: 'cider-pint',   emoji: '🍏', name: 'Pint of cider',          volumeMl: 568, abv: 4.5,  kcal: 240, price: 6.50 },
  { id: 'lager-bottle', emoji: '🍾', name: 'Bottle of lager (330ml)', volumeMl: 330, abv: 4.5,  kcal: 130, price: 5.50 },
  { id: 'lager-can',    emoji: '🥫', name: 'Can of lager (500ml)',   volumeMl: 500, abv: 4.5,  kcal: 190, price: 2.40 },
  { id: 'wine-glass',   emoji: '🍷', name: 'Glass of wine (150ml)',  volumeMl: 150, abv: 12.5, kcal: 113, price: 7.50 },
  { id: 'wine-bottle',  emoji: '🍷', name: 'Bottle of wine (750ml)', volumeMl: 750, abv: 12.5, kcal: 560, price: 11.00 },
  { id: 'spirit',       emoji: '🥃', name: 'Spirit + mixer (pub measure)', volumeMl: 35.5, abv: 40, kcal: 140, price: 8.50 },
  { id: 'spirit-neat',  emoji: '🥃', name: 'Spirit, neat (35.5ml)',  volumeMl: 35.5, abv: 40,  kcal: 79,  price: 6.50 },
  { id: 'alcopop',      emoji: '🧃', name: 'Alcopop (275ml)',        volumeMl: 275, abv: 4,    kcal: 170, price: 7.00 },
  { id: 'liqueur',      emoji: '🥛', name: 'Cream liqueur (50ml)',   volumeMl: 50,  abv: 17,   kcal: 160, price: 6.50 },
];

// Health benefit timeline. Framed as "many people notice" — not medical claims.
export const MILESTONES = [
  { days: 1,   icon: '💧', title: 'Rebalancing begins',  text: 'Your body has metabolised the alcohol. Blood sugar is settling and hydration recovering.' },
  { days: 3,   icon: '⚡', title: 'Energy returning',    text: 'Hangover and withdrawal effects have passed for most people. Energy starts to lift.' },
  { days: 7,   icon: '😴', title: 'Deeper sleep',        text: 'Alcohol disrupts REM sleep — a week in, many people notice genuinely restful nights.' },
  { days: 14,  icon: '🫀', title: 'Liver recovery starts', text: 'Liver fat begins to reduce. Less acid reflux, and dropped calories start to show.' },
  { days: 30,  icon: '✨', title: 'Clearer skin & mind', text: 'Dry January studies found lower blood pressure, better skin, and improved mood and focus by one month.' },
  { days: 60,  icon: '🌿', title: 'New habits rooting',  text: 'Two months in, routines without drink start to feel normal rather than effortful.' },
  { days: 90,  icon: '🛡️', title: 'Body bounced back',  text: 'For moderate drinkers, the liver has largely recovered from fatty change. Immune function improves.' },
  { days: 180, icon: '💪', title: 'Strong foundations',  text: 'Research shows the ability to refuse a drink is much stronger and more automatic by six months.' },
  { days: 365, icon: '🏆', title: 'One full year',       text: 'Cardiovascular and cancer risks are measurably declining. This is a different life now.' },
];

export const HALT_TAGS = ['Hungry', 'Angry', 'Lonely', 'Tired', 'Stressed', 'Bored', 'Social', 'Celebrating', 'Habit'];

export const URGE_SCRIPT = [
  'A craving is a wave. It rises, it peaks, and it always passes — usually within 20 minutes.',
  'You don’t have to fight it. Just watch it, like weather moving across the sky.',
  'Notice where you feel it in your body. Name it: "this is a craving, not a command."',
  'Breathe in slowly for 4, hold for 4, out for 6. Again.',
  'You have surfed this wave before. You can surf this one.',
];

export const BADGES = [
  // Streak badges (days of current-or-longest streak)
  { id: 'streak-1',   icon: '🌱', name: 'Day one',       type: 'streak', threshold: 1 },
  { id: 'streak-3',   icon: '🌿', name: '3 days',        type: 'streak', threshold: 3 },
  { id: 'streak-7',   icon: '🍀', name: '1 week',        type: 'streak', threshold: 7 },
  { id: 'streak-14',  icon: '🌳', name: '2 weeks',       type: 'streak', threshold: 14 },
  { id: 'streak-30',  icon: '🌕', name: '1 month',       type: 'streak', threshold: 30 },
  { id: 'streak-60',  icon: '🌊', name: '2 months',      type: 'streak', threshold: 60 },
  { id: 'streak-90',  icon: '⛰️', name: '3 months',      type: 'streak', threshold: 90 },
  { id: 'streak-180', icon: '🌞', name: 'Half a year',   type: 'streak', threshold: 180 },
  { id: 'streak-365', icon: '🏆', name: 'One year',      type: 'streak', threshold: 365 },
  // Money saved
  { id: 'money-25',   icon: '🪙', name: '€25 saved',     type: 'money', threshold: 25 },
  { id: 'money-100',  icon: '💶', name: '€100 saved',    type: 'money', threshold: 100 },
  { id: 'money-250',  icon: '💰', name: '€250 saved',    type: 'money', threshold: 250 },
  { id: 'money-500',  icon: '🏦', name: '€500 saved',    type: 'money', threshold: 500 },
  { id: 'money-1000', icon: '👑', name: '€1,000 saved',  type: 'money', threshold: 1000 },
  // Drinks avoided (lifetime)
  { id: 'avoid-10',   icon: '🚫', name: '10 drinks avoided',   type: 'avoided', threshold: 10 },
  { id: 'avoid-50',   icon: '🧱', name: '50 drinks avoided',   type: 'avoided', threshold: 50 },
  { id: 'avoid-200',  icon: '🏰', name: '200 drinks avoided',  type: 'avoided', threshold: 200 },
  { id: 'avoid-500',  icon: '🌋', name: '500 drinks avoided',  type: 'avoided', threshold: 500 },
  // Process badges — earnable even after a lapse (progress is never all lost)
  { id: 'first-sos',      icon: '🏄', name: 'Urge surfed',     type: 'process', event: 'sos-complete' },
  { id: 'first-trigger',  icon: '🔍', name: 'Trigger spotted', type: 'process', event: 'trigger-logged' },
  { id: 'first-reflect',  icon: '🪞', name: 'Honest look',     type: 'process', event: 'slip-reflected' },
  { id: 'checkin-7',      icon: '📅', name: '7 check-ins',     type: 'checkins', threshold: 7 },
  { id: 'checkin-30',     icon: '🗓️', name: '30 check-ins',   type: 'checkins', threshold: 30 },
  { id: 'first-export',   icon: '🧳', name: 'Backed up',       type: 'process', event: 'exported' },
];

// HSE low-risk weekly guidelines, in Irish standard drinks.
export const HSE_WEEKLY = { m: 17, f: 11 };

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
