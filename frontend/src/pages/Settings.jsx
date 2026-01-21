import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import {
    UserCircleIcon,
    KeyIcon,
    BellIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

const Settings = () => {
    const { user, updateUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Password change form
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwords.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await authAPI.changePassword({
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });
            setSuccess('Password changed successfully');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', name: 'Profile', icon: UserCircleIcon },
        { id: 'security', name: 'Security', icon: KeyIcon },
        { id: 'notifications', name: 'Notifications', icon: BellIcon },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings</h1>
                <p className="text-dark-400 mt-1">Manage your account settings</p>
            </div>

            {/* Tabs */}
            <div className="glass-card p-2">
                <div className="flex gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-primary-500/20 text-primary-400'
                                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="glass-card">
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 pb-6 border-b border-dark-700/50">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-3xl font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
                                <p className="text-dark-400">{user?.email}</p>
                                <span className="badge badge-info capitalize mt-2">{user?.role}</span>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    type="text"
                                    value={user?.name || ''}
                                    className="input"
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    className="input"
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="label">Contact Number</label>
                                <input
                                    type="text"
                                    value={user?.contactNumber || 'Not set'}
                                    className="input"
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <input
                                    type="text"
                                    value={user?.role || ''}
                                    className="input capitalize"
                                    disabled
                                />
                            </div>
                        </div>

                        <p className="text-sm text-dark-500">
                            Contact your administrator to update your profile information.
                        </p>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-6 border-b border-dark-700/50">
                            <ShieldCheckIcon className="w-8 h-8 text-primary-400" />
                            <div>
                                <h2 className="text-lg font-semibold text-white">Security Settings</h2>
                                <p className="text-dark-400">Manage your password and security preferences</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                            <h3 className="font-medium text-white">Change Password</h3>

                            {error && (
                                <div className="alert-danger text-sm">{error}</div>
                            )}

                            {success && (
                                <div className="alert-success text-sm flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    {success}
                                </div>
                            )}

                            <div>
                                <label className="label">Current Password</label>
                                <input
                                    type="password"
                                    value={passwords.currentPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, currentPassword: e.target.value })
                                    }
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">New Password</label>
                                <input
                                    type="password"
                                    value={passwords.newPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, newPassword: e.target.value })
                                    }
                                    className="input"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="label">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) =>
                                        setPasswords({ ...passwords, confirmPassword: e.target.value })
                                    }
                                    className="input"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner w-4 h-4" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-6 border-b border-dark-700/50">
                            <BellIcon className="w-8 h-8 text-primary-400" />
                            <div>
                                <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
                                <p className="text-dark-400">Configure how you receive notifications</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-dark-700/30">
                                <div>
                                    <p className="font-medium text-white">Critical Alarms</p>
                                    <p className="text-sm text-dark-400">Receive alerts for critical security events</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-dark-700/30">
                                <div>
                                    <p className="font-medium text-white">Attendance Alerts</p>
                                    <p className="text-sm text-dark-400">Get notified for unusual attendance patterns</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-dark-700/30">
                                <div>
                                    <p className="font-medium text-white">Daily Summary</p>
                                    <p className="text-sm text-dark-400">Receive daily attendance summary reports</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-medium text-white">Sound Alerts</p>
                                    <p className="text-sm text-dark-400">Play sound for alarm notifications</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
