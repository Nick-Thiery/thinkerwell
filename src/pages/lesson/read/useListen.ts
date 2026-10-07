/**
 * Listen on the Read stage: reads the part on screen aloud, one piece
 * (the heading, then each sentence) at a time: the part's recording of a
 * natural voice when there is one, otherwise the device's own voice
 * (src/audio/ListenSession.ts, docs/notes/recorded-audio.md).
 *
 * - `items` are the pieces to read (./readingPieces.ts, listenPieces), and
 *   `recording` the part's recording (null for a language without
 *   recordings); when `itemsKey` changes (a new part, or Standard /
 *   Simpler), reading starts again from the first piece of the new items,
 *   or, when paused, waits at it.
 * - `onPartEnd` runs when the last piece has been read. Return true when
 *   there is more to read (the stage moves on to the next part, which
 *   changes `itemsKey`); false ends Listen.
 * - `next` is the next part's recording, downloaded while this one plays
 *   (not with Save data on), so moving on doesn't wait.
 * - Stopping, leaving the stage or changing the lessons' language stops
 *   reading. A device voice that turns up or changes while a recording
 *   plays doesn't interrupt it.
 * - With neither a recording nor a voice for a part, Listen stops and
 *   `unavailable` is true until the next start: the Read stage says why.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ListenSession, silenceUrl } from '../../../audio/ListenSession';
import { loadRecording, prefetchRecording } from '../../../audio/load';
import type { RecordingRef } from '../../../audio/recordings';
import type { MediaLike } from '../../../audio/RecordedPlayer';
import { getSpeechSynthesis, type ListenItem } from '../../../speech';

export type ListenState = 'off' | 'playing' | 'paused';

export interface ListenOptions {
  voice: SpeechSynthesisVoice | null;
  items: readonly ListenItem[];
  itemsKey: string;
  /** The part's recording, or null when its language has none. */
  recording: RecordingRef | null;
  /** The next part's recording, to download ahead. */
  next?: RecordingRef | null;
  /** The lessons' language: changing it stops Listen. */
  lang: string;
  rate: number;
  /** Save data: play only recordings already on the device, and download nothing ahead. */
  saveData?: boolean;
  onPartEnd: () => boolean;
  /** The audio element to play recordings with (a new Audio() unless given). */
  media?: () => MediaLike | null;
}

export interface Listen {
  state: ListenState;
  /** The index in `items` being read now, or null. */
  current: number | null;
  /** Waiting for the part's recording to download. */
  loading: boolean;
  /** The last start found neither a recording nor a voice. */
  unavailable: boolean;
  start: () => void;
  pause: () => void;
  play: () => void;
  stop: () => void;
}

export function useListen({ voice, items, itemsKey, recording, next = null, lang, rate, saveData = false, onPartEnd, media }: ListenOptions): Listen {
  const [state, setStateValue] = useState<ListenState>('off');
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  /** The piece being read, with the items it belongs to (so a new part never shows the old index). */
  const [current, setCurrentValue] = useState<{ key: string; index: number } | null>(null);
  const shownKey = useRef(itemsKey);
  const setCurrent = useCallback((index: number | null) => {
    setCurrentValue(index === null ? null : { key: shownKey.current, index });
  }, []);
  const stateRef = useRef<ListenState>('off');
  const session = useRef<ListenSession | null>(null);
  /** The next part's recording already asked for, so it is downloaded once, not at every sentence. */
  const prefetched = useRef<string | null>(null);
  const latest = useRef({ items, recording, next, onPartEnd, rate, voice, saveData, media });
  useEffect(() => {
    latest.current = { items, recording, next, onPartEnd, rate, voice, saveData, media };
  });

  const setState = useCallback((value: ListenState) => {
    stateRef.current = value;
    setStateValue(value);
  }, []);

  const getSession = useCallback((): ListenSession => {
    if (session.current) return session.current;
    const { rate: startRate, voice: startVoice } = latest.current;
    session.current = new ListenSession(
      {
        media: () => latest.current.media?.() ?? new Audio(),
        synth: getSpeechSynthesis(),
        voice: startVoice,
        rate: startRate,
        load: loadRecording,
        onlyStored: () => latest.current.saveData,
        silence: silenceUrl,
      },
      {
        onItem: (index) => {
          setCurrent(index);
          // Reading: download the next part's recording meanwhile, once.
          const ahead = latest.current.next;
          const aheadKey = ahead ? `${ahead.lang}/${ahead.key}/${ahead.hash}` : null;
          if (index !== null && ahead && aheadKey !== prefetched.current && !latest.current.saveData) {
            prefetched.current = aheadKey;
            prefetchRecording(ahead);
          }
        },
        onFinish: () => {
          setCurrent(null);
          // More to read: stay 'playing'; the new part's items start below.
          if (!latest.current.onPartEnd()) setState('off');
        },
        onError: () => setState('off'),
        onLoading: setLoading,
        onUnavailable: () => {
          setUnavailable(true);
          setState('off');
        },
      },
    );
    return session.current;
  }, [setState, setCurrent]);

  const start = useCallback(() => {
    const s = getSession();
    const { items: startItems, recording: startRecording } = latest.current;
    setUnavailable(false);
    // From the tap itself, before anything waits: lets Safari play the recording when it arrives.
    if (startRecording) s.unlock();
    setState('playing');
    s.play({ items: startItems, recording: startRecording }, 0);
  }, [getSession, setState]);

  const pause = useCallback(() => {
    session.current?.pause();
    setState('paused');
  }, [setState]);

  const play = useCallback(() => {
    const s = session.current;
    if (!s) return;
    setState('playing');
    s.resume();
  }, [setState]);

  const stop = useCallback(() => {
    session.current?.stop();
    setCurrent(null);
    setState('off');
  }, [setState, setCurrent]);

  // A new part or reading level: read it from its first piece.
  useEffect(() => {
    if (shownKey.current === itemsKey) return;
    shownKey.current = itemsKey;
    const s = session.current;
    if (!s || stateRef.current === 'off') return;
    if (stateRef.current === 'playing') {
      s.play({ items, recording }, 0);
    } else {
      s.load({ items, recording });
      setCurrent(null);
    }
  }, [itemsKey, items, recording, setCurrent]);

  useEffect(() => {
    session.current?.setRate(rate);
  }, [rate]);

  useEffect(() => {
    session.current?.setVoice(voice);
  }, [voice]);

  // Another lessons' language, or leaving the stage: stop, and start afresh next time.
  useEffect(() => {
    return () => {
      session.current?.dispose();
      session.current = null;
      stateRef.current = 'off';
      setStateValue('off');
      setLoading(false);
    };
  }, [lang]);

  return {
    state,
    current: current && current.key === itemsKey ? current.index : null,
    loading: state !== 'off' && loading,
    unavailable,
    start,
    pause,
    play,
    stop,
  };
}
