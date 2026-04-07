import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import MemoryGame from '../MemoryGame';

describe('MemoryGame', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onComplete.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the start button initially', () => {
    render(<MemoryGame onComplete={onComplete} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('shows 6 color buttons after game starts', async () => {
    render(<MemoryGame onComplete={onComplete} />);
    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);
    // Should render the 6 color pads
    const colorButtons = document.querySelectorAll('[id^="color-"]');
    expect(colorButtons.length).toBe(6);
  });

  it('does not trigger onComplete before sequence is shown', () => {
    render(<MemoryGame onComplete={onComplete} />);
    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);
    // At this point the sequence is being shown — onComplete should not have been called
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('displays difficulty level indicator', () => {
    render(<MemoryGame onComplete={onComplete} />);
    expect(screen.getByText(/level|difficulty/i)).toBeInTheDocument();
  });
});


