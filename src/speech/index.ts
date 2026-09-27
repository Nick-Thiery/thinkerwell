// Listen, Say it and Record yourself (phase 5): the browser speech and media
// APIs, wrapped so the lesson stages stay simple. Nothing here sends a
// learner's voice anywhere unless an educator allows online speech-to-text.
// See CLAUDE.md ("Listen, Say it and Record") and docs/notes/phase-5.md.
export { getSpeechSynthesis, pickListenVoice, useListenVoice } from './voices';
export { LISTEN_RATES, ReadAloudPlayer, type ReadAloudCallbacks } from './readAloud';
export {
  DICTATION_LANG,
  createRecognition,
  dictationMode,
  hasSpeechRecognition,
  installOnDeviceDictation,
  onDeviceDictationStatus,
  type AvailabilityStatus,
  type DictationMode,
  type DictationSettings,
  type RecognitionConstructor,
  type RecognitionLike,
} from './recognition';
export { composeDictation, dictationAnchor, joinTranscript, type DictationAnchor } from './dictationText';
export {
  STOP_GRACE_MS,
  useDictation,
  type Dictation,
  type DictationField,
  type DictationNotice,
} from './useDictation';
export {
  MAX_RECORDING_MS,
  RecorderError,
  canRecordAudio,
  hasMicrophone,
  pickRecordingType,
  recorderProblem,
  startRecording,
  type ActiveRecording,
  type FinishedRecording,
  type RecorderProblem,
} from './recorder';
