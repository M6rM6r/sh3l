import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MathMarathon } from '../MathMarathon';

describe('MathMarathon', () => {
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

  it('renders a math question with operator', () => {
    render(<MathMarathon onComplete={onComplete} onBack={onBack} />);
    // Should show an arithmetic operator
    expect(screen.getByText(/[+\-×÷*\/]/)).toBeInTheDocument();
  });

  it('renders an answer input field', () => {
    render(<MathMarathon onComplete={onComplete} onBack={onBack} />);
    const input = screen.getByRole('textbox') || document.querySelector('input[type="number"]');
    expect(input).not.toBeNull();
  });

  it('calls onBack when back button is clicked', () => {
    render(<MathMarathon onComplete={onComplete} onBack={onBack} />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('starts with score 0', () => {
    render(<MathMarathon onComplete={onComplete} onBack={onBack} />);
    // Score display starts at 0
    expect(screen.getByText(/\b0\b/)).toBeInTheDocument();
  });

  it('calls onComplete after timer expires (60s)', () => {
    render(<MathMarathon onComplete={onComplete} onBack={onBack} />);
    act(() => {
      vi.advanceTimersByTime(63_000); // 60s game + small buffer
    });
    expect(onComplete).toHaveBeenCalledOnce();
    const [score, level, duration] = onComplete.mock.calls[0];
    expect(typeof score).toBe('number');
    expect(level).toBeGreaterThanOrEqual(1);
    expect(duration).toBeGreaterThan(0);
  });

  it('shows feedback after answering incorrectly', async () => {
    render(<MathMarathon onComplete={onComplete} onBack={onBack} />);
    const input = document.querySelector('input') as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value: '99999' } });
      const submitBtn = screen.getByRole('button', { name: /submit|check|answer/i });
      if (submitBtn) fireEvent.click(submitBtn);
      // Wrong answer feedback should appear
      await vi.advanceTimersByTimeAsync(100);
      expect(screen.queryByText(/wrong|incorrect/i)).not.toBeNull();
    }
  });
});


