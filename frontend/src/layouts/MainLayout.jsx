import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAlarmStore } from '../store/alarmStore';
import { useThemeStore } from '../store/themeStore';
import { useEffect } from 'react';
import {
    HomeIcon,
    UserGroupIcon,
    BuildingStorefrontIcon,
    ClipboardDocumentListIcon,
    QrCodeIcon,
    BellAlertIcon,
    MapIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    ClipboardDocumentCheckIcon,
    MoonIcon,
    SunIcon,
} from '@heroicons/react/24/outline';
import { BellIcon } from '@heroicons/react/24/solid';

const MainLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuthStore();
    const { unresolvedCount, fetchUnresolvedCount, recentAlarms, fetchRecentAlarms } = useAlarmStore();
    const { isDarkMode, toggleTheme, initTheme } = useThemeStore();
    const navigate = useNavigate();

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        // Initialize theme on mount
        initTheme();

        fetchUnresolvedCount();
        fetchRecentAlarms(5);

        // Poll for new alarms every 30 seconds
        const interval = setInterval(() => {
            fetchUnresolvedCount();
            fetchRecentAlarms(5);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchUnresolvedCount, fetchRecentAlarms, initTheme]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, show: true },
        { name: 'Attendance', href: '/attendance', icon: ClipboardDocumentListIcon, show: true },
        { name: 'Map View', href: '/map', icon: MapIcon, show: true },
        { name: 'Employees', href: '/employees', icon: UserGroupIcon, show: isAdmin },
        { name: 'Kiosks', href: '/kiosks', icon: BuildingStorefrontIcon, show: isAdmin },
        { name: 'QR Codes', href: '/qrcodes', icon: QrCodeIcon, show: isAdmin },
        { name: 'Alarms', href: '/alarms', icon: BellAlertIcon, show: isAdmin, badge: unresolvedCount },
        { name: 'Audit Logs', href: '/audit-logs', icon: ClipboardDocumentCheckIcon, show: isAdmin },
        { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, show: true },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          glass border-r border-dark-700/50`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <QrCodeIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white">Kiosk Attend</h1>
                                <p className="text-xs text-dark-400">Attendance System</p>
                            </div>
                        </div>
                        <button
                            className="lg:hidden btn-icon"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {navigation
                            .filter((item) => item.show)
                            .map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        `sidebar-link ${isActive ? 'active' : ''}`
                                    }
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="flex-1">{item.name}</span>
                                    {item.badge > 0 && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-danger-500 text-white animate-pulse">
                                            {item.badge}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                    </nav>

                    {/* User info & logout */}
                    <div className="p-4 border-t border-dark-700/50">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-dark-400 capitalize">{user?.role}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="btn-icon text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
                                title="Logout"
                            >
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top header */}
                <header className="sticky top-0 z-30 glass border-b border-dark-700/50 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <button
                            className="btn-icon lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>

                        <div className="flex-1 lg:flex-none" />

                        <div className="flex items-center gap-4">
                            {/* Dark mode toggle */}
                            <button
                                className="btn-icon transition-transform hover:rotate-12"
                                onClick={toggleTheme}
                                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {isDarkMode ? (
                                    <SunIcon className="w-5 h-5 text-yellow-400" />
                                ) : (
                                    <MoonIcon className="w-5 h-5 text-primary-400" />
                                )}
                            </button>

                            {/* Notifications */}
                            <div className="relative">
                                <button className="btn-icon relative">
                                    <BellIcon className={`w-5 h-5 ${unresolvedCount > 0 ? 'text-warning-400' : ''}`} />
                                    {unresolvedCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-danger-500 rounded-full animate-pulse">
                                            {unresolvedCount > 9 ? '9+' : unresolvedCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* User avatar */}
                            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-dark-700">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-dark-400">{user?.email}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
