# Kiosk Attendance Mobile App

A React Native (Expo) application designed for tablets/phones placed at entry/exit points.

## Features
- **One-Time Admin Setup**: Securely configure the backend URL and authenticate the device.
- **Universal QR Scanning**: Supports the new universal Teller QR codes.
- **GPS Verification**: Automatically verifies the device's location against the kiosk geofence.
- **Time-Locked**: Prevents scanning outside of the 6-9 AM and 9-11 PM windows.
- **Premium UI**: Sleek dark-mode interface with blur effects and smooth animations.

## Compatibility

- **Android**: API 24+ (Android 7.0 Nougat and above)
- **iOS**: iOS 13.0+


## Getting Started

1. **Navigate to the directory**:
   ```bash
   cd kiosk-app
   ```

2. **Start the development server**:
   ```bash
   npx expo start
   ```

3. **Open on your device**:
   - Download the **Expo Go** app on your iPhone or Android.
   - Scan the QR code appearing in your terminal.

## Configuration
When you first open the app, you will be prompted to:
1. Enter the **Backend API URL** (e.g., `http://192.168.1.10:5000/api`).
2. Log in with an **Admin** account to authorize the device.

Once set up, the app will stay in **Scanner Mode** indefinitely. To reset or change the URL, use the logout icon in the top right.
