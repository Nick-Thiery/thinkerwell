import { useId } from 'react';
import { DefinitionCard } from '../../../components/ds';
import type { GlossaryEntry } from '../../../content';
import { useI18n } from '../../../i18n';

export interface KeyWordsPanelProps {
  id: string;
  glossary: readonly GlossaryEntry[];
}

/**
 * Every glossary word in the lesson, with its meaning and example, so
 * nothing marked in the reading is missed (GlossaryTerm.md). Opened by the
 * "Key words" tool.
 */
export function KeyWordsPanel({ id, glossary }: KeyWordsPanelProps) {
  const { t } = useI18n();
  const headingId = useId();
  return (
    <section id={id} className="tw-read-keywords" aria-labelledby={headingId}>
      <div className="tw-read-keywords-head">
        <h2 id={headingId} className="tw-read-keywords-title">
          {t('lessonPlayer.read.keyWordsTitle')}
        </h2>
        <p className="tw-read-keywords-intro">{t('lessonPlayer.read.keyWordsIntro')}</p>
      </div>
      <ul className="tw-read-keywords-grid">
        {glossary.map((entry) => (
          <li key={entry.word}>
            <DefinitionCard
              className="tw-read-def"
              word={entry.word}
              definition={entry.definition}
              example={entry.example}
              onClose={false}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
