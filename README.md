# Push-up 30

Mobile-first web app for a 30-day push-up challenge (≈10 → 50 reps). No backend; data is stored in `localStorage`.

```bash
npm install
npm run dev        # http://localhost:5173 (also exposed on LAN for phone testing)
npm test           # domain unit tests (Vitest)
npm run build      # typecheck + production build
```

Design notes: [`w-srs/task-01/design.md`](w-srs/task-01/design.md).

## Deploy

Free hosting on Cloudflare Pages, auto-deployed on every push to `main` (build `npm run build`, output `dist`, Node 22 from `.node-version`). No environment variables. Step-by-step setup: [`DEPLOY.md`](DEPLOY.md).

## Code map

| Folder | What |
|---|---|
| `src/domain/` | Pure logic, no React/storage: plan data + generator, schedule, streak/stats, workout & test state machines, timer math. Unit-tested. |
| `src/persistence/` | `Repository` interface + `LocalStorageRepository` (versioned, migrates missing fields). Swap for an API repository later. |
| `src/store/appStore.ts` | Zustand store: calls domain functions, saves via the repository. |
| `src/features/` | Screens: onboarding, today, workout, test, progress, plan, day detail, settings. |
| `src/services/` | Clock, beep/vibrate, reminders (notification content + permission), calendar (.ics) export. |
| `src/i18n/`, `src/locales/<lang>/common.json` | Tiny typed i18n (`useT()`), `{{var}}` interpolation, `_one`/`_other` plurals. |

Workout time / reminder default (06:30) lives only in `src/domain/workoutTime.ts`.

## Languages

Vietnamese and English. Without a saved choice the browser language is used (`vi*` → Vietnamese, anything else → English). To add a language: create `src/locales/<code>/common.json` with the same keys as `en` (a test checks this), register it in `src/i18n/i18n.ts` and extend `Language` in `src/domain/types.ts`.

## Reminders

A web app without a backend cannot wake itself at a set time. The reminder is a real system notification shown when the workout time arrives while the app is open or running in the background (tab or installed PWA; on iOS only once added to the Home Screen, iOS 16.4+). It is skipped if today's workout is already done, and not sent more than 2 h late. For a reminder that always rings, Settings → **Add to calendar** exports a daily calendar event with an alarm at the workout time.

Change the training plan in `src/domain/defaultPlan.ts`; `generatePlan()` in `src/domain/plan.ts` scales it to the user's starting max.

## Testing later days by hand (dev only)

Add `?today=YYYY-MM-DD` to the URL to shift the app's clock, e.g. start today, then open `?today=<start + 14 days>` to reach the Day 15 max test. `?today=YYYY-MM-DDTHH:MM` also sets the time of day (e.g. `T05:50` vs `T10:00` to see "Ready to start" vs "Your workout is waiting").
