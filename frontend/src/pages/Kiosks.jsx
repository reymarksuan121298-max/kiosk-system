import { useState, useEffect } from 'react';
import { kiosksAPI } from '../services/api';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    MapPinIcon,
    BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Kiosks = () => {
    const [kiosks, setKiosks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingKiosk, setEditingKiosk] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        lat: '',
        lng: '',
        geofenceRadius: 30,
        deviceId: '',
    });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchKiosks();
    }, [pagination.page, search]);

    const fetchKiosks = async () => {
        try {
            setLoading(true);
            const response = await kiosksAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });
            setKiosks(response.data.kiosks);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error('Failed to fetch kiosks:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (kiosk = null) => {
        if (kiosk) {
            setEditingKiosk(kiosk);
            setFormData({
                name: kiosk.name,
                address: kiosk.address,
                lat: kiosk.lat,
                lng: kiosk.lng,
                geofenceRadius: kiosk.geofence_radius || 30,
                deviceId: kiosk.device_id || '',
            });
        } else {
            setEditingKiosk(null);
            setFormData({
                name: '',
                address: '',
                lat: '',
                lng: '',
                geofenceRadius: 30,
                deviceId: '',
            });
        }
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKiosk(null);
        setFormError('');
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData((prev) => ({
                        ...prev,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    }));
                },
                (error) => {
                    setFormError('Failed to get current location');
                },
                { enableHighAccuracy: true }
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);

        try {
            const data = {
                ...formData,
                lat: parseFloat(formData.lat),
                lng: parseFloat(formData.lng),
                geofenceRadius: parseInt(formData.geofenceRadius),
            };

            if (editingKiosk) {
                await kiosksAPI.update(editingKiosk.id, data);
            } else {
                await kiosksAPI.create(data);
            }
            closeModal();
            fetchKiosks();
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to save kiosk');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (kiosk) => {
        if (!confirm(`Are you sure you want to delete ${kiosk.name}?`)) return;

        try {
            await kiosksAPI.delete(kiosk.id);
            fetchKiosks();
        } catch (error) {
            console.error('Failed to delete kiosk:', error);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Kiosks</h1>
                    <p className="text-dark-400 mt-1">Manage kiosk locations and geofencing</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <PlusIcon className="w-5 h-5" />
                    Add Kiosk
                </button>
            </div>

            {/* Search */}
            <div className="glass-card">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or address..."
                        className="input pl-12"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Kiosk Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-dark-400">Loading kiosks...</p>
                    </div>
                ) : kiosks.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <BuildingStorefrontIcon className="w-12 h-12 mx-auto text-dark-500 mb-4" />
                        <p className="text-dark-400">No kiosks found</p>
                    </div>
                ) : (
                    kiosks.map((kiosk) => (
                        <div key={kiosk.id} className="glass-card card-hover">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
                                        <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{kiosk.name}</h3>
                                        <span
                                            className={`badge mt-1 ${kiosk.is_active ? 'badge-success' : 'badge-danger'
                                                }`}
                                        >
                                            {kiosk.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openModal(kiosk)}
                                        className="btn-icon text-primary-400 hover:text-primary-300"
                                        title="Edit"
                                    >
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(kiosk)}
                                        className="btn-icon text-danger-400 hover:text-danger-300"
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-2">
                                    <MapPinIcon className="w-4 h-4 text-dark-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-dark-300">{kiosk.address}</span>
                                </div>
                                <div className="flex items-center gap-2 text-dark-400">
                                    <span>GPS:</span>
                                    <span className="font-mono text-xs text-dark-300">
                                        {kiosk.lat.toFixed(6)}, {kiosk.lng.toFixed(6)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-dark-400">Geofence Radius</span>
                                    <span className="badge badge-info">{kiosk.geofence_radius}m</span>
                                </div>
                                {kiosk.device_id && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-dark-400">Device ID</span>
                                        <span className="font-mono text-xs text-dark-300 truncate max-w-[120px]">
                                            {kiosk.device_id}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-dark-700/50 text-xs text-dark-500">
                                Created {format(new Date(kiosk.created_at), 'MMM d, yyyy')}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">
                                {editingKiosk ? 'Edit Kiosk' : 'Add Kiosk'}
                            </h2>
                            <button onClick={closeModal} className="btn-icon">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <div className="alert-danger text-sm">{formError}</div>
                            )}

                            <div>
                                <label className="label">Kiosk Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    required
                                    placeholder="Main Branch Kiosk"
                                />
                            </div>

                            <div>
                                <label className="label">Address *</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input min-h-[80px]"
                                    required
                                    placeholder="123 Main Street, City, Country"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Latitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.lat}
                                        onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                        className="input"
                                        required
                                        placeholder="14.5995"
                                    />
                                </div>
                                <div>
                                    <label className="label">Longitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.lng}
                                        onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                                        className="input"
                                        required
                                        placeholder="120.9842"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                className="btn-secondary w-full"
                            >
                                <MapPinIcon className="w-5 h-5" />
                                Use Current Location
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Geofence Radius (meters)</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={formData.geofenceRadius}
                                        onChange={(e) =>
                                            setFormData({ ...formData, geofenceRadius: e.target.value })
                                        }
                                        className="input"
                                        placeholder="30"
                                    />
                                </div>
                                <div>
                                    <label className="label">Device ID</label>
                                    <input
                                        type="text"
                                        value={formData.deviceId}
                                        onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                        className="input"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                                    {submitting ? (
                                        <>
                                            <span className="spinner w-4 h-4" />
                                            Saving...
                                        </>
                                    ) : editingKiosk ? (
                                        'Update Kiosk'
                                    ) : (
                                        'Add Kiosk'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Kiosks;
