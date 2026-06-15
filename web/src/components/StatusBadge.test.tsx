import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders label text', () => {
    render(<StatusBadge label="Running" />);
    expect(screen.getByText('Running')).toBeTruthy();
  });

  it('shows dot by default', () => {
    const { container } = render(<StatusBadge label="Healthy" variant="healthy" />);
    const dot = container.querySelector('.rounded-full.h-1\\.5');
    expect(dot).toBeTruthy();
  });

  it('hides dot when showDot=false', () => {
    const { container } = render(<StatusBadge label="Healthy" variant="healthy" showDot={false} />);
    const dot = container.querySelector('.rounded-full.h-1\\.5');
    expect(dot).toBeNull();
  });

  const variants = ['healthy', 'degraded', 'failed', 'progressing', 'unknown'] as const;
  for (const variant of variants) {
    it(`applies ${variant} variant styling`, () => {
      const { container } = render(<StatusBadge label={variant} variant={variant} />);
      const badge = container.querySelector('span');
      expect(badge?.className).toContain('status-');
    });
  }

  it('defaults to unknown variant when none specified', () => {
    const { container } = render(<StatusBadge label="Default" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('unknown');
  });
});
