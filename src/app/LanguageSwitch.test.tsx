import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider, LOCALES } from '../i18n';
import { LearnerSessionProvider, useLearnerSession } from '../session';
import { deleteAllData, getStore } from '../storage';
import { LanguageSwitch } from './LanguageSwitch';

afterEach(async () => {
  await deleteAllData();
});

function Language() {
  return <p data-testid="language">{useLearnerSession().language}</p>;
}

function renderSwitch(compact = false) {
  return render(
    <I18nProvider>
      <LearnerSessionProvider>
        <LanguageSwitch compact={compact} />
        <Language />
      </LearnerSessionProvider>
    </I18nProvider>,
  );
}

describe('the header’s language switch', () => {
  it('shows the language on screen in its own name, with a globe, and opens every language in its own name', async () => {
    renderSwitch();
    const button = screen.getByRole('button', { name: 'Language: English' });
    expect(button).toHaveTextContent('English');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const group = screen.getByRole('radiogroup', { name: 'Language' });
    expect(within(group).getAllByRole('radio').map((radio) => [radio.textContent, radio.getAttribute('lang')])).toEqual([
      ['English', 'en'],
      ['Bahasa Indonesia', 'id'],
      ['Bahasa Melayu', 'ms'],
    ]);
    // The chosen one has focus, for the arrow keys.
    expect(within(group).getByRole('radio', { name: 'English' })).toHaveFocus();
  });

  it('changes the one language setting (the device’s, with nobody chosen), closes and gives focus back', async () => {
    renderSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'Language: English' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Bahasa Indonesia' }));
    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('id'));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Language: / })).toHaveFocus();
    await waitFor(async () => expect((await (await getStore()).getSettings()).language).toBe('id'));
  });

  it('closes with Escape, giving focus back, without changing anything', async () => {
    renderSwitch();
    const button = screen.getByRole('button', { name: 'Language: English' });
    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(screen.getByTestId('language')).toHaveTextContent('en');
  });

  it('shows a short code on a phone, keeping the full name for screen readers', () => {
    renderSwitch(true);
    const button = screen.getByRole('button', { name: 'Language: English' });
    expect(button).toHaveTextContent('EN');
  });

  it('shows nothing while English is the only language', () => {
    const { container } = render(
      <I18nProvider offered={[LOCALES[0]!]}>
        <LearnerSessionProvider>
          <LanguageSwitch />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
