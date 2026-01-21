import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import { getAuthToken, removeAuthToken } from './src/api/client';

export default function App() {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    try {
      const token = await getAuthToken();
      // Even if no token, we show the scanner by default in Kiosk mode
      setLoading(false);
    } catch (e) {
      console.error('Failed to check status:', e);
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsSetupMode(false);
  };

  const handleGoToSetup = () => {
    setIsSetupMode(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {isSetupMode ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <ScannerScreen onSetup={handleGoToSetup} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
