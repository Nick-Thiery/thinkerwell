import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMediaRecorder, restoreSpeechMocks } from '../test/speechMocks';
import {
  canRecordAudio,
  hasMicrophone,
  MAX_RECORDING_MS,
  pickRecordingType,
  RecorderError,
  recorderProblem,
  startRecording,
} from './recorder';

afterEach(() => restoreSpeechMocks());

describe('recorder support', () => {
  it('needs MediaRecorder and getUserMedia', () => {
    expect(canRecordAudio()).toBe(false);
    mockMediaRecorder();
    expect(canRecordAudio()).toBe(true);
  });

  it('tells whether there is a microphone without asking for it', async () => {
    const media = mockMediaRecorder({ devices: [{ kind: 'audioinput' }, { kind: 'audiooutput' }] });
    expect(await hasMicrophone()).toBe(true);
    expect(media.getUserMedia).not.toHaveBeenCalled();
    restoreSpeechMocks();
    mockMediaRecorder({ devices: [{ kind: 'audiooutput' }, { kind: 'videoinput' }] });
    expect(await hasMicrophone()).toBe(false);
    restoreSpeechMocks();
    expect(await hasMicrophone()).toBeNull();
  });

  it('picks the first format the browser can record', () => {
    mockMediaRecorder({ supportedTypes: ['audio/mp4'] });
    expect(pickRecordingType()).toBe('audio/mp4');
    restoreSpeechMocks();
    mockMediaRecorder({ supportedTypes: [] });
    expect(pickRecordingType()).toBeUndefined();
  });

  it('sorts failures into what the learner is told', () => {
    expect(recorderProblem(new DOMException('x', 'NotAllowedError'))).toBe('mic-blocked');
    expect(recorderProblem(new DOMException('x', 'NotFoundError'))).toBe('no-mic');
    expect(recorderProblem(new Error('x'))).toBe('failed');
    expect(recorderProblem(new RecorderError('no-mic'))).toBe('no-mic');
  });
});

describe('startRecording', () => {
  it('asks for the microphone, records, and releases it when stopped', async () => {
    const media = mockMediaRecorder();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const recording = await startRecording();
    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: expect.any(Object) as unknown });
    expect(media.recorders[0]?.state).toBe('recording');
    now.mockReturnValue(4200);
    const { blob, durationMs } = await recording.stop();
    expect(durationMs).toBe(3200);
    expect(blob.type).toBe('audio/webm;codecs=opus');
    expect(blob.size).toBeGreaterThan(0);
    expect(media.trackStop).toHaveBeenCalled();
    // Stopping twice gives the same clip.
    expect((await recording.stop()).blob).toBe(blob);
  });

  it('rejects with the reason when the microphone is refused or missing', async () => {
    mockMediaRecorder({ getUserMediaError: 'NotAllowedError' });
    await expect(startRecording()).rejects.toMatchObject({ problem: 'mic-blocked' });
    restoreSpeechMocks();
    mockMediaRecorder({ getUserMediaError: 'NotFoundError' });
    await expect(startRecording()).rejects.toMatchObject({ problem: 'no-mic' });
    restoreSpeechMocks();
    await expect(startRecording()).rejects.toMatchObject({ problem: 'failed' });
  });

  it('says when the time limit is reached', async () => {
    mockMediaRecorder();
    vi.useFakeTimers();
    try {
      const onLimit = vi.fn();
      const recording = await startRecording({ onLimit });
      vi.advanceTimersByTime(MAX_RECORDING_MS - 1);
      expect(onLimit).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onLimit).toHaveBeenCalledTimes(1);
      await recording.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancel() releases the microphone', async () => {
    const media = mockMediaRecorder();
    const recording = await startRecording();
    recording.cancel();
    expect(media.trackStop).toHaveBeenCalled();
    expect(media.recorders[0]?.state).toBe('inactive');
  });
});
