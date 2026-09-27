/**
 * "Say it" on a lesson's writing boxes (Write, Watch and Reflect), on top
 * of src/speech/useDictation.ts.
 *
 *   const sayIt = useSayIt();
 *   <SayItBox sayIt={sayIt} id={id} label={...} value={text} onValueChange={setText} />
 *   {sayIt.announcer}
 *
 * - The button shows only when speech can be turned into text on this
 *   device, or when an educator allowed the online path in Settings
 *   (settings.partner.allowOnlineDictation). Otherwise the box is a plain
 *   WritingBox.
 * - While a box listens, its helper line says so; if listening didn't work,
 *   it says why in plain words until the learner tries again or types.
 * - Words arrive through the box's own onValueChange, exactly like typing,
 *   so they stay editable and follow the same save rules. Typing in the
 *   box stops the listening.
 */
import { useState, type ReactElement } from 'react';
import { WritingBox, type WritingBoxProps } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { useLessonPlayer } from '../../lesson';
import { useDictation, type Dictation, type DictationNotice } from '../../speech';

export interface SayIt {
  /** Say it can be offered on this device. */
  available: boolean;
  dictation: Dictation;
  /** Remembers which box Say it was last pressed on, for the announcer. */
  pressed: (id: string) => void;
  /** A polite live region that says when a box starts listening, or why it couldn't. Render once per stage. */
  announcer: ReactElement;
}

const NOTICE_KEYS: Record<DictationNotice, MessageKey> = {
  'mic-blocked': 'lessonPlayer.sayIt.micBlocked',
  'no-mic': 'lessonPlayer.sayIt.noMic',
  offline: 'lessonPlayer.sayIt.offline',
  'no-speech': 'lessonPlayer.sayIt.noSpeech',
  unavailable: 'lessonPlayer.sayIt.unavailable',
};

/** One per stage: every SayItBox in the stage shares it, so only one box listens at a time. */
export function useSayIt(): SayIt {
  const { t } = useI18n();
  const { settings } = useLessonPlayer();
  const dictation = useDictation(settings.partner.allowOnlineDictation);
  const [lastId, setLastId] = useState<string | null>(null);

  const lastNotice = lastId ? dictation.noticeFor(lastId) : null;
  const announcement = dictation.listeningId
    ? t('lessonPlayer.sayIt.listening')
    : lastNotice
      ? t(NOTICE_KEYS[lastNotice])
      : '';

  return {
    available: dictation.available,
    dictation,
    pressed: setLastId,
    announcer: (
      <p className="tw-visually-hidden" aria-live="polite">
        {announcement}
      </p>
    ),
  };
}

export interface SayItBoxProps extends Omit<WritingBoxProps, 'id' | 'dictate' | 'onDictateClick' | 'value' | 'onValueChange'> {
  sayIt: SayIt;
  /** The textarea's id (required: dictation finds the box and its caret by it). */
  id: string;
  value: string;
  /** Typing and dictated words both arrive here. */
  onValueChange: (text: string) => void;
  /** Where the caret is after dictated words went in (Write's starters go after them). */
  onDictatedCaret?: (caret: number) => void;
  /** Once listening ends, with the box's text. */
  onDictationDone?: (text: string) => void;
}

/** A WritingBox with Say it when the device can do it. */
export function SayItBox({
  sayIt,
  id,
  value,
  onValueChange,
  onDictatedCaret,
  onDictationDone,
  helper,
  ...rest
}: SayItBoxProps) {
  const { t } = useI18n();
  const { dictation } = sayIt;
  const listening = dictation.listeningId === id;
  const notice = dictation.noticeFor(id);

  const typed = (text: string) => {
    dictation.typed(id);
    onValueChange(text);
  };

  if (!sayIt.available) {
    return <WritingBox id={id} value={value} onValueChange={typed} helper={helper} {...rest} />;
  }

  return (
    <WritingBox
      id={id}
      value={value}
      onValueChange={typed}
      dictate={listening ? 'listening' : true}
      onDictateClick={() => {
        sayIt.pressed(id);
        dictation.toggle({
          id,
          value,
          onChange: (text, caret) => {
            onValueChange(text);
            onDictatedCaret?.(caret);
          },
          onDone: onDictationDone,
        });
      }}
      helper={listening ? t('lessonPlayer.sayIt.listening') : notice ? t(NOTICE_KEYS[notice]) : helper}
      {...rest}
    />
  );
}
