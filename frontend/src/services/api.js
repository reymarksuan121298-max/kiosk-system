import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    changePassword: (data) => api.put('/auth/change-password', data),
    logout: () => api.post('/auth/logout'),
};

// Employees API
export const employeesAPI = {
    getAll: (params) => api.get('/employees', { params }),
    getOne: (id) => api.get(`/employees/${id}`),
    create: (data) => api.post('/employees', data),
    update: (id, data) => api.put(`/employees/${id}`, data),
    delete: (id) => api.delete(`/employees/${id}`),
    getAttendance: (id, params) => api.get(`/employees/${id}/attendance`, { params }),
};

// Kiosks API
export const kiosksAPI = {
    getAll: (params) => api.get('/kiosks', { params }),
    getOne: (id) => api.get(`/kiosks/${id}`),
    create: (data) => api.post('/kiosks', data),
    update: (id, data) => api.put(`/kiosks/${id}`, data),
    delete: (id) => api.delete(`/kiosks/${id}`),
    getStats: (id, params) => api.get(`/kiosks/${id}/stats`, { params }),
};

// Attendance API
export const attendanceAPI = {
    scan: (data) => api.post('/attendance/scan', data),
    getAll: (params) => api.get('/attendance', { params }),
    getToday: () => api.get('/attendance/today'),
    invalidate: (id, data) => api.put(`/attendance/${id}/invalidate`, data),
    sync: (records) => api.post('/attendance/sync', { records }),
};

// QR Codes API
export const qrCodesAPI = {
    generate: (data) => api.post('/qrcodes/generate', data),
    generateWithImage: (data) => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            formData.append(key, data[key]);
        });
        return api.post('/qrcodes/generate-with-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getAll: (params) => api.get('/qrcodes', { params }),
    getOne: (id) => api.get(`/qrcodes/${id}`),
    revoke: (id, data) => api.put(`/qrcodes/${id}/revoke`, data),
    restore: (id) => api.put(`/qrcodes/${id}/restore`),
    delete: (id) => api.delete(`/qrcodes/${id}`),
};

// Alarms API
export const alarmsAPI = {
    getAll: (params) => api.get('/alarms', { params }),
    getUnresolvedCount: () => api.get('/alarms/unresolved/count'),
    getRecent: (limit = 10) => api.get('/alarms/recent', { params: { limit } }),
    getOne: (id) => api.get(`/alarms/${id}`),
    resolve: (id, data) => api.put(`/alarms/${id}/resolve`, data),
    bulkResolve: (alarmIds, resolution) => api.put('/alarms/resolve/bulk', { alarmIds, resolution }),
    deleteAll: (params) => api.delete('/alarms/all', { params }),
    getStats: (params) => api.get('/alarms/stats/summary', { params }),
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getTrends: (days = 7) => api.get('/dashboard/trends', { params: { days } }),
    getMapKiosks: () => api.get('/dashboard/map/kiosks'),
    getMapAttendance: (hours = 24) => api.get('/dashboard/map/attendance', { params: { hours } }),
    getAuditLogs: (params) => api.get('/dashboard/audit-logs', { params }),
    exportAttendance: (queryString) => api.get(`/dashboard/export/attendance?${queryString}`, {
        responseType: 'blob',
    }),
};

export default api;
