import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';
import { Activity } from 'lucide-react';

describe('MetricCard', () => {
  it('renders value and label', () => {
    render(<MetricCard icon={Activity} value="42" label="Total Agents" />);
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Total Agents')).toBeTruthy();
  });

  it('does not render trend when absent', () => {
    const { container } = render(<MetricCard icon={Activity} value="10" label="Count" />);
    expect(container.textContent).not.toContain('%');
  });

  it('renders trend with up direction', () => {
    render(
      <MetricCard
        icon={Activity}
        value="100"
        label="Requests"
        trend={{ value: 12, direction: 'up' }}
      />,
    );
    expect(screen.getByText('+12%')).toBeTruthy();
  });

  it('renders trend with down direction', () => {
    render(
      <MetricCard
        icon={Activity}
        value="100"
        label="Errors"
        trend={{ value: 5, direction: 'down' }}
      />,
    );
    expect(screen.getByText('-5%')).toBeTruthy();
  });

  it('renders trend with flat direction (no prefix)', () => {
    render(
      <MetricCard
        icon={Activity}
        value="50"
        label="Latency"
        trend={{ value: 0, direction: 'flat' }}
      />,
    );
    expect(screen.getByText('0%')).toBeTruthy();
  });
});
