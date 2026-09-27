/**
 * "Record yourself" in the Speak stage: record, listen back, record again or
 * delete, with MediaRecorder (src/speech/recorder.ts).
 *
 * - Hidden where the browser can't record, or where the device lists no
 *   microphone (and there is no saved clip to listen to or delete). It
 *   stays hidden for the moment it takes to check, so it never flashes up.
 * - The microphone is asked for only when the learner taps Start recording,
 *   and released when the recording stops.
 * - A chosen learner's latest clip for this lesson is kept in IndexedDB
 *   (store.saveRecording replaces any earlier one); Delete removes it, and
 *   removing the learner removes all their clips (store.removeLearner).
 *   Guests' clips live in memory only and are gone when they leave the stage.
 * - Recordings are never uploaded and never count towards Speak being done.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLessonPlayer } from '../../../lesson';
import { useLearnerSession } from '../../../session';
import {
  canRecordAudio,
  hasMicrophone,
  recorderProblem,
  startRecording,
  type ActiveRecording,
  type RecorderProblem,
} from '../../../speech';
import { getStore } from '../../../storage';

export interface Clip {
  blob: Blob;
  durationMs: number;
}

/** What went wrong last, for a short plain message. */
export type SpeakRecorderProblem = RecorderProblem | 'playback' | 'not-saved';

/** What just happened, for the live region. */
export type SpeakRecorderEvent = 'started' | 'stopped' | 'deleted' | null;

export interface SpeakRecorder {
  /** 'hidden' while it can't be offered here. */
  view: 'hidden' | 'idle' | 'recording' | 'recorded';
  /** How long the current recording has run, while recording. */
  elapsedMs: number;
  clip: Clip | null;
  problem: SpeakRecorderProblem | null;
  lastEvent: SpeakRecorderEvent;
  start: () => void;
  stop: () => void;
  playBack: () => void;
  remove: () => void;
}

export function useSpeakRecorder(): SpeakRecorder {
  const { lesson, mode } = useLessonPlayer();
  const { activeLearner, storageAvailable } = useLearnerSession();
  const learnerId = mode === 'learner' ? (activeLearner?.id ?? null) : null;
  const saves = learnerId !== null && storageAvailable;
  const lessonId = lesson.id;

  const supported = canRecordAudio();
  /** Whether the device lists a microphone; null when the browser won't say. */
  const [micListed, setMicListed] = useState<boolean | null | 'checking'>('checking');
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [clip, setClip] = useState<Clip | null>(null);
  const [problem, setProblem] = useState<SpeakRecorderProblem | null>(null);
  const [lastEvent, setLastEvent] = useState<SpeakRecorderEvent>(null);

  const active = useRef<ActiveRecording | null>(null);
  const starting = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Is there a microphone? Asks for nothing; checks again when devices change.
  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;
    const check = () => {
      void hasMicrophone().then((listed) => {
        if (!cancelled) setMicListed(listed);
      });
    };
    check();
    const devices = navigator.mediaDevices;
    devices.addEventListener?.('devicechange', check);
    return () => {
      cancelled = true;
      devices.removeEventListener?.('devicechange', check);
    };
  }, [supported]);

  // The learner's saved clip for this lesson.
  useEffect(() => {
    if (!saves || !learnerId) return undefined;
    let cancelled = false;
    void getStore()
      .then((store) => store.getRecording(learnerId, lessonId))
      .then((saved) => {
        if (!cancelled && saved) setClip({ blob: saved.blob, durationMs: saved.durationMs });
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, [saves, learnerId, lessonId]);

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }, []);

  const keep = useCallback(
    async (finished: Clip) => {
      if (!saves || !learnerId) return true;
      try {
        const store = await getStore();
        await store.saveRecording(learnerId, lessonId, finished.blob, finished.durationMs);
        return true;
      } catch (error) {
        if (import.meta.env.DEV) console.error(error);
        return false;
      }
    },
    [saves, learnerId, lessonId],
  );

  const stop = useCallback(() => {
    const current = active.current;
    if (!current) return;
    active.current = null;
    void current.stop().then(async (finished) => {
      const saved = finished.blob.size > 0 ? await keep(finished) : true;
      if (!alive.current) return;
      setRecording(false);
      if (finished.blob.size > 0) {
        stopAudio();
        setClip(finished);
      }
      setProblem(saved ? null : 'not-saved');
      setLastEvent('stopped');
    });
  }, [keep, stopAudio]);

  const start = useCallback(() => {
    if (active.current || starting.current) return;
    starting.current = true;
    setProblem(null);
    stopAudio();
    void startRecording({ onLimit: () => stop() })
      .then((started) => {
        starting.current = false;
        if (!alive.current) {
          started.cancel();
          return;
        }
        active.current = started;
        setElapsedMs(0);
        setRecording(true);
        setLastEvent('started');
      })
      .catch((error: unknown) => {
        starting.current = false;
        if (alive.current) setProblem(recorderProblem(error));
      });
  }, [stop, stopAudio]);

  // The clock while recording.
  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => {
      const current = active.current;
      if (current) setElapsedMs(Date.now() - current.startedAt);
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  const playBack = useCallback(() => {
    if (!clip) return;
    if (typeof URL.createObjectURL !== 'function' || typeof Audio !== 'function') {
      setProblem('playback');
      return;
    }
    stopAudio();
    const url = URL.createObjectURL(clip.blob);
    audioUrl.current = url;
    const player = new Audio(url);
    audio.current = player;
    setProblem(null);
    void Promise.resolve(player.play()).catch(() => {
      if (alive.current && audio.current === player) setProblem('playback');
    });
  }, [clip, stopAudio]);

  const remove = useCallback(() => {
    stopAudio();
    setClip(null);
    setProblem(null);
    setLastEvent('deleted');
    if (saves && learnerId) {
      void getStore()
        .then((store) => store.deleteRecording(learnerId, lessonId))
        .catch((error: unknown) => {
          if (import.meta.env.DEV) console.error(error);
        });
    }
  }, [saves, learnerId, lessonId, stopAudio]);

  // Leaving the stage: a recording in progress is stopped (and, for a
  // learner, kept, as if they had pressed Stop); playback stops.
  useEffect(
    () => () => {
      const current = active.current;
      active.current = null;
      if (current) void current.stop().then((finished) => (finished.blob.size > 0 ? keep(finished) : true));
      stopAudio();
    },
    [keep, stopAudio],
  );

  const view: SpeakRecorder['view'] = !supported
    ? 'hidden'
    : recording
      ? 'recording'
      : clip
        ? 'recorded'
        : micListed === false || micListed === 'checking'
          ? 'hidden'
          : 'idle';

  return { view, elapsedMs, clip, problem, lastEvent, start, stop, playBack, remove };
}
