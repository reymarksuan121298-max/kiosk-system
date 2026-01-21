import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { api } from '../api/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen({ onSetup }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [result, setResult] = useState(null);
    const [setupTaps, setSetupTaps] = useState(0);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'GPS is required for attendance.');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        })();
    }, []);

    const handleBarcodeScanned = async ({ data }) => {
        if (!scanning || loading) return;

        setScanning(false);
        setLoading(true);

        try {
            // Get fresh location
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

            const response = await api.scanAttendance({
                qrData: data,
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                deviceId: Device.osBuildId || Device.designName,
                deviceInfo: {
                    model: Device.modelName,
                    os: Device.osName,
                    version: Device.osVersion
                }
            });

            setResult({
                success: true,
                message: response.data.message,
                attendance: response.data.attendance
            });

        } catch (error) {
            console.log('Scan error:', error.response?.data || error.message);
            setResult({
                success: false,
                message: error.response?.data?.error || 'Failed to record attendance'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let timer;
        if (result) {
            // Automatically reset scanner after 5 seconds
            timer = setTimeout(() => {
                resetScanner();
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [result]);

    const resetScanner = () => {
        setResult(null);
        setScanning(true);
    };

    if (!permission) {
        return <View style={styles.center}><ActivityIndicator color="#0ea5e9" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera access is required</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {scanning ? (
                <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.unfocusedContainer}></View>
                        <View style={styles.focusedContainer}>
                            <View style={styles.unfocusedContainer}></View>
                            <View style={styles.focusedCenter}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                            <View style={styles.unfocusedContainer}></View>
                        </View>
                        <View style={styles.unfocusedContainer}>
                            <Text style={styles.scanText}>Scan your Personal QR Code</Text>
                        </View>
                    </View>

                    {/* Secret Setup Button (Hidden) */}
                    <TouchableOpacity
                        style={[styles.logoutBtn, { opacity: 0 }]}
                        onPress={() => {
                            // Secret: Tap 5 times quickly to open setup
                            setSetupTaps(prev => prev + 1);
                            setTimeout(() => setSetupTaps(0), 2000); // Reset counter after 2 seconds
                            if (setupTaps >= 4) {
                                onSetup();
                                setSetupTaps(0);
                            }
                        }}
                    >
                        <MaterialCommunityIcons name="cog" size={24} color="white" />
                    </TouchableOpacity>
                </CameraView>
            ) : (
                <View style={styles.resultContainer}>
                    <BlurView intensity={20} tint="dark" style={styles.resultCard}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#0ea5e9" />
                        ) : (
                            <>
                                <MaterialCommunityIcons
                                    name={result.success ? "check-circle" : "alert-circle"}
                                    size={80}
                                    color={result.success ? "#22c55e" : "#ef4444"}
                                />
                                <Text style={styles.resultTitle}>{result.success ? 'Success!' : 'Failed'}</Text>
                                <Text style={styles.resultMsg}>{result.message}</Text>

                                {result.success && result.attendance && (
                                    <View style={styles.details}>
                                        <Text style={styles.detailText}>Employee: {result.attendance.employee?.name}</Text>
                                        <Text style={styles.detailText}>Type: {result.attendance.type.toUpperCase()}</Text>
                                        <Text style={styles.detailText}>Kiosk: {result.attendance.kiosk?.name}</Text>
                                    </View>
                                )}

                                <TouchableOpacity style={[styles.button, { marginTop: 30 }]} onPress={resetScanner}>
                                    <Text style={styles.buttonText}>Scan Another (Auto-resets in 5s)</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </BlurView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    camera: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    unfocusedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    focusedContainer: {
        flexDirection: 'row',
        height: 280,
    },
    focusedCenter: {
        width: 280,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#0ea5e9',
    },
    topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
    topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
    scanText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    logoutBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 10,
        borderRadius: 20,
    },
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    resultCard: {
        width: '100%',
        padding: 30,
        borderRadius: 30,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    resultTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 15,
    },
    resultMsg: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    details: {
        marginTop: 20,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 15,
    },
    detailText: {
        color: 'white',
        fontSize: 14,
        marginBottom: 5,
    },
    button: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 15,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    text: {
        color: 'white',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
});
