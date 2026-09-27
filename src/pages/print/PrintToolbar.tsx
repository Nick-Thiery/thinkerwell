import { Button } from '../../components/ds';
import { useI18n } from '../../i18n';

export interface PrintToolbarProps {
  /** Where "back" goes, and what it says. */
  backHref: string;
  backLabel: string;
  /** False when there is nothing to print (the journal with nobody chosen). */
  canPrint?: boolean;
}

/**
 * The bar above a print view on screen: back to where the learner was, and
 * Print (the browser's own print dialog, which can also save a PDF). It
 * never prints (print.css hides .tw-no-print).
 */
export function PrintToolbar({ backHref, backLabel, canPrint = true }: PrintToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="tw-print-toolbar tw-no-print">
      <Button variant="ghost" icon="ArrowLeft" href={backHref}>
        {backLabel}
      </Button>
      {canPrint ? (
        <Button variant="primary" icon="Printer" onClick={() => window.print()}>
          {t('print.print')}
        </Button>
      ) : null}
    </div>
  );
}

/** Empty lines to write on, on paper. Decorative: hidden from screen readers. */
export function AnswerLines({ count }: { count: number }) {
  return (
    <div className="tw-print-lines" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
