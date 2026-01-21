import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { dashboardAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
    BuildingStorefrontIcon,
    UserGroupIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons
const kioskIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0ea5e9" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const checkinIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" width="24" height="24">
      <circle cx="12" cy="12" r="10" stroke="#16a34a" stroke-width="2"/>
      <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

const checkoutIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="24" height="24">
      <circle cx="12" cy="12" r="10" stroke="#d97706" stroke-width="2"/>
      <path d="M8 12h8" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

// Map center controller
const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 15);
        }
    }, [center, map]);
    return null;
};

const Map = () => {
    const [kiosks, setKiosks] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedKiosk, setSelectedKiosk] = useState(null);
    const [showAttendance, setShowAttendance] = useState(true);
    const [mapCenter, setMapCenter] = useState([14.5995, 120.9842]); // Default to Manila
    const [mapStyle, setMapStyle] = useState('street'); // 'street' or 'satellite'

    useEffect(() => {
        fetchMapData();
    }, []);

    const fetchMapData = async () => {
        try {
            setLoading(true);
            const [kiosksRes, attendanceRes] = await Promise.all([
                dashboardAPI.getMapKiosks(),
                dashboardAPI.getMapAttendance(24),
            ]);
            setKiosks(kiosksRes.data.kiosks || []);
            setAttendance(attendanceRes.data.attendance || []);

            // Center map on first kiosk if available
            if (kiosksRes.data.kiosks?.length > 0) {
                const firstKiosk = kiosksRes.data.kiosks[0];
                setMapCenter([firstKiosk.lat, firstKiosk.lng]);
            }
        } catch (error) {
            console.error('Failed to fetch map data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKioskClick = (kiosk) => {
        setSelectedKiosk(kiosk);
        setMapCenter([kiosk.lat, kiosk.lng]);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Map View</h1>
                    <p className="text-dark-400 mt-1">Kiosk locations and recent attendance</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Map Style Toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-dark-600">
                        <button
                            onClick={() => setMapStyle('street')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${mapStyle === 'street'
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                }`}
                        >
                            Street
                        </button>
                        <button
                            onClick={() => setMapStyle('satellite')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${mapStyle === 'satellite'
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                }`}
                        >
                            Satellite
                        </button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showAttendance}
                            onChange={(e) => setShowAttendance(e.target.checked)}
                            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-dark-300 text-sm">Show attendance markers</span>
                    </label>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Kiosk List */}
                <div className="hidden lg:block w-80 glass-card overflow-hidden p-0">
                    <div className="p-4 border-b border-dark-700/50">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <BuildingStorefrontIcon className="w-5 h-5 text-primary-400" />
                            Kiosks ({kiosks.length})
                        </h2>
                    </div>
                    <div className="overflow-y-auto h-full pb-4">
                        {kiosks.map((kiosk) => (
                            <button
                                key={kiosk.id}
                                onClick={() => handleKioskClick(kiosk)}
                                className={`w-full text-left p-4 border-b border-dark-700/30 hover:bg-dark-700/50 transition-colors ${selectedKiosk?.id === kiosk.id ? 'bg-primary-500/10 border-l-2 border-l-primary-500' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <MapPinIcon className={`w-5 h-5 flex-shrink-0 ${selectedKiosk?.id === kiosk.id ? 'text-primary-400' : 'text-dark-400'
                                        }`} />
                                    <div>
                                        <p className="font-medium text-white">{kiosk.name}</p>
                                        <p className="text-sm text-dark-400 line-clamp-2">{kiosk.address}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`badge ${kiosk.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                {kiosk.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-xs text-dark-500">{kiosk.geofence_radius}m radius</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 map-container">
                    {loading ? (
                        <div className="h-full flex items-center justify-center bg-dark-800">
                            <div className="text-center">
                                <div className="spinner w-12 h-12 mx-auto mb-4" />
                                <p className="text-dark-400">Loading map...</p>
                            </div>
                        </div>
                    ) : (
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            className="h-full w-full"
                            scrollWheelZoom={true}
                        >
                            <MapController center={mapCenter} />

                            {/* Map Tiles - Street or Satellite */}
                            {mapStyle === 'street' ? (
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            ) : (
                                <>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    />
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                                    />
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                                    />
                                </>
                            )}

                            {/* Kiosk markers with geofence circles */}
                            {kiosks.map((kiosk) => (
                                <div key={kiosk.id}>
                                    <Circle
                                        center={[kiosk.lat, kiosk.lng]}
                                        radius={kiosk.geofence_radius}
                                        pathOptions={{
                                            color: '#0ea5e9',
                                            fillColor: '#0ea5e9',
                                            fillOpacity: 0.1,
                                            weight: 2,
                                        }}
                                    />
                                    <Marker
                                        position={[kiosk.lat, kiosk.lng]}
                                        icon={kioskIcon}
                                    >
                                        <Popup>
                                            <div className="min-w-[200px]">
                                                <h3 className="font-semibold text-dark-900">{kiosk.name}</h3>
                                                <p className="text-sm text-dark-600 mt-1">{kiosk.address}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs ${kiosk.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {kiosk.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                    <span className="text-xs text-dark-500">
                                                        {kiosk.geofence_radius}m radius
                                                    </span>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </div>
                            ))}

                            {/* Attendance markers */}
                            {showAttendance && attendance.map((record) => (
                                record.lat && record.lng && (
                                    <Marker
                                        key={record.id}
                                        position={[record.lat, record.lng]}
                                        icon={record.type === 'checkin' ? checkinIcon : checkoutIcon}
                                    >
                                        <Popup>
                                            <div className="min-w-[180px]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs ${record.type === 'checkin'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {record.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-dark-900">
                                                    {record.employees?.name || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-dark-600">
                                                    {record.kiosks?.name}
                                                </p>
                                                <p className="text-xs text-dark-500 mt-1">
                                                    {format(new Date(record.scanned_at), 'PPpp')}
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
                        </MapContainer>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="glass-card py-3 px-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-primary-500" />
                        <span className="text-dark-400">Kiosk Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-success-500" />
                        <span className="text-dark-400">Check-in</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-warning-500" />
                        <span className="text-dark-400">Check-out</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border-2 border-primary-500 border-dashed opacity-50" />
                        <span className="text-dark-400">Geofence Area</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Map;
