/**
 * Listen on the Read stage: reads the part on screen aloud, one piece
 * (the heading, then each sentence) at a time, with the device's own voice.
 *
 * - `items` are the texts to read; when `itemsKey` changes (a new part, or
 *   Standard / Simpler), reading starts again from the first piece of the
 *   new items, or, when paused, waits at it.
 * - `onPartEnd` runs when the last piece has been read. Return true when
 *   there is more to read (the stage moves on to the next part, which
 *   changes `itemsKey`); false ends Listen.
 * - Stopping, leaving the stage or losing the voice cancels any speech.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechSynthesis, ReadAloudPlayer } from '../../../speech';

export type ListenState = 'off' | 'playing' | 'paused';

export interface ListenOptions {
  voice: SpeechSynthesisVoice | null;
  items: readonly string[];
  itemsKey: string;
  rate: number;
  onPartEnd: () => boolean;
}

export interface Listen {
  state: ListenState;
  /** The index in `items` being read now, or null. */
  current: number | null;
  start: () => void;
  pause: () => void;
  play: () => void;
  stop: () => void;
}

export function useListen({ voice, items, itemsKey, rate, onPartEnd }: ListenOptions): Listen {
  const [state, setStateValue] = useState<ListenState>('off');
  /** The piece being read, with the items it belongs to (so a new part never shows the old index). */
  const [current, setCurrentValue] = useState<{ key: string; index: number } | null>(null);
  const shownKey = useRef(itemsKey);
  const setCurrent = useCallback((index: number | null) => {
    setCurrentValue(index === null ? null : { key: shownKey.current, index });
  }, []);
  const stateRef = useRef<ListenState>('off');
  const player = useRef<ReadAloudPlayer | null>(null);
  const latest = useRef({ items, onPartEnd, rate });
  useEffect(() => {
    latest.current = { items, onPartEnd, rate };
  });

  const setState = useCallback((next: ListenState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const getPlayer = useCallback((): ReadAloudPlayer | null => {
    if (player.current) return player.current;
    const synth = getSpeechSynthesis();
    if (!synth || !voice) return null;
    player.current = new ReadAloudPlayer(synth, voice, latest.current.rate, {
      onItem: setCurrent,
      onFinish: () => {
        setCurrent(null);
        // More to read: stay 'playing'; the new part's items start below.
        if (!latest.current.onPartEnd()) setState('off');
      },
      onError: () => setState('off'),
    });
    return player.current;
  }, [voice, setState, setCurrent]);

  const start = useCallback(() => {
    const p = getPlayer();
    if (!p) return;
    setState('playing');
    p.play(latest.current.items, 0);
  }, [getPlayer, setState]);

  const pause = useCallback(() => {
    player.current?.pause();
    setState('paused');
  }, [setState]);

  const play = useCallback(() => {
    const p = player.current;
    if (!p) return;
    setState('playing');
    p.resume();
  }, [setState]);

  const stop = useCallback(() => {
    player.current?.stop();
    setCurrent(null);
    setState('off');
  }, [setState, setCurrent]);

  // A new part or reading level: read it from its first piece.
  useEffect(() => {
    if (shownKey.current === itemsKey) return;
    shownKey.current = itemsKey;
    const p = player.current;
    if (!p || stateRef.current === 'off') return;
    if (stateRef.current === 'playing') {
      p.play(items, 0);
    } else {
      p.load(items);
      setCurrent(null);
    }
  }, [itemsKey, items, setCurrent]);

  useEffect(() => {
    player.current?.setRate(rate);
  }, [rate]);

  // The voice went away (or changed): stop, and make a new player next time.
  useEffect(() => {
    return () => {
      player.current?.stop();
      player.current = null;
      stateRef.current = 'off';
      setStateValue('off');
    };
  }, [voice]);

  return { state, current: current && current.key === itemsKey ? current.index : null, start, pause, play, stop };
}
