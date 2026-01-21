import { useState, useEffect } from 'react';
import { attendanceAPI, dashboardAPI } from '../services/api';
import {
    FunnelIcon,
    ArrowDownTrayIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Attendance = () => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({
        type: '',
        startDate: '',
        endDate: '',
        isValid: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchAttendance();
    }, [pagination.page, filters]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            };

            // Remove empty filters
            Object.keys(params).forEach((key) => {
                if (params[key] === '') delete params[key];
            });

            const response = await attendanceAPI.getAll(params);
            setAttendance(response.data.attendance);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            type: '',
            startDate: '',
            endDate: '',
            isValid: '',
        });
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const exportData = async () => {
        try {
            setExporting(true);

            // Build query params
            const params = new URLSearchParams();
            params.append('format', 'csv');
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);

            // Fetch Excel data with authentication
            const response = await dashboardAPI.exportAttendance(params.toString());

            // Create blob and download (Excel format)
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Generate filename with date (.xlsx extension)
            const dateStr = format(new Date(), 'yyyy-MM-dd');
            link.setAttribute('download', `attendance-export-${dateStr}.xlsx`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export:', error);
            alert('Failed to export attendance data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const hasActiveFilters = Object.values(filters).some((v) => v !== '');

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Attendance Log</h1>
                    <p className="text-dark-400 mt-1">View all attendance records</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 bg-primary-500 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={exportData}
                        disabled={exporting}
                        className="btn-primary disabled:opacity-50"
                    >
                        {exporting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                Export
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="glass-card">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="label">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="input"
                            >
                                <option value="">All Types</option>
                                <option value="checkin">Check-in</option>
                                <option value="checkout">Check-out</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Status</label>
                            <select
                                value={filters.isValid}
                                onChange={(e) => setFilters({ ...filters, isValid: e.target.value })}
                                className="input"
                            >
                                <option value="">All Status</option>
                                <option value="true">Valid</option>
                                <option value="false">Invalid</option>
                            </select>
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-4 text-sm text-primary-400 hover:text-primary-300"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="glass-card overflow-hidden p-0">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date/Time</th>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Kiosk</th>
                                <th>Location</th>
                                <th>Distance</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-12">
                                        <div className="spinner mx-auto mb-4" />
                                        <p className="text-dark-400">Loading attendance records...</p>
                                    </td>
                                </tr>
                            ) : attendance.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-12">
                                        <ClockIcon className="w-12 h-12 mx-auto text-dark-500 mb-4" />
                                        <p className="text-dark-400">No attendance records found</p>
                                    </td>
                                </tr>
                            ) : (
                                attendance.map((record) => (
                                    <tr key={record.id}>
                                        <td>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {format(new Date(record.scanned_at), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-dark-400">
                                                    {format(new Date(record.scanned_at), 'h:mm:ss a')}
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-semibold">
                                                    {record.employees?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {record.employees?.name || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-dark-400">
                                                        {record.employees?.employee_id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${record.type === 'checkin' ? 'badge-success' : 'badge-info'
                                                    }`}
                                            >
                                                {record.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                            </span>
                                        </td>
                                        <td>
                                            <p className="text-dark-300">{record.kiosks?.name || 'Unknown'}</p>
                                            <p className="text-xs text-dark-500 truncate max-w-[150px]">
                                                {record.kiosks?.address}
                                            </p>
                                        </td>
                                        <td>
                                            {record.lat && record.lng ? (
                                                <div className="flex items-center gap-1 text-sm text-dark-400">
                                                    <MapPinIcon className="w-4 h-4" />
                                                    <span className="font-mono text-xs">
                                                        {record.lat.toFixed(4)}, {record.lng.toFixed(4)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-dark-500">—</span>
                                            )}
                                        </td>
                                        <td>
                                            {record.geofence_distance !== null ? (
                                                <span className="text-dark-300">{record.geofence_distance}m</span>
                                            ) : (
                                                <span className="text-dark-500">—</span>
                                            )}
                                        </td>
                                        <td>
                                            {record.is_valid ? (
                                                <div className="flex items-center gap-1 text-success-400">
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                    <span className="text-sm">Valid</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-danger-400">
                                                    <XCircleIcon className="w-5 h-5" />
                                                    <span className="text-sm">Invalid</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
                        <p className="text-sm text-dark-400">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
            </div>
        </div>
    );
};

export default Attendance;
