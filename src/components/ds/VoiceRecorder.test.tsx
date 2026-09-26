import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceRecorder } from './VoiceRecorder';

describe('VoiceRecorder', () => {
  it('idle: shows Start recording only', () => {
    render(<VoiceRecorder state="idle" />);
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Listen back' })).not.toBeInTheDocument();
  });

  it('recording: shows the live timer and Stop', () => {
    render(<VoiceRecorder state="recording" time="0:12" />);
    expect(screen.getByText('Recording 0:12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('recorded: shows Listen back, the time, Record again and Delete', () => {
    render(<VoiceRecorder state="recorded" time="0:42" />);
    expect(screen.getByRole('button', { name: 'Listen back' })).toBeInTheDocument();
    expect(screen.getByText('0:42')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('uses the default title and privacy note', () => {
    render(<VoiceRecorder state="idle" />);
    expect(screen.getByRole('heading', { name: 'Record yourself' })).toBeInTheDocument();
    expect(screen.getByText(/stays on this device/)).toBeInTheDocument();
  });

  it('calls the callback for the control shown in each state', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const { rerender } = render(<VoiceRecorder state="idle" onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    expect(onStart).toHaveBeenCalledTimes(1);

    const onStop = vi.fn();
    rerender(<VoiceRecorder state="recording" onStop={onStop} />);
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledTimes(1);

    const onPlayback = vi.fn();
    const onReRecord = vi.fn();
    const onDelete = vi.fn();
    rerender(
      <VoiceRecorder
        state="recorded"
        onPlayback={onPlayback}
        onReRecord={onReRecord}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Listen back' }));
    await user.click(screen.getByRole('button', { name: 'Record again' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onPlayback).toHaveBeenCalledTimes(1);
    expect(onReRecord).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
