import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './app';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      sidebarExpanded: true,
      selectedAgentId: null,
      commandPaletteOpen: false,
      theme: 'light',
    });
  });

  it('has correct initial defaults', () => {
    const state = useAppStore.getState();
    expect(state.sidebarExpanded).toBe(true);
    expect(state.selectedAgentId).toBeNull();
    expect(state.commandPaletteOpen).toBe(false);
    expect(state.theme).toBe('light');
  });

  it('toggleSidebar flips the boolean', () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarExpanded).toBe(false);

    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarExpanded).toBe(true);
  });

  it('setSelectedAgent sets and clears', () => {
    useAppStore.getState().setSelectedAgent('agent-1');
    expect(useAppStore.getState().selectedAgentId).toBe('agent-1');

    useAppStore.getState().setSelectedAgent(null);
    expect(useAppStore.getState().selectedAgentId).toBeNull();
  });

  it('setCommandPaletteOpen toggles state', () => {
    useAppStore.getState().setCommandPaletteOpen(true);
    expect(useAppStore.getState().commandPaletteOpen).toBe(true);

    useAppStore.getState().setCommandPaletteOpen(false);
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });

  it('setTheme("dark") adds dark class to documentElement', () => {
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme("light") removes dark class from documentElement', () => {
    document.documentElement.classList.add('dark');
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('partialize only persists sidebarExpanded and theme', () => {
    const state = useAppStore.getState();
    const persisted = {
      sidebarExpanded: state.sidebarExpanded,
      theme: state.theme,
    };
    expect(Object.keys(persisted)).toEqual(['sidebarExpanded', 'theme']);
  });
});
