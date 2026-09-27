import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { handleRovingKeyDown, useRovingTabIndex } from '../../components/ds/internal/rovingFocus';
import { LEARNER_COLOURS, type LearnerColour } from '../../storage';
import { useI18n } from '../../i18n';

/** Fill colour (a design token) for each learner avatar colour, in swatch order. */
const SWATCH_TOKEN: Record<LearnerColour, string> = {
  lemon: 'var(--lemon)',
  history: 'var(--sec-history)',
  geography: 'var(--sec-geography)',
  civics: 'var(--sec-civics)',
  paper: 'var(--paper)',
};

interface SwatchProps {
  colour: LearnerColour;
  checked: boolean;
  onChoose: (colour: LearnerColour) => void;
}

function Swatch({ colour, checked, onChoose }: SwatchProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  useRovingTabIndex(ref, checked);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    handleRovingKeyDown(event);
  }

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={t(`pages.home.newLearner.colour.${colour}`)}
      className="tw-colour-swatch"
      style={{
        background: SWATCH_TOKEN[colour],
        border: checked ? '3px solid var(--ink)' : colour === 'paper' ? '2px solid var(--ink-muted)' : '2px solid var(--paper)',
        boxShadow: checked ? '0 0 0 3px var(--paper)' : 'none',
      }}
      onClick={() => onChoose(colour)}
      onKeyDown={handleKeyDown}
    />
  );
}

export interface ColourPickerProps {
  value: LearnerColour;
  onChange: (colour: LearnerColour) => void;
  legend: string;
}

/**
 * The five round colour swatches on NewLearner.dc.html, as a real
 * `role="radiogroup"` of `role="radio"` buttons with the same left/right and
 * Home/End roving as the design system's Chip radio groups (src/components/ds/Chip.tsx).
 */
export function ColourPicker({ value, onChange, legend }: ColourPickerProps) {
  return (
    <fieldset className="tw-colour-fieldset">
      <legend className="label">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="tw-colour-radiogroup">
        {LEARNER_COLOURS.map((colour) => (
          <Swatch key={colour} colour={colour} checked={value === colour} onChoose={onChange} />
        ))}
      </div>
    </fieldset>
  );
}
