# Listen's voice

Branch `listen-voices`. Researched and built on 7 October 2026. Learners said Listen sounded robotic. Browsers change what they list often, so check this again before relying on it.

## Why it sounded robotic

`pickListenVoice` took the device's default local voice first, then the first voice with a preferred region. Two things made that a bad choice:

- **Safari says every voice is the default.** WebKit lists each system voice with `isDefault` true (`PlatformSpeechSynthesizerCocoa.mm`), so "the default" was simply the first English voice in Safari's list. On iPads and Macs that list includes Apple's Eloquence voices (Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley) and the novelty "Effects" voices (Albert, Bad News, Bahh, Bells, Boing, Bubbles, Cellos, Good News, Jester, Organ, Superstar, Trinoids, Whisper, Wobble, Zarvox), any of which could come first. Not checked on a real iPad: the order of Safari's list is Apple's.
- **Nothing looked at quality.** A downloaded "Enhanced" or "Premium" voice, where the browser lists one, was never preferred over a compact one.

And nobody could choose the voice.

## What was built

- **The best voice, by a ranking table** (`src/speech/voiceRanking.ts`, tests in `voiceRanking.test.ts` with each platform's list). Listen still uses only voices on the device (`localService === true`) in the lessons' language, and never another language's voice.
- **"Listen voice" in Settings** (`/settings#listen-voice`, `src/pages/settings/ListenVoiceSetting.tsx`). One list per lessons' language that has a voice on the device: English, and Indonesian where the device has an Indonesian voice. Each starts with "Automatic (best on this device)", the default, and says which voice that is; then the usable voices, best first. Novelty voices and voices that need the internet are never offered. "Play a sample" reads one short sentence in that language with that voice at the device's Listen speed, only when tapped (`src/speech/sample.ts`; the sentences live in code, in the lessons' language, like the content's verdicts). Leaving the page stops it. Under the lists, short steps for getting a clearer voice on an iPad or iPhone, Android, a Windows laptop and a Chromebook. With a lessons' language on screen that has no voice (Indonesian), it says so.
- **The choice is a device setting**: `settings.listenVoices`, by language (`"en"`, `"id"`), each the voice's `name`, `voiceURI` and `lang`. It is optional, like `speechCheck`, so `DB_VERSION` stays 2 and older records read as Automatic. It is saved even while looking around (Settings sets up the device). It wins over the ranking in every lesson. If that voice isn't on the device (settings from another device, a voice removed, a browser that lists it differently), lessons use the best voice again and Settings shows Automatic, without a word.
- **The setup checklist** (`/educators/setup`) has an optional fifth step before the speech check, which stays last: "Choose the Listen voice (optional)". It says which voice Listen reads with on this device, the best one or the one chosen in Settings, and links to `/settings#listen-voice`. Its badge says "Optional" until a voice is chosen, then "Done", and "Not on this browser" where there is no voice Listen can use. On paper it shows its box, title and what to do, without its reason, and the steps are 3 mm apart instead of 3.5 mm, so the checklist still prints on one A4 page in Indonesian. On US Letter paper the Indonesian checklist now takes two pages (English still one); only leaving the step off paper altogether kept it to one, and Indonesia uses A4.
- **Reading** (`src/pages/lesson/read/readingPieces.ts`, `listenPieces`): see "Sounding more natural" below.

## The ranking

A page sees five things about a voice: `name`, `voiceURI`, `lang`, `localService` and `default`. The table uses only those.

1. **Never used**: voices not on the device (`localService` false); voices whose name says they are online ("Online", as Edge's "… Online (Natural)", or "-network", as Google's Android voices), whatever `localService` says; and Apple's novelty voices, by name (with their older names Hysterical, Princess, Deranged and Pipe Organ, and the old MacinTalk voices Fred, Junior, Kathy and Ralph) or by Apple's identifier in Safari's `voiceURI` (`com.apple.speech.synthesis.voice.Albert`), which stays the same when a Mac translates the names.
2. **Quality**, best first:
   - **High**: "Premium", "Enhanced", "Natural", "Neural" or "Siri" in the name, or `premium` or `enhanced` in the `voiceURI` (Safari's `com.apple.voice.premium.en-US.Zoe`).
   - **Standard**: everything else.
   - **Low**: Apple's Eloquence voices (by name or `com.apple.eloquence.…`), eSpeak's voices (ChromeOS, Linux) and any `voiceURI` saying super-compact. They are robotic at a normal speed, so they are used only when nothing else is there.
3. **Region**: English in British English first (the course's spelling), then US, Australian, Irish, Canadian, New Zealand, South African and Indian English, then any other English; Indonesian in id-ID first. A Scottish voice (`en-GB-u-sd-gbsct`) counts as British.
4. **The device's default**, only to break a tie, and only where it means something: where every voice says it is the default (Safari), it is ignored.
5. The browser's own order.

The same voice listed twice (name and region) is offered once. Language tags are read however browsers write them: `en_GB` and `en_gb` (Android), `in_ID` (old Android, Indonesian), `eng-US-f000` (Firefox on Android).

## What each platform lists

Checked in the browsers' source code where it is public, and otherwise in other people's tests. Nothing here was tried on a real device.

| Platform | What a page sees | Checked in |
| --- | --- | --- |
| Safari on iPad, iPhone and Mac (every iPad browser is Safari underneath) | Every system voice, each `localService` true and `default` true. `name` is Apple's name ("Daniel", "Samantha (Enhanced)", "Zoe (Premium)"); `voiceURI` is Apple's identifier: `com.apple.voice.compact.en-GB.Daniel`, `com.apple.voice.enhanced.…`, `com.apple.voice.premium.…`, `com.apple.eloquence.en-US.Eddy`, `com.apple.speech.synthesis.voice.Albert`, and older ones such as `com.apple.ttsbundle.siri_male_en-GB_compact` (Arthur, a compact Siri voice). **Voices downloaded in Settings are often not listed**, and installing a better copy of a voice can make the voice disappear from Safari's list. | WebKit `PlatformSpeechSynthesizerCocoa.mm`; WebKit bugs 290497 and 250665; Apple developer forum 723503; Readium's notes; a list of iOS voice identifiers |
| Chrome on a Mac | Every voice the Mac has, downloaded ones included, the system voice first. `name` is Apple's name, with the language added when two voices share one ("Eddy (English (United States))"); `voiceURI` is the name. | Chromium `tts_mac.mm` |
| Chrome on Android, Samsung Internet | One voice per language and region that the phone's speech engine (Google's or Samsung's) says it can speak, named in the phone's language ("English United Kingdom"), `lang` with an underscore (`en_GB`; Indonesian may be `in_ID`), all `localService` true, none marked default. Which voice it really is, and how good, is set in Android's own text-to-speech settings. A language whose voice isn't downloaded can still be listed, and Chrome may then read it with an English voice. | Chromium `TtsPlatformImpl.java` and `tts_android.cc`; Readium's notes |
| Chrome and Edge on Windows | Windows' own voices ("Microsoft Hazel - English (United Kingdom)"), from the newer OneCore list first, `localService` true. Voices added in Windows' Speech settings are in that list, so they appear too (perhaps only once the browser restarts, which Settings suggests). Chrome's "Google …" and Edge's "… Online (Natural)" voices need the internet. Windows 11's natural Narrator voices are not listed as local voices. | Chromium `tts_win.cc`; Readium's notes and voice lists |
| ChromeOS | ChromeOS's own voices, Android's ("… en-gb-x-gba-local", "…-network") and eSpeak's. Google's support page says its natural voices send text to Google; Readium's notes say they work offline. Listen trusts `localService`, and never uses a name ending "-network". | Google's Chromebook help; Readium's notes |
| Edge on Android | No voices at all, so Listen is hidden. | Readium's notes |

So the "Enhanced" and "Premium" tier matters most for Chrome on a Mac, and for Safari only where it does list a downloaded voice. On iPads, the big change is that Listen no longer picks a novelty or Eloquence voice.

## Getting a clearer voice (what Settings says)

The steps under the lists, checked against the makers' own help where it exists. Where a path couldn't be checked, the words stay general.

- **iPad or iPhone**: Settings, Accessibility, Spoken Content (called Read & Speak on newer versions: sources disagree about which iOS 26 version renamed it), Voices, the language, then a voice marked Enhanced or Premium, downloaded. Then: Safari doesn't let websites use every voice you download; if the new voice isn't in the list, keep the one you have. (Apple's support guide; AbilityNet's iOS 26 guide; Speech Central.)
- **Android**: Settings, search for text-to-speech (it is under Accessibility on most phones and under General management on Samsung's), the settings button next to Preferred engine, Install voice data, the language, download a voice. (Google's and Samsung's help.)
- **Windows laptop**: Settings, Time & language, Speech, Add voices next to Manage voices, the language; it may need an administrator; then restart the browser. (Microsoft's help; GeekRewind, October 2026.)
- **Chromebook**: Settings, Accessibility, Text-to-Speech, Text-to-Speech voice settings, then install the voices for the language. (Google's Chromebook help.)

The Indonesian versions use the menus' Indonesian names as far as they are known, keep Read & Speak, Enhanced, Premium and Text-to-Speech in English, and are flagged for the reviewers to check on devices set to Indonesian.

## Sounding more natural

- **Headings**: a part's heading is said with a full stop (headings have none), so voices finish it as a phrase rather than running on, with 400 ms of silence after it (`HEADING_PAUSE_MS`). Pausing or stopping in that silence cancels what comes next.
- **Nothing read twice**: in Lessons 1 and 3's simpler text in English (and 1, 3 and 10's in Indonesian) the first sentence says the same words as the heading. Listen then skips the heading and reads, and highlights, the sentence. A test walks every part of every lesson in both languages.
- **Abbreviations**: the sentence splitter broke after a title ("Dr. Ahmed" became "Dr." and "Ahmed …"), so "Dr." would have been read as a sentence of its own and highlighted alone. Titles (Mr, Mrs, Ms, Dr, Prof, St, Mt, Sr, Jr, Capt, Gen, Rev; Bpk, Sdr, Sdri, Ir, Hj), "vs", "approx", "e.g." and "i.e." now stay with what follows, and "No." does before a number. None is in the lessons today. Initials ("Mina L. packed rice") were already fine.
- **Numbers**: nothing to fix. The lessons write numbers in their own language's way (1,000 and 13.8 in English, 1.000 and 13,8 in Indonesian), and each is read by a voice of that language. There are no number ranges with dashes and no symbols such as % or °C in the reading text. "ML" (the letters on the tin, Lesson 2) is left as it is.
- **Speeds unchanged**: Slow stays 0.8 and Normal 1, and the pitch is never set. Normal is each voice's own speed, which is what makes a voice sound like itself; nothing pointed to a different speed being clearer for these learners. Learners can still slow it down.
- One utterance per sentence, as before (phase 5), so there is a natural pause between sentences and the highlight keeps up.

## Sizes

Measured as `e2e/build-output.spec.ts` counts them (Brotli), against `main` built on the same machine: the course's offline copy grows by 4.1 kB (630.4 to 634.5 kB; the budget is 635 kB), for the ranking, the Settings part, the checklist step and their words in English and Indonesian. A first visit to the home page grows by 0.7 kB (218.8 to 219.5 kB; the budget is 220 kB): the new English words are in en.json, which every first visit loads, and the styles are in the one stylesheet. No budget was raised, but both are now within 0.5 kB of their limits.

## Not done, or for later

- **Try it on the pilot devices.** Nothing here was tried on an iPad, an Android tablet, a Windows laptop or a Chromebook. On each: does Settings list the voices you expect, does Automatic pick a clear one, does "Play a sample" speak, and does a downloaded voice appear (Safari may not show it)?
- **macOS 26 (Tahoe)**: one app maker reports that Premium and Enhanced voices may make no sound there. Chrome on a Mac would now pick such a voice first. If Listen is silent on a Mac, choose another voice in Settings. Not checked.
- **ChromeOS natural voices**: if a Chromebook lists them as on the device but sends the text to Google (as Google's help says for Select-to-speak), Listen would use them, now first. Check on a Chromebook before the pilot uses one.
- **Android and missing voice data**: Chrome on Android can list Indonesian when the Indonesian voice isn't downloaded, and then read Indonesian lessons with an English voice. A page can't tell. Downloading the voice (the Android steps in Settings) fixes it.
- **A choice per device, not per learner**: one voice for everyone on the device, by design (it is set up by staff, like the other device settings).

## Sources

- WebKit: [`PlatformSpeechSynthesizerCocoa.mm`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/cocoa/PlatformSpeechSynthesizerCocoa.mm) (every voice `localService` and `isDefault` true, `voiceURI` = Apple's identifier); [bug 290497](https://bugs.webkit.org/show_bug.cgi?id=290497) (downloaded voices not listed, open); [bug 250665](https://bugs.webkit.org/show_bug.cgi?id=250665) (voices missing, "only Eloquence voices are listed" on iOS 18)
- Apple developer forums: [Web Speech Synthesis API: not all voices installed listed](https://developer.apple.com/forums/thread/723503)
- Chromium: [`tts_mac.mm`](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/tts_mac.mm), [`TtsPlatformImpl.java`](https://chromium.googlesource.com/chromium/src/+/main/content/public/android/java/src/org/chromium/content/browser/TtsPlatformImpl.java), [`tts_android.cc`](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/tts_android.cc), [`tts_win.cc`](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/tts_win.cc)
- Readium: [SpeechSynthesis in browsers and OSes](https://readium.org/speech/docs/WebSpeech.html), and its voice lists ([English](https://github.com/readium/speech/blob/main/json/en.json), [Indonesian](https://github.com/readium/speech/blob/main/json/id.json), [novelty voices](https://github.com/readium/speech/blob/main/json/filters/novelty.json), [very low quality voices](https://github.com/readium/speech/blob/main/json/filters/veryLowQuality.json))
- [List of AVSpeechSynthesisVoice identifiers on an iPad](https://gist.github.com/Koze/d1de49c24fc28375a9e314c72f7fdae4)
- Apple: [Adjust voice and speed for VoiceOver and Speak Screen](https://support.apple.com/en-us/111798); AbilityNet: [customise the voice in iOS 26](https://mcmw.abilitynet.org.uk/how-to-customise-the-voice-used-by-screen-readers-in-ios-26-on-your-iphone-or-ipad); Speech Central: [missing iPhone voices on iOS 17, 18 and 26](https://speechcentral.net/2025/06/27/missing-iphone-voices-restore-ava-samantha-other-favorites-on-ios-17-18-and-ios-26/); Scriptation: [better playback voices](https://help.scriptation.com/en/article/are-there-better-playback-voices-available-wbbvl2/) (Enhanced and Premium names, the macOS Tahoe issue)
- Google: [Hear text read aloud with Google Text-to-speech](https://support.google.com/accessibility/android/answer/6006983); [Change the language or voice of spoken text (Chromebook)](https://support.google.com/chromebook/answer/11221616)
- Samsung: [Use text to speech on your Galaxy phone or tablet](https://www.samsung.com/us/support/answer/ANS10003701/)
- Microsoft: [Download languages and voices for Immersive Reader, Read Mode, and Read Aloud](https://support.microsoft.com/en-us/topic/download-languages-and-voices-for-immersive-reader-read-mode-and-read-aloud-4c83a8d8-7486-42f7-8e46-2b0fdf753130); GeekRewind: [install text-to-speech voices in Windows 11](https://geekrewind.com/how-to-install-text-to-speech-voices-in-windows-11-speech-settings/)
