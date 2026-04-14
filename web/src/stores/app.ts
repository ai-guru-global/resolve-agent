import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface AppState {
  sidebarExpanded: boolean;
  selectedAgentId: string | null;
  commandPaletteOpen: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSelectedAgent: (id: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      selectedAgentId: null,
      commandPaletteOpen: false,
      theme: 'light',
      toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
      setSelectedAgent: (id) => set({ selectedAgentId: id }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'resolve-agent-ui',
      partialize: (state) => ({ sidebarExpanded: state.sidebarExpanded, theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);
