// API Configuration for Kiosk App
// Update API_BASE_URL to match your backend server address

// For development on the same network:
// - Use your computer's local IP address (not localhost)
// - The mobile device needs to be on the same WiFi network as your computer

// Your current local IP: 192.168.100.24
const LOCAL_API_URL = 'http://192.168.100.24:5000/api';

// Paste your Localtunnel or Ngrok URL here for building/deployment
const PUBLIC_API_URL = 'https://backend-rho-ashen-76.vercel.app/api';

const API_BASE_URL = PUBLIC_API_URL || LOCAL_API_URL;

export const config = {
    API_BASE_URL,
    // App settings
    APP_NAME: 'Kiosk Attendance',
    VERSION: '1.0.0',
    // Timeouts
    REQUEST_TIMEOUT: 10000, // 10 seconds
    // Location settings
    LOCATION_ACCURACY: 'high',
};

export default config;
