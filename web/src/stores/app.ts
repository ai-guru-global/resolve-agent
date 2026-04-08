import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  sidebarExpanded: boolean;
  selectedAgentId: string | null;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSelectedAgent: (id: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      selectedAgentId: null,
      commandPaletteOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
      setSelectedAgent: (id) => set({ selectedAgentId: id }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'resolve-agent-ui',
      partialize: (state) => ({ sidebarExpanded: state.sidebarExpanded }),
    },
  ),
);
