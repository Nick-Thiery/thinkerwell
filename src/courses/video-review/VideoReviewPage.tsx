import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import data from 'virtual:thinkerwell/video-review';
import words from 'virtual:thinkerwell/messages/videoReview';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, Icon, TextField, VideoCard } from '../../components/ds';
import { useCatalog } from '../../content/useCatalog';
import { useI18n, withWords } from '../../i18n';
import { findLocale } from '../../i18n/locales';
import { useLearnerSession } from '../../session';
import { getStore } from '../../storage/store';
import type { ReviewDecision, ReviewLesson, ReviewPart, ReviewRecommendation, VideoReviewNotes } from './types';
import type * as LessonPages from '../../app/lazy/lessonPages';
import './stylesheet';

/**
 * The Watch step's player rules and the duration format, from the lessons'
 * chunk (src/app/lazy/lessonPages.ts), which src/courses/routes.tsx loads with
 * this page. Importing them here instead would split them out of that chunk
 * into small files of their own: one more download for every learner's lesson.
 */
export type LessonCode = Pick<typeof LessonPages, 'youtubeEmbedUrl' | 'PLAYER_ALLOW' | 'PLAYER_REFERRER_POLICY' | 'formatDuration'>;

/**
 * /review/videos: for the people who review the local-language Watch videos
 * (docs/notes/local-language-videos.md). Never linked from anywhere, noindex,
 * and built into assets/preview/video-review/ (src/courses/build.ts), so no
 * learner's device downloads it, and nothing on it reaches a lesson.
 *
 * In the language on screen (Bahasa Indonesia or Bahasa Melayu; the one
 * language setting, changed with the header's switch), one lesson at a time:
 * the video the pre-screen recommends, in the same player as a lesson's Watch
 * step (nothing from YouTube before the tap), the part to watch, why, both
 * questions, the written version and key points, what to check (YouTube's AI
 * dubbing, a weak fit, a written version made from the description), then
 * "Use it", "Use it with changes" or "Don't use it" and a comment. The other
 * videos that may fit are links. Answers are kept on this device only
 * (settings.videoReview) and never sent: at the end the reviewer copies them
 * and sends them to the team, who approve the videos with their name
 * (npm run videos:apply).
 */
export function VideoReviewPage({ lessonCode }: { lessonCode: LessonCode }) {
  const parent = useI18n();
  const i18n = useMemo(() => withWords(parent, words), [parent]);
  const { t } = i18n;
  usePageTitle(t('videoReview.pageTitle'));
  // The language on screen (the one language setting, or a test language in the dev server).
  const language = i18n.locale;
  const lessons = data[language];
  const languageName = findLocale(language)?.endonym ?? language;

  return (
    <div className="tw-vr-page">
      <header className="tw-vr-head">
        <span className="eyebrow">{t('videoReview.eyebrow')}</span>
        <h1 className="h1" tabIndex={-1}>
          {lessons ? t('videoReview.title', { language: languageName }) : t('videoReview.pageTitle')}
        </h1>
        {lessons ? <p className="body-lg">{t('videoReview.intro', { language: languageName })}</p> : null}
      </header>
      {lessons ? (
        <Review key={language} lessonCode={lessonCode} t={t} i18n={i18n} lessons={lessons} language={language} languageName={languageName} />
      ) : (
        <p className="body-lg">{t('videoReview.chooseLanguage')}</p>
      )}
    </div>
  );
}

type T = ReturnType<typeof useI18n>['t'];
type I18n = ReturnType<typeof useI18n>;

const EMPTY: VideoReviewNotes = { answers: {} };

/** The reviewer's answers on this device: loaded once, saved as they change (kept for this visit only without storage). */
function useReviewNotes(): [VideoReviewNotes, (change: (notes: VideoReviewNotes) => VideoReviewNotes) => void, boolean] {
  const { storageAvailable } = useLearnerSession();
  const [notes, setNotes] = useState<VideoReviewNotes>(EMPTY);
  const [saved, setSaved] = useState(false);
  const latest = useRef(notes);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!storageAvailable) return undefined;
    let live = true;
    void getStore()
      .then((store) => store.getSettings())
      .then((settings) => {
        if (live && settings.videoReview && latest.current === EMPTY) {
          latest.current = settings.videoReview;
          setNotes(settings.videoReview);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [storageAvailable]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (change: (notes: VideoReviewNotes) => VideoReviewNotes) => {
    const next = change(latest.current);
    latest.current = next;
    setNotes(next);
    setSaved(false);
    if (!storageAvailable) return;
    clearTimeout(timer.current);
    // A comment saves a moment after typing stops; an answer at once.
    timer.current = setTimeout(() => {
      void getStore()
        .then((store) => store.updateSettings({ videoReview: latest.current }))
        .then(() => setSaved(true))
        .catch(() => {});
    }, 400);
  };

  return [notes, update, saved];
}

interface ReviewProps {
  lessonCode: LessonCode;
  t: T;
  i18n: I18n;
  lessons: ReviewLesson[];
  language: string;
  languageName: string;
}

function Review({ lessonCode, t, i18n, lessons, language, languageName }: ReviewProps) {
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const [notes, update, saved] = useReviewNotes();
  const lessonSelectId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const index = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.key === params.get('lesson')),
  );
  const lesson = lessons[index]!;
  const number = Number(lesson.key.slice(1));
  const title = (n: number) => catalog.getLessonByNumber(n)?.title ?? '';
  const answerKey = `${language}/${lesson.key}`;
  const answer = notes.answers[answerKey] ?? {};
  const reviewable = lessons.filter((l) => l.recommended);
  const done = reviewable.filter((l) => notes.answers[`${language}/${l.key}`]?.decision).length;

  const go = (next: number) => {
    moved.current = true;
    setParams({ lesson: lessons[next]!.key }, { replace: true });
  };
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus();
  }, [index]);

  const setAnswer = (patch: { decision?: ReviewDecision; comment?: string }) =>
    update((current) => ({ ...current, answers: { ...current.answers, [answerKey]: { ...current.answers[answerKey], ...patch } } }));

  return (
    <>
      <section className="tw-vr-card" aria-labelledby="vr-how">
        <h2 id="vr-how" className="h3">
          {t('videoReview.howTitle')}
        </h2>
        <ol className="tw-vr-how">
          <li>{t('videoReview.how1')}</li>
          <li>{t('videoReview.how2')}</li>
          <li>{t('videoReview.how3')}</li>
          <li>{t('videoReview.how4')}</li>
        </ol>
        <TextField
          label={t('videoReview.reviewerLabel')}
          helper={t('videoReview.reviewerHelp')}
          value={notes.reviewer ?? ''}
          onValueChange={(name) => update((current) => ({ ...current, reviewer: name }))}
          autoComplete="name"
        />
      </section>

      <div className="tw-vr-nav">
        <div className="tw-vr-select">
          <label htmlFor={lessonSelectId}>{t('videoReview.lessonLabel')}</label>
          <select id={lessonSelectId} value={lesson.key} onChange={(event) => go(lessons.findIndex((l) => l.key === event.target.value))}>
            {lessons.map((l) => {
              const n = Number(l.key.slice(1));
              return (
                <option key={l.key} value={l.key}>
                  {t('videoReview.lessonOption', { number: i18n.formatNumber(n), title: title(n) })}
                </option>
              );
            })}
          </select>
        </div>
        <p className="tw-vr-progress" aria-live="polite">
          {t('videoReview.progress', { done: i18n.formatNumber(done), total: i18n.formatNumber(reviewable.length) })}
        </p>
      </div>

      <section className="tw-vr-card" aria-labelledby="vr-lesson">
        <h2 id="vr-lesson" ref={headingRef} className="h2" tabIndex={-1} {...i18n.contentLang}>
          {t('videoReview.lessonHeading', { number: i18n.formatNumber(number), title: title(number) })}
        </h2>
        {lesson.approved ? <p className="tw-vr-muted">{t('videoReview.approvedNote')}</p> : null}
        {lesson.recommended ? (
          <Recommendation key={answerKey} lessonCode={lessonCode} t={t} i18n={i18n} video={lesson.recommended} language={language} languageName={languageName} />
        ) : (
          <p className="body-lg">{t('videoReview.noVideo', { language: languageName })}</p>
        )}

        {lesson.recommended ? (
          <div className="tw-vr-answer">
            <span className="tw-vr-label" id={`vr-answer-${answerKey}`}>
              {t('videoReview.answerLabel')}
            </span>
            {/* Three plain buttons, one pressed: they stack on a phone, where a segmented control's labels can't fit. */}
            <div className="tw-vr-choices" role="group" aria-labelledby={`vr-answer-${answerKey}`}>
              {(
                [
                  ['use', 'Check'],
                  ['change', 'Pencil'],
                  ['no', 'X'],
                ] as const
              ).map(([decision, icon]) => (
                <button
                  key={decision}
                  type="button"
                  className="tw-vr-choice"
                  aria-pressed={answer.decision === decision}
                  onClick={() => setAnswer({ decision })}
                >
                  <Icon name={icon} size={20} />
                  {t(`videoReview.${decision}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Comment key={`comment-${answerKey}`} t={t} value={answer.comment ?? ''} onChange={(comment) => setAnswer({ comment })} />
        {saved ? (
          <p className="tw-vr-muted" role="status">
            {t('videoReview.saved')}
          </p>
        ) : null}

        <OtherVideos t={t} lesson={lesson} />

        <div className="tw-vr-buttons">
          <Button variant="secondary" icon="ArrowLeft" onClick={() => go(index - 1)} disabled={index === 0}>
            {t('videoReview.previous')}
          </Button>
          <Button variant="primary" icon="ArrowRight" onClick={() => go(index + 1)} disabled={index === lessons.length - 1}>
            {t('videoReview.next')}
          </Button>
        </div>
      </section>

      <Send t={t} i18n={i18n} lessons={lessons} notes={notes} language={language} languageName={languageName} title={title} />
    </>
  );
}

function Recommendation({
  lessonCode,
  t,
  i18n,
  video,
  language,
  languageName,
}: {
  t: T;
  i18n: I18n;
  lessonCode: LessonCode;
  video: ReviewRecommendation;
  language: string;
  languageName: string;
}) {
  const [watching, setWatching] = useState(false);
  const writtenRef = useRef<HTMLHeadingElement>(null);
  const writtenId = useId();
  const clock = (seconds: number) => lessonCode.formatDuration(seconds, i18n.formatNumber);
  const part =
    video.startSeconds !== undefined && video.endSeconds !== undefined
      ? t('videoReview.part', {
          start: clock(video.startSeconds),
          end: clock(video.endSeconds),
          length: clock(video.endSeconds - video.startSeconds),
        })
      : video.durationSeconds
        ? t('videoReview.whole', { length: clock(video.durationSeconds) })
        : null;
  const question = (label: string, text: string, changed: boolean) => (
    <div className="tw-vr-question">
      <span className="tw-vr-label">{label}</span>
      <p className="body-lg">{text}</p>
      <span className="tw-vr-muted">{t(changed ? 'videoReview.newQuestion' : 'videoReview.ownQuestion')}</span>
    </div>
  );

  return (
    <>
      <h3 className="h3">{t('videoReview.suggested')}</h3>
      <VideoCard
        title={video.title}
        channel={video.channel}
        titleInEnglish={false}
        headingLevel={3}
        duration={video.durationSeconds ? clock(video.durationSeconds) : undefined}
        watchVariant="secondary"
        optionalTag={false}
        watching={watching}
        onWatch={() => setWatching(true)}
        onReadInstead={() => writtenRef.current?.focus()}
        player={
          watching ? (
            <iframe
              src={lessonCode.youtubeEmbedUrl(video.youtubeId, window.location.origin, video, language)}
              title={video.title}
              allow={lessonCode.PLAYER_ALLOW}
              allowFullScreen
              loading="eager"
              referrerPolicy={lessonCode.PLAYER_REFERRER_POLICY}
            />
          ) : undefined
        }
      >
        {part ? <p className="tw-vr-label">{part}</p> : null}
      </VideoCard>

      {video.autoDubbed ? <Flag icon="Volume2">{t('videoReview.dubWarning', { language: languageName })}</Flag> : null}
      {video.weakFit ? <Flag icon="Info">{t('videoReview.weakFit')}</Flag> : null}
      {video.summaryFromVideo ? null : <Flag icon="Info">{t('videoReview.noCaptions')}</Flag>}

      <div className="tw-vr-question">
        <span className="tw-vr-label">{t('videoReview.whyTitle')}</span>
        <p className="body-lg">{video.why}</p>
      </div>

      <h3 className="h3">{t('videoReview.questionsTitle')}</h3>
      {question(t('videoReview.before'), video.beforeQuestion, video.questionsChanged.includes('beforeQuestion'))}
      {question(t('videoReview.after'), video.afterQuestion, video.questionsChanged.includes('afterQuestion'))}

      <h3 id={writtenId} ref={writtenRef} className="h3" tabIndex={-1}>
        {t('videoReview.writtenTitle')}
      </h3>
      <div className="tw-vr-written body-lg">
        {video.summary.split(/\n\s*\n/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <span className="tw-vr-label">{t('videoReview.keyPoints')}</span>
      <ul className="tw-vr-keypoints">
        {video.keyPoints.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
      {video.contentNote ? (
        <div className="tw-vr-question">
          <span className="tw-vr-label">{t('videoReview.teacherNote')}</span>
          <p>{video.contentNote}</p>
        </div>
      ) : null}
    </>
  );
}

function Flag({ icon, children }: { icon: 'Volume2' | 'Info'; children: ReactNode }) {
  return (
    <p className="tw-vr-flag">
      <Icon name={icon} size={20} />
      <span>{children}</span>
    </p>
  );
}

function Comment({ t, value, onChange }: { t: T; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="tw-vr-comment">
      <label htmlFor={id}>{t('videoReview.commentLabel')}</label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </div>
  );
}

const watchUrl = (video: ReviewPart) => `https://www.youtube.com/watch?v=${video.youtubeId}${video.startSeconds ? `&t=${video.startSeconds}s` : ''}`;

function OtherVideos({ t, lesson }: { t: T; lesson: ReviewLesson }) {
  const others = [...lesson.alsoSuitable.map((video) => ({ video, checked: true })), ...lesson.notChecked.map((video) => ({ video, checked: false }))];
  if (others.length === 0) return null;
  return (
    <section className="tw-vr-question" aria-labelledby={`vr-other-${lesson.key}`}>
      <h3 id={`vr-other-${lesson.key}`} className="h3">
        {t('videoReview.otherTitle')}
      </h3>
      <p className="tw-vr-muted">{t('videoReview.otherHelp')}</p>
      <ul className="tw-vr-others">
        {others.map(({ video, checked }) => (
          <li key={video.youtubeId}>
            <a href={watchUrl(video)} target="_blank" rel="noreferrer">
              {video.title}
              <span className="tw-visually-hidden"> {t('pages.teacherTools.newTab')}</span>
            </a>
            <span className="tw-vr-muted">{t('videoReview.by', { channel: video.channel })}</span>
            {checked ? null : <span className="tw-vr-muted">{t('videoReview.notChecked')}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The reviewer's answers as text to copy into a message (nothing is sent from the page). */
export function summaryText(
  t: T,
  formatNumber: (n: number) => string,
  lessons: ReviewLesson[],
  notes: VideoReviewNotes,
  language: string,
  languageName: string,
): string {
  const lines = [t('videoReview.summaryTitle', { language: languageName })];
  if (notes.reviewer?.trim()) lines.push(t('videoReview.summaryReviewer', { name: notes.reviewer.trim() }));
  for (const lesson of lessons) {
    const answer = notes.answers[`${language}/${lesson.key}`] ?? {};
    const comment = answer.comment?.trim();
    if (!lesson.recommended && !comment) continue;
    lines.push('');
    lines.push(
      t('videoReview.summaryLesson', {
        number: formatNumber(Number(lesson.key.slice(1))),
        video: lesson.recommended ? lesson.recommended.youtubeId : t('videoReview.summaryNoVideo'),
        answer: answer.decision ? t(`videoReview.${answer.decision}`) : t('videoReview.summaryNotYet'),
      }),
    );
    if (comment) lines.push(t('videoReview.summaryComment', { comment }));
  }
  return lines.join('\n');
}

function Send({
  t,
  i18n,
  lessons,
  notes,
  language,
  languageName,
}: {
  t: T;
  i18n: I18n;
  lessons: ReviewLesson[];
  notes: VideoReviewNotes;
  language: string;
  languageName: string;
  title: (n: number) => string;
}) {
  const text = summaryText(t, i18n.formatNumber, lessons, notes, language, languageName);
  const [status, setStatus] = useState<'copied' | 'failed' | null>(null);
  const textId = useId();
  const copy = () => {
    setStatus(null);
    if (!navigator.clipboard) {
      setStatus('failed');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => setStatus('copied'),
      () => setStatus('failed'),
    );
  };
  return (
    <section className="tw-vr-card tw-vr-summary" aria-labelledby="vr-send">
      <h2 id="vr-send" className="h2">
        {t('videoReview.sendTitle')}
      </h2>
      <p>{t('videoReview.sendBody')}</p>
      <div>
        <Button variant="secondary" icon="ClipboardCheck" onClick={copy}>
          {t('videoReview.copy')}
        </Button>
      </div>
      {status ? (
        <p role="status" className="tw-vr-muted">
          {t(status === 'copied' ? 'videoReview.copied' : 'videoReview.copyFailed')}
        </p>
      ) : null}
      <label htmlFor={textId} className="tw-vr-label">
        {t('videoReview.summaryLabel')}
      </label>
      <textarea id={textId} readOnly value={text} />
    </section>
  );
}
