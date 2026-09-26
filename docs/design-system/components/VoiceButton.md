# VoiceButton

The "Say it" microphone button. The learner talks and their words appear in a writing box. `WritingBox` shows it when you pass `dictate`.

Props: `state` idle | listening, `children` (label, default "Say it"), `stopLabel` (default "Stop").

- Idle: a lavender mic disc and "Say it". Listening: the button turns ink, the disc turns lemon and pulses, and the label becomes "Stop".
- Speech is turned into text on the device where the browser can do that. Don't send children's voices to an online service without a partner's consent; if a device can't do it offline, hide the button rather than show a broken one.
- The box stays editable: dictated words are a draft the learner can fix.
