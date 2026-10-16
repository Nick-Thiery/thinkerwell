# Safari and iPad testing

The learners' shared tablets are often iPads, so the end-to-end tests also run in WebKit (the engine behind Safari).

- One-time setup: `npm run test:e2e:install:safari` (WebKit goes in `node_modules`, like Chromium, so both scripts set `PLAYWRIGHT_BROWSERS_PATH=0`).
- Run: `npm run build`, then `npm run test:e2e:safari`. The `ipad-safari` project (820 x 1180, touch) is off unless `PW_WEBKIT` is set, so `npm run test:e2e` is unchanged and CI stays on Chromium.
- Tests tagged `@own-size` or `@chromium-only` are skipped there.

## What WebKit does differently

- `page.pdf` is not supported, so the two print-sheet tests (teacher guide, answer key) are `@chromium-only`.
- Safari ignores a text track's `default` flag. `SiteVideo` turns on the track for the page's language itself, once the video's details load (`showDefaultTrack`).
- In right-to-left, WebKit's `scrollWidth` grows while the glossary popover is open although the popover is inside the window. The right-to-left popover test is `@chromium-only`. Look again when a right-to-left language is offered.

- Playwright's WebKit cannot go offline and reload with a service worker ("WebKit encountered an internal error"), so the offline specs (`offline.spec.ts`, `page-not-downloaded.spec.ts`, the offline recorded-audio test) are `@chromium-only`. Offline behaviour on an iPad must be tried by hand.
- Every test that prints to PDF is `@chromium-only` (certificates, pilot-day, the pilot day guide, partner-kit).
- `speech.spec.ts` shows a different Settings state in WebKit (it has its own speech-recognition object); it is `@chromium-only` until someone looks at what Safari shows there.

## Last run

16 October 2026, on main before the pilot: 196 passed, 4 skipped, 5 failed. Three were the pilot day guide's PDF tests, which were not yet tagged `@chromium-only` (they are now). The other two (Listen's recorded audio, and the `/courses` redirect) passed when they were run again on their own: they timed out under the load of the full run.

A run in WebKit is not a real iPad: try the pilot's devices before the pilot.
