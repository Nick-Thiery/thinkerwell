import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { VideoCard } from './VideoCard';

describe('VideoCard', () => {
  it('draws a local poster and offers Watch and Read instead by default', () => {
    const onWatch = vi.fn();
    const onReadInstead = vi.fn();
    const { container } = render(
      <VideoCard title="Ancient Mesopotamia 101" channel="National Geographic" duration="4:10" onWatch={onWatch} onReadInstead={onReadInstead}>
        <p>Why this video</p>
      </VideoCard>,
    );
    expect(container.querySelector('.tw-video-poster')).not.toBeNull();
    expect(container.querySelector('.tw-video-player')).toBeNull();
    expect(container.querySelector('img, iframe')).toBeNull();
    expect(screen.getByText('4:10')).toBeInTheDocument();
    expect(screen.getByText('Why this video')).toBeInTheDocument();
    // Primary by default, as in the reference.
    expect(screen.getByRole('button', { name: 'Watch the video' })).toHaveClass('tw-btn-primary');
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    fireEvent.click(screen.getByRole('button', { name: 'Read instead' }));
    expect(onWatch).toHaveBeenCalledTimes(1);
    expect(onReadInstead).toHaveBeenCalledTimes(1);
  });

  it('uses the secondary variant and a custom read label when asked', () => {
    render(<VideoCard title="A video" watchVariant="secondary" readLabel="Read the same ideas" />);
    expect(screen.getByRole('button', { name: 'Watch the video' })).toHaveClass('tw-btn-secondary');
    expect(screen.getByRole('button', { name: 'Read the same ideas' })).toBeInTheDocument();
  });

  it('shows `player` in place of the poster', () => {
    const { container } = render(
      <VideoCard title="A video" player={<iframe title="A video" src="about:blank" />} duration="1:00" />,
    );
    expect(container.querySelector('.tw-video-poster')).toBeNull();
    const area = container.querySelector('.tw-video-player');
    expect(area).not.toBeNull();
    expect(area?.querySelector('iframe')).not.toBeNull();
    // The poster's badges go with it.
    expect(screen.queryByText('1:00')).toBeNull();
  });

  it('`watching` hides the Watch button and keeps Read instead', () => {
    render(<VideoCard title="A video" watching />);
    expect(screen.queryByRole('button', { name: 'Watch the video' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Read instead' })).toBeInTheDocument();
  });

  it('adds `actions` after the two choices', () => {
    const { container } = render(
      <VideoCard title="A video" actions={<Button variant="ghost">Close the video</Button>} />,
    );
    const labels = Array.from(container.querySelectorAll('.tw-video-actions button')).map((b) => b.textContent);
    expect(labels).toEqual(['Watch the video', 'Read instead', 'Close the video']);
  });
});
