import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  selectedAgentId: string | null;
  toggleSidebar: () => void;
  setSelectedAgent: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  selectedAgentId: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
}));
