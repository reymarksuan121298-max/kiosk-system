import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { attendanceAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
    CameraIcon,
    CheckCircleIcon,
    XCircleIcon,
    MapPinIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    PhotoIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Scanner = () => {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const scannerRef = useRef(null);
    const { user } = useAuthStore();

    useEffect(() => {
        // Get current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    });
                },
                (err) => {
                    setLocationError('Unable to get your location. Please enable GPS.');
                    console.error('Geolocation error:', err);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setLocationError('Geolocation is not supported by this browser.');
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []);

    const startScanner = () => {
        if (!location) {
            setError('GPS location is required. Please enable location services.');
            return;
        }

        setScanning(true);
        setResult(null);
        setError(null);

        const scanner = new Html5QrcodeScanner(
            'qr-reader',
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
            },
            false
        );

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const onScanSuccess = async (decodedText) => {
        stopScanner();
        setLoading(true);
        setError(null);

        try {
            const response = await attendanceAPI.scan({
                qrData: decodedText,
                lat: location.lat,
                lng: location.lng,
                deviceId: navigator.userAgent,
                deviceInfo: {
                    platform: navigator.platform,
                    language: navigator.language,
                },
            });

            setResult({
                success: true,
                data: response.data,
            });

            // Play success sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQIAG5jV3pltAAAsmuLTjFQAADF8x8N1QwAAL3bCv3ZAAC1yw751PgAsccC+dD0AK3DAv3U8ACpwwL91PAApb8G/dTsAKG/Bv3Y7AChvwb92OwAnbsK/dzsAJ27Cv3c7ACZtw792OgAmbc');
            audio.volume = 0.5;
            audio.play().catch(() => { });

        } catch (err) {
            const errorData = err.response?.data;
            setResult({
                success: false,
                error: errorData?.error || 'Failed to record attendance',
                alarmTriggered: errorData?.alarmTriggered,
                distance: errorData?.distance,
                allowedRadius: errorData?.allowedRadius,
            });

            // Play error sound
            if (errorData?.alarmTriggered) {
                const audio = new Audio();
                audio.src = 'data:audio/wav;base64,UklGRigBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQBAADg';
                audio.volume = 0.8;
                audio.play().catch(() => { });
            }
        } finally {
            setLoading(false);
        }
    };

    const onScanFailure = (error) => {
        // Ignore scan failures as they happen continuously until a QR is found
    };

    // Handle QR code image upload
    const fileInputRef = useRef(null);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!location) {
            setError('GPS location is required. Please enable location services.');
            event.target.value = '';
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const html5Qrcode = new Html5Qrcode("qr-reader-hidden");
            const decodedText = await html5Qrcode.scanFile(file, true);

            // Process the scanned QR code
            await onScanSuccess(decodedText);
        } catch (err) {
            console.error('QR scan from file failed:', err);
            setError('Could not read QR code from image. Please try a clearer image.');
            setLoading(false);
        }

        event.target.value = '';
    };

    const resetScanner = () => {
        setResult(null);
        setError(null);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">QR Code Scanner</h1>
                <p className="text-dark-400 mt-2">Scan your attendance QR code</p>
            </div>

            {/* Location status */}
            <div className="glass-card">
                <div className="flex items-center gap-3">
                    <MapPinIcon className={`w-6 h-6 ${location ? 'text-success-400' : 'text-warning-400'}`} />
                    <div className="flex-1">
                        <p className="font-medium text-white">GPS Location</p>
                        {location ? (
                            <p className="text-sm text-dark-400">
                                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                                <span className="ml-2 text-dark-500">
                                    (±{Math.round(location.accuracy)}m accuracy)
                                </span>
                            </p>
                        ) : locationError ? (
                            <p className="text-sm text-danger-400">{locationError}</p>
                        ) : (
                            <p className="text-sm text-dark-400">Getting location...</p>
                        )}
                    </div>
                    {location && <span className="badge-success">Ready</span>}
                </div>
            </div>

            {/* Scanner section */}
            <div className="glass-card">
                {!scanning && !result ? (
                    <div className="space-y-6">

                        {error && (
                            <div className="alert-danger">
                                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {loading && (
                            <div className="text-center py-4">
                                <div className="spinner w-8 h-8 mx-auto mb-2" />
                                <p className="text-dark-400">Processing QR code...</p>
                            </div>
                        )}

                        {/* Hidden elements for file QR scanning */}
                        <div id="qr-reader-hidden" style={{ display: 'none' }} />
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        <div className="space-y-3">
                            <p className="text-center text-dark-400 text-sm">Choose how to scan your QR code</p>

                            {/* Camera Scan Button */}
                            <button
                                onClick={startScanner}
                                disabled={!location || loading}
                                className="btn-primary w-full py-4 text-lg"
                            >
                                <CameraIcon className="w-6 h-6" />
                                Scan with Camera
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-dark-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-dark-800 text-dark-400">or</span>
                                </div>
                            </div>

                            {/* Upload Image Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!location || loading}
                                className="btn-secondary w-full py-4 text-lg"
                            >
                                <PhotoIcon className="w-6 h-6" />
                                Upload QR Image
                            </button>
                        </div>
                    </div>
                ) : scanning ? (
                    <div className="space-y-4">
                        <div className="qr-scanner-container relative">
                            <div id="qr-reader" className="rounded-xl overflow-hidden" />
                            <div className="qr-scanner-overlay rounded-xl" />
                        </div>

                        {loading && (
                            <div className="text-center py-4">
                                <div className="spinner w-8 h-8 mx-auto mb-2" />
                                <p className="text-dark-400">Processing attendance...</p>
                            </div>
                        )}

                        <button onClick={stopScanner} className="btn-secondary w-full">
                            Cancel
                        </button>
                    </div>
                ) : result ? (
                    <div className="space-y-6">
                        {/* Result display */}
                        <div
                            className={`text-center p-6 rounded-2xl ${result.success
                                ? 'bg-success-500/10 border border-success-500/30'
                                : 'bg-danger-500/10 border border-danger-500/30'
                                }`}
                        >
                            {result.success ? (
                                <>
                                    <CheckCircleIcon className="w-16 h-16 text-success-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {result.data.attendance?.type === 'checkin' ? 'Check-In' : 'Check-Out'} Successful!
                                    </h3>
                                    <p className="text-dark-300">{result.data.message}</p>
                                </>
                            ) : (
                                <>
                                    <XCircleIcon className="w-16 h-16 text-danger-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">Scan Failed</h3>
                                    <p className="text-dark-300">{result.error}</p>
                                    {result.distance && (
                                        <p className="text-sm text-dark-400 mt-2">
                                            You are {result.distance}m away (allowed: {result.allowedRadius}m)
                                        </p>
                                    )}
                                    {result.alarmTriggered && (
                                        <div className="mt-4 flex items-center justify-center gap-2 text-warning-400">
                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                            <span className="text-sm">Security alert triggered</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Attendance details */}
                        {result.success && result.data.attendance && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
                                    <span className="text-dark-400">Employee</span>
                                    <span className="text-white font-medium">
                                        {result.data.attendance.employee?.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
                                    <span className="text-dark-400">Kiosk</span>
                                    <span className="text-white font-medium">
                                        {result.data.attendance.kiosk?.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
                                    <span className="text-dark-400">Time</span>
                                    <span className="text-white font-medium">
                                        {format(new Date(result.data.attendance.scannedAt), 'PPpp')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-dark-400">Distance from Kiosk</span>
                                    <span className="text-white font-medium">
                                        {result.data.attendance.geofenceDistance}m
                                    </span>
                                </div>
                            </div>
                        )}

                        <button onClick={resetScanner} className="btn-primary w-full">
                            Scan Another
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Instructions */}
            {!scanning && !result && !loading && (
                <div className="glass-card">
                    <h3 className="font-medium text-white mb-4">Instructions</h3>
                    <ol className="space-y-3 text-dark-400 list-decimal list-inside">
                        <li>Ensure GPS location is enabled and detected</li>
                        <li>Choose one of the following options:
                            <ul className="ml-6 mt-2 space-y-1 list-disc">
                                <li><strong className="text-dark-300">Scan with Camera:</strong> Point your camera at the QR code at your kiosk</li>
                                <li><strong className="text-dark-300">Upload QR Image:</strong> Upload a photo of your designated QR code</li>
                            </ul>
                        </li>
                        <li>The QR code contains your employee information</li>
                        <li>Wait for the scan to complete and verify your attendance</li>
                    </ol>
                </div>
            )}
        </div>
    );
};

export default Scanner;
