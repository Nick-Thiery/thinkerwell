# Phase 5: Listen, Say it and Record yourself

Branch `phase-5-speech`. Researched and built in September 2026. Browser support for speech changes often, so check this again before relying on it.

## What was built

- **Listen** on the Read stage. The Listen tool is the first reading tool. A local English voice reads the part on screen: the heading first, then one sentence at a time, in the version on screen (Standard or Simpler). The sentence being read is marked with `mark.tw-speaking`, and the page scrolls to it only when it is out of view. At the end of a part, Listen moves on to the next part and keeps reading. It stops after the last part, at the quick check, when the learner leaves the stage, and if the voice fails. The ListenBar can pause, play, stop (focus goes back to Listen) and switch between Slow (0.8) and Normal.
- **Say it** on Write's answer box, both Watch boxes and every Reflect box (`SayItBox`). Dictated words go in at the learner's caret and are saved exactly like typing. That means a spoken answer to the required Reflect prompt completes the lesson, and a spoken answer to Watch's after question counts once listening ends. Typing in the box stops listening. While a box listens, its helper line says "Listening. Speak slowly…". If listening fails, the helper line says why in plain words.
- **Record yourself** on the Speak stage: an optional, private recorder. The microphone is asked for only when the learner taps Start recording, and it is released when they tap Stop. A chosen learner's latest clip for each lesson is kept in IndexedDB, and Delete removes it. Guests' clips stay in memory only. Recording never counts towards Speak being done.
- **Settings for this device** (`/settings`, for educators). Its **Check this device** button finds out how this browser does speech to text and saves the answer, it offers the browser's one-time on-device download where there is one, and it has **Allow online speech-to-text**, which is off unless an educator turns it on. The Educators page links to it for now.
- `src/speech/` wraps the browser APIs. `src/test/speechMocks.ts` fakes `speechSynthesis`, `SpeechRecognition`, `getUserMedia` and `MediaRecorder` for Vitest. `e2e/speech.spec.ts` checks the real pages.

## Browser support and what happens elsewhere

### Listen (speechSynthesis with a voice where `localService` is true)

| Browser / device | Result |
| --- | --- |
| Chrome and Edge on Windows | Works with Windows' own voices. Chrome's "Google …" voices and Edge's "… Online (Natural)" voices use the internet, so they are skipped. |
| Chrome, Safari and Firefox on macOS | Works with the Mac's own voices. |
| Safari on iPhone and iPad | Works with the system voices. |
| Chrome on Android, Samsung Internet | Works with the phone's text-to-speech voices. Pause is done by cancelling and restarting the sentence, because `pause()` ends speech on Android. |
| Firefox on Windows or Linux | Works with the system voices when the system has them. |
| ChromeOS | Usually works with ChromeOS's own voices. |
| Linux without speech-dispatcher, headless browsers | No voices, so Listen is hidden. |

Where no local English voice exists, the Listen tool doesn't show, and nothing else changes.

Which voice: since October 2026, the best one on the device by a ranking table, or the one an educator chose in Settings ("Listen voice"). What each platform lists, the ranking and its sources are in `docs/notes/listen-voices.md`.

### Say it (speech recognition)

On the device means that **Check this device** in Settings asked `SpeechRecognition.available({ langs: ['en-US'], processLocally: true, quality: 'dictation' })` and the answer was `available`. The answer is saved with the date (`settings.speechCheck`), and lessons read it: they never ask the browser themselves (see "Changed" below). Say it then runs recognition with `processLocally = true`, which the spec says must stay on the device. If a browser doesn't answer within 3 seconds, the check counts as not available.

| Browser / device | On the device | With "Allow online speech-to-text" on |
| --- | --- | --- |
| Chrome 139+ on Windows, macOS, Linux | Yes, once the English language pack is on the device. Without it, `available()` says `downloadable`, and Settings offers the download (about 60 MB, from Google). Chrome 150+ also understands `quality`. | Google's servers (needs the internet) |
| Edge (desktop) | Only in Edge 150 Canary/Dev with the "Speech Recognition with on-device model" flag. Stable Edge: no. | Microsoft's online service |
| Brave | No. The API is there, but Brave never installs the pack (`available()` stays at `downloading`). | Depends on Brave; not tested |
| ChromeOS, Chrome on Android | No. There is no on-device Web Speech here yet. | Google's service |
| Safari on macOS, iPhone and iPad | No. There is only `webkitSpeechRecognition` and no `processLocally`, and Apple decides whether audio goes to its servers. | Apple's service (Siri and Dictation must be on) |
| Firefox | Not yet by default. Firefox 157 added on-device recognition behind a preference, and caniuse lists `processLocally` from Firefox 159. The detection will pick it up once it is on. | No recognition in current releases |
| Samsung Internet | No | No |

Say it shows only where it can work: on the device once Check this device has said so, or online when an educator has allowed that and the browser has recognition. Everywhere else, including on a device nobody has checked, the button is hidden and the boxes are plain writing boxes. If recognition fails part-way, the box says why and the learner can type:

- the microphone was refused;
- no microphone was found;
- the device is offline on the online path;
- nothing was heard;
- the on-device pack stopped working. In this case Say it stops offering on-device recognition on that page (it hides, or goes online where an educator allowed that). The page doesn't ask the browser again; an educator can run Check this device again in Settings.

### Record yourself (MediaRecorder and getUserMedia)

| Browser / device | Result |
| --- | --- |
| Chrome, Edge, Firefox (desktop and Android), Samsung Internet | Records WebM or Ogg with Opus. |
| Safari 14.1+ on macOS, iPhone and iPad | Records MP4 with AAC. |
| Any browser over plain http (not localhost) | No `getUserMedia`, so the recorder is hidden. The site is served over HTTPS on Vercel. |

Before any permission is given, the page checks for a microphone with `enumerateDevices()`, which asks for nothing. Chrome, Firefox and Safari all list an unnamed `audioinput` when a microphone exists. If the browser can't record, or no microphone is listed, the recorder is hidden and the Speak task doesn't mention recording. A saved clip still shows so that it can be played or deleted. If the microphone is refused, the recorder says so in plain words and the learner can practise in other ways.

## Decisions

1. **Detecting on-device recognition.** Say it uses on-device recognition only when the browser has an unprefixed `SpeechRecognition` with `available()` and a real `processLocally` property, and `available()` says `available`. On an engine that doesn't know `processLocally`, setting it does nothing and the audio could go online, so the property is never set there.
2. **Online path.** The online path is a device setting, `settings.partner.allowOnlineDictation`, which was already in storage. It is off unless an educator turns it on. It is explained on a new Settings page, because phase 6 builds Settings anyway. Phase 6 will add the page to the header menu and add the other settings.
3. **Settings save even while looking around.** Changing a device setting is setting up the device, not a learner's work, and educators often browse in look-around mode. Inside a lesson, look-around still saves nothing: the Listen speed is kept in memory for guests and saved to `settings.listeningSpeed` only for a chosen learner.
4. **The on-device download starts only from Settings.** It starts when an educator taps the button, never inside a lesson. The browser downloads it from its maker (Google for Chrome), it can be large, and bad internet is the norm here. The site itself still loads nothing from other servers (see `e2e/privacy.spec.ts`).
5. **Languages.** Recognition listens for `en-US`, the pack browsers ship first. Listen prefers the device's default English voice, then British English, then any English voice. (Changed in October 2026: the device's default made Listen pick robotic and novelty voices in Safari, which calls every voice the default. Listen now ranks voices by quality, then region, and the default only breaks ties; an educator can choose the voice in Settings. See `docs/notes/listen-voices.md`.)
6. **Listen reads the heading, and reads sentence by sentence.** The heading is read but not highlighted, because the design system's heading has no mark. (Since October 2026 it is read with a full stop and a short silence after it, and skipped when the first sentence repeats it: `docs/notes/listen-voices.md`.) Each sentence is its own utterance, so the highlight never depends on `boundary` events, which many local voices never send. Sentences are split with `Intl.Segmenter`, with a simpler fallback for browsers that don't have it.
7. **Listen moves on by itself.** It carries on from part to part without moving focus, so a keyboard user stays on Pause. If the learner changes the part or the reading level, Listen starts that part again from its heading. The quick check isn't read.
8. **Where Say it appears.** Say it is on Write's answer box, not on the short planning boxes (the screen shows it on the answer box only). It is on both Watch boxes and every Reflect box. It isn't on Read's warm-up or think boxes, which the plan doesn't list.
9. **Recordings are kept per learner and deleted only on request.** The latest clip per learner and lesson is kept, and it is deleted by Delete or by removing the learner (CLAUDE.md). `VoiceRecorder.md` also says to delete it "when the learner switches". Clips are stored per learner and the recorder only ever shows the active learner's clip, so switching learners doesn't expose another learner's clip. This follows CLAUDE.md.
10. **Recording limits.** Recordings are made at about 32 kbps, which is roughly 240 kB a minute, and stop by themselves after 3 minutes. A recording still in progress when the learner leaves Speak is kept, as if they had tapped Stop.
11. **The recorder's copy.** The recorder's title is "Record yourself (optional)", as on the screen. Its task line is generic, because the content has no "three sentences" frames.
12. **No red for problems.** Problems are shown as plain words on a lavender wash (the help colour), never in red.

## Changed

**28 September 2026: pages no longer ask about speech recognition as they open** (branch `fix-speech-crash`). In Playwright's Chromium 153 on GitHub Actions, with phone or tablet emulation (touch), the tab crashed ("Page crashed") as soon as Write, Watch, Reflect or Settings opened. A probe showed it: without `SpeechRecognition` and `webkitSpeechRecognition` nothing crashed, and those pages called `SpeechRecognition.available()` as they opened. Learners would have seen Chrome's "Aw, Snap!" page mid-lesson, on the touch laptops and tablets the pilot uses. Now:

- Lessons decide from the saved device settings only (`dictationMode()` calls nothing): Say it shows when `settings.speechCheck` says `available`, or when "Allow online speech-to-text" is on and the browser has the API. A recognition object is made only when the learner taps Say it, still with `processLocally = true` on the device.
- Settings asks the browser only when an educator taps **Check this device**, and saves the answer with the date. The download follows from that answer, and its outcome is checked and saved the same way. Educators run the check once per device (and browser) when they set it up (`docs/LAUNCH_CHECKLIST.md`).
- `settings.speechCheck` is null until someone checks. Settings saved before it existed read as null, so the database stays at version 2 (no migration, and an older build can still open it).
- `src/pages/speechOnOpen.test.tsx` renders Write, Watch, Reflect and Settings and checks that neither `available()` nor the constructor is called. The end-to-end tests tap Check this device and Say it only with a fake recognition (`e2e/speechFake.ts`).
- Not known yet: whether the crash also happens in real Chrome 153 on a touch device, or only in headless Chromium, and whether the check itself would crash there. Try Check this device on each pilot device.

## Not done, or for later

- **Not tested on real devices.** Nothing here was tried on real hardware: Chrome with the English pack installed, an iPad, an Android phone or a Windows laptop. This machine's headless Chromium (141) has no voices and reports the pack as `downloadable`. Everything else was tested with mocked APIs. Try Listen, Say it and Record yourself on the HELP pilot devices before the pilot.
- **Settings in the header menu.** Settings isn't linked from the header menu yet (phase 6).
- **Listen elsewhere.** Listen reads only the Read stage's text, not Watch's written version.
- **Glossary definitions and the highlight.** An open glossary definition closes when the highlight passes the word it belongs to, because the word moves into the `<mark>`.

## Sources

- MDN: [Using the Web Speech API: on-device speech recognition](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [`SpeechRecognition.available()`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static), [`install()`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/install_static), [`processLocally`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally)
- [Web Speech API spec](https://webaudio.github.io/web-speech-api/) and the [on-device explainer](https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md)
- Chrome: [Intent to Ship: On-device Web Speech API](https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM), [Intent to Ship: On-Device Recognition Quality](https://groups.google.com/a/chromium.org/g/blink-dev/c/P8P-x7AnC6I), [Chrome 150 release notes](https://developer.chrome.com/release-notes/150)
- Edge: [Convert speech to text with the SpeechRecognition API](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api)
- Firefox: [Bug 1940906, on-device Web Speech Recognition](https://bugzilla.mozilla.org/show_bug.cgi?id=1940906), [Gecko SpeechRecognition docs](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/docs/SpeechRecognition.md)
- Brave: [issue 55414, on-device recognition stuck at "downloading"](https://github.com/brave/brave-browser/issues/55414)
- [caniuse: `SpeechRecognition.processLocally`](https://caniuse.com/mdn-api_speechrecognition_processlocally)
- WebKit: [bug 174833, enumerateDevices on iOS](https://bugs.webkit.org/show_bug.cgi?id=174833)
