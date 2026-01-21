import { useState, useEffect } from 'react';
import { alarmsAPI } from '../services/api';
import { useAlarmStore } from '../store/alarmStore';
import {
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XMarkIcon,
    FunnelIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Alarms = () => {
    const [alarms, setAlarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlarm, setSelectedAlarm] = useState(null);
    const [resolving, setResolving] = useState(false);
    const [resolution, setResolution] = useState('');
    const [filters, setFilters] = useState({
        type: '',
        severity: '',
        isResolved: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });
    const { fetchUnresolvedCount, decrementCount } = useAlarmStore();

    useEffect(() => {
        fetchAlarms();
    }, [pagination.page, filters]);

    const fetchAlarms = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            };
            Object.keys(params).forEach((key) => {
                if (params[key] === '') delete params[key];
            });

            const response = await alarmsAPI.getAll(params);
            setAlarms(response.data.alarms);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error('Failed to fetch alarms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedAlarm) return;
        setResolving(true);

        try {
            await alarmsAPI.resolve(selectedAlarm.id, { resolution });
            setSelectedAlarm(null);
            setResolution('');
            fetchAlarms();
            decrementCount();
            fetchUnresolvedCount();
        } catch (error) {
            console.error('Failed to resolve alarm:', error);
        } finally {
            setResolving(false);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'badge-danger';
            case 'high':
                return 'badge-warning';
            case 'medium':
                return 'badge-info';
            default:
                return 'bg-dark-600 text-dark-300';
        }
    };

    const getSeverityBg = (severity) => {
        switch (severity) {
            case 'critical':
                return 'bg-danger-500/10 border-danger-500/30';
            case 'high':
                return 'bg-warning-500/10 border-warning-500/30';
            case 'medium':
                return 'bg-primary-500/10 border-primary-500/30';
            default:
                return 'bg-dark-700/50 border-dark-600/50';
        }
    };

    const getTypeLabel = (type) => {
        const types = {
            INVALID_QR: 'Invalid QR',
            REVOKED_QR: 'Revoked QR',
            OUTSIDE_GEOFENCE: 'Outside Geofence',
            MULTIPLE_SCANS: 'Multiple Scans',
            GPS_SPOOFING: 'GPS Spoofing',
            DEVICE_TAMPERING: 'Device Tampering',
            UNKNOWN_DEVICE: 'Unknown Device',
        };
        return types[type] || type;
    };

    const hasActiveFilters = Object.values(filters).some((v) => v !== '');

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Alarms</h1>
                    <p className="text-dark-400 mt-1">Security alerts and notifications</p>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn-secondary ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}
                >
                    <FunnelIcon className="w-5 h-5" />
                    Filters
                </button>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="glass-card">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="label">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="input"
                            >
                                <option value="">All Types</option>
                                <option value="INVALID_QR">Invalid QR</option>
                                <option value="REVOKED_QR">Revoked QR</option>
                                <option value="OUTSIDE_GEOFENCE">Outside Geofence</option>
                                <option value="MULTIPLE_SCANS">Multiple Scans</option>
                                <option value="GPS_SPOOFING">GPS Spoofing</option>
                                <option value="DEVICE_TAMPERING">Device Tampering</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Severity</label>
                            <select
                                value={filters.severity}
                                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                                className="input"
                            >
                                <option value="">All Severity</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Status</label>
                            <select
                                value={filters.isResolved}
                                onChange={(e) => setFilters({ ...filters, isResolved: e.target.value })}
                                className="input"
                            >
                                <option value="">All Status</option>
                                <option value="false">Unresolved</option>
                                <option value="true">Resolved</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Alarms List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-dark-400">Loading alarms...</p>
                    </div>
                ) : alarms.length === 0 ? (
                    <div className="text-center py-12 glass-card">
                        <BellAlertIcon className="w-12 h-12 mx-auto text-dark-500 mb-4" />
                        <p className="text-dark-400">No alarms found</p>
                    </div>
                ) : (
                    alarms.map((alarm) => (
                        <div
                            key={alarm.id}
                            className={`glass-card border ${alarm.is_resolved
                                    ? 'opacity-60 border-dark-700/50'
                                    : getSeverityBg(alarm.severity)
                                } ${!alarm.is_resolved && alarm.severity === 'critical' ? 'alarm-pulse' : ''}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                {/* Icon */}
                                <div
                                    className={`p-3 rounded-xl self-start ${alarm.is_resolved
                                            ? 'bg-success-500/20'
                                            : alarm.severity === 'critical'
                                                ? 'bg-danger-500'
                                                : alarm.severity === 'high'
                                                    ? 'bg-warning-500'
                                                    : 'bg-primary-500/50'
                                        }`}
                                >
                                    {alarm.is_resolved ? (
                                        <CheckCircleIcon className="w-6 h-6 text-success-400" />
                                    ) : (
                                        <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`badge ${getSeverityColor(alarm.severity)}`}>
                                            {alarm.severity}
                                        </span>
                                        <span className="badge bg-dark-700 text-dark-300">
                                            {getTypeLabel(alarm.type)}
                                        </span>
                                        {alarm.is_resolved && (
                                            <span className="badge badge-success">Resolved</span>
                                        )}
                                    </div>
                                    <p className="text-white font-medium">{alarm.message}</p>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-dark-400">
                                        <span>
                                            Triggered: {format(new Date(alarm.triggered_at), 'PPpp')}
                                        </span>
                                        {alarm.employees && (
                                            <span>Employee: {alarm.employees.name}</span>
                                        )}
                                        {alarm.kiosks && <span>Kiosk: {alarm.kiosks.name}</span>}
                                    </div>
                                    {alarm.is_resolved && alarm.resolution && (
                                        <div className="mt-3 p-3 bg-dark-800/50 rounded-lg">
                                            <p className="text-sm text-dark-300">
                                                <span className="text-dark-500">Resolution:</span> {alarm.resolution}
                                            </p>
                                            {alarm.resolved_at && (
                                                <p className="text-xs text-dark-500 mt-1">
                                                    Resolved on {format(new Date(alarm.resolved_at), 'PPpp')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {!alarm.is_resolved && (
                                    <button
                                        onClick={() => setSelectedAlarm(alarm)}
                                        className="btn-primary py-2 self-start"
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-dark-400">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            disabled={pagination.page === 1}
                            className="btn-secondary py-2 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            disabled={pagination.page === pagination.totalPages}
                            className="btn-secondary py-2 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {selectedAlarm && (
                <div className="modal-overlay" onClick={() => setSelectedAlarm(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">Resolve Alarm</h2>
                            <button onClick={() => setSelectedAlarm(null)} className="btn-icon">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className={`p-4 rounded-xl ${getSeverityBg(selectedAlarm.severity)}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`badge ${getSeverityColor(selectedAlarm.severity)}`}>
                                        {selectedAlarm.severity}
                                    </span>
                                    <span className="badge bg-dark-700 text-dark-300">
                                        {getTypeLabel(selectedAlarm.type)}
                                    </span>
                                </div>
                                <p className="text-white">{selectedAlarm.message}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="label">Resolution Notes</label>
                            <textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                className="input min-h-[100px]"
                                placeholder="Describe the resolution or action taken..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedAlarm(null)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResolve}
                                disabled={resolving}
                                className="btn-success flex-1"
                            >
                                {resolving ? (
                                    <>
                                        <span className="spinner w-4 h-4" />
                                        Resolving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Mark as Resolved
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Alarms;
