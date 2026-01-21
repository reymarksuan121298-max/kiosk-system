import { useState, useEffect } from 'react';
import { employeesAPI, kiosksAPI } from '../services/api';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    UserCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
    BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [kiosks, setKiosks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        employeeId: '',
        contactNumber: '',
        email: '',
        kioskId: '',
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
        fetchEmployees();
        fetchKiosks();
    }, [pagination.page, search]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await employeesAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });
            setEmployees(response.data.employees);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error('Failed to fetch employees:', error);
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

    const openModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                employeeId: employee.employee_id,
                contactNumber: employee.contact_number || '',
                email: employee.email || '',
                kioskId: employee.assigned_kiosk_id || '',
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                name: '',
                employeeId: '',
                contactNumber: '',
                email: '',
                kioskId: '',
            });
        }
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingEmployee(null);
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);

        try {
            if (editingEmployee) {
                await employeesAPI.update(editingEmployee.id, formData);
            } else {
                await employeesAPI.create(formData);
            }
            closeModal();
            fetchEmployees();
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to save employee');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (employee) => {
        if (!confirm(`Are you sure you want to delete ${employee.name}?`)) return;

        try {
            await employeesAPI.delete(employee.id);
            fetchEmployees();
        } catch (error) {
            console.error('Failed to delete employee:', error);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Employees</h1>
                    <p className="text-dark-400 mt-1">Manage teller employees</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <PlusIcon className="w-5 h-5" />
                    Add Employee
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
                        placeholder="Search by name, ID, or contact..."
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

            {/* Table */}
            <div className="glass-card overflow-hidden p-0">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Employee ID</th>
                                <th>Contact</th>
                                <th>Assigned Kiosk</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-12">
                                        <div className="spinner mx-auto mb-4" />
                                        <p className="text-dark-400">Loading employees...</p>
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-12">
                                        <UserCircleIcon className="w-12 h-12 mx-auto text-dark-500 mb-4" />
                                        <p className="text-dark-400">No employees found</p>
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold">
                                                    {employee.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{employee.name}</p>
                                                    {employee.email && (
                                                        <p className="text-xs text-dark-400">{employee.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-mono text-dark-300">{employee.employee_id}</span>
                                        </td>
                                        <td>
                                            {employee.contact_number ? (
                                                <span className="text-dark-300">{employee.contact_number}</span>
                                            ) : (
                                                <span className="text-dark-500">—</span>
                                            )}
                                        </td>
                                        <td>
                                            {employee.kiosks ? (
                                                <div className="flex items-center gap-2">
                                                    <BuildingStorefrontIcon className="w-4 h-4 text-primary-400" />
                                                    <span className="text-dark-300">{employee.kiosks.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-dark-500">Not assigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${employee.is_active ? 'badge-success' : 'badge-danger'
                                                    }`}
                                            >
                                                {employee.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="text-dark-400 text-sm">
                                            {format(new Date(employee.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(employee)}
                                                    className="btn-icon text-primary-400 hover:text-primary-300"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(employee)}
                                                    className="btn-icon text-danger-400 hover:text-danger-300"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">
                                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
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
                                <label className="label">
                                    <UserCircleIcon className="w-4 h-4 inline mr-1" />
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    required
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="label">Employee ID *</label>
                                <input
                                    type="text"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="input"
                                    required
                                    disabled={!!editingEmployee}
                                    placeholder="EMP-001"
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <PhoneIcon className="w-4 h-4 inline mr-1" />
                                    Contact Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    className="input"
                                    placeholder="+63 9XX XXX XXXX"
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <BuildingStorefrontIcon className="w-4 h-4 inline mr-1" />
                                    Assigned Kiosk
                                </label>
                                <select
                                    value={formData.kioskId}
                                    onChange={(e) => setFormData({ ...formData, kioskId: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Not Assigned</option>
                                    {kiosks.map((kiosk) => (
                                        <option key={kiosk.id} value={kiosk.id}>
                                            {kiosk.name} - {kiosk.address}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary flex-1"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="spinner w-4 h-4" />
                                            Saving...
                                        </>
                                    ) : editingEmployee ? (
                                        'Update Employee'
                                    ) : (
                                        'Add Employee'
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

export default Employees;
