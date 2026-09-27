# Moving work between devices

Branch `device-transfer`. Built in September 2026.

Tablets get reset, learners switch devices, and a centre may replace a laptop. Until now a learner's work lived only in that browser's IndexedDB. Settings (`/settings`) now has **Move work to another device**, with two parts:

- **Save work to a file.** Choose one learner or "All learners on this device", then tap **Save my work to a file**. The browser downloads a small JSON file, for example `thinkerwell-amina-2026-09-28.json` or `thinkerwell-all-learners-2026-09-28.json`.
- **Load work from a file.** Tap **Load my work** and pick a file. Thinkerwell reads and checks the whole file, then shows what is in it, for example "Amina: 12 lessons and 2 section checks. New on this device." Nothing changes until someone taps **Load it**. Afterwards it says what happened ("Added to this device: Amina.", "Added to the work already here: Yusuf.", or "This device already had all the work in this file, so nothing changed.").

Nothing goes online, and no permission is asked for. It works offline. The file is made in the browser and downloaded, and loading reads a file the person picks.

The code:

| File | What |
| --- | --- |
| `src/storage/workFile.ts` | The file format, making a file, its name, and the hand-written checker |
| `src/storage/mergeWork.ts` | The merge rules, as pure functions (`mergeProgress`, `mergeQuizRecord`, `planImport`) |
| `src/storage/store.ts` | `exportWork()` (one read transaction) and `importWork()` (one read-write transaction) |
| `src/pages/settings/WorkFileSetting.tsx` | The Settings section |
| `src/pages/settings/files.ts` | Downloading a file and reading a picked one |
| `src/session/sameNames.ts` | Telling apart learners who share a name |

## What is in the file

```json
{
  "format": "thinkerwell-work",
  "version": 1,
  "savedAt": "2026-09-28T09:00:00.000Z",
  "learners": [
    { "learner": { "id": "…", "name": "Amina", "colour": "geography", "createdAt": "…", "classCode": "HLP-07", "readingLevel": "simpler" },
      "progress": [ /* one LessonProgress per lesson started, as stored */ ],
      "quizAttempts": [ /* one SectionQuizRecord per section check taken, as stored */ ] }
  ]
}
```

`format` marks it as ours. `version` is `WORK_FILE_VERSION`; bump it when the shape changes, and a device with an older Thinkerwell then says "This file was saved by a newer version of Thinkerwell. Update this device first". A learner who has done every lesson is about 50 kB.

**Left out:**

- **Recordings.** They are too big, and the Settings section says so: "Recordings stay on this device."
- **Device settings** (Save data, Listen speed, the reading level for anyone who hasn't chosen one, Say it). They belong to the device, not to a learner.
- **Who is learning now** (the current learner).

The file isn't locked or encrypted. The help line under the button says "Anyone with the file can read the work in it, so keep it safe."

## Checking a file

`checkWorkFile()` is written by hand, because zod never reaches the browser (CLAUDE.md, "Stack"). The file is treated as untrusted.

- **Refused as a whole**, with nothing changed, if:
  - it isn't JSON, or doesn't have our marker: "This isn't a Thinkerwell work file";
  - its version is newer than this Thinkerwell's: "This file was saved by a newer version of Thinkerwell. Update this device first: open Thinkerwell with the internet on, then try again." The version is checked before anything else, because a newer file may have another shape;
  - it is empty (no bytes, or no learners): "There's no work in this file";
  - it is over 5 MB (checked before it is read, and again after): "This file is too big to be Thinkerwell work";
  - anything in it doesn't fit the format: "Part of this file is damaged, so nothing was loaded." That covers a missing or mistyped field, an unknown stage, colour or reading level, a date not written as the app writes it, the same learner, lesson or section check twice, a record that belongs to a different learner than the one it is under, and a number out of range.
- **Strings.** Every string is capped: answers at 50,000 characters (no lesson answer comes near it), names at 60 (the form allows 30), class codes at 40 and ids at 64. Names can't hold line breaks or control characters, and answers can hold line breaks and tabs but no other control characters. Ids must be letters, digits and hyphens. Keys of numbered lists must be small numbers, so a key like `__proto__` is refused. Everything from a file is shown as text only, never as markup.
- **Clean records.** The checker builds new records from the fields it knows, so extra fields in a file are dropped, and repeated stages are dropped.
- **Lessons and checks this version doesn't have** are left out, and the preview says how many ("2 pieces of work are for lessons or checks that this version of Thinkerwell doesn't have. They will be left out.").

Saving checks its own file the same way before downloading it, so it never hands out a file that couldn't be loaded. If "All learners" makes a file over 5 MB, it says "That's too much work for one file. Save each learner's work on its own."

A bad file never changes the database: checking happens before the preview, and the preview before any write. A failure while writing changes nothing either (below).

## Merge rules

The rules are in `src/storage/mergeWork.ts`. Each one has a test in `src/storage/mergeWork.test.ts`, and the store tests (`src/storage/transfer.test.ts`) run them through two databases.

### Learners

- **Matched by id, never by name.**
- **A learner who isn't on this device is added** as they are in the file: name, colour, class code, reading level and the date they were first added.
- **A different learner with the same name is still added.** Two tiles then share a name. So wherever learner tiles show (the "Who's learning today?" picker and the learner switcher), learners who share a name (ignoring case and spaces) also show the day each was added, for example "Up to Lesson 3 · added Sep 2, 2026". The list of learners under "Save work to a file" does the same, and the preview warns before loading. Nobody is renamed. Other tiles are unchanged.
- **A learner already on this device keeps their details from this device** (name, colour, class code, reading level). Only their work is combined.

### Lesson work

This applies when both this device and the file have a record for the same learner and lesson. A lesson only one side has is kept as it is.

- **Stages done:** every stage done on either side (this device's order first).
- **Completed:** a lesson completed on either side stays completed, with the earlier completed date.
- **Started:** the earlier date. **Updated:** the later date, not the time of loading, so "Continue" still points where the learner last worked, and loading the same file again changes nothing.
- **Answers** (the warm-up, quick-check answers, the writing, planning notes, Watch's before and after answers, reflections): the copy from the record saved more recently wins, **but only if it has text**. An empty answer never replaces a written one. On an exact tie, this device wins.
- **The current stage, how they practised speaking, self-check ticks and quick-check choices** follow the same rule: from the more recent record, where it has one.
- **Quick-check tries:** the larger count.
- **"Example shown" and "read instead"** stay true once true on either side.

**Why this rule for answers.** `src/storage/types.ts` keeps one `updatedAt` per learner and lesson, not one per answer. So the most defensible rule is:

- Trust the record changed more recently for each answer: in the usual case, a learner moves on from one device to the next, and the newer record holds their latest version of every answer.
- Never let a blank overwrite text. That is the one way a whole-record rule could lose work outright: for example, an answer the newer device never had.

The rule can't tell which side changed an answer when the same answer was edited on both devices without moving the work between. Then the newer record's version wins, and the other edit to that same answer is lost. Keeping per-answer dates would fix that, but needs a new storage version. Keeping "this device's text, filling the gaps from the file" was the alternative. It fails in the common case: when a learner comes back to a device, it would keep the old answers there over their newer work.

### Section checks

- **Best:** the higher score (a tie goes to the later attempt, as `recordQuizAttempt` does).
- **Latest:** the later attempt.
- **Attempts:** the larger of the two counts, not the sum.

**Why the larger count.** A `quizAttempts` record keeps only the best attempt, the latest attempt and a count, not a list of attempts. The two copies usually share their earlier attempts (the work came from the same place). Adding the counts would count those twice, and loading the same file again would add them again. The larger count can undercount only when a learner took the same check on two devices without moving their work in between.

### Loading twice, and failures

- **Loading the same file twice changes nothing the second time.** Every rule gives the same result when combined with the same file again, and only records that would change are written. The second time, no writes are made at all, and the page says nothing changed.
- **One transaction.** `importWork()` reads what the device has for each learner in the file and writes every change in one IndexedDB transaction. If any write fails, the transaction is aborted and nothing changes. The page then says "The work couldn't be loaded, so nothing changed on this device. Try again." and keeps the preview.
- **It doesn't choose a learner, or touch the device's settings or recordings.** The header and the home page show new learners at once (`reloadLearners()` in the learner session).
- No change to the storage schema: `DB_VERSION` is still 2.

## The Settings section

- It sits after "Offline and data". It is device-wide, like the rest of Settings, so it also works while looking around. Saving starts on the learner using the device, or on "All learners on this device" when nobody is chosen.
- With no learners on the device, it says "There's no saved work on this device yet." and still offers loading (the usual case on a new or reset tablet). Where the browser window can't keep anything (some private windows), it says so and offers neither.
- **Load my work** is a real button, and it opens a hidden `<input type="file" accept=".json,application/json">`. So there is one control for the keyboard and screen readers, and it is 44px tall. After a file is read, focus moves to the preview's heading. After loading, it moves to the result, and after Cancel, back to **Load my work**. Messages sit in live regions. Problems use the burnt-orange `retry-soft` ground with an icon and words, never red. Success uses the page's lavender status line.
- Long names wrap (`overflow-wrap: anywhere`). The page tour has a stop with a file chosen (`e2e/pageTour.ts`), so the preview is checked for sideways scroll, axe, focus rings, tap sizes and right to left like every other page.
- The Lucide `Upload` icon is new to the icon set; it isn't in the design-system list.

## Browsers

- **Download:** a Blob, and a temporary `<a download>` that is clicked and removed. Its object URL is revoked 40 seconds later, not at once, because Safari and some Android browsers read the file after the click (FileSaver.js waits the same). There is no `showSaveFilePicker`. As far as documented behaviour goes:
  - iPad Safari (13 and later) asks whether to download and puts the file in Files, under Downloads;
  - Android Chrome saves it to Downloads.
- **Reading:** `Blob.text()`, or `FileReader` where that is missing.
- **Content-Security-Policy:** unchanged. A `blob:` download of the site's own page, and reading a picked file, aren't fetches the policy governs. The end-to-end test downloads a file under the real policy (`vite preview` sends it).

## Tests

- `src/storage/workFile.test.ts`:
  - making a file, its name, and that it holds no recordings or settings;
  - refusing each kind of bad file: not JSON, wrong marker, a newer version, empty, over 5 MB, 37 kinds of damaged record, huge strings and control characters;
  - leaving out unknown lessons and checks;
  - dropping unknown fields.
- `src/storage/mergeWork.test.ts`: each merge rule, both ways round, and combining twice.
- `src/storage/transfer.test.ts` runs the store between two databases:
  - a round trip, and combining work for a learner who is on both;
  - a same-name learner;
  - the same file twice (no writes at all);
  - a write failing part-way, and the whole transaction being refused. Both leave nothing changed.
- `src/pages/settings/WorkFileSetting.test.tsx`: the Settings section. It covers saving one learner or everyone, the preview, Cancel, loading, loading twice, skipped lessons, each problem message with nothing changed, a failed write, and names shown as text.
- `src/pages/settings/files.test.ts`: the download link and when its URL is revoked.
- `e2e/device-transfer.spec.ts`, at 390, 820 and 1280px:
  - in one browser context, a learner writes in Lesson 10 and saves their work to a file;
  - a fresh context loads the file through **Load my work** and loads it again, which changes nothing;
  - the work then shows in the journal and in the lesson, and no request goes to another server;
  - a file from a newer version is refused.

## Not done, or for later

- **Not tried on a real iPad or Android tablet.** Everything was tested in headless Chromium. On the pilot devices, check these things:
  - saving a file and finding it (on an iPad, Files, then Downloads);
  - loading it on another device;
  - saving and loading from Thinkerwell added to the Home Screen, which is how the pilot iPads should run it (phase 6). Downloads from a Home Screen web app have been unreliable in some iOS versions, and the Home Screen app keeps its storage apart from Safari's, so opening Safari instead wouldn't reach the same work. If saving fails there, the fix is to offer the system share sheet (`navigator.share` with the file) where the browser supports it, which lets the file be saved to Files.
- **Android's file picker** sometimes greys out `.json` files it doesn't recognise. If that happens, the `accept` attribute can be dropped: the file is checked by its content anyway.
- **Recordings aren't moved.** They could go in a separate file later if educators ask.
- **An answer edited on two devices without moving the work between** keeps only the newer record's version (see the merge rules). Per-answer dates would fix it with a new storage version.
- **Moving work without a file** (for example device to device over the local network) isn't possible without a server, and nothing leaves the device in this phase.
