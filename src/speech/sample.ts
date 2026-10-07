/**
 * "Play a sample" in Settings ("Listen voice"): one short sentence, read
 * with the voice an educator is choosing, at the device's Listen speed.
 *
 * The sentence is in the lessons' language, whatever the interface's
 * language (an English voice reads the English one, an Indonesian voice the
 * Indonesian one), so, like the content's verdicts
 * (src/pages/lesson/read/feedbackText.ts), it lives here and not in
 * en.json, where an interface translation would change its language. The
 * Indonesian was drafted by AI and is listed for the native reviewers
 * (docs/translation/README.md).
 */
import { LISTEN_SAMPLES } from './sampleText';
import { baseLang } from './voiceRanking';

/** The sample sentence by the lessons' language ("en", "id"), in ./sampleText.ts so the recordings use it too. */
export { LISTEN_SAMPLES };

/** The sample sentence for a speech tag ("en-GB", "id-ID"); English for a language with none. */
export function listenSample(speechLang: string): string {
  return LISTEN_SAMPLES[baseLang(speechLang)] ?? LISTEN_SAMPLES.en!;
}

/**
 * Reads the sample with `voice` at `rate`, stopping anything already
 * speaking first. Only ever called from a tap.
 */
export function speakSample(synth: SpeechSynthesis, voice: SpeechSynthesisVoice, rate: number): SpeechSynthesisUtterance {
  synth.cancel();
  // A pause() left over from a lesson would hold the new utterance in the queue.
  if (synth.paused) synth.resume();
  const utterance = new SpeechSynthesisUtterance(listenSample(voice.lang));
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = rate;
  synth.speak(utterance);
  return utterance;
}
