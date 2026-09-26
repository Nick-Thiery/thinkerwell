import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SiteHeader } from './SiteHeader';

const LOGO = '/images/thinkerwell-mascot-transparent.png';
const LINKS = [
  { label: 'Home', href: '/', active: true },
  { label: 'Course', href: '/course' },
];

describe('SiteHeader', () => {
  it('full layout: shows the nav links and marks the active one, no menu button', () => {
    render(<SiteHeader logoSrc={LOGO} links={LINKS} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Course' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  });

  it('compact layout: shows the menu button, hides the nav links', () => {
    render(<SiteHeader logoSrc={LOGO} links={LINKS} compact />);
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
  });

  it('shows no learner chip when there is no learner chosen, in full layout', () => {
    render(<SiteHeader logoSrc={LOGO} links={LINKS} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows no learner chip when there is no learner chosen, in compact layout (only the menu button)', () => {
    render(<SiteHeader logoSrc={LOGO} links={LINKS} compact />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('full layout: the learner chip has an accessible name once a learner is chosen', () => {
    render(<SiteHeader logoSrc={LOGO} links={LINKS} learner={{ name: 'Amina' }} />);
    expect(screen.getByRole('button', { name: 'Amina' })).toBeInTheDocument();
  });

  it('compact layout: the learner chip names the current learner for screen readers', () => {
    render(<SiteHeader logoSrc={LOGO} learner={{ name: 'Amina' }} compact />);
    expect(screen.getByRole('button', { name: 'Switch learner, current: Amina' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
  });

  it('calls onLearnerClick and onMenuClick', async () => {
    const user = userEvent.setup();
    const onLearnerClick = vi.fn();
    const onMenuClick = vi.fn();
    render(
      <SiteHeader
        logoSrc={LOGO}
        learner={{ name: 'Amina' }}
        compact
        onLearnerClick={onLearnerClick}
        onMenuClick={onMenuClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: /switch learner/i }));
    expect(onLearnerClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
