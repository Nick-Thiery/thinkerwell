/**
 * "Set up this device" (/educators/setup): a checklist a staff member works
 * through once on each laptop or tablet, with the state of each step on this
 * device wherever the app can know it. Linked from the Educators page.
 *
 * The same page on screen and on paper, like the teacher guides: printed, it
 * is a one-page checklist with a box to tick for each step and the home
 * screen steps for every kind of device, without the states or buttons.
 * On screen, the video "Set up a device" (./../siteVideo/, the checklist in
 * about a minute) sits between the introduction and the steps.
 *
 * Opening it asks the browser nothing that could prompt or fail
 * (./setup/deviceChecks.ts). "Keep work safe" asks for persistent storage
 * only when tapped, and the speech step shows the saved result of Settings'
 * "Check this device": this page never touches SpeechRecognition. The
 * optional Listen voice step reads the device's voice list, which asks
 * nothing, and links to Settings' "Listen voice". The offline step points
 * to Settings' "Lesson audio", where Listen's recordings are downloaded
 * for use without the internet (they aren't in the offline copy).
 */
import { useId, useState, type ReactNode } from 'react';
import { recordedLanguages } from '../../audio/recordings';
import { classPath, educatorsPath, settingsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Badge, Button, Icon, type BadgeProps, type IconName } from '../../components/ds';
import { useContent } from '../../content/useContent';
import { useI18n, type MessageKey } from '../../i18n';
import { useServiceWorker } from '../../offline';
import { useLearnerSession } from '../../session';
import { hasSpeechRecognition, isChosenVoice, listenVoiceFor, speechCheckFor, speechLangFor, useListenVoiceState } from '../../speech';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import { OFFLINE_STATUS } from '../settings/offlineStatus';
import { useDeviceSettings } from '../settings/useDeviceSettings';
import { SiteVideo } from '../siteVideo/SiteVideo';
import {
  DEVICE_PLATFORMS,
  learnersStepState,
  offlineStepState,
  speechFinding,
  speechStepState,
  storageStepState,
  thisPlatform,
  useInstalledApp,
  usePersistence,
  voiceStepState,
  type DevicePlatform,
  type Persistence,
  type SpeechFinding,
  type StepState,
} from './setup/deviceChecks';
import './SetupPage.css';
import { useAddLearner } from './useAddLearner';

const STATE_BADGE: Record<StepState, { tone: BadgeProps['tone']; icon?: IconName; key: MessageKey }> = {
  done: { tone: 'correct', icon: 'Check', key: 'pages.setup.state.done' },
  todo: { tone: 'ink', key: 'pages.setup.state.todo' },
  'in-progress': { tone: 'outline', icon: 'Clock', key: 'pages.setup.state.inProgress' },
  checking: { tone: 'outline', icon: 'Clock', key: 'pages.setup.state.checking' },
  optional: { tone: 'outline', icon: 'Info', key: 'pages.setup.state.optional' },
  'not-here': { tone: 'outline', icon: 'Info', key: 'pages.setup.state.notHere' },
  'not-needed': { tone: 'outline', icon: 'Info', key: 'pages.setup.state.notNeeded' },
};

const PERSISTENCE_TEXT: Record<Persistence, MessageKey> = {
  unknown: 'pages.setup.storage.checking',
  asking: 'pages.setup.storage.asking',
  persisted: 'pages.setup.storage.done',
  'not-persisted': 'pages.setup.storage.todo',
  refused: 'pages.setup.storage.refused',
  unsupported: 'pages.setup.storage.unsupported',
};

const SPEECH_TEXT: Record<SpeechFinding, MessageKey> = {
  none: 'pages.setup.speech.none',
  'not-checked': 'pages.setup.speech.notChecked',
  'on-device': 'pages.setup.speech.onDevice',
  download: 'pages.setup.speech.download',
  'not-on-device': 'pages.setup.speech.notOnDevice',
};

const PLATFORM_STEPS = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;

/** Safari (iPad and iPhone) deletes a site's saved work after this many days without a visit, unless it is on the home screen. */
const SAFARI_DELETES_AFTER_DAYS = 7;

export function SetupPage() {
  const { t, tx, formatDate, contentLocale } = useI18n();
  const content = useContent();
  const title = t('pages.setup.title');
  usePageTitle(title);
  const session = useLearnerSession();
  const { settings } = useDeviceSettings();
  const { offline } = useServiceWorker();
  const { persistence, ask } = usePersistence();
  const installed = useInstalledApp();
  const [platform] = useState<DevicePlatform>(thisPlatform);
  const addLearner = useAddLearner();

  // Listen's recordings download on their own, apart from the offline copy (Settings, "Lesson audio").
  const recorded = recordedLanguages().length > 0;
  // Each step's state and what to say about it on this device.
  const homeState: StepState = installed ? 'done' : 'todo';
  const offlineState = offlineStepState(offline);
  const storageState = storageStepState(persistence, session.storageAvailable);
  const learnersReady = session.status === 'ready';
  const learnersState: StepState = learnersReady
    ? learnersStepState(session.learners.length, session.storageAvailable)
    : 'checking';
  // Listen and Say it in the lessons' language on this page (English, or id-ID for Indonesian lessons).
  const lessonsLang = speechLangFor(contentLocale);
  const chosenVoice = listenVoiceFor(settings, lessonsLang);
  const { voice, settled: voicesListed } = useListenVoiceState(lessonsLang, chosenVoice);
  const voiceChosen = !!voice && !!chosenVoice && isChosenVoice(voice, chosenVoice);
  const voiceState = voiceStepState({ voice, chosen: voiceChosen, settled: voicesListed });
  const check = settings ? speechCheckFor(settings, lessonsLang) : null;
  const finding = speechFinding(check, hasSpeechRecognition());
  const speechState: StepState = settings === null && finding !== 'none' ? 'checking' : speechStepState(finding);

  const checkedAt = check ? new Date(check.checkedAt) : null;
  const checkedOn =
    finding !== 'none' && finding !== 'not-checked' && checkedAt && !Number.isNaN(checkedAt.getTime())
      ? `${t('pages.settings.sayIt.checkedOn', {
          date: formatDate(checkedAt, { day: 'numeric', month: 'long', year: 'numeric' }),
        })} `
      : '';

  return (
    <div className="tw-print-page tw-setup-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={t('pages.teacherTools.back')} />

      <article className="tw-print-sheet tw-setup" aria-labelledby="setup-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <h1 id="setup-title" className="tw-print-title" tabIndex={-1}>
            {title}
          </h1>
          <p className="tw-no-print">{t('pages.setup.intro')}</p>
          <p className="tw-print-only">{t('pages.setup.paperIntro')}</p>
          <p className="tw-print-only tw-setup-fill">
            <span>{t('pages.setup.device')}</span>
            <span className="tw-setup-blank" />
            <span>{t('pages.setup.date')}</span>
            <span className="tw-setup-blank" />
          </p>
        </header>

        {/* "Set up a device": the checklist shown in about a minute (src/pages/siteVideo/). On screen only; the paper checklist has no use for it. */}
        <div className="tw-no-print tw-setup-video">
          <SiteVideo video="setup" watchVariant="secondary" headingLevel={2} />
        </div>

        <ol className="tw-setup-steps" role="list" aria-label={t('pages.setup.stepsLabel')}>
          <SetupStep
            number={1}
            title={t('pages.setup.homeScreen.title')}
            why={t('pages.setup.homeScreen.why', { count: SAFARI_DELETES_AFTER_DAYS })}
            note={t('pages.setup.homeScreen.first')}
            state={homeState}
            status={t(installed ? 'pages.setup.homeScreen.installed' : 'pages.setup.homeScreen.inBrowser')}
          >
            <HomeScreenSteps platform={platform} />
          </SetupStep>

          <SetupStep
            number={2}
            title={t('pages.setup.offline.title')}
            why={t('pages.setup.offline.why')}
            how={t('pages.setup.offline.how')}
            state={offlineState}
            status={t(OFFLINE_STATUS[offline].key, { count: content.getLessons().length })}
            actions={
              recorded ? (
                <Button variant="secondary" icon="Download" href={settingsPath('lesson-audio')}>
                  {t('pages.setup.offline.audioOpen')}
                </Button>
              ) : null
            }
          >
            {/* Listen's recordings aren't in the offline copy: point to Settings' "Lesson audio". On screen
                only: on paper the checklist must still fit one A4 page in Indonesian. */}
            {recorded ? <p className="tw-no-print">{t('pages.setup.offline.audio')}</p> : null}
          </SetupStep>

          <SetupStep
            number={3}
            title={t('pages.setup.storage.title')}
            why={t('pages.setup.storage.why')}
            how={t('pages.setup.storage.how')}
            state={storageState}
            status={t(session.storageAvailable ? PERSISTENCE_TEXT[persistence] : 'pages.setup.storage.noStorage')}
            actions={
              session.storageAvailable && (persistence === 'not-persisted' || persistence === 'refused') ? (
                <Button variant="secondary" icon="Lock" onClick={() => void ask()}>
                  {t('pages.setup.storage.button')}
                </Button>
              ) : null
            }
          />

          <SetupStep
            number={4}
            title={t('pages.setup.learners.title')}
            why={t('pages.setup.learners.why')}
            how={t('pages.setup.learners.how')}
            state={learnersState}
            status={
              !learnersReady
                ? ''
                : !session.storageAvailable
                  ? t('pages.setup.storage.noStorage')
                  : session.learners.length === 0
                    ? t('pages.setup.learners.none')
                    : t('pages.setup.learners.count', { count: session.learners.length })
            }
            actions={
              learnersReady && session.storageAvailable ? (
                <>
                  <Button variant="secondary" icon="Plus" onClick={addLearner}>
                    {t('pages.setup.learners.add')}
                  </Button>
                  {session.learners.length > 0 ? (
                    <Button variant="ghost" icon="Users" href={classPath()}>
                      {t('pages.setup.learners.seeClass')}
                    </Button>
                  ) : null}
                </>
              ) : null
            }
          >
            <p>{t('pages.setup.learners.codes')}</p>
          </SetupStep>

          <SetupStep
            number={5}
            title={t('pages.setup.voice.title')}
            why={t(recorded ? 'pages.setup.voice.whyRecorded' : 'pages.setup.voice.why')}
            whyOnPaper={false}
            how={t('pages.setup.voice.how')}
            state={voiceState}
            status={
              voiceState === 'checking'
                ? ''
                : voice
                  ? tx(voiceChosen ? 'pages.setup.voice.chosen' : 'pages.setup.voice.automatic', {
                      voice: <span translate="no">{voice.name}</span>,
                    })
                  : t(recorded ? 'pages.setup.voice.noneRecorded' : 'pages.setup.voice.none')
            }
            actions={
              <Button variant="secondary" icon="Settings" href={settingsPath('listen-voice')}>
                {t('pages.setup.voice.open')}
              </Button>
            }
          />

          <SetupStep
            number={6}
            title={t('pages.setup.speech.title')}
            why={t('pages.setup.speech.why')}
            note={t('pages.setup.speech.last')}
            how={t('pages.setup.speech.how')}
            state={speechState}
            status={speechState === 'checking' ? '' : `${checkedOn}${t(SPEECH_TEXT[finding])}`}
            actions={
              finding !== 'none' ? (
                <Button variant="secondary" icon="Settings" href={settingsPath('say-it')}>
                  {t('pages.setup.speech.open')}
                </Button>
              ) : null
            }
          />
        </ol>

        <section className="tw-setup-later" aria-labelledby="setup-later-title">
          <h2 id="setup-later-title" className="tw-setup-title">
            <Icon name="Download" size={22} />
            <span>{t('pages.setup.later.title')}</span>
          </h2>
          <p>{t('pages.setup.later.body')}</p>
          <div className="tw-setup-actions tw-no-print">
            <Button variant="secondary" icon="Settings" href={settingsPath('move-work')}>
              {t('pages.setup.later.open')}
            </Button>
          </div>
        </section>
      </article>
    </div>
  );
}

interface SetupStepProps {
  number: number;
  title: string;
  why: string;
  /** False to leave the reason off paper, where the checklist must fit one A4 page (the optional Listen voice step). */
  whyOnPaper?: boolean;
  /** "Do this first" or "Do this last", and why. */
  note?: string;
  /** What to do, in words that work on screen and on paper. */
  how?: string;
  state: StepState;
  /** What the app knows about this step on this device (never printed). */
  status: ReactNode;
  /** Buttons for the step (never printed). */
  actions?: ReactNode;
  children?: ReactNode;
}

function SetupStep({ number, title, why, whyOnPaper = true, note, how, state, status, actions, children }: SetupStepProps) {
  const { t, formatNumber } = useI18n();
  const badge = STATE_BADGE[state];
  return (
    <li className={`tw-setup-step tw-setup-step-${state}`}>
      <h2 className="tw-setup-title">
        {/* On paper, a box to tick. */}
        <span className="tw-setup-box" aria-hidden="true" />
        <span className="tw-setup-number" aria-hidden="true">
          {formatNumber(number)}
        </span>
        <span>{title}</span>
      </h2>
      <p className={whyOnPaper ? undefined : 'tw-no-print'}>{why}</p>
      {note ? (
        <p className="tw-setup-note">
          <Icon name="Info" size={20} />
          <span>{note}</span>
        </p>
      ) : null}
      {how ? <p>{how}</p> : null}
      {children}
      <p className="tw-setup-status tw-no-print" role="status">
        <Badge tone={badge.tone} icon={badge.icon}>
          {t(badge.key)}
        </Badge>
        {status ? <span>{status}</span> : null}
      </p>
      {actions ? <div className="tw-setup-actions tw-no-print">{actions}</div> : null}
    </li>
  );
}

/**
 * How to add Thinkerwell to the home screen. On screen: the steps for this
 * kind of device, with the others behind a disclosure. On paper: all three,
 * side by side, since one printout serves every device.
 */
function HomeScreenSteps({ platform }: { platform: DevicePlatform }) {
  const { t } = useI18n();
  const others = DEVICE_PLATFORMS.filter((each) => each !== platform);
  return (
    <>
      <div className="tw-setup-platforms tw-no-print">
        <PlatformSteps platform={platform} heading={t('pages.setup.homeScreen.thisDevice', { device: t(`pages.setup.homeScreen.${platform}.name`) })} />
        <details className="tw-setup-more">
          <summary>
            <span>{t('pages.setup.homeScreen.otherDevices')}</span>
            <Icon name="ChevronDown" size={20} className="tw-setup-more-chevron" />
          </summary>
          <div className="tw-setup-more-body">
            {others.map((each) => (
              <PlatformSteps key={each} platform={each} heading={t(`pages.setup.homeScreen.${each}.name`)} />
            ))}
          </div>
        </details>
      </div>
      <div className="tw-setup-platforms-paper tw-print-only">
        {DEVICE_PLATFORMS.map((each) => (
          <PlatformSteps key={each} platform={each} heading={t(`pages.setup.homeScreen.${each}.name`)} />
        ))}
      </div>
    </>
  );
}

function PlatformSteps({ platform, heading }: { platform: DevicePlatform; heading: string }) {
  const { t, formatNumber } = useI18n();
  const headingId = useId();
  return (
    <section className="tw-setup-platform" aria-labelledby={headingId}>
      <h3 id={headingId}>{heading}</h3>
      {/* Numbered in the language's digits, not by the browser's list markers. */}
      <ol role="list">
        {PLATFORM_STEPS.map((step, index) => (
          <li key={step}>
            <span className="tw-setup-platform-number" aria-hidden="true">
              {formatNumber(index + 1)}
            </span>
            <span>{t(`pages.setup.homeScreen.${platform}.${step}`)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
