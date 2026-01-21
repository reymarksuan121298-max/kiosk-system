import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
    persist(
        (set, get) => ({
            isDarkMode: true, // Default to dark mode

            toggleTheme: () => {
                const newMode = !get().isDarkMode;
                set({ isDarkMode: newMode });

                // Apply theme to document
                if (newMode) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                }
            },

            initTheme: () => {
                const isDark = get().isDarkMode;
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                }
            },
        }),
        {
            name: 'theme-storage',
        }
    )
);
