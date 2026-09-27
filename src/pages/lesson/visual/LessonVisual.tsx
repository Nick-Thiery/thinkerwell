import { getVisualUrl, type Visual } from '../../../content';
import './LessonVisual.css';

export interface LessonVisualProps {
  visual: Visual | null;
  className?: string;
}

/**
 * The lesson's one picture (content/lessons/*.json `visual`): an SVG from
 * content/visuals/, shown with the lesson's alt text. Built into the site,
 * so it is precached for offline use like any other asset. Renders nothing
 * if a lesson has no picture.
 */
export function LessonVisual({ visual, className }: LessonVisualProps) {
  const url = visual ? getVisualUrl(visual.src) : undefined;
  if (!visual || !url) return null;
  return (
    <figure className={className ? `tw-lesson-visual ${className}` : 'tw-lesson-visual'}>
      <img src={url} alt={visual.alt} loading="lazy" decoding="async" />
    </figure>
  );
}
