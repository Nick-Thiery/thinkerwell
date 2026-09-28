import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLessons } from '../content';
import { findLocale, I18nProvider, LOCALES, type LocaleDefinition } from '../i18n';
import { NewLearnerForm } from '../pages/home/NewLearnerForm';
import { LearnerDashboard } from '../pages/home/LearnerDashboard';
import { LanguageSetting } from '../pages/settings/LanguageSetting';
import { LearnerSessionProvider, useLearnerSession } from '../session';
import { deleteAllData, getStore, type NewLearner } from '../storage';
import { LanguageChoice } from './LanguageChoice';

// A second ready language, as it will be once a translation is checked.
// Its endonym is a stand-in: no real translation is written here.
const second: LocaleDefinition = { ...findLocale('so')!, ready: true, endonym: 'Second' };
const rtl: LocaleDefinition = { ...findLocale('fa-AF')!, ready: true, endonym: 'Third' };
const offered = [LOCALES[0]!, second, rtl];

afterEach(async () => {
  await deleteAllData();
});

describe('LanguageChoice', () => {
  it('shows nothing while English is the only language offered (today)', () => {
    const { container } = render(
      <I18nProvider>
        <LanguageChoice label="Your language" value="en" onChange={() => undefined} />
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('offers each language by its own name, in its own language and direction', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider offered={offered}>
        <LanguageChoice label="Your language" value="en" onChange={onChange} />
      </I18nProvider>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Your language' });
    const chips = within(group).getAllByRole('radio');
    expect(chips.map((chip) => chip.textContent)).toEqual(['English', 'Second', 'Third']);
    expect(chips.map((chip) => [chip.getAttribute('lang'), chip.getAttribute('dir')])).toEqual([
      ['en', 'ltr'],
      ['so', 'ltr'],
      ['fa-AF', 'rtl'],
    ]);
    expect(chips[0]).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(chips[2]!);
    expect(onChange).toHaveBeenCalledWith('fa-AF');
    await userEvent.click(chips[0]!);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

function Current() {
  const { currentLearner, deviceLanguage } = useLearnerSession();
  return <p data-testid="state">{`${currentLearner?.language ?? 'none'} ${deviceLanguage ?? 'none'}`}</p>;
}

describe('Settings: the language on this device', () => {
  it('is hidden while English is the only language', () => {
    render(
      <LearnerSessionProvider>
        <LanguageSetting />
      </LearnerSessionProvider>,
    );
    expect(screen.queryByRole('heading', { name: 'Language' })).not.toBeInTheDocument();
  });

  it('saves the device language, and English as no choice', async () => {
    render(
      <I18nProvider offered={offered}>
        <LearnerSessionProvider>
          <LanguageSetting />
          <Current />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Language' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: 'Language on this device' });
    expect(group).toHaveAccessibleDescription(/The lessons stay in English/);
    await waitFor(() => expect(within(group).getByRole('radio', { name: 'English' })).toBeEnabled());
    await userEvent.click(within(group).getByRole('radio', { name: 'Second' }));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('none so'));
    expect((await (await getStore()).getSettings()).language).toBe('so');
    await userEvent.click(within(group).getByRole('radio', { name: 'English' }));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('none none'));
  });
});

describe('a new learner', () => {
  const lesson1 = getLessons()[0]!;

  async function submit(chooseLanguage?: string): Promise<NewLearner> {
    const onSubmit = vi.fn((_input: NewLearner) => Promise.resolve());
    render(
      <I18nProvider offered={offered}>
        <MemoryRouter>
          <NewLearnerForm lesson1={lesson1} onBack={() => undefined} onSubmit={onSubmit} />
        </MemoryRouter>
      </I18nProvider>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('First name or nickname'), 'Amina');
    const group = screen.getByRole('radiogroup', { name: 'Your language' });
    expect(within(group).getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    if (chooseLanguage) await user.click(within(group).getByRole('radio', { name: chooseLanguage }));
    await user.click(screen.getByRole('button', { name: 'Start Lesson 1' }));
    return onSubmit.mock.calls[0]![0];
  }

  it("follows the device's language until they choose one", async () => {
    expect(await submit()).not.toHaveProperty('language');
  });

  it('keeps the language they choose', async () => {
    expect((await submit('Third')).language).toBe('fa-AF');
  });

  it('is not asked while English is the only language', () => {
    render(
      <MemoryRouter>
        <NewLearnerForm lesson1={lesson1} onBack={() => undefined} onSubmit={() => Promise.resolve()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Your language' })).not.toBeInTheDocument();
  });
});

describe("a learner's home", () => {
  it('lets them change their own language, and saves it on their record', async () => {
    const store = await getStore();
    const amina = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.setCurrentLearnerId(amina.id);
    render(
      <I18nProvider offered={offered}>
        <LearnerSessionProvider>
          <MemoryRouter>
            <LearnerDashboard learner={amina} progress={new Map()} />
          </MemoryRouter>
          <Current />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Your language' });
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('none none'));
    await userEvent.click(within(group).getByRole('radio', { name: 'Second' }));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('so none'));
    expect((await store.getLearner(amina.id))?.language).toBe('so');
  });

  it('shows no language choice while English is the only language', () => {
    const learner = { id: 'a', name: 'Amina', colour: 'lemon' as const, createdAt: '2026-09-01T00:00:00.000Z' };
    render(
      <MemoryRouter>
        <LearnerDashboard learner={learner} progress={new Map()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('heading', { name: 'Your language' })).not.toBeInTheDocument();
  });
});
