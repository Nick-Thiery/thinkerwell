import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENGLISH, type LoadedLocale } from './core';
import { En, I18nProvider, useI18n } from './I18nProvider';

const loadFont = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./fonts', () => ({ loadFont }));

beforeEach(() => {
  loadFont.mockClear();
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
});

function Probe() {
  const { t, tx, lang, dir, contentLang, uiLang, formatDate, formatNumber, offered } = useI18n();
  return (
    <div>
      <p data-testid="nav">{t('nav.course')}</p>
      <p data-testid="rich">{tx('pages.home.newLearner.startsWithLesson', { number: 10, title: <En>Towns near rivers</En> })}</p>
      <p data-testid="content" {...contentLang}>
        Rivers give water.
        <span data-testid="ui" {...uiLang}>
          {t('ds.content.definition.close')}
        </span>
      </p>
      <p data-testid="meta">{`${lang} ${dir} ${formatNumber(12)} ${formatDate(new Date(2026, 8, 5), { month: 'long' })} ${offered.map((l) => l.code).join(',')}`}</p>
    </div>
  );
}

const dari: LoadedLocale = {
  definition: { code: 'fa-AF', englishName: 'Dari', endonym: 'Dari', dir: 'rtl', font: 'arabic', ready: true },
  messages: { nav: { course: 'TEST course' } },
};

describe('I18nProvider', () => {
  it('is English by default, with no extra markup', () => {
    const { container } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('nav')).toHaveTextContent('Course');
    expect(screen.getByTestId('rich').innerHTML).toBe('Lesson 10: Towns near rivers');
    expect(screen.getByTestId('meta')).toHaveTextContent('en ltr 12 September en');
    expect(container.querySelectorAll('[lang], [dir]')).toHaveLength(0);
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(loadFont).not.toHaveBeenCalled();
  });

  it('loads another language, staying English until it arrives', async () => {
    render(
      <I18nProvider locale="en-XA">
        <Probe />
      </I18nProvider>,
    );
    expect(await screen.findByText('⟦Çööûûŕšé⟧')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-XA');
    expect(document.documentElement.dir).toBe('ltr');
    // The lesson title keeps English, marked as English; the message around it is the language's.
    const rich = screen.getByTestId('rich');
    expect(rich.textContent).toBe('⟦Ļééššööñ 10: Towns near rivers⟧');
    expect(rich.querySelector('span[lang="en"]')).toHaveTextContent('Towns near rivers');
    expect(rich.querySelector('span[lang="en"]')).not.toHaveAttribute('dir');
    expect(screen.getByTestId('content')).toHaveAttribute('lang', 'en');
    expect(screen.getByTestId('ui')).toHaveAttribute('lang', 'en-XA');
    // Dates are formatted by Intl and changed like the messages; numbers keep their digits.
    expect(screen.getByTestId('meta')).toHaveTextContent('en-XA ltr 12 Šééþţééɱƀééŕ en');
  });

  it('marks English course text left to right in a right-to-left language, and loads its font', async () => {
    render(
      <I18nProvider locale="ar-XB">
        <Probe />
      </I18nProvider>,
    );
    await screen.findByText((_, element) => element?.getAttribute('data-testid') === 'meta' && element.textContent.startsWith('ar-XB'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByTestId('content')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('content')).toHaveAttribute('lang', 'en');
    expect(screen.getByTestId('ui')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('ui')).toHaveAttribute('lang', 'ar-XB');
    expect(screen.getByTestId('rich').querySelector('span[lang="en"]')).toHaveAttribute('dir', 'ltr');
    expect(loadFont).toHaveBeenCalledWith('arabic');
  });

  it('uses a language it is given as it is, with its digits, falling back to English for missing keys', () => {
    render(
      <I18nProvider loaded={dari} offered={[ENGLISH.definition, dari.definition]}>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('nav')).toHaveTextContent('TEST course');
    expect(screen.getByTestId('ui')).toHaveTextContent('Close');
    expect(screen.getByTestId('meta').textContent).toMatch(/^fa-AF rtl ۱۲ \S+ en,fa-AF$/);
  });

  it('goes back to English at once', async () => {
    const { rerender } = render(
      <I18nProvider locale="en-XA">
        <Probe />
      </I18nProvider>,
    );
    await screen.findByText('⟦Çööûûŕšé⟧');
    rerender(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('nav')).toHaveTextContent('Course');
    expect(document.documentElement.lang).toBe('en');
  });

  it('stays English for a language it does not know', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <I18nProvider locale="de">
        <Probe />
      </I18nProvider>,
    );
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getByTestId('nav')).toHaveTextContent('Course');
  });

  it('keeps the dev right-to-left switch for English, with course text following the page', () => {
    render(
      <I18nProvider dirOverride="rtl">
        <Probe />
      </I18nProvider>,
    );
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByTestId('content')).not.toHaveAttribute('dir');
  });
});
