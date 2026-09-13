import { create } from 'zustand';
export type AppLanguage = 'vi' | 'en';
export type AppColorScheme = 'light' | 'dark' | 'system';
type AppState = {
  refreshKey: number;
  language: AppLanguage;
  colorScheme: AppColorScheme;
  refresh: () => void;
  setLanguage: (language: AppLanguage) => void;
  setColorScheme: (colorScheme: AppColorScheme) => void;
};
export const useAppStore = create<AppState>((set) => ({
  refreshKey: 0,
  language: 'vi',
  colorScheme: 'system',
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  setLanguage: (language) => set({ language }),
  setColorScheme: (colorScheme) => set({ colorScheme }),
}));

