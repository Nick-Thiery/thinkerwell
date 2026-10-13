# Pilot-day dry run, October 2026

Branch `pilot-dry-run`. Done on 13 October 2026.

A walk through pilot day as a brand-new member of staff would do it, on fresh browser profiles, against a production build (`npm run build`, then `vite preview`), with Playwright and Chromium at 390px (phone) and 820px (tablet), and at 1280px for the keyboard. Screenshots were looked at one by one and are **not committed**; the names below are the files the walk made (`NN-name-size.png`, in a scratch folder), so the same walk can be repeated.

## What was walked

First visit to home; Educators and "Set up this device" (every step, as Chrome on a laptop, Android and an iPad see it); three learners with a class code (English, Bahasa Indonesia, Bahasa Melayu); one whole lesson (Read, Write, Speak, Watch, Reflect) and all of Culture; a learner switched to Indonesian and to Malay with the header's switch and the learner home; the Culture section check; its certificate; Settings: save everyone's work to a file and load it in a second fresh browser; the class view; "Print all certificates"; the consent form, information sheet and code cards in English, Indonesian and Malay, on screen and printed to A4 (page counts, organisation name filled in and empty); the network cut before the offline copy was ready ("This page hasn't downloaded yet", "Try again"); then everything offline after the course was saved (a learner added and a lesson opened offline, 17 pages by address); keyboard only on the checklist and on adding a learner and the first lesson.

What held up: no sideways scroll on any page at 390 or 820px; no console errors online; the checklist's six steps read well in all three languages and print on one A4 page in each; consent form two pages, information sheet one, certificate one landscape page, code cards ten to a page with the list after, in all three languages (names, dates and the organisation fill in everywhere they should; no organisation name is built into any string); no English leaked into the Indonesian or Malay partner-kit pages (every line of the staff pages was compared with the English); "This page hasn't downloaded yet" with "Try again" appears and works; every page, language and print view opens offline, including a learner added offline; saving and loading work between two browsers kept every learner, their class codes, their language and the finished lessons and check; every focus stop on the checklist and the lesson has a visible 3px outline and is at least 44px tall (glossary words are inline text).

## Findings

Severity: **High** stops or misleads someone on pilot day; **Medium** is hard to use or misleading but there is a way round; **Low** is polish. "Fixed" means fixed on this branch.

| # | Sev | Where | What | Screenshot | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | High | Header's language switch, phones, once a learner is chosen | The panel hung from the switch's end edge, which sits left of the learner's avatar and the menu button, so at 390px it started 52px off the left edge of the screen: "English" and "Bahasa Melayu" were cut off. The very first thing a learner on a shared tablet would do in Jakarta is change language. Cause: `.tw-language-switch-panel` is anchored to the button, not the header. | `18-header-language-menu-phone`, `80-langpanel-fixed-390` | Fixed (`LanguageSwitch.css`: below 480px the panel spans the header's width) |
| 2 | Medium | Lesson step path, phones 360 to 390px | The current step shows its name; at 360 and 375px (most Android phones and iPhone SE/mini) and just over at 390px in Indonesian and Malay, the last step, Reflect, was cut off ("Refle"), on the one step that finishes the lesson. Worked at 320 and 412px, which is why the width tests missed it. | `59-stages-id-reflect-360`, `58-stagepath-ms-watch-390` | Fixed (`StagePath.css`: name hidden below 380px as it was below 360px, joins 8px) |
| 3 | Medium | Setup checklist, "Before you reset this device", and Settings | The checklist says "Save everyone's work to a file", but Settings opens with only the learner using the device chosen. Following the checklist literally saved one learner's work and left the rest behind. | `28-settings-movework-phone` | Fixed (copy: it now says to choose "All learners on this device"; Indonesian, Malay and Vietnamese updated and flagged for reviewers, see below) |
| 4 | Medium | For organisations | "What you get" says "Answers to your questions by email", but there is no contact address anywhere on the site (`CONTACT_EMAIL` is `null`, so the contact card is left out on purpose). Public copy must promise nothing that isn't true today. | `40-p-_organisations-en-phone` | **Needs a founder decision** (see below) |
| 5 | Low | Setup checklist, "Keep work safe" | After the tap the button was replaced while the browser was asked, so keyboard focus fell to the top of the page (to `body`). | none (found with the keyboard) | Fixed (`SetupPage.tsx`: the button stays, `aria-disabled` while asking) |
| 6 | Low | Bahasa Melayu messages | 83 messages (three words or more) in `ms.json` are word for word the same as `id.json`. Most are words the two languages share ("Pelajaran", "Kembali ke kursus"), but some lean Indonesian: "Sampai Pelajaran {number}" on every learner tile (Malay: "Hingga" or "Sehingga"), "Kamu di sini", "Apa itu Thinkerwell". Malay is offered to everyone while native review is in progress. | `70-home-tablet` | Left for the Malay reviewer; list below |
| 7 | Low | Offline | `/icons/favicon-96.png` isn't in the offline copy, so the tab icon is missing offline (21 failed requests in the console on a walk offline). Nothing else is missing. | none | Left |
| 8 | Low | Setup checklist, step 5 | "Checking" with an empty bar for about three seconds on a laptop with no voices, then "Not on this browser". The wait is deliberate (some browsers list voices late) but there is no hint. | `03-setup-phone` | Left |
| 9 | Low | Class view | A learner who hasn't started the lesson they are "on" shows "On now: Lesson 20 …" with "Up next" under it. The two read as opposites. | `34-class-phone` | Left; wording is for the founders (see below) |
| 10 | Low | Learner tiles, phone | The remove (bin) button touches the avatar's top corner. It has its 44px target; only the avatar's border is hidden for a few pixels. | `33`-style home with learners at 390px | Left |
| 11 | Info | Stages | A lesson finished by just stepping through shows Watch and Read with ticks and Speak without one. That is the rule in `progressRules.ts` (Watch counts when you continue; Speak only when the learner says how they practised), not a bug, but staff will ask. | `07-lesson-complete-phone` | Left |

### Left for the Malay reviewer (finding 6)

`pages.home.tileMeta` ("Sampai Pelajaran {number}"), `pages.home.dashboard.youAreHere`, `pages.organisations.whatTitle`, `pages.infoSheet.whatTitle`, `pages.teacherGuide.eyebrow` and the other identical messages. A one-line script comparing `ms.json` with `id.json` lists all 83.

## Fixes made

1. `src/app/LanguageSwitch.css`: below 480px the language panel is as wide as the header allows, measured from the header's edges.
2. `src/components/ds/StagePath.css`: the current step's name is hidden below 380px (was 359px); joins are 8px (were 12px) so "Refleksi" fits at 390px.
3. `src/pages/educators/SetupPage.tsx`: "Keep work safe" stays in the page while the browser is asked.
4. `src/i18n/messages/{en,id,ms,vi}.json`, `pages.setup.later.body`: says to choose "All learners on this device". Indonesian, Malay and Vietnamese are AI drafts of the new English, with back-translations in `docs/translation/{id,ms,vi}/notes/ui.json` (the notes carry the new English as `source`; Vietnamese was already flagged), for the reviewers. The words are short on purpose: the checklist prints on one A4 page, and this box sits at the very bottom, so a third line in Indonesian or Malay pushed it onto a second page (`e2e/partner-kit.spec.ts` caught it in Indonesian; Malay isn't in that spec and was checked by hand). If the box grows again, shorten the words before touching the spacing.
5. `e2e/phone-header.spec.ts` (new, laptop project, `@own-size`): at 360, 375, 390 and 412px with a learner chosen, in English, Indonesian and Malay, the language panel stays on the screen and every step of the step path ends inside the page's gutter.

## Needs a founder decision

1. **A contact address (finding 4).** Either set `CONTACT_EMAIL` in `src/app/contact.ts` to a real inbox before a partner reads For organisations, or take "Answers to your questions by email" out of "What you get". Either way the Educators page's "Tell us what to fix", the consent form's "Questions?" line and the information sheet's "write to Thinkerwell" stay out until there is one.
2. **How staff find the checklist.** "Set up this device" is one tap in from For educators, under "Starting a pilot", but nothing on the home page leads staff there, and a staff member handed a tablet lands on "Who's learning today?". A small "Setting up a device?" link on home (or in the menu) would help; it is a change to the home page, so it is yours to decide.
3. **Class code or code card.** The new-learner form has an optional "Class code", and the code cards say to type the card's code as the *name*. Both are explained (step 4 of the checklist; For organisations), but a staff member will wonder which to use. Decide whether HELP's learners type the code as their name, and the class code stays for a group, or the form says so next to the field.
4. **Who can remove a learner.** Every learner tile has a bin button, so any child on a shared tablet can remove another child's work (after a confirmation that defaults to "Keep"). Fine for a classroom where staff watch; worth deciding whether the pilot wants it behind the teacher pages.
5. **Class view wording (finding 9).** Suggest "Now: Lesson 20 (not started)" or hiding "Up next" there.
6. **Malay review (finding 6)** before a Malaysian partner is shown the Malay pages.

## Checks

`npm run check:i18n`, `npm run check:content`, `npm run typecheck` and `npm run lint` pass; Vitest passes (127 files, 7125 tests); the end-to-end specs for the pilot-day tools, partner kit, learners, Indonesian, Malay, offline, "page not downloaded", device transfer, keyboard lesson, tap sizes, sideways scroll (every page at 320 to 1280px) and the new header spec pass against the production build. On Letter paper the checklist still takes two pages in Indonesian and in Malay (Indonesia and Malaysia use A4); English fits one page on both.

## Not tried

An iPad, an Android tablet and a Chromebook, Safari and Firefox, or HELP's printer: all of this was Chromium on Linux with PDF output. The iPad and Android steps on the checklist were only read (with those devices' user agents), and `persist()` was answered "no" by this Chromium, which showed the "browser said no for now" line, not the success line.
