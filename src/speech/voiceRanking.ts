/**
 * Which of the device's voices Listen reads with: the ranking table
 * (docs/notes/listen-voices.md has the sources and what each platform lists).
 *
 * A web page sees only five things about a voice: `name`, `voiceURI`,
 * `lang`, `localService` and `default`. Nothing says how good it sounds, so
 * this goes by what those reveal on the platforms the pilot uses:
 *
 * - iPad, iPhone and Safari on a Mac: `voiceURI` is Apple's identifier,
 *   which names the quality ("com.apple.voice.compact.en-GB.Daniel",
 *   "com.apple.voice.enhanced.…", "com.apple.voice.premium.…",
 *   "com.apple.eloquence.en-US.Eddy", "com.apple.speech.synthesis.voice.Albert").
 *   Every voice says `default: true`, so `default` tells nothing there. The
 *   first English voice in Safari's list can be an Eloquence or novelty
 *   voice, which is why Listen sounded robotic on iPads.
 * - Chrome on a Mac: the names Apple shows ("Daniel (Enhanced)",
 *   "Zoe (Premium)"), with the language added when two voices share a name
 *   ("Eddy (English (United States))"); `voiceURI` is the name.
 * - Chrome on Android, Samsung Internet: one voice per language and region
 *   of the phone's speech engine (Google's or Samsung's), named after it in
 *   the phone's language ("English United Kingdom"), `lang` with an
 *   underscore ("en_GB"). Which voice it really is, and how good, is chosen
 *   in Android's own text-to-speech settings, so the name can't tell.
 * - Chrome and Edge on Windows: Windows' own voices, "Microsoft Hazel -
 *   English (United Kingdom)". Edge's "… Online (Natural)" voices and
 *   Chrome's "Google …" voices use the internet (`localService` false) and
 *   are never used.
 * - ChromeOS: its own voices, Android's ("… en-gb-x-gba-local" or
 *   "…-network") and eSpeak's ("eSpeak English"), which sound very robotic.
 *
 * The order: quality first (QUALITY below; novelty voices are never used at
 * all), then the region (British English first, the course's spelling),
 * then the device's own default, which only breaks ties, then the browser's
 * order. An educator's choice in Settings wins over all of it
 * (pickListenVoice in ./voices.ts).
 */

/** How good a voice is likely to sound. A voice with no quality (null) is never used. */
export type VoiceQuality = 'high' | 'standard' | 'low';

/** The parts of a voice the ranking reads. */
export type VoiceInfo = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang' | 'localService' | 'default'>;

/**
 * Apple's novelty and joke voices (macOS, iPadOS and iOS ship them, and
 * Safari and Chrome list them): never used, never offered. By their names,
 * with the older names some of them still have ("Jester" was "Hysterical",
 * "Superstar" "Princess", "Wobble" "Deranged", "Organ" "Pipe Organ"), and
 * the old MacinTalk voices of the same kind (Fred, Junior, Kathy, Ralph).
 */
const NOVELTY_NAMES = new Set(
  [
    'Albert',
    'Bad News',
    'Bahh',
    'Bells',
    'Boing',
    'Bubbles',
    'Cellos',
    'Good News',
    'Jester',
    'Hysterical',
    'Organ',
    'Pipe Organ',
    'Superstar',
    'Princess',
    'Trinoids',
    'Whisper',
    'Wobble',
    'Deranged',
    'Zarvox',
    'Fred',
    'Junior',
    'Kathy',
    'Ralph',
  ].map((name) => name.toLowerCase()),
);

/** The same voices by Apple's identifier (Safari's voiceURI), whatever the name is translated to. */
const NOVELTY_URI =
  /^com\.apple\.speech\.synthesis\.voice\.(albert|badnews|bahh|bells|boing|bubbles|cellos|goodnews|hysterical|organ|princess|trinoids|whisper|deranged|zarvox|fred|junior|kathy|ralph)$/i;

/**
 * Apple's Eloquence voices (Eddy, Flo, Grandma, Grandpa, Jacques, Reed,
 * Rocko, Sandy, Shelley): made for screen-reader users who listen very
 * fast, and robotic at a normal speed. Used only when nothing better is there.
 */
const ELOQUENCE_NAMES = new Set(['eddy', 'flo', 'grandma', 'grandpa', 'jacques', 'reed', 'rocko', 'sandy', 'shelley']);

/** The quality table, checked in this order; a voice that matches neither is 'standard'. */
const QUALITY: ReadonlyArray<{ quality: VoiceQuality; test: (voice: VoiceInfo, base: string) => boolean }> = [
  {
    // A downloaded higher-quality voice: Apple's "(Enhanced)" and "(Premium)"
    // (in Safari, "com.apple.voice.enhanced…" and "…premium…"), Microsoft's
    // and Google's "Natural", other "Neural" voices, and "Siri" voices where
    // a browser lists them.
    quality: 'high',
    test: (voice) => /\b(premium|enhanced|natural|neural|siri)\b/i.test(voice.name) || /\b(premium|enhanced)\b/i.test(voice.voiceURI),
  },
  {
    // The most robotic: Apple's Eloquence voices, eSpeak's (ChromeOS, Linux)
    // and Apple's super-compact ones.
    quality: 'low',
    test: (voice, base) =>
      ELOQUENCE_NAMES.has(base) || /eloquence|espeak|super-?compact/i.test(voice.voiceURI) || /\bespeak\b/i.test(voice.name),
  },
];

/** "Eddy (English (United States))" → "eddy"; "Bad News" → "bad news". */
function baseName(name: string): string {
  return name
    .replace(/\s*\(.*$/, '')
    .trim()
    .toLowerCase();
}

/**
 * A voice whose name says it needs the internet, whatever `localService`
 * says: Edge's "… Online (Natural)" voices, and Google's Android voices
 * ending "-network" (ChromeOS can list those too). Never used.
 */
export function soundsOnline(voice: VoiceInfo): boolean {
  return /\bonline\b|-network\b/i.test(voice.name);
}

/** How good `voice` is likely to sound, or null for a novelty voice that is never used. */
export function voiceQuality(voice: VoiceInfo): VoiceQuality | null {
  const base = baseName(voice.name);
  if (NOVELTY_NAMES.has(base) || NOVELTY_URI.test(voice.voiceURI)) return null;
  for (const row of QUALITY) {
    if (row.test(voice, base)) return row.quality;
  }
  return 'standard';
}

/** "en_US" (Android) → "en-us". */
export function normalLang(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase();
}

/**
 * A language tag's language, in two letters: "en-GB" → "en". Older Android
 * and Java systems still say "in" for Indonesian, and Firefox on Android uses
 * three letters ("eng-US-f000").
 */
const LANGUAGE_ALIASES: Readonly<Record<string, string>> = { in: 'id', ind: 'id', eng: 'en' };

export function baseLang(tag: string): string {
  const base = normalLang(tag).split('-')[0] ?? '';
  return LANGUAGE_ALIASES[base] ?? base;
}

/** The language and region, "en-gb", from "en-GB", "en_GB", "en-GB-u-sd-gbsct" (Fiona, Scottish) or "eng-GB-f000". */
function regionOf(tag: string): string {
  const parts = normalLang(tag).split('-');
  const region = parts.slice(1).find((part) => /^[a-z]{2}$|^\d{3}$/.test(part));
  return region ? `${baseLang(tag)}-${region}` : baseLang(tag);
}

/**
 * Regions in order of preference, by language: English in British English
 * first (the course is written in British spelling), then other English;
 * any other language its own region first (id-ID). A region not listed comes after these.
 */
const PREFERRED_REGIONS: Readonly<Record<string, readonly string[]>> = {
  en: ['en-gb', 'en-us', 'en-au', 'en-ie', 'en-ca', 'en-nz', 'en-za', 'en-in'],
};

function regionRank(voice: VoiceInfo, speechLang: string): number {
  const base = baseLang(speechLang);
  const preferred = PREFERRED_REGIONS[base] ?? [regionOf(speechLang)];
  const index = preferred.indexOf(regionOf(voice.lang));
  return index === -1 ? preferred.length : index;
}

const QUALITY_ORDER: Record<VoiceQuality, number> = { high: 0, standard: 1, low: 2 };

/**
 * The voices Listen may use for `speechLang` ("en", "en-US", "id-ID"), best
 * first: on the device (`localService`), in that language, not a novelty
 * voice and not one whose name says it is online. The same voice listed
 * twice (name and region) appears once.
 */
export function rankListenVoices<V extends VoiceInfo>(voices: readonly V[], speechLang = 'en'): V[] {
  const base = baseLang(speechLang);
  const usable = voices
    .map((voice, index) => ({ voice, index, quality: voiceQuality(voice) }))
    .filter(
      (each): each is { voice: V; index: number; quality: VoiceQuality } =>
        each.voice.localService && baseLang(each.voice.lang) === base && each.quality !== null && !soundsOnline(each.voice),
    );
  // Safari says every voice is the default, which tells nothing: then it isn't used.
  const defaultMeansSomething = usable.some((each) => !each.voice.default);
  const ranked = usable
    .map((each) => ({
      ...each,
      region: regionRank(each.voice, speechLang),
      isDefault: defaultMeansSomething && each.voice.default ? 0 : 1,
    }))
    .sort(
      (a, b) =>
        QUALITY_ORDER[a.quality] - QUALITY_ORDER[b.quality] ||
        a.region - b.region ||
        a.isDefault - b.isDefault ||
        a.index - b.index,
    );
  const seen = new Set<string>();
  return ranked
    .filter(({ voice }) => {
      const key = `${voice.name}\u0000${regionOf(voice.lang)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ voice }) => voice);
}
