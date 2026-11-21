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
- Playwright's `page.screenshot` adds a `<style>` of its own in WebKit, which the Content-Security-Policy refuses; WebKit logs that as a console error, so a test that also fails on console errors must not take a screenshot there (`profile-journal.spec.ts` takes its picture for reviewers in Chromium only). It is not something the site does.
- `speech.spec.ts` shows a different Settings state in WebKit (it has its own speech-recognition object); it is `@chromium-only` until someone looks at what Safari shows there.

## Last run

20 November 2026, on main (with the CI time limit change) before the pilots, WebKit 2359 at 820 x 1180: 239 passed, 4 skipped, 1 failed. The failure was the screenshot above, a test artefact; with it fixed the test passes in WebKit. Earlier: 16 October 2026, 196 passed, 4 skipped, 5 failed (PDF tests not yet tagged, and two timeouts under load).

What the run covers on an iPad-sized WebKit, for the parts most used on pilot day:

- **The setup checklist**: `pilot-day.spec.ts`, "on screen in any browser" (added in November 2026): each step settles on a state, the home screen steps shown are the iPad's ("Tap Share: the square with an arrow pointing up"), the other devices' steps open, nothing scrolls sideways, and "Keep work safe" asks the browser only on the tap. The printed checklist is checked in Chromium only (`partner-kit.spec.ts`).
- **The picture dialog**: `picture.spec.ts` (the native `<dialog>`, its width, closing it and focus coming back).
- **Listen**: `recorded-audio.spec.ts` (a recording plays, Slow, the highlight) and `listen-voice.spec.ts`; Listen offline is Chromium only.
- **Saving work to a file**: `device-transfer.spec.ts` (download on one device, load on a fresh one, a wrong file refused).

Seen by hand in WebKit at iPad size (20 November): the checklist's "Keep work safe" in WebKit gets "no" from `persist()` and says "The browser said no for now…", which is the right message; with no speech recognition the speech step says "Not needed"; the voice step says "Checking" for about 3 seconds while the voice list is read again, then settles.

## What still needs a real iPad

A run in WebKit is not a real iPad. Before the pilot, on one of the pilot's own iPads (and one Android tablet if they have them):

1. **Add to Home Screen** in Safari, from the checklist's steps, then open Thinkerwell from its icon: the checklist's first step should say "Done", and learners added there are kept apart from Safari's (the steps say so).
2. **Offline**: open the course once with the internet, wait for "Done" on the offline step, turn on Airplane Mode, close Thinkerwell fully and open it from the icon. Open a lesson of each course you will use (another course works offline only once it is saved in Settings, "Courses for offline use").
3. **Saved work kept**: Safari may delete a site's data after 7 days without a visit unless it is on the home screen; tap "Keep work safe" on the icon's copy and check its answer. Leave a learner's work on the device for a week (or over a school break) and check it is still there.
4. **Listen**: play a lesson's recording with the sound on, Slow and Normal, and check it is heard with the iPad's silent mode or a Focus on, since staff will expect it to. Download "Lesson audio" in Settings, go offline, and play it again.
5. **Save my work to a file**: in Settings, save everyone's work; Safari asks where to save (Files, "On My iPad"). Then "Load my work" from Files on a second iPad.
6. **The picture dialog**: "See it bigger", pinch to zoom inside it, and close it.
7. **Printing**: print the setup checklist and a lesson from the iPad (AirPrint, or Save to Files as PDF): WebKit can't make PDFs in the tests.
8. **Say it and Record**: Record yourself asks for the microphone on the tap; Say it is hidden unless an educator has allowed online speech to text (Safari's dictation is not on the device).
