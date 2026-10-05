# Turas 🌊

*Turas* (Irish: "journey") is a privacy-first progressive web app that helps you
quit — or cut down on — drinking. Inspired by Ireland's departed quit.ie.

**Everything stays on your device.** No account, no server, no analytics.

## Features

- **Two modes**: quit completely (streak + gentle slip handling) or cut down
  (daily logging vs weekly budget, drink-free days, and % reduction vs your old habits)
- **Honest money saved**: you define your drinks with *your* prices and how often
  you used to have them — presets carry Irish nutrition data (std drinks = 10 g, kcal)
- **SOS button**: 20-minute craving timer, urge-surfing script, and your pledge as a
  playing card that flips to your own inspirational photos
- **Trigger log** with HALT tags, free text, history, and pattern insights
- **15-second evening check-in** (mood/sleep/cravings) with optional reminders
- **Badges, treats, health milestones** — lifetime progress never resets after a slip
- **Export/import** a single JSON backup (includes photos) for changing phones

## Run

Any static file server works — no build step:

```bash
npm run serve        # python http.server on :8080
# or: cd app && python3 -m http.server 8080
```

Open http://localhost:8080, then "Add to Home Screen" on your phone for the
full app experience (offline, notifications on Android).

## Develop & test

```bash
npm test                      # pure-function unit tests (calc.js)
npm i --no-save puppeteer-core
node tests/e2e.smoke.mjs      # headless-Chrome end-to-end smoke test
```

Code layout: `app/js/calc.js` (pure maths), `app/js/db.js` (IndexedDB),
`app/js/views/*` (screens), `app/js/features/*` (badges, backup, reminders),
`app/js/data/presets.js` (Irish drink/nutrition/price/milestone data).

## Safety

Turas is not a medical device. If you drink heavily every day or get withdrawal
symptoms when you stop, talk to your GP before stopping suddenly.
HSE Drugs & Alcohol Helpline: **1800 459 459** (freephone).
