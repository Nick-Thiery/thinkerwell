import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { GlossaryEntry } from '../../../content';
import { findLocale, I18nProvider, type LoadedLocale } from '../../../i18n';
import { KeyWordsPanel } from './KeyWordsPanel';
import { ReadingPassage } from './ReadingPassage';

// A glossary word with a meaning in Dari, as a lesson file could carry one
// once a native speaker has written it. A fixture, not a translation.
const glossary: GlossaryEntry[] = [
  { word: 'river', definition: 'A large stream of water.', example: 'The river is wide.', translations: { 'fa-AF': 'FIXTURE meaning' } },
];
const dari: LoadedLocale = { definition: { ...findLocale('fa-AF')!, ready: true }, messages: { ds: { content: { definition: { close: 'FIXTURE close' } } } } };

function renderReading(loaded?: LoadedLocale) {
  render(
    <I18nProvider loaded={loaded}>
      <div className="tw-reading-text" lang={loaded ? 'en' : undefined}>
        <ReadingPassage text="People live by the river." glossary={glossary} />
      </div>
      <KeyWordsPanel id="keywords" glossary={glossary} />
    </I18nProvider>,
  );
}

describe("a glossary word's meaning in the learner's language", () => {
  it('shows under the English definition, labelled with its own name, in its own language and direction', async () => {
    renderReading(dari);
    await userEvent.click(screen.getByRole('button', { name: 'river' }));
    const popover = screen.getByRole('dialog');
    // The popover's own buttons are back in the interface's language and direction.
    expect(popover).toHaveAttribute('lang', 'fa-AF');
    expect(popover).toHaveAttribute('dir', 'rtl');
    expect(within(popover).getByRole('button', { name: 'FIXTURE close' })).toBeInTheDocument();
    // The word, its definition and its example stay English.
    expect(within(popover).getByText('A large stream of water.')).toHaveAttribute('lang', 'en');
    expect(within(popover).getByText('The river is wide.')).toHaveAttribute('lang', 'en');
    const meaning = within(popover).getByText('FIXTURE meaning').parentElement!;
    expect(meaning).toHaveAttribute('lang', 'fa-AF');
    expect(meaning).toHaveAttribute('dir', 'rtl');
    expect(meaning).toHaveTextContent(/^دریFIXTURE meaning$/);
    // It comes after the definition.
    const definition = within(popover).getByText('A large stream of water.');
    expect(definition.compareDocumentPosition(meaning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows in the Key words panel too', () => {
    renderReading(dari);
    const panel = screen.getByRole('region', { name: /Key words/ });
    expect(within(panel).getByText('FIXTURE meaning').parentElement).toHaveAttribute('lang', 'fa-AF');
  });

  it('is not there in English, and the popover has no extra markup', async () => {
    renderReading();
    await userEvent.click(screen.getByRole('button', { name: 'river' }));
    const popover = screen.getByRole('dialog');
    expect(within(popover).queryByText('FIXTURE meaning')).not.toBeInTheDocument();
    expect(popover).not.toHaveAttribute('lang');
    expect(popover.querySelectorAll('[lang], [dir]')).toHaveLength(0);
  });
});
