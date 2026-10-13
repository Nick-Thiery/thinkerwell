import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getLessons } from '../../content';
import { PilotDayPage, REVIEW_FIRST_LESSONS } from './PilotDayPage';
import { planTotal, SESSION_MINUTES, SHORT_SESSION_MINUTES } from './sessionPlan';

/** The pilot day guide for staff (/educators/pilot-day). */

function renderPage() {
  const router = createMemoryRouter([{ path: '/educators/pilot-day', element: <PilotDayPage /> }], {
    initialEntries: ['/educators/pilot-day'],
  });
  render(<RouterProvider router={router} />);
  return screen.getByRole('article', { name: 'Pilot day: a one-page guide for staff' });
}

function part(sheet: HTMLElement, name: string): HTMLElement {
  return within(sheet).getByRole('region', { name });
}

describe('the pilot day guide', () => {
  it('has the six parts a staff member needs, in the order of the day', () => {
    const sheet = renderPage();
    expect(within(sheet).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Before the session',
      'Start of the session',
      'What learners do',
      'If something goes wrong',
      'Sensitive topics',
      'End of the session',
    ]);
    expect(screen.getByRole('heading', { level: 1, name: 'Pilot day guide' })).toBeInTheDocument();
  });

  it('says how to get ready, using the pages and buttons the app has', () => {
    const before = part(renderPage(), 'Before the session');
    expect(before).toHaveTextContent('Set up each device once: open For educators, then Set up this device.');
    expect(before).toHaveTextContent('Print the code cards from For educators. Each learner types their code as their name.');
    expect(before).toHaveTextContent(/information sheet.*consent form\. A learner's own no wins\./);
    expect(within(before).getByText('Set up this device').tagName).toBe('STRONG');
  });

  it('says who is learning today, that new learners add themselves, and that looking around is for visitors', () => {
    const start = part(renderPage(), 'Start of the session');
    expect(start).toHaveTextContent("The home page asks Who's learning today? Each learner taps their own tile.");
    expect(start).toHaveTextContent("New learners tap I'm new here and type their name or code.");
    expect(start).toHaveTextContent('Just look around is for visitors. Nothing is saved while someone looks around');
  });

  it('says what learners do: five stages, nothing locked, and how long', () => {
    const learn = part(renderPage(), 'What learners do');
    expect(learn).toHaveTextContent('Every lesson has five stages: Read, Write, Speak, Watch, and Reflect.');
    expect(learn).toHaveTextContent('Nothing is locked. Learners can open any lesson and any stage, in any order, and try the quick checks again.');
    // The same range as the Educators page (the shortest to the longest lesson), and the teacher guides' plans.
    const lessons = getLessons();
    const min = Math.min(...lessons.map((lesson) => lesson.estimatedMinutes[0]));
    const max = Math.max(...lessons.map((lesson) => lesson.estimatedMinutes[1]));
    expect(learn).toHaveTextContent(
      `A lesson takes about ${min}–${max} minutes. Each teacher guide has a plan for ${SESSION_MINUTES} minutes and a shorter one for ${SHORT_SESSION_MINUTES}.`,
    );
    expect([planTotal('minutes'), planTotal('short')]).toEqual([SESSION_MINUTES, SHORT_SESSION_MINUTES]);
  });

  it('says what to do for each thing that can go wrong', () => {
    const wrong = part(renderPage(), 'If something goes wrong');
    const items = within(wrong).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('strong')?.textContent)).toEqual([
      "A page hasn't downloaded yet.",
      'No internet.',
      'Several learners, one device.',
      'Work seems to be missing.',
      "A video won't play.",
      'No sound, or no Say it button.',
    ]);
    expect(items[0]).toHaveTextContent('Connect to the internet and tap Try again. Saved work stays on the device.');
    expect(items[1]).toHaveTextContent('Keep going.');
    expect(items[1]).toHaveTextContent('work saves on the device');
    expect(items[2]).toHaveTextContent('Each learner taps their own tile on the home page.');
    expect(items[3]).toHaveTextContent(
      "If you saved a file, open Settings, tap Load my work and choose it. Look in the device's downloads for a name that starts with thinkerwell.",
    );
    expect(within(items[3]!).getByText('thinkerwell')).toHaveAttribute('translate', 'no');
    expect(items[4]).toHaveTextContent('Tap Read instead. It has the same ideas and works without the internet.');
    expect(items[5]).toHaveTextContent('This is normal. Listen and Say it show only where the device can do them.');
  });

  it('says never to ask about journey, home country, family, religion or ethnicity, and points to the guides', () => {
    const topics = part(renderPage(), 'Sensitive topics');
    expect(topics).toHaveTextContent('Never ask learners about their journey, home country, family, religion or ethnicity.');
    expect(topics).toHaveTextContent('It starts with Sensitive topics: read before class, and it says which videos to preview.');
    expect(topics).toHaveTextContent('Lessons 4 and 19 ask for a local educator to review them first.');
  });

  it('names the lessons whose guides ask for a review first, and no others', () => {
    const asksForReview = getLessons()
      .filter((lesson) => lesson.sensitiveNotes.some((note) => /review this lesson/i.test(note)))
      .map((lesson) => lesson.number);
    expect(asksForReview).toEqual([...REVIEW_FIRST_LESSONS]);
  });

  it('says to save the work to a file before a device is reset, and where certificates and the class are', () => {
    const end = part(renderPage(), 'End of the session');
    expect(end).toHaveTextContent(
      'Before you reset a device or give it back, save the work to a file: open Settings, then Move work to another device, then Save my work to a file.',
    );
    expect(end).toHaveTextContent('Print certificates for finished sections: open For educators, then Print all certificates.');
    expect(end).toHaveTextContent('See where everyone is: open For educators, then The class on this device. It shows no scores.');
  });

  it('is plain: no "please", no exclamation marks, no placeholder, no organisation or place, nothing about measurement', () => {
    const sheet = renderPage();
    const text = sheet.textContent ?? '';
    expect(text).not.toMatch(/please/i);
    expect(text).not.toContain('!');
    expect(text).not.toMatch(/\[|\{|\}/);
    expect(text).not.toMatch(/HELP|HLP|Jakarta|Indonesia|Malaysia/);
    expect(text).not.toMatch(/measure|research|study|data/i);
  });

  it('leaves out who to contact while there is no address, and shows no placeholder', () => {
    const sheet = renderPage();
    expect(within(sheet).queryByRole('region', { name: 'Tell us what to fix' })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('link')).not.toBeInTheDocument();
    expect(sheet.textContent).not.toMatch(/@|CONTACT/);
  });

  it('prints as the sheet alone: the title, the intro and the toolbar are for the screen', () => {
    const sheet = renderPage();
    expect(sheet.closest('.tw-no-print')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).closest('.tw-no-print')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Back to the educators page' }).closest('.tw-no-print')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Print' }).closest('.tw-no-print')).not.toBeNull();
  });
});
