import { getVisualUrl, type Visual } from '../../../content';
import './LessonVisual.css';

export interface LessonVisualProps {
  visual: Visual | null;
}

/**
 * The lesson's one picture (content/lessons/*.json `visual`): an SVG from
 * content/visuals/, as wide as the reading column, with the lesson's alt
 * text. The team-only `description` is never shown. The file is part of the
 * build (served from the site itself, never another server). Renders
 * nothing if a lesson has no picture. LessonEvidence places it.
 */
export function LessonVisual({ visual }: LessonVisualProps) {
  const url = visual ? getVisualUrl(visual.src) : undefined;
  if (!visual || !url) return null;
  return (
    <figure className="tw-lesson-visual">
      {/* Not lazy: it sits near the top of Read, and the warm-up often asks learners to look at it. */}
      <img src={url} alt={visual.alt} decoding="async" />
    </figure>
  );
}
