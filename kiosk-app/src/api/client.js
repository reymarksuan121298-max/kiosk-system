import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../config';

const API_KEY = 'KIOSK_API_URL';
const TOKEN_KEY = 'KIOSK_AUTH_TOKEN';

// Get the API URL from storage or use default from config
export const getApiUrl = async () => {
    const url = await SecureStore.getItemAsync(API_KEY);
    return url || config.API_BASE_URL;
};

export const setApiUrl = async (url) => {
    await SecureStore.setItemAsync(API_KEY, url);
};

export const setAuthToken = async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getAuthToken = async () => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeAuthToken = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// Create axios client with dynamic base URL
const getClient = async () => {
    const baseURL = await getApiUrl();
    const token = await getAuthToken();

    const client = axios.create({
        baseURL,
        timeout: config.REQUEST_TIMEOUT,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
    });

    // Add response interceptor for better error handling
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.code === 'ECONNABORTED') {
                error.message = 'Request timeout. Please check your connection.';
            } else if (!error.response) {
                error.message = 'Network error. Please check if the server is running and you are on the same network.';
            }
            return Promise.reject(error);
        }
    );

    return client;
};

// API methods
export const api = {
    // Health check - test connection to backend
    healthCheck: async () => {
        const client = await getClient();
        return client.get('/health');
    },

    // Authentication
    login: async (email, password) => {
        const client = await getClient();
        return client.post('/auth/login', { email, password });
    },

    logout: async () => {
        const client = await getClient();
        return client.post('/auth/logout');
    },

    getMe: async () => {
        const client = await getClient();
        return client.get('/auth/me');
    },

    // Attendance
    scanAttendance: async (data) => {
        const client = await getClient();
        return client.post('/attendance/scan', data);
    },

    getTodayAttendance: async () => {
        const client = await getClient();
        return client.get('/attendance/today');
    },

    // Kiosks
    getKiosks: async () => {
        const client = await getClient();
        return client.get('/kiosks');
    },

    getKiosk: async (id) => {
        const client = await getClient();
        return client.get(`/kiosks/${id}`);
    },

    // Employees
    getEmployees: async () => {
        const client = await getClient();
        return client.get('/employees');
    },

    // QR Codes
    getEmployeeQRCode: async (employeeId) => {
        const client = await getClient();
        return client.get(`/qrcodes/employee/${employeeId}`);
    },

    generateQRCode: async (data) => {
        const client = await getClient();
        return client.post('/qrcodes/generate', data);
    },
};

export default api;
