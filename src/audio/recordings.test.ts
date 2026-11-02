import { afterEach, describe, expect, it } from 'vitest';
import { audioUrl, recordingRef, recordingsOf, recordingTrack, setRecordingsForTests } from './recordings';

// A preview course's recordings are a track of their own ("id/digital-world",
// public/audio/id/digital-world/), so Our World's never change and a device
// without the preview downloads nothing of them.

const OUR_WORLD = { en: { timings: '/audio/en/timings.a.json', files: 1, bytes: 10 } };
const COURSES = { 'digital-world': { id: { timings: '/audio/id/digital-world/timings.b.json', files: 1, bytes: 20 } } };

afterEach(() => setRecordingsForTests(null));

describe('recording tracks', () => {
  it('are the language for Our World and "<lang>/<course>" for a preview course', () => {
    expect(recordingTrack('id-ID')).toBe('id');
    expect(recordingTrack('id-ID', 'our-world')).toBe('id');
    expect(recordingTrack('id-ID', 'digital-world')).toBe('id/digital-world');
  });

  it('find a course’s own files, and never Our World’s for a course without recordings', () => {
    setRecordingsForTests(OUR_WORLD, COURSES);
    expect(recordingsOf('id/digital-world')?.bytes).toBe(20);
    expect(recordingsOf('en-GB')?.bytes).toBe(10);
    expect(recordingsOf('en/digital-world')).toBeUndefined();
    expect(audioUrl('id/digital-world', 'dw-what-ai-is-standard-1.abc.mp3')).toBe('/audio/id/digital-world/dw-what-ai-is-standard-1.abc.mp3');
    expect(audioUrl('id-ID', 'l01-standard-1.abc.mp3')).toBe('/audio/id/l01-standard-1.abc.mp3');
  });

  it('ask for a course lesson’s recording in its course’s track, or none', () => {
    setRecordingsForTests(OUR_WORLD, COURSES);
    expect(recordingRef('id-ID', 'dw-what-ai-is/standard/1', ['Apa itu AI'], 'digital-world')?.lang).toBe('id/digital-world');
    expect(recordingRef('en-US', 'dw-what-ai-is/standard/1', ['What AI is'], 'digital-world')).toBeNull();
    expect(recordingRef('en-US', 'l01/standard/1', ['Maps'])?.lang).toBe('en');
  });
});
