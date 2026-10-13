import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { SettingsPage } from '../SettingsPage';

afterEach(async () => {
  await deleteAllData();
});

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <LearnerSessionProvider>
        <SettingsPage />
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const codeField = () => screen.getByLabelText('Organisation code');
const share = () => screen.getByRole('checkbox', { name: 'Share pilot results from this device' });
const saveCode = () => screen.getByRole('button', { name: 'Save code' });
const settings = async () => (await getStore()).getSettings();

describe('Settings: Share pilot results', () => {
  it('is off by default, explained, and cannot be turned on without a code', async () => {
    renderSettings();
    expect(await screen.findByRole('heading', { level: 2, name: 'Share pilot results' })).toBeInTheDocument();
    await waitFor(() => expect(codeField()).toBeEnabled());
    expect(share()).not.toBeChecked();
    expect(share()).toBeDisabled();
    expect(screen.getByText('Sharing is off. Nothing is sent.')).toBeInTheDocument();
    expect(share()).toHaveAccessibleDescription(/never includes names, writing or recordings/);
    expect(share()).toHaveAccessibleDescription(/Save an organisation code first/);
    const saved = await settings();
    expect(saved.partner.sharePilotResults).toBeUndefined();
    expect(saved.partner.organisationCode).toBeUndefined();
  });

  it('checks the code as it is typed and saves it in its lower-case form', async () => {
    const user = userEvent.setup();
    renderSettings();
    await waitFor(() => expect(codeField()).toBeEnabled());
    await user.type(codeField(), 'Help Jakarta!');
    expect(screen.getByText(/Use letters, numbers and hyphens/)).toBeInTheDocument();
    expect(saveCode()).toBeDisabled();
    await user.clear(codeField());
    await user.type(codeField(), ' Help Jakarta ');
    expect(saveCode()).toBeEnabled();
    await user.click(saveCode());
    await waitFor(async () => expect((await settings()).partner.organisationCode).toBe('help-jakarta'));
    // Saving a code does not turn sharing on.
    expect((await settings()).partner.sharePilotResults).toBeUndefined();
    await waitFor(() => expect(share()).toBeEnabled());
    expect(share()).not.toBeChecked();
  });

  it('turns sharing on and off, and says who it is shared with', async () => {
    const user = userEvent.setup();
    renderSettings();
    await waitFor(() => expect(codeField()).toBeEnabled());
    await user.type(codeField(), 'my-partner');
    await user.click(saveCode());
    await waitFor(() => expect(share()).toBeEnabled());

    await user.click(share());
    await waitFor(async () => expect((await settings()).partner.sharePilotResults).toBe(true));
    expect(share()).toBeChecked();
    expect(await screen.findByText(/Sharing with my-partner\./)).toBeInTheDocument();
    expect(await screen.findByText(/Results waiting to be sent: 0/)).toBeInTheDocument();

    await user.click(share());
    await waitFor(async () => expect((await settings()).partner.sharePilotResults).toBe(false));
    expect(screen.getByText('Sharing is off. Nothing is sent.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete waiting results' })).not.toBeInTheDocument();
  });

  it('clearing the code turns sharing off with it', async () => {
    const user = userEvent.setup();
    renderSettings();
    await waitFor(() => expect(codeField()).toBeEnabled());
    await user.type(codeField(), 'my-partner');
    await user.click(saveCode());
    await waitFor(() => expect(share()).toBeEnabled());
    await user.click(share());
    await waitFor(async () => expect((await settings()).partner.sharePilotResults).toBe(true));

    await user.clear(codeField());
    await user.click(saveCode());
    await waitFor(async () => expect((await settings()).partner.organisationCode).toBe(''));
    expect((await settings()).partner.sharePilotResults).toBe(false);
    await waitFor(() => expect(share()).toBeDisabled());
  });
});
