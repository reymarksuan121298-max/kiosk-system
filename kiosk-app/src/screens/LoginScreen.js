import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { api, setApiUrl, setAuthToken, getApiUrl } from '../api/client';
import { config } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [apiUrl, setApiUrlInput] = useState(config.API_BASE_URL);
    const [loading, setLoading] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking', 'connected', 'error'

    useEffect(() => {
        const initializeAndCheck = async () => {
            // Load saved URL or use default from config
            const savedUrl = await getApiUrl();
            const urlToUse = savedUrl || config.API_BASE_URL;
            setApiUrlInput(urlToUse);

            // Test connection to backend
            try {
                await setApiUrl(urlToUse);
                await api.healthCheck();
                setConnectionStatus('connected');
            } catch (error) {
                console.log('Initial connection check failed:', error.message);
                setConnectionStatus('error');
            }
        };
        initializeAndCheck();
    }, []);

    const testConnection = async () => {
        setConnectionStatus('checking');
        try {
            await setApiUrl(apiUrl.trim());
            await api.healthCheck();
            setConnectionStatus('connected');
            Alert.alert('Success', 'Connected to backend server!');
        } catch (error) {
            setConnectionStatus('error');
            Alert.alert('Connection Failed', error.message || 'Could not connect to server. Check the URL and your network.');
        }
    };


    const handleLogin = async () => {
        const normalizedEmail = email.trim();
        const normalizedPassword = password.trim();

        if (!normalizedEmail || !normalizedPassword || !apiUrl) {
            Alert.alert('Error', 'Please fill in all fields including API URL.');
            return;
        }

        // Debug logging
        console.log('=== LOGIN ATTEMPT ===');
        console.log('API URL:', apiUrl);
        console.log('Email:', normalizedEmail);
        console.log('Password length:', normalizedPassword.length);

        setLoading(true);
        try {
            await setApiUrl(apiUrl.trim());
            console.log('Making login request...');
            const response = await api.login(normalizedEmail, normalizedPassword);
            console.log('Login response:', JSON.stringify(response.data));

            if (response.data.user.role !== 'admin') {
                // In a real scenario, you might have a 'kiosk' role
                Alert.alert('Access Denied', 'Only Admin can set up the Kiosk.');
                return;
            }

            await setAuthToken(response.data.token);
            onLoginSuccess();
        } catch (error) {
            console.error('=== LOGIN ERROR ===');
            console.error('Error response:', JSON.stringify(error.response?.data));
            console.error('Error message:', error.message);
            console.error('Error status:', error.response?.status);
            const errorMsg = error.response?.data?.error || 'Could not connect to server. Check your API URL and Wi-Fi.';
            Alert.alert('Login Failed', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.gradient}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <MaterialCommunityIcons name="qrcode-scan" size={60} color="#0ea5e9" />
                    </View>
                    <Text style={styles.title}>Kiosk Setup</Text>
                    <Text style={styles.subtitle}>Configure this device for attendance scanning</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Email</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="admin@example.com"
                                placeholderTextColor="#475569"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="#475569"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.configToggle}
                        onPress={() => setShowConfig(!showConfig)}
                    >
                        <Text style={styles.configToggleText}>
                            {showConfig ? 'Hide Network Config' : 'Show Network Config'}
                        </Text>
                        <MaterialCommunityIcons name={showConfig ? "chevron-up" : "chevron-down"} size={20} color="#0ea5e9" />
                    </TouchableOpacity>

                    {showConfig && (
                        <View style={styles.inputGroup}>
                            <View style={styles.statusRow}>
                                <Text style={styles.label}>Backend API URL</Text>
                                <View style={styles.statusIndicator}>
                                    <View style={[
                                        styles.statusDot,
                                        connectionStatus === 'connected' && styles.statusConnected,
                                        connectionStatus === 'error' && styles.statusError,
                                        connectionStatus === 'checking' && styles.statusChecking,
                                    ]} />
                                    <Text style={styles.statusText}>
                                        {connectionStatus === 'connected' ? 'Connected' :
                                            connectionStatus === 'error' ? 'Disconnected' : 'Checking...'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="server-network" size={20} color="#64748b" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={config.API_BASE_URL}
                                    placeholderTextColor="#475569"
                                    value={apiUrl}
                                    onChangeText={setApiUrlInput}
                                    autoCapitalize="none"
                                />
                            </View>
                            <TouchableOpacity style={styles.testButton} onPress={testConnection}>
                                <MaterialCommunityIcons name="connection" size={18} color="#0ea5e9" />
                                <Text style={styles.testButtonText}>Test Connection</Text>
                            </TouchableOpacity>
                            <Text style={styles.hint}>
                                Enter the Public API URL (Localtunnel/Vercel) to connect over the internet.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Complete Setup</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 25,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 8,
        textAlign: 'center',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 15,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 55,
        color: 'white',
        fontSize: 16,
    },
    hint: {
        color: '#64748b',
        fontSize: 12,
        marginLeft: 4,
    },
    configToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    configToggleText: {
        color: '#0ea5e9',
        marginRight: 5,
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#0ea5e9',
        height: 55,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
        backgroundColor: '#64748b',
    },
    statusConnected: {
        backgroundColor: '#22c55e',
    },
    statusError: {
        backgroundColor: '#ef4444',
    },
    statusChecking: {
        backgroundColor: '#f59e0b',
    },
    statusText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.3)',
    },
    testButtonText: {
        color: '#0ea5e9',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});
