import { expect, test, type Page } from '@playwright/test';

// The contact form (/contact, docs/notes/contact-form.md). `vite preview`
// has no server functions, so /api/contact is answered here, the way the
// real one answers (api/_lib/contact.ts).

async function fillIn(page: Page) {
  await page.getByLabel('What is it about?').selectOption({ label: 'Educator or classroom use' });
  await page.getByLabel('Your name').fill('Ana Lim');
  await page.getByLabel('Email or WhatsApp number').fill('+65 9123 4567');
  await page.getByLabel('Your message').fill('Can we use the lessons with a class of twenty on four tablets?');
}

test('people find the form from For organisations, the Educators page and the footer', async ({ page }) => {
  await page.goto('/organisations');
  await page.locator('.tw-org-hero').getByRole('link', { name: 'Get in touch' }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator('h1')).toHaveText('Contact Thinkerwell');
  await expect(page).toHaveTitle('Contact Us | Thinkerwell');

  await page.goto('/educators');
  await page.getByRole('link', { name: 'Send an enquiry' }).click();
  await expect(page.locator('h1')).toHaveText('Contact Thinkerwell');

  await page.goto('/about');
  await page.locator('footer.tw-site-footer').getByRole('link', { name: 'Contact' }).click();
  await expect(page.locator('h1')).toHaveText('Contact Thinkerwell');
});

test('an enquiry is sent to this site only, once, and the page says so', async ({ page }) => {
  const bodies: unknown[] = [];
  const hosts = new Set<string>();
  page.on('request', (request) => hosts.add(new URL(request.url()).host));
  await page.route('**/api/contact', async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"sent":true}' });
  });
  await page.goto('/contact');
  await fillIn(page);
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByRole('status')).toHaveText(/Thanks\. Your message has been sent\./);
  expect(bodies).toEqual([
    { topic: 'educator', name: 'Ana Lim', contact: '+65 9123 4567', message: 'Can we use the lessons with a class of twenty on four tablets?', website: '' },
  ]);
  expect([...hosts]).toEqual([new URL(page.url()).host]);
});

test('a problem is said under its field, and focus goes there', async ({ page }) => {
  await page.goto('/contact');
  await fillIn(page);
  await page.getByLabel('Email or WhatsApp number').fill('9123 4567');
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  const contact = page.getByLabel('Email or WhatsApp number');
  await expect(contact).toBeFocused();
  await expect(contact).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/a WhatsApp number that starts with a country code/)).toBeVisible();
});

test('when the message can’t be sent, everything typed stays and the email address is given', async ({ page }) => {
  await page.route('**/api/contact', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"not_configured"}' }));
  await page.goto('/contact');
  await fillIn(page);
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText("We couldn't send your message.");
  await expect(alert.getByRole('link', { name: 'thinkerwell.hello@gmail.com' })).toHaveAttribute('href', 'mailto:thinkerwell.hello@gmail.com');
  await expect(page.getByLabel('Your name')).toHaveValue('Ana Lim');
  await expect(page.getByLabel('Your message')).toHaveValue('Can we use the lessons with a class of twenty on four tablets?');
});
