/**
 * Recording the learner's voice for "Record yourself" (Speak), with
 * MediaRecorder. The clip is only ever handed back to the caller, which
 * keeps it on the device (IndexedDB, src/storage) or in memory. Nothing here
 * sends it anywhere.
 *
 * The microphone is asked for only in startRecording(), which the Speak
 * stage calls when the learner taps Start recording, and it is released as
 * soon as the recording stops.
 */

/** Recordings stop on their own after this long, so one clip can't fill the device. */
export const MAX_RECORDING_MS = 3 * 60 * 1000;

/** Low but clear speech quality: about 240 kB a minute. */
const AUDIO_BITS_PER_SECOND = 32_000;

/** Formats to try, best first. Chrome, Edge and Firefox record WebM or Ogg Opus; Safari records MP4. */
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];

/** True when this browser can record audio at all (MediaRecorder and getUserMedia). */
export function canRecordAudio(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder === 'function' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

/**
 * Whether the device has a microphone: true, false, or null when the
 * browser won't say. Browsers list their input devices (without names)
 * before any permission is given, so this asks for nothing.
 */
export async function hasMicrophone(): Promise<boolean | null> {
  const devices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  if (!devices || typeof devices.enumerateDevices !== 'function') return null;
  try {
    const list = await devices.enumerateDevices();
    return list.some((device) => device.kind === 'audioinput');
  } catch {
    return null;
  }
}

/** The first recording format this browser supports, or undefined to let it choose. */
export function pickRecordingType(): string | undefined {
  if (typeof window === 'undefined' || typeof window.MediaRecorder?.isTypeSupported !== 'function') return undefined;
  return TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Why recording couldn't start: the microphone was refused, there is none, or something else. */
export type RecorderProblem = 'mic-blocked' | 'no-mic' | 'failed';

export class RecorderError extends Error {
  readonly problem: RecorderProblem;
  constructor(problem: RecorderProblem) {
    super(`Recording could not start: ${problem}`);
    this.name = 'RecorderError';
    this.problem = problem;
  }
}

/** Sorts a getUserMedia or MediaRecorder failure into what the learner is told. */
export function recorderProblem(error: unknown): RecorderProblem {
  if (error instanceof RecorderError) return error.problem;
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'mic-blocked';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'no-mic';
  return 'failed';
}

export interface FinishedRecording {
  blob: Blob;
  durationMs: number;
}

export interface ActiveRecording {
  /** When recording started (Date.now()). */
  readonly startedAt: number;
  /** Stops and gives back the clip. Safe to call more than once. */
  stop(): Promise<FinishedRecording>;
  /** Stops and throws the clip away. */
  cancel(): void;
}

/**
 * Asks for the microphone and starts recording. Rejects with a
 * RecorderError when it can't. `onLimit` runs if the recording reaches
 * MAX_RECORDING_MS and stops itself; call stop() then to get the clip.
 */
export async function startRecording({ onLimit }: { onLimit?: () => void } = {}): Promise<ActiveRecording> {
  if (!canRecordAudio()) throw new RecorderError('failed');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    throw new RecorderError(recorderProblem(error));
  }

  const releaseMicrophone = () => stream.getTracks().forEach((track) => track.stop());
  const mimeType = pickRecordingType();
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
  } catch {
    releaseMicrophone();
    throw new RecorderError('failed');
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const startedAt = Date.now();
  let stopping: Promise<FinishedRecording> | null = null;
  let cancelled = false;

  const finished = new Promise<FinishedRecording>((resolve) => {
    recorder.onstop = () => {
      releaseMicrophone();
      const type = recorder.mimeType || mimeType || chunks[0]?.type || 'audio/webm';
      resolve({ blob: new Blob(chunks, { type }), durationMs: Math.max(0, Date.now() - startedAt) });
    };
  });

  const limit = setTimeout(() => {
    if (!stopping && !cancelled) onLimit?.();
  }, MAX_RECORDING_MS);

  try {
    // A slice every second, so a long recording isn't one huge buffer.
    recorder.start(1000);
  } catch {
    clearTimeout(limit);
    releaseMicrophone();
    throw new RecorderError('failed');
  }

  const end = () => {
    clearTimeout(limit);
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        releaseMicrophone();
      }
    } else {
      releaseMicrophone();
    }
  };

  return {
    startedAt,
    stop() {
      if (!stopping) {
        stopping = finished;
        end();
      }
      return stopping;
    },
    cancel() {
      cancelled = true;
      chunks.length = 0;
      end();
    },
  };
}
