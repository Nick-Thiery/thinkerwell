/**
 * The sentence "Play a sample" reads in Settings ("Listen voice"), by the
 * lessons' language ("en", "id", "ms", "vi"). Pure, with no imports, so the
 * recorded-audio tools (tools/audio/) record the same sentence
 * (docs/notes/recorded-audio.md). See ./sample.ts.
 */
export const LISTEN_SAMPLES: Readonly<Record<string, string>> = {
  en: 'This is the voice that reads the lessons aloud.',
  id: 'Ini suara yang membacakan pelajaran.',
  ms: 'Inilah suara yang membacakan pelajaran.',
  vi: 'Đây là giọng đọc các bài học cho bạn nghe.',
};
