import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, alarmsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAlarmStore } from '../store/alarmStore';
import {
    UserGroupIcon,
    BuildingStorefrontIcon,
    ClipboardDocumentListIcon,
    BellAlertIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    MapPinIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { format } from 'date-fns';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const { recentAlarms, fetchRecentAlarms } = useAlarmStore();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, trendsRes] = await Promise.all([
                dashboardAPI.getStats(),
                dashboardAPI.getTrends(7),
            ]);
            setStats(statsRes.data);
            setTrends(trendsRes.data.trends || []);
            await fetchRecentAlarms(5);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: "Today's Check-ins",
            value: stats?.todayStats?.checkIns || 0,
            icon: ArrowTrendingUpIcon,
            color: 'blue',
            gradient: 'from-primary-500 to-primary-600',
        },
        {
            title: "Today's Check-outs",
            value: stats?.todayStats?.checkOuts || 0,
            icon: ArrowTrendingDownIcon,
            color: 'green',
            gradient: 'from-success-500 to-success-600',
        },
        {
            title: 'Total Employees',
            value: stats?.totalEmployees || 0,
            icon: UserGroupIcon,
            color: 'yellow',
            gradient: 'from-warning-500 to-warning-600',
        },
        {
            title: 'Active Kiosks',
            value: stats?.totalKiosks || 0,
            icon: BuildingStorefrontIcon,
            color: 'blue',
            gradient: 'from-accent-500 to-accent-600',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4" />
                    <p className="text-dark-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Welcome header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                        Welcome back, <span className="gradient-primary">{user?.name?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-dark-400 mt-1">
                        Here's what's happening with your attendance system today.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-dark-400">
                    <ClockIcon className="w-5 h-5" />
                    <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
                </div>
            </div>

            {/* Alert banner for critical alarms */}
            {stats?.criticalAlarms > 0 && (
                <div className="alert-danger alarm-pulse">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-medium">Critical Alarms Detected</p>
                        <p className="text-sm opacity-80">
                            You have {stats.criticalAlarms} critical alarm{stats.criticalAlarms > 1 ? 's' : ''} requiring immediate attention.
                        </p>
                    </div>
                    <Link to="/alarms" className="btn btn-danger py-2 px-4">
                        View Alarms
                    </Link>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={stat.title}
                        className={`stat-card ${stat.color} card-hover`}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-dark-400 text-sm font-medium">{stat.title}</p>
                                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Trend Chart */}
                <div className="lg:col-span-2 glass-card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">Attendance Trend</h2>
                        <span className="text-sm text-dark-400">Last 7 days</span>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="checkInGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="checkOutGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                                />
                                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                    }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                    labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="checkIns"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    fill="url(#checkInGradient)"
                                    name="Check-ins"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="checkOuts"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fill="url(#checkOutGradient)"
                                    name="Check-outs"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Alarms */}
                <div className="glass-card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">Recent Alarms</h2>
                        <Link to="/alarms" className="text-sm text-primary-400 hover:text-primary-300">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {recentAlarms.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                <BellAlertIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No recent alarms</p>
                            </div>
                        ) : (
                            recentAlarms.map((alarm) => (
                                <div
                                    key={alarm.id}
                                    className={`p-3 rounded-xl border ${alarm.severity === 'critical'
                                        ? 'bg-danger-500/10 border-danger-500/30'
                                        : alarm.severity === 'high'
                                            ? 'bg-warning-500/10 border-warning-500/30'
                                            : 'bg-dark-700/50 border-dark-600/50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <ExclamationTriangleIcon
                                            className={`w-5 h-5 flex-shrink-0 ${alarm.severity === 'critical'
                                                ? 'text-danger-400'
                                                : alarm.severity === 'high'
                                                    ? 'text-warning-400'
                                                    : 'text-dark-400'
                                                }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{alarm.message}</p>
                                            <p className="text-xs text-dark-400 mt-1">
                                                {format(new Date(alarm.triggered_at), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                        <span
                                            className={`badge ${alarm.severity === 'critical'
                                                ? 'badge-danger'
                                                : alarm.severity === 'high'
                                                    ? 'badge-warning'
                                                    : 'badge-info'
                                                }`}
                                        >
                                            {alarm.severity}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                    to="/map"
                    className="glass-card flex items-center gap-4 hover:border-success-500/50 transition-all group"
                >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-success-500 to-success-600 group-hover:shadow-glow transition-shadow">
                        <MapPinIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">View Map</h3>
                        <p className="text-sm text-dark-400">Kiosk locations</p>
                    </div>
                </Link>

                <Link
                    to="/attendance"
                    className="glass-card flex items-center gap-4 hover:border-warning-500/50 transition-all group"
                >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-warning-500 to-warning-600 group-hover:shadow-glow transition-shadow">
                        <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Attendance Log</h3>
                        <p className="text-sm text-dark-400">View records</p>
                    </div>
                </Link>

                {user?.role === 'admin' && (
                    <Link
                        to="/qrcodes"
                        className="glass-card flex items-center gap-4 hover:border-accent-500/50 transition-all group"
                    >
                        <div className="p-3 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 group-hover:shadow-glow transition-shadow">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-white">Generate QR</h3>
                            <p className="text-sm text-dark-400">Create new codes</p>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
