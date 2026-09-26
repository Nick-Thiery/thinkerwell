# VoiceRecorder

A private practice recorder for the Speak stage: record, listen back, record again or delete.

Props: `state` idle | recording | recorded, `time` (e.g. "0:42"), `title` (default "Record yourself"), `note` (privacy line), `children` (e.g. the task).

- Recordings stay on the device and are never uploaded. Keep only the latest recording per lesson, and delete it when the learner switches or signs out on a shared device.
- The recording dot is ink, not red. No red in learning flows.
- Recording is optional. Practising with a partner, quietly or in writing all count.
