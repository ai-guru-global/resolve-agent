import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { Search } from 'lucide-react';
import { vi } from 'vitest';

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <MemoryRouter>
        <EmptyState icon={Search} title="No results" description="Try a different query" />
      </MemoryRouter>,
    );
    expect(screen.getByText('No results')).toBeTruthy();
    expect(screen.getByText('Try a different query')).toBeTruthy();
  });

  it('renders action button with onClick', () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <EmptyState
          icon={Search}
          title="Empty"
          description="Nothing here"
          action={{ label: 'Create', onClick }}
        />
      </MemoryRouter>,
    );
    const btn = screen.getByText('Create');
    expect(btn).toBeTruthy();
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders action link with href', () => {
    render(
      <MemoryRouter>
        <EmptyState
          icon={Search}
          title="Empty"
          description="Nothing here"
          action={{ label: 'Go Home', href: '/' }}
        />
      </MemoryRouter>,
    );
    const link = screen.getByText('Go Home');
    expect(link.closest('a')).toBeTruthy();
  });

  it('omits action section when no action prop', () => {
    const { container } = render(
      <MemoryRouter>
        <EmptyState icon={Search} title="Empty" description="Nothing" />
      </MemoryRouter>,
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('applies className', () => {
    const { container } = render(
      <MemoryRouter>
        <EmptyState icon={Search} title="Empty" description="Nothing" className="custom-class" />
      </MemoryRouter>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('custom-class');
  });
});
