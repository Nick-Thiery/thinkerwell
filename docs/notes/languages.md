# Languages: the groundwork

Branch `language-groundwork`. Built in September 2026.

The site is ready for a translation to be dropped in, but none is: English is the only language learners can choose, and **learners see no change**. We don't know the pilot learners' home languages yet. The plan names Dari/Farsi and Arabic (right to left, Arabic script) and Somali (Latin script). Machine translation must never reach learners, so this branch has no Dari, Arabic or Somali text: only the languages' own names, which come from CLDR (the Unicode data every browser uses) and are checked against `Intl.DisplayNames` in a test.

The lessons stay in English on purpose (the course is also English practice). Only the interface (buttons, instructions) is translated, and optionally a short meaning for each glossary word. How a helper translates is in `docs/TRANSLATING.md`.

## What exists

### The language list (`src/i18n/locales.ts`)

Each language has a code (BCP 47, also `<html lang>` and the message file's name), an English name, its own name (endonym), a direction, a font key (`latin` or `arabic`) and a `ready` flag. Only `ready` languages are offered.

| Code | English name | Direction | Font | Ready |
| --- | --- | --- | --- | --- |
| `en` | English | ltr | latin | yes |
| `fa-AF` | Dari | rtl | arabic | no |
| `ar` | Arabic | rtl | arabic | no |
| `so` | Somali | ltr | latin | no |
| `id` | Indonesian | ltr | latin | yes (lessons too) |

Iranian Farsi would be `fa`, a language of its own. Rohingya (also named in `docs/PRODUCT.md`) isn't listed: it has no settled written form in CLDR, so how to support it is a question for the centre.

The file has no imports, so the build (`vite.config.ts`), the content schema and the translator tools read it too.

### Loading (`src/i18n/load.ts`, `src/i18n/build.ts`)

- English (`src/i18n/messages/en.json`) is bundled, as before.
- Every other language is `src/i18n/messages/<code>.json`, a chunk of its own (`assets/locales/<code>/<hash>.js`), fetched the first time someone uses it. None exists yet; `npm run i18n:import` makes one. A listed language with no file loads as empty, so it shows English.
- The service worker (`src/offline/sw.ts`) precaches a language's chunk only once it is `ready`, so it works offline like the rest of the course; the Arabic font the same, once a ready language needs it; the test languages never. `languagePrecacheIgnores` in `src/i18n/build.ts` decides this from the list, as the precache's `globIgnores` (`vite.config.ts`), and its test covers "Dari ready" and "Somali ready" cases. Today the precache holds nothing for other languages, and `e2e/languages.spec.ts` checks that an English visit fetches nothing of them and that `sw.js` lists none.
- While a language loads (from the precache, a few milliseconds), the language shown before stays. At start-up that is English for a moment.

### Which language shows (`src/app/AppLayout.tsx`)

The learner's own language (`learner.language`), else the device's (`settings.language`, set in Settings), else English, and only ever an offered one: a saved code that isn't ready in this version is ignored. Guests and the "Who's learning today?" screen get the device's. Switching learner switches language. `LanguageForSession` sets `<html lang>` and `dir` through `I18nProvider`.

Both fields are optional: learners saved before read as "no choice", and `settings.language` is `null` until someone chooses, like `settings.speechCheck`. The database stays at version 2. A learner's language travels in work files; older versions drop it, so `WORK_FILE_VERSION` stays 1 (`docs/notes/device-transfer.md`).

The language choice (`src/app/LanguageChoice.tsx`) is a row of chips, one per offered language, each named in itself and marked with its own `lang` and `dir`. It is in Settings (the device's language), the new-learner form and the learner home (a learner's own). It renders nothing while only English is offered, so none of it shows today; it is tested with made-up ready languages.

### Messages, plurals, numbers and dates (`src/i18n/core.ts`, `src/i18n/I18nProvider.tsx`)

- Plural messages pick their form with `Intl.PluralRules` for the language, so every CLDR category works (Arabic's zero, one, two, few, many and other). A missing form falls back to `other`.
- Number params are written with the language's `Intl.NumberFormat` (Dari gets Persian digits). English output is unchanged (no number above 999 appears).
- `useI18n()` also gives `formatDate`, `formatNumber` and `formatList`. Every date (journal, certificate, Settings, learner tiles), name list and duration now goes through them, so it is in the language's words, calendar and digits.
- A key a language doesn't have falls back to English, formatted as English.
- `tx(key, params)` is `t` for messages whose params are elements, such as a lesson title marked as English (`<En>`).

English-only assumptions fixed on the way:

- "Saved today" and "Saved yesterday" were "today" and "yesterday" dropped into "Saved {date}"; they are whole messages now.
- A done step's screen-reader name and a lesson row's name (with its question) were joined in code; they are messages now.
- The quick-check verdicts that lesson files start their feedback with ("Yes.", "Not quite.") lived in en.json, where a translation would have stopped them matching the English content. They are course text, so they are `CONTENT_VERDICTS` in `src/pages/lesson/read/feedbackText.ts` now.
- The complete screen compared the English completion message with the heading in the interface language; it compares it with the English heading now.
- "Section {number}: {title}" in the teacher guide was a message and a title joined with ": " in code.
- Video and recording lengths ("4:10") and the teacher guide's minutes use the language's digits.

### Course text stays marked as English

When the interface is in another language, everything from `content/` carries `lang="en"`, and `dir="ltr"` in a right-to-left page (`contentLang` from `useI18n()`, or `<En>` inside a message). Screen readers then read it as English, and it keeps its left-to-right layout. English pages get no extra markup at all. Interface text inside course text (a glossary word's popover inside a reading) is put back with `uiLang`. The wordmark and the avatar initials are `translate="no"`.

- Listen reads with an English on-device voice whatever the interface language, and sets each utterance's `lang` to it (`src/speech/voices.ts`, tested with a Persian default voice). Say it always listens for `en-US`.
- The practice options ("I practised with a partner") and the fiction label come from `content/course.json`, so they are course text and stay English. Moving them to en.json would make them translatable: a decision for Justin and Nick.
- `ds.course.sectionName.*` in en.json names a section only where a page has no name from the content; the course pages show the content's English section names.

### Fonts (`src/i18n/fonts/`)

Vazirmatn (SIL Open Font License 1.1, `@fontsource/vazirmatn` from npm) for Dari/Farsi and Arabic. `arabic.css` adds only its Arabic-script letters (`unicode-range`) to the site's own families, "Atkinson Hyperlegible Next" (400, 400 italic, 500, 700) and "Funnel Display" (500, 600). So Latin letters, digits and punctuation keep the site's fonts, Arabic letters come from Vazirmatn, and the design tokens don't change. It is loaded only while a language with the `arabic` font key is shown, and a browser downloads a file only when a page shows Arabic letters in that weight. It is a stylesheet of its own (`assets/fonts-arabic/arabic-[hash].css`), imported as a file (`?url`) and added with a `<link>` by `src/i18n/fonts/index.ts`: the site has one stylesheet for every page (`cssCodeSplit: false`, `docs/notes/slow-internet.md`), which takes in any CSS the code imports, even on demand, so an `import('./arabic.css')` would put Vazirmatn's rules in every visit's stylesheet. The build stops if they ever reach it (`keepFirstVisitLight` in `vite.config.ts`). Arabic script has no italic, so italic text gets upright letters, and headings drop their tight tracking in Arabic script (letters join up). Four files, about 21 kB each.

Somali uses the 26 basic Latin letters and the apostrophe, which the site's fonts already have (`src/i18n/fonts/fonts.test.ts` checks).

### Test languages (`src/i18n/pseudo.ts`)

Made from en.json whenever the site is built, served or tested (the `pseudoLocales` plugin in `vite.config.ts`), never written by hand:

- **en-XA**: every letter accented, every word about 35% longer, each message in ⟦ ⟧. English left in the code stays plain, a layout that can't take longer words breaks, and text cut off loses its ⟧.
- **ar-XB**: right to left, each word turned round with right-to-left marks.

In development, add `?locale=en-XA` (or `ar-XB`, or any listed language, ready or not) to any address; `?locale=en` turns it off, like `?dir=rtl`. In a production build the switch accepts only the test languages, and only in a browser driven by automated tests (`navigator.webdriver`), for the end-to-end tests. They are never offered, never saved and never precached; their chunks (`assets/pseudo/`) are in `dist/` but nothing fetches them.

`e2e/languages.spec.ts` walks the whole page tour (`e2e/pageTour.ts`) at 390px in both. In en-XA it fails on any visible interface text (or `aria-label`, `placeholder`, `title`, `alt`) outside course text that isn't pseudo-localised, on anything wider than the screen and on text cut off; in ar-XB every page must stay right to left and fit. The tour finds buttons and headings by their en.json keys (`e2e/uiText.ts`), so it runs in any of the three. It found:

- the course text listed above, unmarked everywhere;
- the wordmark and avatar initials (not translatable: now `translate="no"`);
- dates on the certificate and in Settings formatted outside the language's formatter;
- the section check's result message (course text);
- one layout break: segmented controls (the journal's filter) couldn't shrink, so longer words pushed the page 4px sideways at 390px. They now wrap inside their column.

### Glossary meanings

A glossary entry in a lesson file can carry `"translations": { "fa-AF": "…" }`: one short line (at most 120 characters) per listed language other than English, checked when the content is built (`src/content/schema.ts`). When the learner's language has one, the word's popover and the Key words panel show it under the English definition, labelled with the language's own name, in its own `lang` and `dir` (`src/lesson/glossaryMeaning.ts`, `DefinitionCard`'s `meaning`). No lesson has any; the tests use fixtures. The print views don't show them.

### The translator kit (`tools/i18n/`)

- `npm run i18n:export -- <code> [file.csv]` writes `thinkerwell-<code>.csv` (ignored by git): key, English, notes, current translation, new translation, UTF-8 with a BOM. A plural message gets a row per form the language has, with the numbers each is for. Notes come from `src/i18n/messages/en.notes.json` (written for about 140 tricky keys: where the text shows, what each placeholder is), plus what the placeholders are and a length hint for short labels.
- `npm run i18n:import -- <code> <file.csv>` writes `src/i18n/messages/<code>.json`. It takes the new translation, or the current one if that is blank, and refuses (lists, and exits with an error) rows with an unknown key, a plural form the language doesn't have, or `{placeholders}` that don't match the English. In a plural form other than `other`, `{count}` may be left out ("one lesson").
- `npm run check:i18n` fails on unknown keys, placeholder mismatches, broken plural forms (a missing or unknown form), empty messages, exclamation marks, notes for keys that don't exist, and a `ready` language with messages missing (learners would see English); for a language that isn't ready it only reports how many are missing. It runs in CI after the content check.

### Pages that load when opened

This branch first made Settings, the Educators page, teacher guides, answer keys, the print views and certificates chunks of their own, fetched when opened, with the rest of the app one `app` chunk, to keep the English first load no bigger. It was merged after `slow-internet` (`docs/notes/slow-internet.md`, 28 September 2026), which already loads every page but home, the course map and the 404 when opened, in three chunks, with a lesson catalog, idle preloading and a first-page script. That scheme replaced this one, so pages load one way only (`src/app/lazyPage.tsx`, `src/app/lazy/`). A language's messages and the test languages keep their own chunks and folders (`assets/locales/`, `assets/pseudo/`), and the Arabic font its own stylesheet, whichever way pages load.

What the language work adds, measured with `npm run build && npm run slow-internet -- --bytes` (Brotli, as Vercel sends it), on top of `slow-internet`:

| | `slow-internet` | With the language groundwork |
| --- | ---: | ---: |
| First visit, home page | 204.5 kB | 207.2 kB |
| First visit, Lesson 10 Read from a link | 314.4 kB | 317.5 kB |
| Precache | 469.1 kB | 472.4 kB |

About 3 kB: the language code in the first chunk (the list, loading, the provider's formatters, the test-language switch) and the reworded messages. Nothing of other languages, the test languages or the Arabic font is in the precache or a first visit.

## Bahasa Indonesia (branch `bahasa-indonesia`, September 2026)

Indonesian is ready, and it is the first language whose **lessons are translated too**, for the Jakarta pilot: a learner who chooses it gets the interface, the lessons, the section checks, the course text and the lesson pictures in Indonesian. The videos stay English, and the Watch step says so. This reverses "the lessons stay in English" for this one language, at the team's request; every other language still translates the interface only. The Indonesian was drafted and cross-checked by AI and waits for native-speaker review before it reaches learners (`docs/translation/README.md`).

- **The flag.** `content: true` (and `speechLang: 'id-ID'`) on the language in `src/i18n/locales.ts`. `contentLocale()` gives the lessons' language for an interface language: its own when `content`, otherwise English.
- **The files.** `content/id/course.json`, `content/id/lessons/*.json`, `content/id/quizzes/*.json` and `content/id/visuals/*.svg`. A translation file holds only the text learners read, in the English file's shape; `src/content/translation.ts` lays it over the English, so ids, correct answers, videos, links and the teachers' notes always come from English (`scripts/i18n/translatable.py` applies the same rules for the checks and the spreadsheet). A glossary entry's `forms` is replaced whole.
- **Loading.** They load with the language's messages (`fetchContent` in `src/i18n/load.ts`), in the same chunk (`assets/locales/id/`), and its pictures go in `assets/locales/id/visuals/` (`src/i18n/build.ts`), so the precache rules for ready languages cover them. An English visit fetches none of it.
- **Showing it.** `useI18n().content` is the loaded translation (or undefined while the lessons are English). `useCatalog()` (`src/content/useCatalog.ts`, any page) and `useContent()` (`src/content/useContent.ts`, the lazy pages that show lessons) give the same getters as the English module-level ones, over the translated content (`catalogFor`, `contentFor`, built once per language). Every page uses them; helpers outside components take the content as a parameter that defaults to English.
- **Course text marking.** `contentLang` is empty when the lessons are in the page's own language; `englishLang` (and `<AlwaysEn>`) marks what stays English in every language: video titles and channels, sources and teachers' notes.
- **The lesson player.** Quick-check and section-check feedback starts with "Benar." or "Belum tepat." in Indonesian, which the player drops like "Yes." and "Not quite." (`CONTENT_VERDICTS_BY_LANG` in `src/pages/lesson/read/feedbackText.ts`). The complete screen compares the completion message with its heading in the lessons' language. Key words are matched with the lessons' language. Glossary meanings (`translations`) aren't offered for a language whose lessons are translated.
- **Listen** reads with an on-device voice in the lessons' language (`pickListenVoice(voices, 'id-ID')`), never another language's voice; with none, the Read step says so (`lessonPlayer.read.listenNoVoice`) instead of hiding Listen silently. **Say it** listens in the lessons' language (`speechLangFor`), on the device only if an educator's "Check this device" found that language available there: English's answer stays in `settings.speechCheck`, other languages' in `settings.speechChecks` (by speech tag), with no migration (`src/speech/language.ts`).
- **Checks.** The build checks the translation against the English (`checkTranslation`); `npm test`, `npm run check:content` (`scripts/check_translation.py`) and `e2e/indonesian.spec.ts` check it further (`docs/translation/README.md`, "Checks").
- **Size.** Measured with `npm run build`: the Indonesian chunk is 367 kB (95 kB gzipped), the pictures about 45 kB compressed. English first visits don't change. The precache (every device's offline copy, since a ready language is precached) is 609 kB, up from 481 kB; its budget is 620 kB. If that matters more than having Indonesian offline on every device, precache a language only on devices that use it: that needs runtime caching, which the service worker avoids today.
- **English copy changed.** Three help texts beside the language choice said "The lessons stay in English"; they now say the lessons follow the language in Indonesian.

## How to add a language

1. Add it to `LOCALES` in `src/i18n/locales.ts` with `ready: false` (and `content: true`, a `speechLang` and translated `content/<code>/` files only if its lessons are to be translated too, as for Indonesian): its code, English name, own name (`new Intl.DisplayNames([code], { type: 'language' }).of(code)`; `locales.test.ts` checks it), direction and font key. A script the site's fonts and Vazirmatn don't cover needs a font file in `src/i18n/fonts/`, a font key, and its place in `src/i18n/build.ts` (file names and precache rule).
2. `npm run i18n:export -- <code>` and send the spreadsheet to a translator with `docs/TRANSLATING.md`.
3. `npm run i18n:import -- <code> <file.csv>`, then `npm run check:i18n`.
4. Look at it: `npm run dev`, then `?locale=<code>` on any address. Walk the page tour at phone and laptop width.
5. A second native speaker reviews it (`docs/TRANSLATING.md`, "Checking a translation").
6. Set `ready: true`. `npm run check:i18n` then insists that every message is translated. The language appears in the pickers, and its chunk (and, for Arabic script, the font) joins the precache. Run the end-to-end tests, and `npm run size` to see the precache.
7. Glossary meanings, if wanted, go in the lesson files as `translations`; `check_lesson.py` ignores them.
8. Update `docs/PRODUCT.md`.

## Not done, or for later

- **No translation at all**, by design. The only non-English text is the three languages' own names, from CLDR.
- **Dates in Dari** follow the locale's own calendar (Solar Hijri) and digits, as `Intl` gives them. Ask the centre which calendar learners know; `formatDate` can take `calendar: 'gregory'`. English dates keep their order ("September 5, 2026"; day first is an open decision in `docs/PRODUCT.md`).
- **Screen-reader names that mix the interface and a title** (a lesson row, "Answer key for the History section check") are attributes, which can't mark part of themselves as English, so a Dari screen reader reads the English title with a Dari voice. The visible text is marked. The same for the browser tab's title.
- The step path's "done" for screen readers is still a separate string read after the step's name (`ds.chrome.stagePath.doneSuffix`, with a note for translators); moving it into one message would change what screen readers hear in English.
- `index.html` (`lang="en"`) and the web manifest (`lang`, `dir`) stay English; the app sets `<html lang>` and `dir` as it starts.
- The language picker has never been seen by a learner; it was built from the design system's chips without a screen design. Its place (Settings, new learner, learner home) is worth checking with the centre once a language is ready.
- The test languages run end to end at 390px only. Right to left at other widths is the existing `e2e/right-to-left.spec.ts` (English text, forced `dir`).
- Glossary meanings don't print.
