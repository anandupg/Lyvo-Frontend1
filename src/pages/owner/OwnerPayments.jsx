import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
    DollarSign, Search, RefreshCw, ArrowUpRight, CheckCircle, Clock,
    AlertCircle, User, Phone, Mail, Building, Bed, Calendar, Send,
    Eye, History, Plus, X, MessageSquare
} from 'lucide-react';

const OwnerPayments = () => {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCustomPaymentModal, setShowCustomPaymentModal] = useState(false);
    const [tenantsList, setTenantsList] = useState([]); // For dropdown
    const [customPayment, setCustomPayment] = useState({
        tenantId: '',
        amount: '',
        reason: '',
        dueDate: ''
    });
    const [confirmPaymentModal, setConfirmPaymentModal] = useState({
        show: false,
        paymentId: null,
        paymentDetails: null
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchPayments(), fetchTenantsList()]);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const response = await apiClient.get('/property/owner/payments');
            if (response.data.success) {
                setPayments(response.data.payments);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            // toast({ ... })
        }
    };

    const fetchTenantsList = async () => {
        try {
            const response = await apiClient.get('/property/owner/tenants?status=active');
            if (response.data.success) {
                setTenantsList(response.data.tenants);
            }
        } catch (e) { console.error(e); }
    };

    // Helper to get selected tenant details
    const selectedTenant = useMemo(() => {
        return tenantsList.find(t => t._id === customPayment.tenantId);
    }, [customPayment.tenantId, tenantsList]);

    const { rentPayments, otherPayments } = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        // Filter and sort items (LIFO - Newest First by Due Date)
        const allFiltered = payments
            .filter((p) => {
                if (statusFilter === 'all') return true;
                return p.status === statusFilter;
            })
            .filter((p) => {
                if (!q) return true;
                const tenant = p.tenantId ? `${p.tenantId.userName} ${p.tenantId.userEmail}`.toLowerCase() : 'Unknown';
                const property = p.tenantId ? (p.tenantId.propertyName || '').toLowerCase() : '';
                const room = p.tenantId ? (p.tenantId.roomNumber || '').toLowerCase() : '';
                const desc = (p.description || '').toLowerCase();
                return tenant.includes(q) || property.includes(q) || room.includes(q) || desc.includes(q);
            })
            .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)); // LIFO Sorting: Newest Due Date First

        // Split into Rent and Other
        const rent = [];
        const other = [];

        allFiltered.forEach(p => {
            if (p.type === 'rent') {
                rent.push(p);
            } else {
                other.push(p);
            }
        });

        return { rentPayments: rent, otherPayments: other };
    }, [payments, searchQuery, statusFilter]);

    // Reusable Payment Card Component
    const PaymentCard = ({ payment, index }) => (
        <motion.div
            key={payment._id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-shadow ${payment.status === 'overdue' ? 'border-red-300 bg-red-50' :
                payment.type === 'rent' ? 'border-blue-100' : 'border-purple-100'
                }`}
        >
            <div className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: Tenant/Payment Info */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${payment.status === 'overdue' ? 'bg-red-100' :
                            payment.type === 'rent' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                            {payment.type === 'rent' ? (
                                <Building className={`w-6 h-6 sm:w-7 sm:h-7 ${payment.status === 'overdue' ? 'text-red-600' : 'text-blue-600'}`} />
                            ) : (
                                <DollarSign className={`w-6 h-6 sm:w-7 sm:h-7 ${payment.status === 'overdue' ? 'text-red-600' : 'text-purple-600'}`} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{payment.tenantId ? payment.tenantId.userName : 'Unknown Tenant'}</h3>
                                {payment.tenantId?.userEmail && (
                                    <span className="text-sm text-gray-500 font-normal">({payment.tenantId.userEmail})</span>
                                )}
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                    {payment.status}
                                </span>
                                {payment.daysOverdue > 0 && (
                                    <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                        {payment.daysOverdue} days overdue
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                                <span className="font-medium text-gray-800">{payment.description}</span>
                                <span className="text-gray-400">|</span>
                                <div className="flex items-center gap-1">
                                    <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span>{payment.tenantId?.propertyName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Bed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span>Room {payment.tenantId?.roomNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Payment Info */}
                    <div className="hidden lg:flex items-center gap-6 xl:gap-8 min-w-max">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Amount</p>
                            <p className="text-base font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Due Date</p>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(payment.dueDate)}</p>
                        </div>
                        {payment.paidAt && (
                            <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Paid On</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDate(payment.paidAt)}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap gap-2">
                        {payment.status !== 'paid' && (
                            <>
                                <button
                                    onClick={() => window.location.href = `tel:${payment.tenantId?.userPhone || ''}`}
                                    className="px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center gap-1.5"
                                    disabled={!payment.tenantId?.userPhone}
                                >
                                    <Phone className="w-4 h-4" />
                                    <span className="hidden sm:inline">Call</span>
                                </button>
                                <button
                                    onClick={() => window.location.href = `sms:${payment.tenantId?.userPhone || ''}`}
                                    className="px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center gap-1.5"
                                    disabled={!payment.tenantId?.userPhone}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="hidden sm:inline">Message</span>
                                </button>
                                <button
                                    onClick={() => setConfirmPaymentModal({
                                        show: true,
                                        paymentId: payment._id,
                                        paymentDetails: payment
                                    })}
                                    className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Mark Paid</span>
                                    <span className="sm:hidden">Paid</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile View Items */}
                <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                        <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                        <p className="font-semibold text-gray-900">{formatDate(payment.dueDate)}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const stats = useMemo(() => {
        const total = payments.length;
        const pending = payments.filter(p => p.status === 'pending').length;
        const overdue = payments.filter(p => p.status === 'overdue').length;
        const collectedThisMonth = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0); // Check if paidAt is this month? Simplified for now.
        return { total, pending, overdue, collectedThisMonth };
    }, [payments]);

    const refresh = async () => {
        setIsRefreshing(true);
        await fetchPayments();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleSendPaymentRequest = (tenantId) => {
        alert(`Payment request sent (Not Implemented - Auto-Notification sent on creation)`);
    };

    const handleMarkAsPaid = async (paymentId) => {
        try {
            const response = await apiClient.put(`/property/owner/payments/${paymentId}/paid`);
            if (response.data.success) {
                // Optimistic update or refresh
                setPayments(prev => prev.map(p =>
                    p._id === paymentId ? { ...p, status: 'paid', daysOverdue: 0, paidAt: new Date().toISOString() } : p
                ));
                setConfirmPaymentModal({ show: false, paymentId: null, paymentDetails: null });
            }
        } catch (error) {
            console.error('Error marking as paid:', error);
            alert('Failed to mark as paid');
        }
    };

    const handleCreateCustomPayment = async () => {
        if (!customPayment.tenantId || !customPayment.amount || !customPayment.reason) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const response = await apiClient.post('/property/owner/payments/create', customPayment);
            if (response.data.success) {
                alert('Payment request created successfully!');
                setShowCustomPaymentModal(false);
                setCustomPayment({ tenantId: '', amount: '', reason: '', dueDate: '' });
                fetchPayments(); // Refresh list
            }
        } catch (error) {
            console.error('Error creating payment:', error);
            alert('Failed to create payment request');
        }
    };

    if (loading) {
        return (
            <OwnerLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <RefreshCw className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading payment ledger...</p>
                    </div>
                </div>
            </OwnerLayout>
        );
    }

    return (
        <OwnerLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management</h1>
                            <p className="text-gray-600">Track and manage tenant payments</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={refresh}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Refresh
                            </button>
                            <button
                                onClick={() => setShowCustomPaymentModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Custom Request
                            </button>
                            <button
                                onClick={() => navigate('/owner-dashboard')}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                                <ArrowUpRight className="w-4 h-4" />
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div
                        className={`bg-gradient-to-br from-blue-50 to-blue-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'all' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-200'
                            }`}
                        onClick={() => setStatusFilter('all')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-blue-600 mb-1">Total Tenants</div>
                                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
                            </div>
                            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-gradient-to-br from-yellow-50 to-yellow-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'pending' ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-yellow-200'
                            }`}
                        onClick={() => setStatusFilter('pending')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-yellow-600 mb-1">Pending</div>
                                <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
                            </div>
                            <div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-gradient-to-br from-red-50 to-red-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'overdue' ? 'border-red-400 ring-2 ring-red-200' : 'border-red-200'
                            }`}
                        onClick={() => setStatusFilter('overdue')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-red-600 mb-1">Overdue</div>
                                <div className="text-3xl font-bold text-red-900">{stats.overdue}</div>
                            </div>
                            <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-green-600 mb-1">Collected</div>
                                <div className="text-2xl font-bold text-green-900">{formatCurrency(stats.collectedThisMonth)}</div>
                            </div>
                            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by tenant, property, or room..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Payments List Sections */}
                <div className="space-y-8">
                    {/* Rent Section */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 px-1">
                            <Building className="w-5 h-5 text-blue-600" />
                            Monthly Rent & Dues
                        </h2>
                        {rentPayments.length === 0 ? (
                            <p className="text-gray-500 italic px-1">No rent records found.</p>
                        ) : (
                            <div className="space-y-4">
                                {rentPayments.map((p, i) => <PaymentCard payment={p} index={i} key={p._id} />)}
                            </div>
                        )}
                    </div>

                    {/* Other Section */}
                    {otherPayments.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-purple-600" />
                                    Other Payments & Requests
                                </h2>
                            </div>
                            <div className="space-y-4">
                                {otherPayments.map((p, i) => <PaymentCard payment={p} index={i} key={p._id} />)}
                            </div>
                        </div>
                    )}

                    {rentPayments.length === 0 && otherPayments.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
                            <p className="text-gray-600">
                                {searchQuery ? 'Try adjusting your search criteria' : 'No payment records found'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Custom Payment Request Modal */}
                {showCustomPaymentModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Create Custom Payment Request</h2>
                                    <button
                                        onClick={() => setShowCustomPaymentModal(false)}
                                        className="p-1 hover:bg-purple-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <p className="text-purple-100 mt-2">Request payment from a tenant for any reason</p>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4">
                                {/* Select Tenant */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Tenant <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={customPayment.tenantId}
                                        onChange={(e) => setCustomPayment({ ...customPayment, tenantId: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="">Choose a tenant...</option>
                                        {tenantsList.map(tenant => (
                                            <option key={tenant._id} value={tenant._id}>
                                                {tenant.userName} ({tenant.userPhone || 'No Phone'}) — {tenant.propertyName} ({tenant.roomNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Selected Tenant Details Card */}
                                <AnimatePresence>
                                    {selectedTenant && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-purple-50 rounded-lg p-4 border border-purple-100 text-sm overflow-hidden"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-5 h-5 text-purple-700" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{selectedTenant.userName}</p>
                                                    <p className="text-gray-600 font-medium">{selectedTenant.propertyName} <span className="mx-1">•</span> Room {selectedTenant.roomNumber}</p>
                                                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                                                        {selectedTenant.userEmail && <p className="flex items-center gap-1">📧 {selectedTenant.userEmail}</p>}
                                                        {selectedTenant.userPhone && <p className="flex items-center gap-1">📱 {selectedTenant.userPhone}</p>}
                                                        <p className="flex items-center gap-1 font-medium text-green-700">💰 Rent: {formatCurrency(selectedTenant.monthlyRent)}/mo</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Amount (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={customPayment.amount}
                                        onChange={(e) => setCustomPayment({ ...customPayment, amount: e.target.value })}
                                        placeholder="Enter amount"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={customPayment.reason}
                                        onChange={(e) => setCustomPayment({ ...customPayment, reason: e.target.value })}
                                        placeholder="e.g., Electricity bill, Maintenance charges, Damage repair, etc."
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Due Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={customPayment.dueDate}
                                        onChange={(e) => setCustomPayment({ ...customPayment, dueDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-gray-50 px-6 py-4 flex gap-3">
                                <button
                                    onClick={() => setShowCustomPaymentModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateCustomPayment}
                                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Send className="w-5 h-5" />
                                    Send Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Confirmation Modal for Mark as Paid */}
                <AnimatePresence>
                    {confirmPaymentModal.show && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
                            >
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Confirm Payment</h3>
                                    </div>
                                    <button
                                        onClick={() => setConfirmPaymentModal({ show: false, paymentId: null, paymentDetails: null })}
                                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6">
                                    <p className="text-gray-700 mb-4">
                                        Are you sure you want to mark this payment as <span className="font-bold text-green-600">PAID</span>?
                                    </p>

                                    {confirmPaymentModal.paymentDetails && (
                                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Tenant:</span>
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {confirmPaymentModal.paymentDetails.tenantId?.userName || 'Unknown'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Amount:</span>
                                                <span className="text-sm font-bold text-green-600">
                                                    {formatCurrency(confirmPaymentModal.paymentDetails.amount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Description:</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {confirmPaymentModal.paymentDetails.description}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500 mt-4">
                                        This action will update the payment status and notify the tenant.
                                    </p>
                                </div>

                                {/* Modal Footer */}
                                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                                    <button
                                        onClick={() => setConfirmPaymentModal({ show: false, paymentId: null, paymentDetails: null })}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleMarkAsPaid(confirmPaymentModal.paymentId)}
                                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Confirm Payment
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </OwnerLayout>
    );
};

export default OwnerPayments;
