/**
 * "Listen voice" in Settings (/settings#listen-voice), for educators: which
 * of this device's voices Listen reads with, one choice per lessons'
 * language that has a voice here (English, and Indonesian where the device
 * has an Indonesian voice), and how to get a clearer voice.
 *
 * - Only voices that run on the device are offered, never one that needs
 *   the internet, and never a novelty voice (src/speech/voiceRanking.ts),
 *   best first. "Automatic (best on this device)" is the default.
 * - A choice is a device setting (settings.listenVoices, by language),
 *   saved through the page's useDeviceSettings(), even while looking
 *   around. It wins over the ranking in every lesson; where the voice has
 *   gone (another device, a voice removed), lessons use the best voice
 *   again without a word, and this page shows Automatic.
 * - "Play a sample" reads one short sentence in that language with that
 *   voice, at the device's Listen speed, only when tapped. Leaving the page
 *   stops it. Reading the voice list asks the browser for nothing.
 */
import { useEffect, useId, useRef, type ChangeEvent } from 'react';
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
import type { ListenVoiceChoice } from '../../storage';
import type { DeviceSettingsState } from './useDeviceSettings';

/** The section's address on the page (/settings#listen-voice), for links from elsewhere. */
const LISTEN_VOICE_PART: SettingsPart = 'listen-voice';

/** The select's value for "Automatic". */
const AUTOMATIC = '';

/** Where to get a clearer voice, by kind of device. */
const DEVICES = ['apple', 'android', 'windows', 'chromebook'] as const;

/** A voice's value in the select: what the browser calls it. */
function optionValue(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): string {
  return `${voice.voiceURI}\u0000${voice.name}`;
}

export function ListenVoiceSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t, contentLocale } = useI18n();
  const { settings, canSave, failed, save } = deviceSettings;
  const { voices, settled } = useDeviceVoices();
  const headingId = useId();
  /** True once a sample was read here, so leaving the page stops it (and nothing else). */
  const sampled = useRef(false);

  useEffect(
    () => () => {
      if (sampled.current) getSpeechSynthesis()?.cancel();
    },
    [],
  );

  const groups = listenLanguages().map((lang) => ({ lang, voices: listenVoices(voices, lang) }));
  const [english, ...others] = groups;
  const shown = others.filter((group) => group.voices.length > 0);
  // Lessons in Indonesian on this page, and no Indonesian voice: say so (in English, nothing to say).
  const lessonsLang = speechLangFor(contentLocale);
  const missingHere = contentLocale.content && others.some((group) => group.lang === lessonsLang && group.voices.length === 0);
  const rate = LISTEN_RATES[settings?.listeningSpeed ?? 'normal'];

  const choose = (lang: string, choice: ListenVoiceChoice | null) => void save(listenVoicePatch(settings, lang, choice));
  const sample = (voice: SpeechSynthesisVoice) => {
    const synth = getSpeechSynthesis();
    if (!synth) return;
    sampled.current = true;
    speakSample(synth, voice, rate);
  };

  return (
    <section id={LISTEN_VOICE_PART} className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2" tabIndex={-1}>
        {t('pages.settings.listenVoice.title')}
      </h2>
      <p className="tw-settings-text">{t('pages.settings.listenVoice.intro')}</p>

      {english && english.voices.length > 0 ? (
        <VoicePicker
          lang={english.lang}
          voices={english.voices}
          chosen={listenVoiceFor(settings, english.lang)}
          disabled={!canSave || settings === null}
          failed={failed === 'listenVoices'}
          onChoose={choose}
          onSample={sample}
        />
      ) : null}
      {shown.map((group) => (
        <VoicePicker
          key={group.lang}
          lang={group.lang}
          voices={group.voices}
          chosen={listenVoiceFor(settings, group.lang)}
          disabled={!canSave || settings === null}
          failed={failed === 'listenVoices'}
          onChoose={choose}
          onSample={sample}
        />
      ))}

      {/* Said only once the browser has had time to list its voices, so it never flashes up. */}
      {settled && english?.voices.length === 0 ? <p className="tw-settings-status">{t('pages.settings.listenVoice.noVoice')}</p> : null}
      {settled && missingHere ? <p className="tw-settings-status">{t('pages.settings.listenVoice.noVoiceIndonesian')}</p> : null}
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
  /** Its usable voices on this device, best first. */
  voices: readonly SpeechSynthesisVoice[];
  /** The saved choice, or null for Automatic. */
  chosen: ListenVoiceChoice | null;
  disabled: boolean;
  failed: boolean;
  onChoose: (lang: string, choice: ListenVoiceChoice | null) => void;
  onSample: (voice: SpeechSynthesisVoice) => void;
}

/** One language's voice: a list to choose from, what Automatic uses, and "Play a sample". */
function VoicePicker({ lang, voices, chosen, disabled, failed, onChoose, onSample }: VoicePickerProps) {
  const { t, tx } = useI18n();
  const labelId = useId();
  const selectId = useId();
  const helpId = useId();
  // A saved voice that isn't on this device (any more) shows as Automatic, which is what lessons use.
  const chosenVoice = chosen ? voices.find((voice) => isChosenVoice(voice, chosen)) : undefined;
  const best = voices[0]!;
  const reading = chosenVoice ?? best;
  const value = chosenVoice ? optionValue(chosenVoice) : AUTOMATIC;
  // Two voices with the same name (Apple lists some in several regions) get their language too.
  const names = voices.map((voice) => voice.name);
  const label = (voice: SpeechSynthesisVoice) =>
    names.indexOf(voice.name) !== names.lastIndexOf(voice.name)
      ? t('pages.settings.listenVoice.nameWithLang', { name: voice.name, lang: voice.lang })
      : voice.name;

  const change = (event: ChangeEvent<HTMLSelectElement>) => {
    const picked = voices.find((voice) => optionValue(voice) === event.currentTarget.value);
    onChoose(lang, picked ? voiceChoice(picked) : null);
  };

  return (
    <div className="tw-settings-field tw-listen-voice" role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={selectId} className="tw-settings-label">
        {t(`pages.settings.listenVoice.voiceFor.${listenVoiceKey(lang)}` as MessageKey)}
      </label>
      <select id={selectId} className="tw-settings-select" value={value} disabled={disabled} aria-describedby={helpId} onChange={change}>
        <option value={AUTOMATIC}>{t('pages.settings.listenVoice.automatic')}</option>
        {voices.map((voice) => (
          <option key={optionValue(voice)} value={optionValue(voice)} translate="no">
            {label(voice)}
          </option>
        ))}
      </select>
      <p id={helpId} className="tw-settings-help">
        {value === AUTOMATIC ? tx('pages.settings.listenVoice.automaticNow', { voice: <span translate="no">{best.name}</span> }) : null}
        {failed ? ` ${t('pages.settings.saveFailed')}` : ''}
      </p>
      <Button variant="secondary" icon="Volume2" onClick={() => onSample(reading)}>
        {t('pages.settings.listenVoice.sample')}
      </Button>
    </div>
  );
}
