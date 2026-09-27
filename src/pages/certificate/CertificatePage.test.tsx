import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { lessonPath } from '../../app/lessonUrls';
import { getLessons, getSection, getSectionLessons, getSections, type Lesson, type Section } from '../../content';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { CertificatePage, certificateNameSize, type CertificateScope } from './CertificatePage';

const geography = getSection('geography') as Section;
const geographyLessons = getSectionLessons('geography');

afterEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  await deleteAllData();
});

async function addCurrentLearner(name = 'Amina'): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name, colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

/** Finishes each lesson (Reflect's required answer), a day apart from 1 September 2026. */
async function finish(learnerId: string, lessons: readonly Lesson[]): Promise<void> {
  const store = await getStore();
  let day = 1;
  for (const lesson of lessons) {
    const at = new Date(Date.UTC(2026, 8, day++, 10)).toISOString();
    await store.updateProgress(learnerId, lesson.id, (p) => ({
      ...p,
      stagesDone: ['read', 'write', 'speak', 'reflect'],
      reflections: { 0: 'An answer.' },
      completedAt: at,
    }));
  }
}

function renderCertificate(scope: CertificateScope = { kind: 'section', section: geography }, { lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[scope.kind === 'section' ? `/certificate/section/${scope.section.id}` : '/certificate/course']}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <CertificatePage scope={scope} />
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const longDate = (iso: string) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

describe('certificateNameSize', () => {
  it('prints a longer name smaller', () => {
    expect(certificateNameSize('Amina')).toBe('l');
    expect(certificateNameSize('Amina Rahimi Mohammadi')).toBe('l');
    expect(certificateNameSize('Mohammed Abdirahman Abdullahi')).toBe('m');
    expect(certificateNameSize('Mohammed Abdirahman Abdullahi Hassan Ali')).toBe('s');
  });
});

describe('CertificatePage', { timeout: 30_000 }, () => {
  it("shows a section certificate once every lesson in it is finished, without the section check", async () => {
    const id = await addCurrentLearner();
    await finish(id, geographyLessons);
    renderCertificate();

    const sheet = await screen.findByRole('article', { name: 'Certificate' });
    expect(within(sheet).getByRole('heading', { level: 1, name: 'Certificate' })).toBeInTheDocument();
    expect(within(sheet).getByText('Thinkerwell')).toBeInTheDocument();
    expect(sheet.querySelector('img')).toHaveAttribute('src', '/images/thinkerwell-mascot-transparent.png');
    expect(within(sheet).getByText('Amina')).toHaveClass('tw-cert-name');
    expect(within(sheet).getByText('finished the Geography & Our Environment section of Exploring Our World.')).toBeInTheDocument();
    // The section, with its icon and name, and every lesson title in order.
    expect(within(sheet).getByRole('heading', { level: 2 })).toHaveTextContent('Geography & Our Environment');
    const items = within(sheet).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(geographyLessons.map((lesson) => `${lesson.number}${lesson.title}`));
    // The date the last lesson was finished (the fifth, on 5 September), and a line for a teacher to sign.
    expect(within(sheet).getByText(longDate('2026-09-05T10:00:00.000Z'))).toBeInTheDocument();
    expect(within(sheet).getByText('Date')).toBeInTheDocument();
    expect(within(sheet).getByText("Teacher's signature")).toBeInTheDocument();
    expect(within(sheet).getByText('Exploring Our World is a free social-studies course from Thinkerwell.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the course' })).toHaveAttribute('href', '/course#geography');
  });

  it('never prints a score, even with a section check saved', async () => {
    const id = await addCurrentLearner();
    await finish(id, geographyLessons);
    const store = await getStore();
    await store.recordQuizAttempt(id, 'geography', { answers: {}, score: 7, total: 10, finishedAt: new Date().toISOString() });
    renderCertificate();
    const sheet = await screen.findByRole('article', { name: 'Certificate' });
    expect(sheet.textContent).not.toMatch(/\bscore\b|out of|7 of 10|\/10/i);
  });

  it("lists the lessons left, with links, and no certificate before they're all finished", async () => {
    const id = await addCurrentLearner();
    await finish(id, geographyLessons.slice(0, 2));
    const store = await getStore();
    // Lesson 13 is started but not finished: its link goes back to where the learner was.
    await store.updateProgress(id, geographyLessons[3]!.id, (p) => ({ ...p, stagesDone: ['read'], currentStage: 'write' }));
    renderCertificate();

    expect(await screen.findByRole('heading', { level: 1, name: 'Certificate: Geography & Our Environment' })).toBeInTheDocument();
    expect(screen.getByText('Your certificate is ready when you finish every lesson in this section.')).toBeInTheDocument();
    expect(screen.getByText("You don't need to do the section check for it.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '3 lessons left' })).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /^Lesson \d+: / });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      lessonPath(geographyLessons[2]!.id, 'read'),
      lessonPath(geographyLessons[3]!.id, 'write'),
      lessonPath(geographyLessons[4]!.id, 'read'),
    ]);
    expect(screen.queryByText('Amina')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Name on the certificate')).not.toBeInTheDocument();
  });

  it('tells a guest looking around that certificates are for learners, and shows no one', async () => {
    const id = await addCurrentLearner();
    await finish(id, geographyLessons);
    renderCertificate(undefined, { lookAround: true });
    expect(await screen.findByText('Certificates are for learners who have finished lessons.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Certificate: Geography & Our Environment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Choose who's learning" })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Amina')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
  });

  it('says the same with nobody chosen', async () => {
    renderCertificate({ kind: 'course' });
    expect(await screen.findByText('Certificates are for learners who have finished lessons.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Course certificate' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('lets the name be changed just for this print, saving it nowhere', async () => {
    const user = userEvent.setup();
    const id = await addCurrentLearner();
    await finish(id, geographyLessons);
    const store = await getStore();
    const before = {
      learners: await store.listLearners(),
      progress: await store.listProgress(id),
      settings: await store.getSettings(),
      current: await store.getCurrentLearnerId(),
    };
    renderCertificate();

    const field = await screen.findByLabelText('Name on the certificate');
    expect(field).toHaveValue('Amina');
    expect(screen.getByText("Just for this print. It isn't saved and never leaves this device.")).toBeInTheDocument();
    await user.clear(field);
    await user.type(field, 'Amina Rahimi Mohammadi');
    const sheet = screen.getByRole('article', { name: 'Certificate' });
    expect(within(sheet).getByText('Amina Rahimi Mohammadi')).toHaveClass('tw-cert-name');
    expect(within(sheet).queryByText('Amina')).not.toBeInTheDocument();
    await user.tab();

    // Nothing kept: not on the learner, not in progress or settings, not in the browser's storage.
    expect({
      learners: await store.listLearners(),
      progress: await store.listProgress(id),
      settings: await store.getSettings(),
      current: await store.getCurrentLearnerId(),
    }).toEqual(before);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('leaves a line to write a name on by hand when the field is empty', async () => {
    const user = userEvent.setup();
    const id = await addCurrentLearner();
    await finish(id, geographyLessons);
    renderCertificate();
    await user.clear(await screen.findByLabelText('Name on the certificate'));
    const sheet = screen.getByRole('article', { name: 'Certificate' });
    expect(sheet.querySelector('.tw-cert-name')).toBeNull();
    expect(within(sheet).getByText('Name')).toHaveClass('tw-cert-label');
  });

  it('shows the course certificate, with the four sections, once all 24 lessons are finished', async () => {
    const id = await addCurrentLearner();
    const lessons = getLessons();
    await finish(id, lessons.slice(0, 23));
    const { unmount } = renderCertificate({ kind: 'course' });
    expect(await screen.findByRole('heading', { level: 2, name: '1 lesson left' })).toBeInTheDocument();
    expect(screen.getByText('Your course certificate is ready when you finish all 24 lessons.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Lesson 24: / })).toHaveAttribute('href', lessonPath(lessons[23]!.id, 'read'));
    unmount();

    // The last lesson, finished on 24 September.
    await finish(id, [lessons[23]!]);
    const store = await getStore();
    await store.updateProgress(id, lessons[23]!.id, (p) => ({ ...p, completedAt: '2026-09-24T10:00:00.000Z' }));
    renderCertificate({ kind: 'course' });
    const sheet = await screen.findByRole('article', { name: 'Certificate' });
    expect(within(sheet).getByText('finished all 24 lessons of Exploring Our World.')).toBeInTheDocument();
    expect(within(sheet).getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      getSections().map((section) => `Section ${section.number}${section.title}`),
    );
    expect(within(sheet).getByText(longDate('2026-09-24T10:00:00.000Z'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});
