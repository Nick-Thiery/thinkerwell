import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { IconName } from './types';
import './EvidenceCard.css';

const EVIDENCE_ICON: Record<string, IconName> = {
  object: 'Package',
  document: 'FileText',
  note: 'NotebookPen',
  receipt: 'Receipt',
  drawing: 'ImageIcon',
  map: 'Map',
};

export interface EvidenceCardProps {
  kind?: 'object' | 'note' | 'document' | 'receipt' | 'drawing' | 'map';
  title: string;
  items?: string[];
  text?: string;
  quote?: boolean;
  /** Shows the fiction label (content/course.json's `fictionLabel`); see CLAUDE.md's honesty rule. */
  fictional?: boolean;
  className?: string;
}

/** A piece of evidence for a "how do we know?" question: an object, a note, a document. */
export function EvidenceCard({ kind, title, items, text, quote, fictional, className }: EvidenceCardProps) {
  const { t } = useI18n();
  return (
    <article className={cx('tw-evidence', className)}>
      <div className="tw-evidence-head">
        <span className="tw-evidence-icon">
          <Icon name={EVIDENCE_ICON[kind ?? ''] ?? 'FileText'} size={22} />
        </span>
        <span className="tw-evidence-title">{title}</span>
      </div>
      {items ? (
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}
      {text ? <p className={cx('tw-evidence-text', quote && 'tw-evidence-quote')}>{text}</p> : null}
      {fictional ? (
        <span className="tw-evidence-foot">
          <Icon name="Info" size={16} />
          {t('ds.content.evidence.fictional')}
        </span>
      ) : null}
    </article>
  );
}
