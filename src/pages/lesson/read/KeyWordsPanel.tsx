import { useId } from 'react';
import { DefinitionCard } from '../../../components/ds';
import type { GlossaryEntry } from '../../../content';
import { useI18n } from '../../../i18n';
import { glossaryMeaning } from '../../../lesson/glossaryMeaning';

export interface KeyWordsPanelProps {
  glossary: readonly GlossaryEntry[];
}

/**
 * Every glossary word in the lesson, with its meaning and example, so
 * nothing marked in the reading is missed (GlossaryTerm.md). Inside the
 * "Key words" disclosure under the reading, whose summary shows its title.
 */
export function KeyWordsPanel({ glossary }: KeyWordsPanelProps) {
  const { t, definition: locale } = useI18n();
  const headingId = useId();
  return (
    <section className="tw-read-keywords" aria-labelledby={headingId}>
      <div className="tw-read-keywords-head">
        <h2 id={headingId} className="tw-visually-hidden">
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
              meaning={glossaryMeaning(entry, locale)}
              onClose={false}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
