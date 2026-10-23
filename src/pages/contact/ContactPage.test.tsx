import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { ContactPage } from './ContactPage';

/** The contact form (/contact, docs/notes/contact-form.md). */

function renderPage(locale?: string) {
  const router = createMemoryRouter([{ path: '/contact', element: <ContactPage /> }], { initialEntries: ['/contact'] });
  const page = <RouterProvider router={router} />;
  render(locale ? <I18nProvider locale={locale}>{page}</I18nProvider> : page);
}

function answer(status: number, body: unknown = {}) {
  return vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })));
}

async function fillIn(user: ReturnType<typeof userEvent.setup>, over: { contact?: string } = {}) {
  await user.selectOptions(screen.getByLabelText('What is it about?'), 'Learning organisation or NGO');
  await user.type(screen.getByLabelText('Your name'), 'Siti Rahma');
  await user.type(screen.getByLabelText('Email or WhatsApp number'), over.contact ?? 'siti@example.org');
  await user.type(screen.getByLabelText('Your message'), 'We would like to use Thinkerwell with our learners.');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the contact form', () => {
  it('asks for a topic, a name, one way to reply and a message, and nothing about a learner', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Contact Thinkerwell' })).toBeInTheDocument();
    const topic = screen.getByLabelText('What is it about?');
    expect(within(topic).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose a topic',
      'General question',
      'Educator or classroom use',
      'Learning organisation or NGO',
      'Company or partnership',
      'Feedback or technical issue',
      'Other',
    ]);
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email or WhatsApp number')).toHaveAccessibleDescription('For WhatsApp, start with your country code, such as +65.');
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
    // The bots' field is hidden from people, screen readers and the keyboard.
    const trap = document.querySelector('input[name="website"]')!;
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText(/Don't include a learner's personal information/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hello@thinkerwell.app' })).toHaveAttribute('href', 'mailto:hello@thinkerwell.app');
  });

  it('says what each empty field needs, focuses the first, and sends nothing', async () => {
    const fetch = answer(200, { sent: true });
    vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(screen.getByLabelText('What is it about?')).toHaveFocus();
    expect(screen.getByLabelText('What is it about?')).toHaveAccessibleDescription('Choose a topic.');
    expect(screen.getByLabelText('Your name')).toHaveAccessibleDescription('Write your name.');
    expect(screen.getByLabelText('Email or WhatsApp number')).toHaveAccessibleDescription('Write an email address or a WhatsApp number.');
    expect(screen.getByLabelText('Your message')).toHaveAccessibleDescription('Write your message.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a phone number without a country code, and clears the problem as it is fixed', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillIn(user, { contact: '0812345678' });
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    const contact = screen.getByLabelText('Email or WhatsApp number');
    expect(contact).toHaveFocus();
    expect(contact).toHaveAttribute('aria-invalid', 'true');
    expect(contact).toHaveAccessibleDescription(/a WhatsApp number that starts with a country code/);
    await user.clear(contact);
    await user.type(contact, '+62 812 3456 7890');
    expect(contact).not.toHaveAttribute('aria-invalid');
  });

  it('sends the enquiry to this site only, once, and says it was sent', async () => {
    let resolve: (response: Response) => void = () => undefined;
    const fetch = vi.fn(() => new Promise<Response>((done) => (resolve = done)));
    vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();
    renderPage();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    const sending = screen.getByRole('button', { name: 'Sending…' });
    expect(sending).toBeDisabled();
    await user.click(sending);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string) as unknown;
    expect(body).toEqual({ topic: 'organisation', name: 'Siti Rahma', contact: 'siti@example.org', message: 'We would like to use Thinkerwell with our learners.', website: '' });
    await act(() => {
      resolve(new Response(JSON.stringify({ sent: true }), { status: 200 }));
      return Promise.resolve();
    });
    expect(await screen.findByRole('status')).toHaveTextContent("Thanks. Your message has been sent. We'll reply using the contact details you gave.");
    await user.click(screen.getByRole('button', { name: 'Send another message' }));
    expect(screen.getByLabelText('Your name')).toHaveValue('');
  });

  it('keeps everything typed when the message can’t be sent, and gives the email address', async () => {
    vi.stubGlobal('fetch', answer(503, { error: 'not_configured' }));
    const user = userEvent.setup();
    renderPage();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't send your message. Try again, or write to us at hello@thinkerwell.app.");
    expect(screen.getByLabelText('Your name')).toHaveValue('Siti Rahma');
    expect(screen.getByLabelText('Your message')).toHaveValue('We would like to use Thinkerwell with our learners.');
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeEnabled();
  });

  it('says the same when the device is offline', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    const user = userEvent.setup();
    renderPage();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send your message.");
  });

  it('says when too many messages came from this connection', async () => {
    vi.stubGlobal('fetch', answer(429, { error: 'too_many' }));
    const user = userEvent.setup();
    renderPage();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many messages have been sent from here for now.');
  });

  it('shows the server’s own problems under the fields', async () => {
    vi.stubGlobal('fetch', answer(400, { error: 'invalid', fields: { message: 'long' } }));
    const user = userEvent.setup();
    renderPage();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByText('Keep your message under 3,000 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your message')).toHaveFocus();
  });

  it('is in Indonesian on an Indonesian page', async () => {
    renderPage('id');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hubungi Thinkerwell' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email atau nomor WhatsApp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kirim pesan' })).toBeInTheDocument();
  });

  it('is in Malay on a Malay page', async () => {
    renderPage('ms');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hubungi Thinkerwell' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mel atau nombor WhatsApp')).toBeInTheDocument();
  });
});
