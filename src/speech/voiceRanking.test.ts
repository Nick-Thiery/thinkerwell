import { describe, expect, it } from 'vitest';
import { pickListenVoice } from './voices';
import { baseLang, rankListenVoices, soundsOnline, voiceQuality, type VoiceInfo } from './voiceRanking';

// What each platform's browser lists, as far as docs/notes/listen-voices.md
// could check it: names and voiceURIs in the shape each browser gives them.

function voice(
  name: string,
  lang: string,
  { uri = name, local = true, isDefault = false }: { uri?: string; local?: boolean; isDefault?: boolean } = {},
): SpeechSynthesisVoice {
  return { name, lang, voiceURI: uri, localService: local, default: isDefault };
}

const names = (voices: readonly VoiceInfo[]) => voices.map((each) => each.name);

/**
 * Safari on an iPad (WebKit): voiceURI is Apple's identifier, every voice
 * says it is the default, and novelty and Eloquence voices come early in the list.
 */
const ipadSafari = [
  voice('Albert', 'en-US', { uri: 'com.apple.speech.synthesis.voice.Albert', isDefault: true }),
  voice('Bad News', 'en-US', { uri: 'com.apple.speech.synthesis.voice.BadNews', isDefault: true }),
  voice('Eddy', 'en-GB', { uri: 'com.apple.eloquence.en-GB.Eddy', isDefault: true }),
  voice('Eddy', 'en-US', { uri: 'com.apple.eloquence.en-US.Eddy', isDefault: true }),
  voice('Grandma', 'en-US', { uri: 'com.apple.eloquence.en-US.Grandma', isDefault: true }),
  voice('Jester', 'en-US', { uri: 'com.apple.speech.synthesis.voice.Hysterical', isDefault: true }),
  voice('Karen', 'en-AU', { uri: 'com.apple.voice.compact.en-AU.Karen', isDefault: true }),
  voice('Samantha', 'en-US', { uri: 'com.apple.voice.compact.en-US.Samantha', isDefault: true }),
  voice('Daniel', 'en-GB', { uri: 'com.apple.voice.compact.en-GB.Daniel', isDefault: true }),
  voice('Arthur', 'en-GB', { uri: 'com.apple.ttsbundle.siri_male_en-GB_compact', isDefault: true }),
  voice('Fiona', 'en-GB-u-sd-gbsct', { uri: 'com.apple.voice.compact.en-GB-u-sd-gbsct.Fiona', isDefault: true }),
  voice('Zarvox', 'en-US', { uri: 'com.apple.speech.synthesis.voice.Zarvox', isDefault: true }),
  voice('Damayanti', 'id-ID', { uri: 'com.apple.voice.compact.id-ID.Damayanti', isDefault: true }),
];

/** Chrome on a Mac: Apple's names (with the language added to names used twice), voiceURI = name, the system voice first. */
const macChrome = [
  voice('Samantha', 'en-US', { isDefault: true }),
  voice('Albert', 'en-US'),
  voice('Bad News', 'en-US'),
  voice('Daniel', 'en-GB'),
  voice('Eddy (English (United Kingdom))', 'en-GB'),
  voice('Eddy (English (United States))', 'en-US'),
  voice('Fred', 'en-US'),
  voice('Good News', 'en-US'),
  voice('Kathy', 'en-US'),
  voice('Moira', 'en-IE'),
  voice('Rocko (English (United States))', 'en-US'),
  voice('Shelley (English (United Kingdom))', 'en-GB'),
  voice('Whisper', 'en-US'),
  voice('Zoe (Premium)', 'en-US'),
  voice('Google UK English Female', 'en-GB', { local: false }),
];

/** Chrome on Android with Google's engine: one voice per language and region, in the phone's language, `lang` with an underscore. */
const androidChrome = [
  voice('English United States', 'en_US'),
  voice('English India', 'en_IN'),
  voice('English United Kingdom', 'en_GB'),
  voice('English Australia', 'en_AU'),
  voice('Indonesian Indonesia', 'in_ID'),
];

/** Samsung Internet (and Chrome with Samsung's engine): the same, in lower case, on a tablet set to Indonesian. */
const samsungInternet = [voice('Inggris Amerika Serikat', 'en_us'), voice('Inggris Britania Raya', 'en_gb'), voice('Indonesia Indonesia', 'id_id')];

/** Chrome on Windows: Windows' own voices; Chrome's Google voices need the internet. */
const windowsChrome = [
  voice('Microsoft David - English (United States)', 'en-US', { isDefault: true }),
  voice('Microsoft Mark - English (United States)', 'en-US'),
  voice('Microsoft Zira - English (United States)', 'en-US'),
  voice('Microsoft Hazel - English (United Kingdom)', 'en-GB'),
  voice('Microsoft George - English (United Kingdom)', 'en-GB'),
  voice('Microsoft Andika - Indonesian (Indonesia)', 'id-ID'),
  voice('Google US English', 'en-US', { local: false }),
  voice('Google UK English Male', 'en-GB', { local: false }),
  voice('Google Bahasa Indonesia', 'id-ID', { local: false }),
];

/** Edge on Windows: the same local voices, and hundreds of "Online (Natural)" ones that need the internet. */
const windowsEdge = [
  voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US', { local: false, isDefault: true }),
  voice('Microsoft Sonia Online (Natural) - English (United Kingdom)', 'en-GB', { local: false }),
  voice('Microsoft Gadis Online (Natural) - Indonesian (Indonesia)', 'id-ID', { local: false }),
  voice('Microsoft Zira - English (United States)', 'en-US'),
  voice('Microsoft Susan - English (United Kingdom)', 'en-GB'),
];

/** ChromeOS: its own voices, Android's (local and network) and eSpeak's. */
const chromeOS = [
  voice('eSpeak English (Great Britain)', 'en-GB'),
  voice('Chrome OS US English 1', 'en-US', { isDefault: true }),
  voice('Chrome OS UK English 1', 'en-GB'),
  voice('Android Speech Recognition and Synthesis from Google en-gb-x-gba-network', 'en-GB'),
  voice('Android Speech Recognition and Synthesis from Google en-gb-x-gba-local', 'en-GB'),
  voice('eSpeak Indonesian', 'id'),
];

describe('the ranking table', () => {
  it('never uses a novelty voice, by its name or by Apple’s identifier', () => {
    for (const name of ['Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Fred', 'Good News', 'Jester', 'Junior', 'Kathy', 'Organ', 'Pipe Organ', 'Ralph', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox']) {
      expect(voiceQuality(voice(name, 'en-US')), name).toBeNull();
      // Chrome on a Mac adds the language to a name that two voices share.
      expect(voiceQuality(voice(`${name} (English (United States))`, 'en-US')), name).toBeNull();
    }
    // A Mac in another language translates the names; Safari's voiceURI stays Apple's identifier.
    expect(voiceQuality(voice('Kabar Buruk', 'en-US', { uri: 'com.apple.speech.synthesis.voice.BadNews' }))).toBeNull();
    // Only these names: a voice merely starting with one is fine.
    expect(voiceQuality(voice('Albertine', 'fr-FR'))).toBe('standard');
    expect(voiceQuality(voice('Alex', 'en-US', { uri: 'com.apple.speech.synthesis.voice.Alex' }))).toBe('standard');
  });

  it('puts downloaded higher-quality voices first: Premium, Enhanced, Natural, Neural, Siri', () => {
    expect(voiceQuality(voice('Zoe (Premium)', 'en-US'))).toBe('high');
    expect(voiceQuality(voice('Daniel (Enhanced)', 'en-GB'))).toBe('high');
    expect(voiceQuality(voice('Daniel', 'en-GB', { uri: 'com.apple.voice.enhanced.en-GB.Daniel' }))).toBe('high');
    expect(voiceQuality(voice('Ava', 'en-US', { uri: 'com.apple.voice.premium.en-US.Ava' }))).toBe('high');
    expect(voiceQuality(voice('Google UK English 2 (Natural)', 'en-GB'))).toBe('high');
    expect(voiceQuality(voice('Some Neural Voice', 'en-GB'))).toBe('high');
    expect(voiceQuality(voice('Siri Voice 2', 'en-GB'))).toBe('high');
    expect(voiceQuality(voice('Daniel', 'en-GB', { uri: 'com.apple.voice.compact.en-GB.Daniel' }))).toBe('standard');
  });

  it('puts Eloquence and eSpeak voices last', () => {
    for (const name of ['Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley']) {
      expect(voiceQuality(voice(name, 'en-US')), name).toBe('low');
      expect(voiceQuality(voice(`${name} (English (United Kingdom))`, 'en-GB')), name).toBe('low');
    }
    expect(voiceQuality(voice('Eddie', 'en-US', { uri: 'com.apple.eloquence.en-US.Eddy' }))).toBe('low');
    expect(voiceQuality(voice('eSpeak English', 'en'))).toBe('low');
    expect(voiceQuality(voice('Samantha', 'en-US', { uri: 'com.apple.voice.super-compact.en-US.Samantha' }))).toBe('low');
  });

  it('never uses a voice whose name says it is online, whatever localService says', () => {
    expect(soundsOnline(voice('Microsoft Libby Online (Natural) - English (United Kingdom)', 'en-GB'))).toBe(true);
    expect(soundsOnline(voice('Android Speech Recognition and Synthesis from Google en-gb-x-gba-network', 'en-GB'))).toBe(true);
    expect(soundsOnline(voice('Android Speech Recognition and Synthesis from Google en-gb-x-gba-local', 'en-GB'))).toBe(false);
    expect(rankListenVoices([voice('Microsoft Libby Online (Natural) - English (United Kingdom)', 'en-GB')])).toEqual([]);
  });

  it('reads language tags the way each browser writes them', () => {
    expect(baseLang('en-GB')).toBe('en');
    expect(baseLang('en_gb')).toBe('en');
    expect(baseLang('in_ID')).toBe('id');
    expect(baseLang('eng-US-f000')).toBe('en');
    expect(baseLang('ind-IDN-f00')).toBe('id');
    // Firefox on Android writes three letters.
    expect(names(rankListenVoices([voice('English (United States)', 'eng-US-f000'), voice('English (United Kingdom)', 'eng-GB-f000')]))).toEqual([
      'English (United Kingdom)',
      'English (United States)',
    ]);
  });

  it('lists the same voice once', () => {
    const twice = [voice('Daniel', 'en-GB', { uri: 'a' }), voice('Daniel', 'en-GB', { uri: 'b' }), voice('Daniel', 'en-US', { uri: 'c' })];
    expect(rankListenVoices(twice).map((each) => each.voiceURI)).toEqual(['a', 'c']);
  });
});

describe('the best voice on each platform', () => {
  it('iPad and iPhone (Safari): the British compact voice, never a novelty or Eloquence voice, and "default" means nothing', () => {
    const ranked = rankListenVoices(ipadSafari);
    expect(names(ranked)).toEqual(['Daniel', 'Arthur', 'Fiona', 'Samantha', 'Karen', 'Eddy', 'Eddy', 'Grandma']);
    expect(pickListenVoice(ipadSafari)?.name).toBe('Daniel');
    // With a downloaded Enhanced voice, that one, whatever its region; a British Premium one before it.
    const samanthaEnhanced = voice('Samantha (Enhanced)', 'en-US', { uri: 'com.apple.voice.enhanced.en-US.Samantha', isDefault: true });
    expect(pickListenVoice([...ipadSafari, samanthaEnhanced])).toBe(samanthaEnhanced);
    const jamie = voice('Jamie (Premium)', 'en-GB', { uri: 'com.apple.voice.premium.en-GB.Jamie', isDefault: true });
    expect(pickListenVoice([...ipadSafari, samanthaEnhanced, jamie])).toBe(jamie);
    expect(pickListenVoice(ipadSafari, 'id-ID')?.name).toBe('Damayanti');
  });

  it('Chrome on a Mac: a Premium voice first; without one, British English over the system default', () => {
    expect(names(rankListenVoices(macChrome))).toEqual([
      'Zoe (Premium)',
      'Daniel',
      'Samantha',
      'Moira',
      'Eddy (English (United Kingdom))',
      'Shelley (English (United Kingdom))',
      'Eddy (English (United States))',
      'Rocko (English (United States))',
    ]);
    expect(pickListenVoice(macChrome.filter((each) => each.name !== 'Zoe (Premium)'))?.name).toBe('Daniel');
  });

  it('Chrome on Android: the British English voice of the phone’s engine, and Indonesian by its old code', () => {
    expect(pickListenVoice(androidChrome)?.name).toBe('English United Kingdom');
    expect(names(rankListenVoices(androidChrome))).toEqual(['English United Kingdom', 'English United States', 'English Australia', 'English India']);
    expect(pickListenVoice(androidChrome, 'id-ID')?.name).toBe('Indonesian Indonesia');
  });

  it('Samsung Internet: the same, with names in the tablet’s language and tags in lower case', () => {
    expect(pickListenVoice(samsungInternet)?.name).toBe('Inggris Britania Raya');
    expect(pickListenVoice(samsungInternet, 'id-ID')?.name).toBe('Indonesia Indonesia');
  });

  it('Chrome on Windows: a British Windows voice, never Google’s online voices', () => {
    expect(names(rankListenVoices(windowsChrome))).toEqual([
      'Microsoft Hazel - English (United Kingdom)',
      'Microsoft George - English (United Kingdom)',
      'Microsoft David - English (United States)',
      'Microsoft Mark - English (United States)',
      'Microsoft Zira - English (United States)',
    ]);
    expect(pickListenVoice(windowsChrome, 'id-ID')?.name).toBe('Microsoft Andika - Indonesian (Indonesia)');
  });

  it('Edge on Windows: only the voices on the device, never the "Online (Natural)" ones', () => {
    expect(names(rankListenVoices(windowsEdge))).toEqual(['Microsoft Susan - English (United Kingdom)', 'Microsoft Zira - English (United States)']);
    expect(pickListenVoice(windowsEdge, 'id-ID')).toBeNull();
  });

  it('ChromeOS: its own or Android’s local voice before eSpeak, and never a "-network" voice', () => {
    expect(names(rankListenVoices(chromeOS))).toEqual([
      'Chrome OS UK English 1',
      'Android Speech Recognition and Synthesis from Google en-gb-x-gba-local',
      'Chrome OS US English 1',
      'eSpeak English (Great Britain)',
    ]);
    // eSpeak is used only when there is nothing else.
    expect(pickListenVoice(chromeOS, 'id-ID')?.name).toBe('eSpeak Indonesian');
  });
});
