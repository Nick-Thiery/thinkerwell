/**
 * "Lesson audio" in Settings (/settings#lesson-audio), for teachers: Listen's
 * recordings for every lesson in the device's lessons' languages, downloaded
 * at once on good Wi-Fi so Listen works without the internet
 * (src/audio/download.ts, docs/notes/recorded-audio.md).
 *
 * - The device's languages: the lessons' language of the device's own
 *   language and of every learner on the device (English, Bahasa Indonesia,
 *   or both), so a device used only in Indonesian doesn't download English.
 * - Says how big it is, how much is on the device, and the progress while
 *   downloading, which can be stopped (what has arrived stays).
 * - Offered only once the course itself is kept on the device (the service
 *   worker keeps the recordings), and not while Save data is on: it says so.
 * - Nothing downloads until it is tapped.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { audioTotal, canKeepAudio, downloadAudio, storedAudio, type DownloadResult } from '../../audio/download';
import { recordingLang, recordingsOf } from '../../audio/recordings';
import type { SettingsPart } from '../../app/lessonUrls';
import { Button } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { contentLocale, findLocale, readyLocales } from '../../i18n/locales';
import { isSaveDataOn, useServiceWorker } from '../../offline';
import { useLearnerSession } from '../../session';
import type { DeviceSettingsState } from './useDeviceSettings';

const LESSON_AUDIO_PART: SettingsPart = 'lesson-audio';

/** The lessons' language for an interface language ("id" → "id", "fa-AF" → "en"); English for one that isn't offered. */
function lessonsLangOf(code: string | null | undefined): string {
  const locale = findLocale(code ?? 'en', readyLocales()) ?? findLocale('en', readyLocales())!;
  return recordingLang(contentLocale(locale).code);
}

const RESULT_TEXT: Record<Exclude<DownloadResult, 'done'>, MessageKey> = {
  stopped: 'pages.settings.lessonAudio.stopped',
  failed: 'pages.settings.lessonAudio.failed',
};

export function LessonAudioSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t, formatList, formatNumber } = useI18n();
  const { settings } = deviceSettings;
  const { learners, deviceLanguage } = useLearnerSession();
  const { offline } = useServiceWorker();
  const headingId = useId();
  const progressId = useId();

  // The device's lessons' languages that have recordings, English first.
  const langs = useMemo(() => {
    const wanted = new Set([deviceLanguage, ...learners.map((learner) => learner.language ?? deviceLanguage)].map(lessonsLangOf));
    return ['en', ...[...wanted].filter((lang) => lang !== 'en').sort()].filter((lang) => wanted.has(lang) && recordingsOf(lang));
  }, [learners, deviceLanguage]);
  const langsKey = langs.join(' ');
  const total = audioTotal(langs);

  const [stored, setStored] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const stopper = useRef<AbortController | null>(null);

  useEffect(() => {
    let current = true;
    void storedAudio(langsKey ? langsKey.split(' ') : []).then((bytes) => {
      if (current) setStored(bytes);
    });
    return () => {
      current = false;
    };
  }, [langsKey, result]);

  // Leaving the page stops a download (what has arrived stays).
  useEffect(() => () => stopper.current?.abort(), []);

  if (langs.length === 0 || total === 0) return null;

  const size = (bytes: number) =>
    formatNumber(bytes / 1_000_000, { style: 'unit', unit: 'megabyte', unitDisplay: 'short', maximumFractionDigits: bytes < 10_000_000 ? 1 : 0 });
  const saveData = isSaveDataOn(settings?.saveData ?? null);
  const supported = canKeepAudio() && offline !== 'unsupported';
  const ready = offline === 'ready';
  const downloading = progress !== null;
  const all = stored !== null && stored >= total;

  const start = () => {
    const controller = new AbortController();
    stopper.current = controller;
    setResult(null);
    setProgress(stored ?? 0);
    void downloadAudio(langs, { signal: controller.signal, onProgress: ({ done }) => setProgress(done) }).then((outcome) => {
      if (stopper.current === controller) stopper.current = null;
      setProgress(null);
      setResult(outcome);
    });
  };
  const stop = () => stopper.current?.abort();

  const names = formatList(langs.map((lang) => t(`pages.settings.lessonAudio.lang.${lang}` as MessageKey)));

  return (
    <section id={LESSON_AUDIO_PART} className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2" tabIndex={-1}>
        {t('pages.settings.lessonAudio.title')}
      </h2>
      <p className="tw-settings-text">{t('pages.settings.lessonAudio.intro')}</p>
      <p className="tw-settings-text">{t('pages.settings.lessonAudio.forLanguages', { languages: names, size: size(total) })}</p>

      {!supported ? (
        <p className="tw-settings-status">{t('pages.settings.lessonAudio.unsupported')}</p>
      ) : (
        <div className="tw-settings-field tw-lesson-audio">
          <p className="tw-settings-status" role="status">
            {downloading
              ? t('pages.settings.lessonAudio.progress', { done: size(progress), total: size(total) })
              : stored === null
                ? ''
                : all
                  ? t('pages.settings.lessonAudio.storedAll')
                  : stored === 0
                    ? t('pages.settings.lessonAudio.storedNone')
                    : t('pages.settings.lessonAudio.stored', { stored: size(stored), total: size(total) })}
          </p>
          {downloading ? (
            <progress id={progressId} className="tw-lesson-audio-progress" max={total} value={progress} aria-label={t('pages.settings.lessonAudio.progressLabel')} />
          ) : null}
          {downloading ? (
            <Button variant="secondary" icon="Square" onClick={stop}>
              {t('pages.settings.lessonAudio.stop')}
            </Button>
          ) : all ? null : (
            <Button variant="secondary" icon="Download" disabled={!ready || saveData} onClick={start}>
              {t('pages.settings.lessonAudio.download')}
            </Button>
          )}
          {!downloading && !all && saveData ? <p className="tw-settings-help">{t('pages.settings.lessonAudio.saveData')}</p> : null}
          {!downloading && !all && !saveData && !ready ? <p className="tw-settings-help">{t('pages.settings.lessonAudio.notReady')}</p> : null}
          {!downloading && result && result !== 'done' && !all ? <p className="tw-settings-help">{t(RESULT_TEXT[result])}</p> : null}
        </div>
      )}
    </section>
  );
}
