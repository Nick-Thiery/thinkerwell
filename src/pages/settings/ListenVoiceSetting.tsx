/**
 * "Listen voice" in Settings (/settings#listen-voice), for educators: which
 * of this device's voices Listen reads with, one choice per lessons'
 * language that has a voice here (English, and Indonesian or Malay where the
 * device has a voice for it), and how to get a clearer voice.
 *
 * - Only voices that run on the device are offered, never one that needs
 *   the internet, and never a novelty voice (src/speech/voiceRanking.ts),
 *   best first. "Automatic (best on this device)" is the default.
 * - A choice is a device setting (settings.listenVoices, by language),
 *   saved through the page's useDeviceSettings(), even while looking
 *   around. It wins over the ranking in every lesson; where the voice has
 *   gone (another device, a voice removed), lessons use the best voice
 *   again without a word, and this page shows Automatic.
 * - Where a language has recordings (src/audio/, docs/notes/recorded-audio.md),
 *   Listen plays them, and the device's voice reads only what has no
 *   recording here and now: the list is for that voice. "Play a sample"
 *   plays the recorded sample sentence (or, offline before it was ever
 *   downloaded, reads it with the device's voice), and "Hear this voice"
 *   reads it with the voice chosen in the list. Without recordings,
 *   "Play a sample" reads it with that voice, as before.
 * - Samples play at the device's Listen speed, only when tapped. Leaving the
 *   page stops them. Reading the voice list asks the browser for nothing.
 */
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { recordingsOf } from '../../audio/recordings';
import { SamplePlayer } from '../../audio/sample';
import type { SettingsPart } from '../../app/lessonUrls';
import { Button } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import {
  getSpeechSynthesis,
  isChosenVoice,
  LISTEN_RATES,
  listenLanguages,
  listenVoiceFor,
  listenVoiceKey,
  listenVoicePatch,
  listenVoices,
  speakSample,
  speechLangFor,
  useDeviceVoices,
  voiceChoice,
} from '../../speech';
import { baseLang } from '../../speech/voiceRanking';
import type { ListenVoiceChoice } from '../../storage';
import type { DeviceSettingsState } from './useDeviceSettings';

/** The section's address on the page (/settings#listen-voice), for links from elsewhere. */
const LISTEN_VOICE_PART: SettingsPart = 'listen-voice';

/** The select's value for "Automatic". */
const AUTOMATIC = '';

/** Where to get a clearer voice, by kind of device. */
const DEVICES = ['apple', 'android', 'windows', 'chromebook'] as const;

/** The recorded voice of each language, by its own name (not translated). */
const RECORDED_VOICE: Readonly<Record<string, string>> = { en: 'Kokoro (Heart)', id: 'MMS-TTS (Meta)' };

/** A voice's value in the select: what the browser calls it. */
function optionValue(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): string {
  return `${voice.voiceURI}\u0000${voice.name}`;
}

/** What to say when the lessons' language has no voice on this device, by language: whole sentences, never joined in code. */
const NO_VOICE: Readonly<Record<string, { recorded: MessageKey; none: MessageKey }>> = {
  id: { recorded: 'pages.settings.listenVoice.noVoiceIndonesianRecorded', none: 'pages.settings.listenVoice.noVoiceIndonesian' },
  ms: { recorded: 'pages.settings.listenVoice.noVoiceMalayRecorded', none: 'pages.settings.listenVoice.noVoiceMalay' },
};

export function ListenVoiceSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t, contentLocale } = useI18n();
  const { settings, canSave, failed, save } = deviceSettings;
  const { voices, settled } = useDeviceVoices();
  const headingId = useId();
  /** True once a sample was read here, so leaving the page stops it (and nothing else). */
  const sampled = useRef(false);
  const [samples] = useState(() => new SamplePlayer());
  /** The language whose sample couldn't be played (no recording here, no voice). */
  const [noSample, setNoSample] = useState<string | null>(null);

  useEffect(
    () => () => {
      samples.stop();
      if (sampled.current) getSpeechSynthesis()?.cancel();
    },
    [samples],
  );

  const groups = listenLanguages().map((lang) => ({ lang, voices: listenVoices(voices, lang), recorded: !!recordingsOf(lang) }));
  const [english, ...others] = groups;
  const shown = others.filter((group) => group.voices.length > 0 || group.recorded);
  // Lessons in Indonesian or Malay on this page, and no voice for them: say so (in English, nothing to say).
  const lessonsLang = speechLangFor(contentLocale);
  const missingHere = contentLocale.content && others.some((group) => group.lang === lessonsLang && group.voices.length === 0);
  const rate = LISTEN_RATES[settings?.listeningSpeed ?? 'normal'];

  const choose = (lang: string, choice: ListenVoiceChoice | null) => void save(listenVoicePatch(settings, lang, choice));
  const sample = (voice: SpeechSynthesisVoice) => {
    const synth = getSpeechSynthesis();
    if (!synth) return;
    samples.stop();
    sampled.current = true;
    speakSample(synth, voice, rate);
  };
  // The recording, or the device's voice when it can't be had here and now.
  const sampleRecording = (lang: string, voice: SpeechSynthesisVoice | undefined) => {
    setNoSample(null);
    if (sampled.current) getSpeechSynthesis()?.cancel();
    void samples.play(lang, rate).then((played) => {
      if (played) return;
      if (voice) sample(voice);
      else setNoSample(lang);
    });
  };

  return (
    <section id={LISTEN_VOICE_PART} className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2" tabIndex={-1}>
        {t('pages.settings.listenVoice.title')}
      </h2>
      <p className="tw-settings-text">
        {t(groups.some((group) => group.recorded) ? 'pages.settings.listenVoice.introRecorded' : 'pages.settings.listenVoice.intro')}
      </p>

      {[...(english && (english.voices.length > 0 || english.recorded) ? [english] : []), ...shown].map((group) => (
        <VoicePicker
          key={group.lang}
          lang={group.lang}
          voices={group.voices}
          recorded={group.recorded}
          chosen={listenVoiceFor(settings, group.lang)}
          disabled={!canSave || settings === null}
          failed={failed === 'listenVoices'}
          noSample={noSample === group.lang}
          onChoose={choose}
          onSample={sample}
          onSampleRecording={sampleRecording}
        />
      ))}

      {/* Said only once the browser has had time to list its voices, so it never flashes up. */}
      {settled && english?.voices.length === 0 ? (
        <p className="tw-settings-status">
          {t(english.recorded ? 'pages.settings.listenVoice.noVoiceRecorded' : 'pages.settings.listenVoice.noVoice')}
        </p>
      ) : null}
      {settled && missingHere ? (
        <p className="tw-settings-status">
          {t(
            (NO_VOICE[baseLang(lessonsLang)] ?? NO_VOICE.id!)[
              others.some((group) => group.lang === lessonsLang && group.recorded) ? 'recorded' : 'none'
            ],
          )}
        </p>
      ) : null}
      {!canSave ? <p className="tw-settings-help tw-listen-voice-alone">{t('pages.settings.noStorage')}</p> : null}

      <div className="tw-listen-voice-better">
        <h3 className="tw-listen-voice-h3">{t('pages.settings.listenVoice.better.title')}</h3>
        <p className="tw-settings-help tw-listen-voice-alone">{t('pages.settings.listenVoice.better.intro')}</p>
        <ul className="tw-listen-voice-devices" role="list">
          {DEVICES.map((device) => (
            <li key={device}>
              <strong>{t(`pages.settings.listenVoice.better.${device}.name`)}</strong>
              <span>{t(`pages.settings.listenVoice.better.${device}.steps`)}</span>
              {device === 'apple' ? <span>{t('pages.settings.listenVoice.better.apple.note')}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface VoicePickerProps {
  /** The lessons' language, as a speech tag ("en", "id-ID"). */
  lang: string;
  /** Its usable voices on this device, best first (none, for a language with recordings only). */
  voices: readonly SpeechSynthesisVoice[];
  /** Listen plays recordings in this language; the device's voice is for what has none. */
  recorded: boolean;
  /** The saved choice, or null for Automatic. */
  chosen: ListenVoiceChoice | null;
  disabled: boolean;
  failed: boolean;
  /** The last sample couldn't be played (no recording here, no voice). */
  noSample: boolean;
  onChoose: (lang: string, choice: ListenVoiceChoice | null) => void;
  onSample: (voice: SpeechSynthesisVoice) => void;
  onSampleRecording: (lang: string, voice: SpeechSynthesisVoice | undefined) => void;
}

/**
 * One language's voice: the recorded voice and its sample, where the
 * language has recordings; then a list of the device's voices to choose
 * from, what Automatic uses, and a sample of it.
 */
function VoicePicker({ lang, voices, recorded, chosen, disabled, failed, noSample, onChoose, onSample, onSampleRecording }: VoicePickerProps) {
  const { t, tx } = useI18n();
  const labelId = useId();
  const selectId = useId();
  const helpId = useId();
  const deviceLabelId = useId();
  // A saved voice that isn't on this device (any more) shows as Automatic, which is what lessons use.
  const chosenVoice = chosen ? voices.find((voice) => isChosenVoice(voice, chosen)) : undefined;
  const best = voices[0];
  const reading = chosenVoice ?? best;
  const value = chosenVoice ? optionValue(chosenVoice) : AUTOMATIC;
  const label = t(`pages.settings.listenVoice.voiceFor.${listenVoiceKey(lang)}` as MessageKey);
  // Two voices with the same name (Apple lists some in several regions) get their language too.
  const names = voices.map((voice) => voice.name);
  const nameOf = (voice: SpeechSynthesisVoice) =>
    names.indexOf(voice.name) !== names.lastIndexOf(voice.name)
      ? t('pages.settings.listenVoice.nameWithLang', { name: voice.name, lang: voice.lang })
      : voice.name;

  const change = (event: ChangeEvent<HTMLSelectElement>) => {
    const picked = voices.find((voice) => optionValue(voice) === event.currentTarget.value);
    onChoose(lang, picked ? voiceChoice(picked) : null);
  };

  const select = (
    <>
      <select
        id={selectId}
        className="tw-settings-select"
        value={value}
        disabled={disabled}
        // With recordings, the list is named for its language too ("Voice for English lessons Device voice, …").
        aria-labelledby={recorded ? `${labelId} ${deviceLabelId}` : undefined}
        aria-describedby={helpId}
        onChange={change}
      >
        <option value={AUTOMATIC}>{t('pages.settings.listenVoice.automatic')}</option>
        {voices.map((voice) => (
          <option key={optionValue(voice)} value={optionValue(voice)} translate="no">
            {nameOf(voice)}
          </option>
        ))}
      </select>
      <p id={helpId} className="tw-settings-help">
        {value === AUTOMATIC && best ? tx('pages.settings.listenVoice.automaticNow', { voice: <span translate="no">{best.name}</span> }) : null}
        {failed ? ` ${t('pages.settings.saveFailed')}` : ''}
      </p>
    </>
  );

  if (!recorded) {
    return (
      <div className="tw-settings-field tw-listen-voice" role="group" aria-labelledby={labelId}>
        <label id={labelId} htmlFor={selectId} className="tw-settings-label">
          {label}
        </label>
        {select}
        {reading ? (
          <Button variant="secondary" icon="Volume2" onClick={() => onSample(reading)}>
            {t('pages.settings.listenVoice.sample')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="tw-settings-field tw-listen-voice" role="group" aria-labelledby={labelId}>
      <p id={labelId} className="tw-settings-label">
        {label}
      </p>
      <p className="tw-settings-help">
        {tx('pages.settings.listenVoice.recordedWith', { voice: <span translate="no">{RECORDED_VOICE[listenVoiceKey(lang)] ?? ''}</span> })}
      </p>
      <Button variant="secondary" icon="Volume2" onClick={() => onSampleRecording(lang, reading)}>
        {t('pages.settings.listenVoice.sample')}
      </Button>
      {noSample ? (
        <p className="tw-settings-status" role="status">
          {t('pages.settings.listenVoice.sampleUnavailable')}
        </p>
      ) : null}
      {voices.length > 0 ? (
        <>
          <label id={deviceLabelId} htmlFor={selectId} className="tw-settings-label tw-listen-voice-device">
            {t('pages.settings.listenVoice.deviceVoice')}
          </label>
          {select}
          {reading ? (
            <Button variant="ghost" icon="Volume2" onClick={() => onSample(reading)}>
              {t('pages.settings.listenVoice.deviceSample')}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
