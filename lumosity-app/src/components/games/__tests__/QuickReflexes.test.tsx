import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QuickReflexes } from '../QuickReflexes';

describe('QuickReflexes', () => {
  const onComplete = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onComplete.mockClear();
    onBack.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the game title', () => {
    render(<QuickReflexes onComplete={onComplete} onBack={onBack} />);
    expect(screen.getByText(/quick reflexes/i)).toBeInTheDocument();
  });

  it('shows initial timer value of 30', () => {
    render(<QuickReflexes onComplete={onComplete} onBack={onBack} />);
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<QuickReflexes onComplete={onComplete} onBack={onBack} />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onComplete once timer runs out', () => {
    render(<QuickReflexes onComplete={onComplete} onBack={onBack} />);
    act(() => {
      vi.advanceTimersByTime(32_000); // 30s game + small buffer
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('starts at level 1 and score 0', () => {
    render(<QuickReflexes onComplete={onComplete} onBack={onBack} />);
    expect(screen.getByText(/score.*0|0.*score/i)).toBeInTheDocument();
    expect(screen.getByText(/level.*1|1.*level/i)).toBeInTheDocument();
  });
});


