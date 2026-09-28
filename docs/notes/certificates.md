# Certificates

Branch `certificates`. Built on 28 September 2026.

For many learners a printed certificate is something real to keep and show. Every section now has one, and so does the whole course.

## What was built

- **A certificate for each section** at `/certificate/section/:id`, and **one for the course** at `/certificate/course` (`src/pages/certificate/CertificatePage.tsx`, routed by `src/app/CertificateRoute.tsx`). They use the print views' page and toolbar (`src/pages/print/`), with their own sheet (`CertificatePage.css`).
- **What it says.** The mascot and the "Thinkerwell" wordmark (Eczar), "Certificate", the learner's name, large, and "finished the History & Human Stories section of Exploring Our World." (the titles come from `content/course.json`). A section certificate lists its lessons; the course one lists the four sections. Then the date, a line for a teacher to sign, and "Exploring Our World is a free social-studies course from Thinkerwell." No scores.
- **The name.** It starts as the learner's name on this device. Above the certificate, a field ("Name on the certificate") changes it for this print only, for example to a full name: "Just for this print. It isn't saved and never leaves this device." It lives in the page's own state and nothing writes it anywhere. Cleared, the certificate has a line to write a name on by hand. The field takes up to 60 characters, and longer names print smaller.
- **Too early.** Nothing is locked, so anyone can open a certificate's address. A learner who hasn't finished sees "Your certificate is ready when you finish every lesson in this section.", "You don't need to do the section check for it." and the lessons left, each a link to where they stopped.
- **Guests** (looking around, or nobody chosen) have no saved work. They see "Certificates are for learners who have finished lessons." and "Choose who's learning".
- **Where it's offered** (decision 1):
  - the lesson complete screen, when that finish completes the section or the course;
  - each finished section's card on the course page;
  - the learner home's "You've finished the course" card, for the course certificate.

## Decisions

1. **Three places, one for each moment.** The complete screen is where a learner finishes, so that is where the certificate first appears: "You finished the whole Geography & Our Environment section." with "Get your certificate" (for the course: "You finished all 24 lessons.", "Get your course certificate" and "Get your section certificate"). It shows only on the lesson whose finish completed the set (`finishedSetWith`, `src/storage/progress.ts`), not on every later visit to an earlier lesson in it. Later, a finished section's card on the course page links to its certificate, open or closed, and the learner home's finished card links to the course one. No banners.
   - Not the journal: it is about writing, not progress.
   - Not the home's "Section check ready" card: it only ever shows the first finished section, so a link there would miss the others.
   - The complete screen's lemon highlight stays on "Up next". The note is a plain card with the section's disc.
2. **What counts.** A section is finished when every one of its lessons has `completedAt`: Reflect's required answer, as everywhere else (`src/lesson/progressRules.ts`). Section checks are optional, so they are never needed, and scores are never printed.
3. **The date** is the day the last lesson was finished: the latest `completedAt` among the certificate's lessons. `completedAt` keeps the first finish, so going back to a lesson doesn't move it. It is written in the UI's language (`en`) like the date in Settings: "September 5, 2026". Day-first order ("5 September 2026") would need an `en-GB` locale for the whole site; that is a separate decision.
4. **Landscape on a page of its own.** The print views aren't lazy-loaded, so all their CSS is in one stylesheet, always loaded. A bare `@page { size: landscape; }` would turn every later printout landscape too (a lesson printed after a certificate had been open in the same tab). So the rule is on a named page, `@page tw-certificate { size: landscape; margin: 12mm; }`, used only by the certificate itself (`page: tw-certificate`). The end-to-end test checks that a lesson still prints portrait.
5. **One page on A4 and on Letter.** The sheet is designed for the smaller of the two page boxes inside 12 mm margins: 255 mm wide (Letter) and 186 mm high (A4). It is at least 183 mm high, so it fills A4 and leaves about 8 mm spare at the foot of Letter. Sizes are in points and millimetres on paper. The longest name (60 characters) and a 30-letter name without spaces still fit.
   - Chromium supports named pages (checked here), and Firefox has since version 110. Safari wasn't checked. Where the `page` property is ignored, the certificate prints on the browser's default page instead: with it turned off in Chromium, History (the longest section) still fits one portrait A4 or Letter page.
6. **Cheap printers.** Black text on white, a thin double rule for the frame and thin lines to write on. There are no fills except the four section discs, which are small and pale; they keep their tint on paper (`print-color-adjust: exact`) so the sections can be told apart. The mascot keeps its colours and turns into light greys in black and white. The toolbar, the name field and the site header never print.
7. **The mascot is the transparent file** (`public/images/thinkerwell-mascot-transparent.png`), at its own proportions, never cropped or recoloured. The brand book suggests the white-background file for printouts, but that file isn't in the offline precache, and the transparent one prints the same on white paper.
8. **Section colour only beside the section's icon and name**: the disc in the section's SectionBadge on the certificate, and on the complete screen's note, next to the section name. Lemon isn't used.
9. **Honest.** The certificate names the course and says it is free and from Thinkerwell. It claims no accreditation, and nothing about a charity or a registered organisation.
10. **On a phone the preview stacks**, it doesn't shrink: one column of lessons, the date above the signature line, nothing under 14px, and nothing wider than the screen.
11. **Offline.** Nothing new to cache: the mascot, the Eczar wordmark font and the page's code were already in the precache. The offline test finishes a section offline and opens its certificate from the cache.
12. **A new icon**, `Award` (Lucide), for the certificate links. It isn't in the design-system list, like `Settings`.

## Sizes

Measured with `npm run build && npm run size` against `main`: the app code grows by 2.0 kB gzipped and the styles by 1.1 kB. First load of Lesson 10 Read is 367.2 kB gzipped (364.1 kB before), and the precache 564.7 kB (561.6 kB before).

## Checks

- Vitest: `lessonSetStatus` and `finishedSetWith` (`src/storage/progress.test.ts`); the page for a finished section, the course, a learner with lessons left, a guest and nobody chosen, no score even with a saved check, and a changed name saved nowhere (`CertificatePage.test.tsx`); when the complete screen, a course section card and the learner home offer a certificate (`CompleteStage.test.tsx`, `SectionCard.test.tsx`, `LearnerDashboard.test.tsx`); the routes and a not-found address (`routes.test.tsx`).
- `e2e/certificates.spec.ts`, at 390, 820 and 1280px: finishes Geography's five lessons through Reflect, sees the offer only after the last, opens the certificate, changes the name, and prints it with Chromium's PDF on A4 and Letter (exactly one landscape page, black text, no fills), also with the longest names. The name is found nowhere in storage afterwards. A second test opens a certificate too early and while looking around.
- The page tour (`e2e/pageTour.ts`) has four new stops: a certificate with lessons left, the complete screen that finishes a section, the certificate, and a certificate with nobody chosen. The sideways-scroll (320 to 1280px), axe and focus-ring, right-to-left, tap-size, privacy and Content-Security-Policy specs walk them.
- `e2e/offline.spec.ts` finishes Culture offline and opens its certificate from the cache, with the mascot and the Eczar font.

## Left for later

- **Print one on HELP's own printer and paper**, in black and white. Everything here was checked with Chromium's PDF output, not on paper, on an iPad or in Safari.
- **Other languages.** The name sits on its own line above "finished the … section of …". Some languages will want the name inside the sentence; the message can take a `{name}` then.
- ~~**Printing for a whole class.**~~ Done: "Print all certificates" on the class view (`/educators/class/certificates`, `docs/notes/pilot-day-tools.md`) prints every certificate earned on the device, one landscape page each, with the names on the device.
