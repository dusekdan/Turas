# Turas — privacy-first quit/cut-down drinking PWA

## Context

Ireland's quit.ie (smoking cessation: day counter, money saved, milestones) was shut down. The user wants the equivalent for alcohol, as an installable PWA with **all data on-device, no server**, intended for eventual **public release**. Key differentiator: honest Irish drink prices — users define *their own* drinks (preset nutrition + their price + how often they used to drink them) so "money saved" is real, not low-balled. Interview + background research (UCL Drink Less RCT, Smoke Free, I Am Sober, Try Dry, Marlatt relapse-prevention literature) shaped the feature set below.

**Name:** Turas (Irish: "journey"). Dev folder stays `/local/home/dandusek/DrinkAware` for now.

## Decisions from the interview

- **Two program modes**, chosen at onboarding (changeable in settings):
  - **Abstinence** — streak counter; logging a slip resets the streak via a gentle animation, with a low-key "Reflect" link below (never a forced dialog). Lifetime stats (total AF days, longest streak, total € saved) **never reset** (anti–abstinence-violation-effect).
  - **Cutting down** — daily drink logging against baseline; **all three gauges shown simultaneously**: weekly drinks budget (with HSE guidance ≤17 std drinks men / ≤11 women), drink-free days per week, and % reduction vs baseline.
- **Baseline = per-drink weekly schedule**: build each drink from presets, set your price, attach recurrence ("2 pints of stout every Fri+Sat", "daily").
- **V1 support features**: SOS button, trigger logging (HALT tags + free-text + browsable timestamped history), daily check-in loop with PWA notifications (low-friction), badges/achievements + money-saved "treat" countdowns.
- **SOS pledge card**: shows the user's pledge as a playing card; tapping flips it (random flip animation) to reveal a randomly selected inspirational image from a user-defined set (URL or uploaded → stored locally in IndexedDB); repeated taps alternate pledge/next image. Ends with an "I'm calm" button.
- **Safety**: Get Help page + onboarding disclaimer only (no screener). HSE Drugs & Alcohol Helpline 1800 459 459, HSE alcohol hub link, drinkaware.ie, "shakes/sweats when stopping → talk to your GP; seizure/confusion → 999". "Not a medical device" disclaimer.
- **Tech**: vanilla JS, **no build step** (hard requirement). Vendored .js libraries allowed if shipped with the PWA. Android-first (full notification support), iOS best-effort via feature detection. Visual direction: **calm & warm** (soft gradients, nature palette, gentle animations), with celebratory moments on milestones.
- **Data**: local only; JSON export/import in settings (device migration).

## Architecture

Static files, ES modules, no bundler. Hostable from any static host / `python -m http.server`.

```
app/
  index.html            single-page shell
  manifest.webmanifest  name, icons, theme, standalone
  sw.js                 cache-first service worker (full offline)
  css/theme.css, components.css
  js/
    main.js             hash-router + view mounting
    db.js               IndexedDB wrapper (settings, drinks, baseline,
                        events log, triggers, checkins, images as Blobs)
    calc.js             pure functions: grams = ml×ABV×0.789/100,
                        std drinks (10 g IE), kcal, € saved vs baseline schedule
    data/presets.js     Irish drink presets (below) + default prices + milestones
    views/              onboarding, home, log, sos, triggers, checkin,
                        progress, settings, help
    features/           notifications.js, achievements.js, exportImport.js
  vendor/               canvas-confetti.js, uPlot (tiny chart lib) — local files
```

- **IndexedDB** (not localStorage): needed for image Blobs and robust export/import; schema version field in every export for future migrations.
- **Export/import**: JSON file (images base64-embedded) via download / file-picker; versioned.
- **Notifications**: Notification API + SW-scheduled daily reminders where supported; graceful in-app fallback. One evening check-in nudge by default, configurable, easy to dismiss.

## Domain data (from research, verified against drinkaware.ie / CSO)

- 1 Irish standard drink = **10 g alcohol** (not UK units). HSE: ≤17/wk men, ≤11/wk women, 6+ per sitting = binge.
- Presets (serving, ABV, std drinks, kcal, default pub price Dublin/elsewhere): pint stout 568ml/4.2%/1.9/≈195 kcal/€6.80–5.80; pint lager 4.3%/1.9/≈215/€7.10–6.20; pint cider 4.5%/2.0/≈240/€7.00–6.20; 330ml bottle lager 1.0/≈130; glass wine 150ml/12.5%/1.5/≈113/€8.00–7.00; bottle wine 7.4/≈560/€11 off-licence; Irish pub measure spirits 35.5ml/40%/1.0/79 kcal (+ mixer)/€9.50–8.00; alcopop 275ml/1.0/≈170. All editable; custom drinks supported (volume+ABV → auto std drinks/kcal).
- Health benefit timeline milestones ("many people notice…"): 24h blood sugar/hydration, 72h energy, 1wk deeper sleep, 2wk liver fat ↓ begins, 3–4wk blood pressure ↓ + sleep (~70%), 1mo clearer skin/mood, 3mo liver recovery, 6mo refusal self-efficacy, 1yr cardiovascular/cancer risk ↓. Always show "next milestone" countdown.

## Key screens

1. **Onboarding**: welcome + disclaimer → mode choice (quit / cut down) → drink schedule builder (presets → price → recurrence) → goals (cut-down: budget, DF days target) → pledge text + reasons → optional inspirational images → quit/start date.
2. **Home**: hero streak (abstinence) or today/this-week gauges (cut-down); € saved, drinks avoided, calories avoided; next health milestone + next badge; SOS button always visible. Slip flow: "I drank" → animated counter reset → quiet "Reflect?" link → optional trigger note.
3. **Log** (cut-down): one-tap logging from the user's own drink list; running weekly totals vs all three gauges.
4. **SOS**: craving countdown timer (urges pass ~20 min) + urge-surfing script → pledge playing-card flip with images → "I'm calm" → optional "what worked" tag (resurfaced first next time).
5. **Triggers**: HALT chips + free text; reverse-chronological history with date/time; simple pattern insight ("most cravings: Fri evening").
6. **Check-in**: evening review — 3 sliders (mood/sleep/cravings) + optional note, <15 s to complete; charts in Progress.
7. **Progress**: calendar heatmap, lifetime stats, badge wall (streak, process, and savings badges — process badges earnable even after a lapse), treat countdowns ("€220 → new runners"), mood charts.
8. **Settings**: drinks & schedule editor, goals, pledge/reasons/images, notifications, currency (€ default, symbol configurable), export/import JSON, Get Help page, about/disclaimer.

## Implementation order

0. **M0 — setup**: save this plan as `PLAN.md` in the project directory; init git repo.
1. **M1 — core loop**: PWA shell (manifest/SW/offline), IndexedDB layer, onboarding wizard, presets+calc, home dashboard with streak & savings, slip flow with animated reset, export/import. *Usable end-to-end for abstinence mode.*
2. **M2 — cut-down mode**: drink logging, three gauges, baseline comparisons.
3. **M3 — support tools**: SOS (timer, urge-surfing, pledge card + images), triggers + history, daily check-in + notifications.
4. **M4 — retention & polish**: badges/achievements, treats, charts (uPlot), confetti milestones, health timeline detail, calm-and-warm theming pass, iOS testing.

Each milestone is a working app; commit per milestone (init git repo in the project folder first).

## Verification

- Serve locally (`python3 -m http.server` from `app/`), test flows in Chrome mobile emulation; verify offline mode (DevTools → offline) and installability (Lighthouse PWA audit).
- Unit-test `calc.js` pure functions with a tiny no-framework test page (node --test or in-browser asserts): std drinks/kcal/€-saved math against drinkaware.ie figures.
- Export → wipe site data → import roundtrip must restore everything including images.
- Real-device check on Android: install to home screen, notification fires, SOS card animation.
