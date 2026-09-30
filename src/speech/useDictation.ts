/**
 * "Say it": turning a learner's speech into text in a writing box.
 *
 *   const dictation = useDictation({
 *     onDeviceConfirmed: settings.speechCheck?.status === 'available',
 *     allowOnline: settings.partner.allowOnlineDictation,
 *   });
 *   if (dictation.available) ... show the VoiceButton ...
 *   dictation.toggle({ id: 'answer', value, onChange });
 *
 * - Available only when an educator's "Check this device" found that
 *   recognition runs on the device, or when an educator has allowed the
 *   online path (./recognition.ts). Wherever neither applies, `available` is
 *   false and the button stays hidden.
 * - It never asks the browser as the page opens: no available() call and no
 *   recognition object until the learner taps Say it (./recognition.ts).
 * - One box listens at a time. Pressing Say it on another box stops the first.
 * - Words go in at the caret the learner last had in that box (or at the
 *   end if they never were in it), replacing only what this listening put
 *   there, and never the learner's own text (./dictationText.ts).
 * - Typing in the box while it listens stops the listening; the words
 *   already there stay, as editable text.
 * - Leaving the page (or hiding the tab) stops it too.
 * - Nothing is recorded or kept: only the words end up in the box.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { composeDictation, dictationAnchor, joinTranscript, type DictationAnchor } from './dictationText';
import {
  createRecognition,
  DICTATION_LANG,
  dictationMode,
  type DictationMode,
  type DictationSettings,
  type RecognitionErrorEventLike,
  type RecognitionLike,
  type RecognitionResultEventLike,
} from './recognition';

/** Why the last listening in a box didn't work, in words the box can show. */
export type DictationNotice = 'mic-blocked' | 'no-mic' | 'offline' | 'no-speech' | 'unavailable';

export interface DictationField {
  /** The textarea's id. */
  id: string;
  /** The box's text now. */
  value: string;
  /** Called with the new text (and where the caret now is) as words arrive, like typing. */
  onChange: (text: string, caret: number) => void;
  /** Called once listening ends, with the box's text. */
  onDone?: (text: string) => void;
}

export interface Dictation {
  /** Show Say it: recognition can run here (on the device, or online if allowed). */
  available: boolean;
  mode: DictationMode | null;
  /** The id of the box listening now, or null. */
  listeningId: string | null;
  /** The notice to show under a box, if its last listening didn't work. */
  noticeFor: (id: string) => DictationNotice | null;
  /** Say it / Stop on a box. */
  toggle: (field: DictationField) => void;
  /** Call when the learner types in a box: if it is listening, it stops. Clears its notice. */
  typed: (id: string) => void;
  /** Stops any listening now. */
  stop: () => void;
}

/** How long after Stop to wait for the browser's last words before letting go. */
export const STOP_GRACE_MS = 3000;

interface Session {
  id: string;
  recognition: RecognitionLike;
  anchor: DictationAnchor;
  field: DictationField;
  /** The box's text after the last words went in. */
  text: string;
}

function noticeForError(error: string, mode: DictationMode): DictationNotice | null {
  switch (error) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'mic-blocked';
    case 'audio-capture':
      return 'no-mic';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return mode === 'online' ? 'offline' : 'unavailable';
    default:
      return 'unavailable';
  }
}

export function useDictation({ onDeviceConfirmed, allowOnline, lang = DICTATION_LANG }: DictationSettings & { lang?: string }): Dictation {
  /**
   * True once on-device recognition stopped working on this page (the
   * language pack was removed, say). It isn't offered again here, and the
   * page doesn't ask the browser again: an educator can check the device
   * again in Settings.
   */
  const [onDeviceFailed, setOnDeviceFailed] = useState(false);
  const mode = useMemo(
    () => dictationMode({ onDeviceConfirmed: onDeviceConfirmed && !onDeviceFailed, allowOnline }),
    [onDeviceConfirmed, onDeviceFailed, allowOnline],
  );
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, DictationNotice>>({});
  const session = useRef<Session | null>(null);
  /** The caret each box last had when focus left it (by textarea id). */
  const carets = useRef(new Map<string, number>());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const setNotice = useCallback((id: string, notice: DictationNotice | null) => {
    setNotices((current) => {
      if ((current[id] ?? null) === notice) return current;
      const next = { ...current };
      if (notice) next[id] = notice;
      else delete next[id];
      return next;
    });
  }, []);

  /** Ends a session without waiting for its last words (typing, another box, leaving). */
  const abortSession = useCallback(() => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    current.recognition.onresult = null;
    current.recognition.onerror = null;
    current.recognition.onend = null;
    try {
      current.recognition.abort();
    } catch {
      // Already ended.
    }
    if (alive.current) setListeningId(null);
  }, []);

  // Remember where the caret was in a box when focus leaves it (for example
  // to press Say it), so the words go where the learner was writing.
  useEffect(() => {
    const onFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && target.id) carets.current.set(target.id, target.selectionEnd);
    };
    document.addEventListener('focusout', onFocusOut);
    return () => document.removeEventListener('focusout', onFocusOut);
  }, []);

  // Stop listening when the tab is hidden, and when the stage goes away.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') abortSession();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      abortSession();
    };
  }, [abortSession]);

  const start = useCallback(
    (field: DictationField) => {
      if (!mode) return;
      const recognition = createRecognition(mode, lang);
      if (!recognition) {
        setNotice(field.id, 'unavailable');
        return;
      }
      const box = document.getElementById(field.id);
      const value = box instanceof HTMLTextAreaElement ? box.value : field.value;
      const caret = carets.current.get(field.id) ?? null;
      const current: Session = {
        id: field.id,
        recognition,
        anchor: dictationAnchor(value, caret),
        field,
        text: value,
      };

      recognition.onresult = (event: RecognitionResultEventLike) => {
        if (session.current !== current) return;
        const pieces: string[] = [];
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const best = result && result.length > 0 ? result[0] : undefined;
          if (best?.transcript) pieces.push(best.transcript);
        }
        const composed = composeDictation(current.anchor, joinTranscript(pieces));
        if (composed.text === current.text) return;
        current.text = composed.text;
        carets.current.set(current.id, composed.caret);
        current.field.onChange(composed.text, composed.caret);
      };
      recognition.onerror = (event: RecognitionErrorEventLike) => {
        if (session.current !== current) return;
        const notice = noticeForError(event.error, mode);
        if (notice && alive.current) setNotice(current.id, notice);
        // On-device recognition that stops working (the language pack was
        // removed, say): stop offering it on this page. Say it hides, or
        // goes online where an educator allowed that.
        if (mode === 'on-device' && notice === 'unavailable' && alive.current) setOnDeviceFailed(true);
      };
      recognition.onend = () => {
        if (session.current !== current) return;
        session.current = null;
        if (!alive.current) return;
        setListeningId(null);
        current.field.onDone?.(current.text);
      };

      session.current = current;
      setNotice(field.id, null);
      setListeningId(field.id);
      try {
        recognition.start();
      } catch {
        session.current = null;
        setListeningId(null);
        setNotice(field.id, 'unavailable');
      }
    },
    [mode, lang, setNotice],
  );

  const toggle = useCallback(
    (field: DictationField) => {
      const current = session.current;
      if (current && current.id === field.id) {
        // Stop listening; the last words still arrive before onend. If the
        // browser never says it has ended, let go anyway so the button
        // doesn't stay on Stop.
        try {
          current.recognition.stop();
          setTimeout(() => {
            if (session.current === current) abortSession();
          }, STOP_GRACE_MS);
        } catch {
          abortSession();
        }
        return;
      }
      abortSession();
      start(field);
    },
    [abortSession, start],
  );

  const typed = useCallback(
    (id: string) => {
      if (session.current?.id === id) abortSession();
      setNotice(id, null);
    },
    [abortSession, setNotice],
  );

  const noticeFor = useCallback((id: string) => notices[id] ?? null, [notices]);

  return {
    available: mode !== null,
    mode,
    listeningId,
    noticeFor,
    toggle,
    typed,
    stop: abortSession,
  };
}
