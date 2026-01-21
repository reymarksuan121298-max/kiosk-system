import { useState, useEffect } from 'react';
import { qrCodesAPI, kiosksAPI, employeesAPI } from '../services/api';
import {
    PlusIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
    TrashIcon,
    ArrowPathIcon,
    PhotoIcon,
    QrCodeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const QRCodes = () => {
    const [qrCodes, setQRCodes] = useState([]);
    const [kiosks, setKiosks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [viewModal, setViewModal] = useState(null);
    const [formData, setFormData] = useState({
        kioskId: '',
        employeeId: '',
        image: null,
    });
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        kioskId: '',
        type: '',
        isRevoked: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchQRCodes();
        fetchKiosks();
        fetchEmployees();
    }, [pagination.page, filters]);

    const fetchQRCodes = async () => {
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

            const response = await qrCodesAPI.getAll(params);
            setQRCodes(response.data.qrCodes);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error('Failed to fetch QR codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchKiosks = async () => {
        try {
            const response = await kiosksAPI.getAll({ limit: 100 });
            setKiosks(response.data.kiosks);
        } catch (error) {
            console.error('Failed to fetch kiosks:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeesAPI.getAll({ limit: 1000 });
            setEmployees(response.data.employees);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setError('');
        setGenerating(true);

        try {
            let response;
            if (formData.image) {
                response = await qrCodesAPI.generateWithImage({
                    kioskId: formData.kioskId,
                    employeeId: formData.employeeId,
                    image: formData.image,
                });
            } else {
                response = await qrCodesAPI.generate({
                    kioskId: formData.kioskId,
                    employeeId: formData.employeeId,
                });
            }

            setShowModal(false);
            setFormData({ kioskId: '', employeeId: '', image: null });
            fetchQRCodes();

            // Show the generated QR code
            setViewModal({
                ...response.data.qrCode,
                isNew: true,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate QR code');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (qrCode) => {
        if (!confirm('Are you sure you want to revoke this QR code?')) return;

        try {
            await qrCodesAPI.revoke(qrCode.id, { reason: 'Revoked by admin' });
            fetchQRCodes();
        } catch (error) {
            console.error('Failed to revoke QR code:', error);
        }
    };

    const handleRestore = async (qrCode) => {
        try {
            await qrCodesAPI.restore(qrCode.id);
            fetchQRCodes();
        } catch (error) {
            console.error('Failed to restore QR code:', error);
        }
    };

    const handleDelete = async (qrCode) => {
        if (!confirm('Are you sure you want to permanently delete this QR code?')) return;

        try {
            await qrCodesAPI.delete(qrCode.id);
            fetchQRCodes();
        } catch (error) {
            console.error('Failed to delete QR code:', error);
        }
    };

    const viewQRCode = async (qrCode) => {
        try {
            const response = await qrCodesAPI.getOne(qrCode.id);
            setViewModal(response.data.qrCode);
        } catch (error) {
            console.error('Failed to fetch QR code:', error);
        }
    };

    const downloadQRCode = (qrCode) => {
        const link = document.createElement('a');
        // Get kiosk name and sanitize for filename
        const kioskName = qrCode.kiosks?.name || qrCode.kioskName || 'Unknown-Kiosk';
        const sanitizedName = kioskName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        link.download = `QR-${sanitizedName}.png`;
        link.href = qrCode.image;
        link.click();
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">QR Codes</h1>
                    <p className="text-dark-400 mt-1">Generate and manage attendance QR codes</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <PlusIcon className="w-5 h-5" />
                    Generate QR Code
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="label">Kiosk</label>
                        <select
                            value={filters.kioskId}
                            onChange={(e) => setFilters({ ...filters, kioskId: e.target.value })}
                            className="input"
                        >
                            <option value="">All Kiosks</option>
                            {kiosks.map((kiosk) => (
                                <option key={kiosk.id} value={kiosk.id}>
                                    {kiosk.name}
                                </option>
                            ))}
                        </select>
                    </div>
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
                        <label className="label">Status</label>
                        <select
                            value={filters.isRevoked}
                            onChange={(e) => setFilters({ ...filters, isRevoked: e.target.value })}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="false">Active</option>
                            <option value="true">Revoked</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* QR Code Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-dark-400">Loading QR codes...</p>
                    </div>
                ) : qrCodes.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <QrCodeIcon className="w-12 h-12 mx-auto text-dark-500 mb-4" />
                        <p className="text-dark-400">No QR codes found</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-4"
                        >
                            Generate First QR Code
                        </button>
                    </div>
                ) : (
                    qrCodes.map((qrCode) => (
                        <div
                            key={qrCode.id}
                            className={`glass-card card-hover ${qrCode.is_revoked ? 'opacity-60' : ''
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-white">
                                        {qrCode.kiosks?.name || 'Unknown Kiosk'}
                                    </h3>
                                    <span className="badge mt-1 badge-info">
                                        Teller Code
                                    </span>
                                </div>
                                <span
                                    className={`badge ${qrCode.is_revoked ? 'badge-danger' : 'badge-success'
                                        }`}
                                >
                                    {qrCode.is_revoked ? 'Revoked' : 'Active'}
                                </span>
                            </div>

                            {/* QR Preview */}
                            <div
                                className="aspect-square bg-dark-900 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden border border-dark-700 hover:border-primary-500 transition-colors"
                                onClick={() => viewQRCode(qrCode)}
                            >
                                <QrCodeIcon className="w-24 h-24 text-dark-600" />
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between text-dark-400">
                                    <span>Created</span>
                                    <span>{qrCode.created_at ? format(new Date(qrCode.created_at), 'MMM d, yyyy') : 'N/A'}</span>
                                </div>
                                {qrCode.is_revoked && qrCode.revoked_at && (
                                    <div className="flex items-center justify-between text-danger-400">
                                        <span>Revoked</span>
                                        <span>{format(new Date(qrCode.revoked_at), 'MMM d, yyyy')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-dark-700/50 flex gap-2">
                                <button
                                    onClick={() => viewQRCode(qrCode)}
                                    className="btn-secondary flex-1 py-2 text-sm"
                                >
                                    View
                                </button>
                                {qrCode.is_revoked ? (
                                    <button
                                        onClick={() => handleRestore(qrCode)}
                                        className="btn-secondary py-2 text-sm"
                                        title="Restore"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleRevoke(qrCode)}
                                        className="btn-secondary py-2 text-sm text-warning-400"
                                        title="Revoke"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(qrCode)}
                                    className="btn-secondary py-2 text-sm text-danger-400"
                                    title="Delete"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
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

            {/* Generate Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">Generate QR Code</h2>
                            <button onClick={() => setShowModal(false)} className="btn-icon">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-4">
                            {error && <div className="alert-danger text-sm">{error}</div>}

                            <div>
                                <label className="label">Select Kiosk *</label>
                                <select
                                    value={formData.kioskId}
                                    onChange={(e) => setFormData({ ...formData, kioskId: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Choose a kiosk</option>
                                    {kiosks.map((kiosk) => (
                                        <option key={kiosk.id} value={kiosk.id}>
                                            {kiosk.name} - {kiosk.address}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Select Employee *</label>
                                <select
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Choose an employee</option>
                                    {employees.map((employee) => (
                                        <option key={employee.id} value={employee.employee_id}>
                                            {employee.name} ({employee.employee_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="alert-info text-sm py-2">
                                <p><strong>Universal QR:</strong> This code will work for both Check-in (6-9 AM) and Check-out (9-11 PM).</p>
                            </div>

                            <div>
                                <label className="label">
                                    <PhotoIcon className="w-4 h-4 inline mr-1" />
                                    Custom Background Image (Optional)
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                                        className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dark-700 file:text-dark-300 hover:file:bg-dark-600"
                                    />
                                </div>
                                <p className="text-xs text-dark-500 mt-1">
                                    Upload an image to use as a background for the QR code
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating || !formData.kioskId || !formData.employeeId}
                                    className="btn-primary flex-1"
                                >
                                    {generating ? (
                                        <>
                                            <span className="spinner w-4 h-4" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate QR Code'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View QR Modal */}
            {viewModal && (
                <div className="modal-overlay" onClick={() => setViewModal(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    {viewModal.isNew ? 'QR Code Generated!' : 'QR Code Details'}
                                </h2>
                                <p className="text-dark-400">
                                    {viewModal.kiosks?.name} - Teller Code
                                </p>
                            </div>
                            <button onClick={() => setViewModal(null)} className="btn-icon">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* QR Image */}
                        <div className="bg-white rounded-2xl p-6 mb-6">
                            {viewModal.image ? (
                                <img
                                    src={viewModal.image}
                                    alt="QR Code"
                                    className="w-full max-w-[300px] mx-auto"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-[300px]">
                                    <div className="spinner" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                                <span className="text-dark-400">Kiosk</span>
                                <span className="text-white">{viewModal.kiosks?.name}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                                <span className="text-dark-400">Type</span>
                                <span className="badge badge-info">
                                    Attendance
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                                <span className="text-dark-400">Status</span>
                                <span className={`badge ${viewModal.is_revoked ? 'badge-danger' : 'badge-success'}`}>
                                    {viewModal.is_revoked ? 'Revoked' : 'Active'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-dark-400">Created</span>
                                <span className="text-white">
                                    {viewModal.created_at ? format(new Date(viewModal.created_at), 'PPpp') : 'N/A'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => downloadQRCode(viewModal)}
                            className="btn-primary w-full"
                            disabled={!viewModal.image}
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Download QR Code
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRCodes;
