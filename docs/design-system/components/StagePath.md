# StagePath

The Read, Write, Speak, Watch, Reflect path inside a lesson; every step stays clickable.

Props: `current` (stage id), `done` (array of stage ids), `orientation` horizontal | vertical, `sublabels` (`{read: '3 parts · quick check'}` for vertical), `compact` (icons only except the current step, for phones).

- Laptop lessons use the vertical path in a left rail; tablet uses horizontal; phone uses compact.
- Steps are never locked. Done steps show a check; the current step is ink with a lemon mark.
