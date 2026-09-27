import { useId } from 'react';
import { Badge, Icon } from '../../../components/ds';
import { getCourse, type Evidence, type EvidenceCard, type Visual } from '../../../content';
import { useI18n } from '../../../i18n';
import { LessonVisual } from '../visual/LessonVisual';
import { EvidenceTable } from './EvidenceTable';
import './LessonEvidence.css';

export interface LessonEvidenceProps {
  evidence: Evidence;
  /** The lesson's picture (lesson.visual), shown first, above the observation question. */
  visual?: Visual | null;
  /** Offers "See it bigger" on the picture (LessonVisual); the print view turns it off. */
  enlargeablePicture?: boolean;
}

type CardOf<T extends EvidenceCard['type']> = Extract<EvidenceCard, { type: T }>;

/**
 * The lesson's evidence (content/lessons/*.json `evidence`): the lesson's
 * picture, the observation question, then every card, whatever its type.
 * One renderer per card type (docs/content/SPEC.md section 3), no per-lesson
 * code. Read shows it after the warm-up (which often says "Look at the
 * map"); Write shows the same thing behind "Look at the map again".
 *
 * The picture comes before the question and the fiction label, not inside a
 * card: some lessons pair invented evidence with a picture of real places
 * (Lesson 8's trade routes), and the label must not seem to cover those.
 *
 * Honesty (CLAUDE.md rule 8): when the evidence is invented, the fiction
 * label from content/course.json sits under the question, and the first
 * card's caption carries a "Fictional" badge, as on the screens. Real
 * evidence shows neither.
 *
 * The page shell owns the h1 and the stage's h2, so each card's title is an
 * h3 inside its figcaption.
 */
export function LessonEvidence({ evidence, visual = null, enlargeablePicture = true }: LessonEvidenceProps) {
  const { t } = useI18n();
  const baseId = useId();
  const fictionLabel = evidence.fictional ? getCourse().fictionLabel : null;

  return (
    <section className="tw-lx" aria-label={t('lessonPlayer.evidence.sectionLabel')}>
      <LessonVisual visual={visual} enlargeable={enlargeablePicture} />
      <div className="tw-lx-prompt">
        <span className="tw-lx-eyebrow">
          <Icon name="Eye" size={16} />
          {t('lessonPlayer.evidence.eyebrow')}
        </span>
        <p className="tw-lx-question">{evidence.question}</p>
        {fictionLabel ? (
          <p className="tw-lx-fiction">
            <Icon name="Info" size={16} />
            {fictionLabel}
          </p>
        ) : null}
      </div>
      {evidence.cards.map((card, index) => (
        <EvidenceFigure
          key={index}
          card={card}
          titleId={`${baseId}-card-${index}`}
          fictionalBadge={evidence.fictional && index === 0}
        />
      ))}
    </section>
  );
}

interface EvidenceFigureProps {
  card: EvidenceCard;
  titleId: string;
  fictionalBadge: boolean;
}

function EvidenceFigure({ card, titleId, fictionalBadge }: EvidenceFigureProps) {
  const { t } = useI18n();
  return (
    // The type modifier is tw-lx-card-<type>, never tw-lx-<type>: the inner
    // lists already use tw-lx-items, tw-lx-timeline, tw-lx-sources and
    // tw-lx-table, and sharing a class would give the figure their styles.
    <figure className={`tw-lx-card tw-lx-card-${card.type}`} aria-labelledby={titleId}>
      <figcaption className="tw-lx-caption">
        <h3 id={titleId} className="tw-lx-title">
          {card.title}
        </h3>
        {fictionalBadge ? (
          <Badge tone="lavender" icon="Info">
            {t(`lessonPlayer.evidence.fictionalBadge.${card.type}`)}
          </Badge>
        ) : null}
      </figcaption>
      <EvidenceBody card={card} />
    </figure>
  );
}

function EvidenceBody({ card }: { card: EvidenceCard }) {
  switch (card.type) {
    case 'items':
      return <ItemsBody card={card} />;
    case 'timeline':
      return <TimelineBody card={card} />;
    case 'map':
      return <MapBody card={card} />;
    case 'cases':
      return <CasesBody card={card} />;
    case 'sources':
      return <SourcesBody card={card} />;
    case 'table':
      return <EvidenceTable card={card} />;
  }
}

function ItemsBody({ card }: { card: CardOf<'items'> }) {
  return (
    <ul className="tw-lx-items">
      {card.items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function TimelineBody({ card }: { card: CardOf<'timeline'> }) {
  return (
    // role="list": Safari drops list semantics from unstyled lists.
    <ol className="tw-lx-timeline" role="list">
      {card.events.map((event, index) => (
        <li key={index} className="tw-lx-event">
          <span className="tw-lx-year">{event.year}</span>
          <span className="tw-lx-event-text">{event.text}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A map card: its key and its places, as text. The key lists labels only:
 * the lesson's picture draws its own key in the picture's own colours, and
 * swatches here could not match every picture (the content names colours
 * loosely, "brown" or "grey"), or would describe a map that has no picture
 * (Lesson 8's small trading network).
 */
function MapBody({ card }: { card: CardOf<'map'> }) {
  const { t } = useI18n();
  const keyId = useId();
  return (
    <>
      {card.legend.length > 0 ? (
        <div className="tw-lx-legend">
          <span id={keyId} className="tw-lx-legend-label">
            {t('lessonPlayer.evidence.mapKey')}
          </span>
          <ul className="tw-lx-legend-list" role="list" aria-labelledby={keyId}>
            {card.legend.map((entry, index) => (
              <li key={index}>{entry.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <ul className="tw-lx-grid tw-lx-places" role="list" aria-label={t('lessonPlayer.evidence.places')}>
        {card.locations.map((location) => (
          <li key={location.id} className="tw-lx-tile">
            <span className="tw-lx-name">{location.label}</span>
            <span className="tw-lx-desc">{location.description}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function CasesBody({ card }: { card: CardOf<'cases'> }) {
  return (
    <ul className="tw-lx-grid tw-lx-cases" role="list">
      {card.cases.map((item, index) => (
        <li key={index} className="tw-lx-tile">
          <span className="tw-lx-name">{item.name}</span>
          <span className="tw-lx-desc">{item.body}</span>
        </li>
      ))}
    </ul>
  );
}

function SourcesBody({ card }: { card: CardOf<'sources'> }) {
  return (
    <ul className="tw-lx-sources" role="list">
      {card.sources.map((source, index) => (
        <li key={index} className="tw-lx-tile">
          <span className="tw-lx-name">{source.caption}</span>
          {source.details.length === 1 ? (
            <span className="tw-lx-desc">{source.details[0]}</span>
          ) : (
            <ul className="tw-lx-details">
              {source.details.map((detail, detailIndex) => (
                <li key={detailIndex}>{detail}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
