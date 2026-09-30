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
// Only English, as for a build with no other language ready.
const englishOnly = [LOCALES[0]!];

afterEach(async () => {
  await deleteAllData();
});

describe('LanguageChoice', () => {
  it('shows nothing while English is the only language offered', () => {
    const { container } = render(
      <I18nProvider offered={englishOnly}>
        <LanguageChoice label="Your language" value="en" onChange={() => undefined} />
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('offers English and Indonesian today, each by its own name', () => {
    render(
      <I18nProvider>
        <LanguageChoice label="Your language" value="en" onChange={() => undefined} />
      </I18nProvider>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Your language' });
    expect(within(group).getAllByRole('radio').map((radio) => [radio.textContent, radio.getAttribute('lang')])).toEqual([
      ['English', 'en'],
      ['Bahasa Indonesia', 'id'],
    ]);
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
  const { currentLearner, deviceLanguage, language } = useLearnerSession();
  return <p data-testid="state">{`${language} ${currentLearner?.language ?? 'none'} ${deviceLanguage ?? 'none'}`}</p>;
}

/** "<language on screen> <learner's saved language> <device's saved language>", once storage has answered. */
const state = () => screen.getByTestId('state');

describe('Settings: the one language setting', () => {
  it('is hidden while English is the only language', () => {
    render(
      <I18nProvider offered={englishOnly}>
        <LearnerSessionProvider>
          <LanguageSetting />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    expect(screen.queryByRole('heading', { name: 'Language' })).not.toBeInTheDocument();
  });

  it('with nobody chosen, changes the language at once and saves it for the device, English as no choice', async () => {
    render(
      <I18nProvider>
        <LearnerSessionProvider>
          <LanguageSetting />
          <Current />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Language on this device' });
    expect(group).toHaveAccessibleDescription(/kept for this device/);
    await waitFor(() => expect(state()).toHaveTextContent('en none none'));
    await userEvent.click(within(group).getByRole('radio', { name: 'Bahasa Indonesia' }));
    await waitFor(() => expect(state()).toHaveTextContent('id none id'));
    expect((await (await getStore()).getSettings()).language).toBe('id');
    await userEvent.click(within(group).getByRole('radio', { name: 'English' }));
    await waitFor(() => expect(state()).toHaveTextContent('en none none'));
  });

  it("with a learner chosen, changes and saves the learner's language, not the device's", async () => {
    const store = await getStore();
    const amina = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.setCurrentLearnerId(amina.id);
    render(
      <I18nProvider>
        <LearnerSessionProvider>
          <LanguageSetting />
          <Current />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    const group = await screen.findByRole('radiogroup', { name: 'Language for Amina' });
    await userEvent.click(within(group).getByRole('radio', { name: 'Bahasa Indonesia' }));
    await waitFor(() => expect(state()).toHaveTextContent('id id none'));
    expect((await store.getLearner(amina.id))?.language).toBe('id');
    expect((await store.getSettings()).language).toBeNull();
  });
});

describe('a new learner', () => {
  const lesson1 = getLessons()[0]!;

  async function submit(chooseLanguage?: string): Promise<NewLearner> {
    const onSubmit = vi.fn((_input: NewLearner) => Promise.resolve());
    render(
      <I18nProvider>
        <LearnerSessionProvider>
          <MemoryRouter>
            <NewLearnerForm lesson1={lesson1} onBack={() => undefined} onSubmit={onSubmit} />
          </MemoryRouter>
          <Current />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    const user = userEvent.setup();
    await waitFor(() => expect(state()).toHaveTextContent('en none none'));
    await user.type(screen.getByLabelText('First name or nickname'), 'Amina');
    const group = screen.getByRole('radiogroup', { name: 'Your language' });
    expect(within(group).getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    if (chooseLanguage) {
      await user.click(within(group).getByRole('radio', { name: chooseLanguage }));
      // The one setting: nobody is chosen yet, so it is the device's, and on screen at once.
      await waitFor(() => expect(state()).toHaveTextContent('id none id'));
    }
    await user.click(screen.getByRole('button', { name: 'Start Lesson 1' }));
    return onSubmit.mock.calls[0]![0];
  }

  it('keeps the language on screen as they join', async () => {
    expect((await submit()).language).toBe('en');
  });

  it('keeps the language they choose, which the page shows at once', async () => {
    expect((await submit('Bahasa Indonesia')).language).toBe('id');
  });

  it('is not asked while English is the only language', () => {
    render(
      <I18nProvider offered={englishOnly}>
        <LearnerSessionProvider>
          <MemoryRouter>
            <NewLearnerForm lesson1={lesson1} onBack={() => undefined} onSubmit={() => Promise.resolve()} />
          </MemoryRouter>
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Your language' })).not.toBeInTheDocument();
  });
});

describe("a learner's home", () => {
  it('changes their language, the one setting, and saves it on their record', async () => {
    const store = await getStore();
    const amina = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.setCurrentLearnerId(amina.id);
    render(
      <I18nProvider>
        <LearnerSessionProvider>
          <MemoryRouter>
            <LearnerDashboard learner={amina} progress={new Map()} />
          </MemoryRouter>
          <Current />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Your language' });
    await waitFor(() => expect(state()).toHaveTextContent('en none none'));
    await userEvent.click(within(group).getByRole('radio', { name: 'Bahasa Indonesia' }));
    await waitFor(() => expect(state()).toHaveTextContent('id id none'));
    expect((await store.getLearner(amina.id))?.language).toBe('id');
  });

  it('shows no language choice while English is the only language', () => {
    const learner = { id: 'a', name: 'Amina', colour: 'lemon' as const, createdAt: '2026-09-01T00:00:00.000Z' };
    render(
      <I18nProvider offered={englishOnly}>
        <MemoryRouter>
          <LearnerDashboard learner={learner} progress={new Map()} />
        </MemoryRouter>
      </I18nProvider>,
    );
    expect(screen.queryByRole('heading', { name: 'Your language' })).not.toBeInTheDocument();
  });
});
