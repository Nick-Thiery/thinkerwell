import { Button } from '../components/ds';
import { useI18n } from '../i18n';
import { useLearnerSession } from '../session';
import { PlaceholderPage } from './PlaceholderPage';

/**
 * My journal: still the phase 1 placeholder; the journal itself is phase 7.
 * Its print view (/journal/print) exists already, so a chosen learner can
 * print what they have written. Phase 7's "Print my journal" button (on
 * Journal.dc.html) should link there.
 */
export function JournalPage() {
  const { t } = useI18n();
  const { activeLearner } = useLearnerSession();
  return (
    <PlaceholderPage title={t('pages.journal.title')}>
      {activeLearner ? (
        <div>
          <Button variant="secondary" icon="Printer" href="/journal/print">
            {t('print.printJournal')}
          </Button>
        </div>
      ) : null}
    </PlaceholderPage>
  );
}
