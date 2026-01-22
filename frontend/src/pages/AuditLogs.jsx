import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
    ClipboardDocumentCheckIcon,
    FunnelIcon,
    ArrowPathIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const AuditLogs = () => {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        startDate: '',
        endDate: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const fetchLogs = async () => {
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

            const response = await dashboardAPI.getAuditLogs(params);
            setLogs(response.data.logs);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Are you sure you want to delete all audit logs? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            await dashboardAPI.deleteAllAuditLogs();
            fetchLogs();
        } catch (error) {
            console.error('Failed to delete audit logs:', error);
            alert('Failed to delete audit logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('CREATE') || action.includes('REGISTER')) return 'badge-success';
        if (action.includes('DELETE')) return 'badge-danger';
        if (action.includes('UPDATE') || action.includes('CHANGE')) return 'badge-warning';
        if (action.includes('ALARM')) return 'badge-danger';
        return 'badge-info';
    };

    const formatAction = (action) => {
        return action
            .split('_')
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    };

    const hasActiveFilters = Object.values(filters).some((v) => v !== '');

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Audit Logs</h1>
                    <p className="text-dark-400 mt-1">System activity and security logs</p>
                </div>
                <div className="flex gap-3">
                    {user?.role === 'admin' && (
                        <button
                            onClick={handleDeleteAll}
                            className="btn-secondary text-danger-400 hover:text-danger-300"
                            title="Delete All Logs"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Clear Logs
                        </button>
                    )}
                    <button onClick={fetchLogs} className="btn-secondary">
                        <ArrowPathIcon className="w-5 h-5" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="glass-card">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="label">Action</label>
                            <select
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                className="input"
                            >
                                <option value="">All Actions</option>
                                <option value="USER_LOGIN">User Login</option>
                                <option value="USER_LOGOUT">User Logout</option>
                                <option value="EMPLOYEE_CREATED">Employee Created</option>
                                <option value="EMPLOYEE_UPDATED">Employee Updated</option>
                                <option value="KIOSK_CREATED">Kiosk Created</option>
                                <option value="QR_CODE_GENERATED">QR Generated</option>
                                <option value="ATTENDANCE_RECORDED">Attendance</option>
                                <option value="ALARM_TRIGGERED">Alarm Triggered</option>
                                <option value="ALARM_RESOLVED">Alarm Resolved</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Entity Type</label>
                            <select
                                value={filters.entityType}
                                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                                className="input"
                            >
                                <option value="">All Types</option>
                                <option value="user">User</option>
                                <option value="employee">Employee</option>
                                <option value="kiosk">Kiosk</option>
                                <option value="qr_code">QR Code</option>
                                <option value="attendance">Attendance</option>
                                <option value="alarm">Alarm</option>
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
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={() => setFilters({ action: '', entityType: '', startDate: '', endDate: '' })}
                            className="mt-4 text-sm text-primary-400 hover:text-primary-300"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Logs Table */}
            <div className="glass-card overflow-hidden p-0">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>User</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-12">
                                        <div className="spinner mx-auto mb-4" />
                                        <p className="text-dark-400">Loading audit logs...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-12">
                                        <ClipboardDocumentCheckIcon className="w-12 h-12 mx-auto text-dark-500 mb-4" />
                                        <p className="text-dark-400">No audit logs found</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {format(new Date(log.created_at), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-dark-400">
                                                    {format(new Date(log.created_at), 'h:mm:ss a')}
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getActionColor(log.action)}`}>
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <p className="text-white capitalize">{log.entity_type || '—'}</p>
                                                {log.entity_id && (
                                                    <p className="text-xs text-dark-500 font-mono truncate max-w-[100px]">
                                                        {log.entity_id.slice(0, 8)}...
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {log.users ? (
                                                <div>
                                                    <p className="text-white">{log.users.name}</p>
                                                    <p className="text-xs text-dark-400">{log.users.email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-dark-500">System</span>
                                            )}
                                        </td>
                                        <td>
                                            {log.details && Object.keys(log.details).length > 0 ? (
                                                <details className="cursor-pointer">
                                                    <summary className="text-primary-400 hover:text-primary-300 text-sm">
                                                        View details
                                                    </summary>
                                                    <pre className="mt-2 p-2 bg-dark-900 rounded text-xs text-dark-300 max-w-xs overflow-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </details>
                                            ) : (
                                                <span className="text-dark-500">—</span>
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

export default AuditLogs;
