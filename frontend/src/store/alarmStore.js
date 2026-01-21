import { create } from 'zustand';
import { alarmsAPI } from '../services/api';

export const useAlarmStore = create((set, get) => ({
    unresolvedCount: 0,
    recentAlarms: [],
    loading: false,
    error: null,

    fetchUnresolvedCount: async () => {
        try {
            const response = await alarmsAPI.getUnresolvedCount();
            set({ unresolvedCount: response.data.total });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch alarm count:', error);
            return null;
        }
    },

    fetchRecentAlarms: async (limit = 5) => {
        try {
            set({ loading: true });
            const response = await alarmsAPI.getRecent(limit);
            set({ recentAlarms: response.data.alarms, loading: false });
            return response.data.alarms;
        } catch (error) {
            set({ error: error.message, loading: false });
            return [];
        }
    },

    decrementCount: () => {
        set((state) => ({
            unresolvedCount: Math.max(0, state.unresolvedCount - 1),
        }));
    },

    removeFromRecent: (alarmId) => {
        set((state) => ({
            recentAlarms: state.recentAlarms.filter((a) => a.id !== alarmId),
        }));
    },
}));
