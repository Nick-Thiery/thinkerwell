/**
 * Code cards (/educators/code-cards): an educator types a prefix for their
 * group (HLP) and the number of learners, and gets A4 pages of cards to cut
 * out (HLP-01, HLP-02 …, ten to a page) and a matching list with a blank
 * space for each learner's name, for the organisation to keep. Learners
 * type their code as their name on the device, so no real name is ever in
 * Thinkerwell (docs/research/MEASUREMENT_PLAN.md, "Pilot codes, not names").
 *
 * Codes are marked translate="no": they are identifiers, the same in every
 * language, and a browser's own translation must never change them.
 *
 * The prefix and number are in the address (?prefix=HLP&count=20), so a
 * reload or a shared link makes the same cards. Nothing is saved, and no
 * name is ever typed here.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { educatorsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { TextField } from '../../components/ds';
import { useI18n } from '../../i18n';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import { cardPages, isValidPrefix, learnerCodes, MAX_LEARNERS, normalisePrefix, parseCount } from './codeCards';
import './CodeCardsPage.css';

const DEFAULT_COUNT = '20';

export function CodeCardsPage() {
  const { t, tx } = useI18n();
  const title = t('pages.codeCards.title');
  usePageTitle(title);
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefix, setPrefix] = useState(() => normalisePrefix(searchParams.get('prefix') ?? ''));
  const [countText, setCountText] = useState(() => searchParams.get('count') ?? DEFAULT_COUNT);
  // A half-typed prefix ("H") isn't wrong yet: say so once the field is left.
  const [prefixLeft, setPrefixLeft] = useState(false);

  const prefixValid = isValidPrefix(prefix);
  const count = parseCount(countText);
  const codes = prefixValid && count !== null ? learnerCodes(prefix, count) : [];
  const pages = cardPages(codes);

  function remember(next: { prefix: string; count: string }): void {
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }

  const tile = t('pages.home.newLearnerTile');

  return (
    <div className="tw-print-page tw-codes-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={t('pages.teacherTools.back')} canPrint={codes.length > 0} />

      <section className="tw-codes-setup tw-no-print" aria-labelledby="codes-title">
        <h1 id="codes-title" className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.codeCards.intro')}</p>
        <div className="tw-codes-fields">
          <TextField
            label={t('pages.codeCards.prefixLabel')}
            helper={prefixLeft && !prefixValid ? t('pages.codeCards.prefixInvalid') : t('pages.codeCards.prefixHelper')}
            invalid={prefixLeft && !prefixValid}
            value={prefix}
            onValueChange={(value) => {
              const next = normalisePrefix(value);
              setPrefix(next);
              remember({ prefix: next, count: countText });
            }}
            onBlur={() => setPrefixLeft(true)}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <TextField
            label={t('pages.codeCards.countLabel')}
            helper={
              count === null
                ? t('pages.codeCards.countInvalid', { max: MAX_LEARNERS })
                : t('pages.codeCards.countHelper', { max: MAX_LEARNERS })
            }
            invalid={count === null}
            value={countText}
            onValueChange={(value) => {
              setCountText(value);
              remember({ prefix, count: value });
            }}
            inputMode="numeric"
            maxLength={3}
          />
        </div>
        <p className="tw-codes-summary" aria-live="polite">
          {codes.length > 0
            ? tx('pages.codeCards.summary', {
                count: codes.length,
                first: <span translate="no">{codes[0]}</span>,
                last: <span translate="no">{codes[codes.length - 1]}</span>,
              })
            : null}
        </p>
      </section>

      {codes.length > 0 ? (
        <>
          <section className="tw-codes-cards" aria-labelledby="codes-cards-title">
            <h2 id="codes-cards-title" className="h2 tw-no-print">
              {t('pages.codeCards.cardsTitle')}
            </h2>
            {pages.map((page) => (
              <ul key={page[0]} className="tw-codes-sheet" role="list">
                {page.map((code) => (
                  <li key={code} className="tw-code-card">
                    <span className="tw-code-card-brand" translate="no">
                      {t('app.name')}
                    </span>
                    <span className="tw-code-card-label">{t('pages.codeCards.cardLabel')}</span>
                    <strong className="tw-code-card-code" translate="no">
                      {code}
                    </strong>
                    <span className="tw-code-card-how">{t('pages.codeCards.cardHow', { tile })}</span>
                    <span className="tw-code-card-keep">{t('pages.codeCards.cardKeep')}</span>
                  </li>
                ))}
              </ul>
            ))}
          </section>

          <section className="tw-print-sheet tw-codes-list" aria-labelledby="codes-list-title">
            <header className="tw-print-head">
              <p className="tw-print-brand">{t('print.brand')}</p>
              <h2 id="codes-list-title" className="tw-print-title">
                {t('pages.codeCards.listTitle')}
              </h2>
            </header>
            <p>{t('pages.codeCards.listIntro')}</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('pages.codeCards.listCode')}</th>
                  <th scope="col">{t('pages.codeCards.listName')}</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code}>
                    <th scope="row" translate="no">
                      {code}
                    </th>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
