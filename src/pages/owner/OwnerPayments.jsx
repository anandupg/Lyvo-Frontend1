import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
    DollarSign, Search, RefreshCw, ArrowUpRight, CheckCircle, Clock,
    AlertCircle, User, Phone, Mail, Building, Bed, Calendar, Send,
    Eye, History, Plus, X
} from 'lucide-react';

const OwnerPayments = () => {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCustomPaymentModal, setShowCustomPaymentModal] = useState(false);
    const [customPayment, setCustomPayment] = useState({
        tenantId: '',
        amount: '',
        reason: '',
        dueDate: ''
    });

    // Mock data - Replace with actual API call
    const mockTenants = [
        {
            id: 1,
            tenantName: 'John Doe',
            tenantEmail: 'john@example.com',
            tenantPhone: '+91 98765 43210',
            propertyName: 'Sunshine Apartments',
            roomNumber: '101',
            monthlyRent: 15000,
            lastPaymentDate: '2024-12-25',
            nextDueDate: '2025-01-25',
            paymentStatus: 'pending',
            daysOverdue: 5
        },
        {
            id: 2,
            tenantName: 'Jane Smith',
            tenantEmail: 'jane@example.com',
            tenantPhone: '+91 98765 43211',
            propertyName: 'Green Valley PG',
            roomNumber: '205',
            monthlyRent: 12000,
            lastPaymentDate: '2025-01-20',
            nextDueDate: '2025-02-20',
            paymentStatus: 'paid',
            daysOverdue: 0
        },
        {
            id: 3,
            tenantName: 'Bob Wilson',
            tenantEmail: 'bob@example.com',
            tenantPhone: '+91 98765 43212',
            propertyName: 'Sunshine Apartments',
            roomNumber: '303',
            monthlyRent: 18000,
            lastPaymentDate: '2024-12-15',
            nextDueDate: '2025-01-15',
            paymentStatus: 'overdue',
            daysOverdue: 15
        }
    ];

    useEffect(() => {
        // Simulate API call
        setTimeout(() => {
            setTenants(mockTenants);
            setLoading(false);
        }, 500);
    }, []);

    const filteredTenants = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return tenants
            .filter((t) => {
                if (statusFilter === 'all') return true;
                return t.paymentStatus === statusFilter;
            })
            .filter((t) => {
                if (!q) return true;
                const tenant = `${t.tenantName} ${t.tenantEmail}`.toLowerCase();
                const property = t.propertyName.toLowerCase();
                const room = t.roomNumber.toLowerCase();
                return tenant.includes(q) || property.includes(q) || room.includes(q);
            })
            .sort((a, b) => b.daysOverdue - a.daysOverdue);
    }, [tenants, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const total = tenants.length;
        const pending = tenants.filter(t => t.paymentStatus === 'pending').length;
        const overdue = tenants.filter(t => t.paymentStatus === 'overdue').length;
        const collectedThisMonth = tenants
            .filter(t => t.paymentStatus === 'paid')
            .reduce((sum, t) => sum + t.monthlyRent, 0);
        return { total, pending, overdue, collectedThisMonth };
    }, [tenants]);

    const refresh = async () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
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
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleSendPaymentRequest = (tenantId) => {
        alert(`Payment request sent to tenant ${tenantId}`);
    };

    const handleMarkAsPaid = (tenantId) => {
        setTenants(prev => prev.map(t =>
            t.id === tenantId ? { ...t, paymentStatus: 'paid', daysOverdue: 0 } : t
        ));
    };

    const handleCreateCustomPayment = () => {
        if (!customPayment.tenantId || !customPayment.amount || !customPayment.reason) {
            alert('Please fill in all required fields');
            return;
        }
        alert(`Custom payment request created:\nTenant: ${tenants.find(t => t.id === parseInt(customPayment.tenantId))?.tenantName}\nAmount: ${formatCurrency(customPayment.amount)}\nReason: ${customPayment.reason}`);
        setShowCustomPaymentModal(false);
        setCustomPayment({ tenantId: '', amount: '', reason: '', dueDate: '' });
    };

    if (loading) {
        return (
            <OwnerLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <RefreshCw className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading payment information...</p>
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
                            <p className="text-gray-600">Manage tenant rent payments</p>
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

                {/* Tenants List */}
                {filteredTenants.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenants Found</h3>
                        <p className="text-gray-600">
                            {searchQuery ? 'Try adjusting your search criteria' : 'No tenants with payment information'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTenants.map((tenant, index) => (
                            <motion.div
                                key={tenant.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-shadow ${tenant.paymentStatus === 'overdue' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                            >
                                <div className="p-4 sm:p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Left: Tenant Info */}
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${tenant.paymentStatus === 'overdue' ? 'bg-red-100' : 'bg-green-100'
                                                }`}>
                                                <User className={`w-6 h-6 sm:w-7 sm:h-7 ${tenant.paymentStatus === 'overdue' ? 'text-red-600' : 'text-green-600'
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{tenant.tenantName}</h3>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.paymentStatus)}`}>
                                                        {tenant.paymentStatus}
                                                    </span>
                                                    {tenant.daysOverdue > 0 && (
                                                        <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                                            {tenant.daysOverdue} days overdue
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        <span>{tenant.propertyName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Bed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        <span>Room {tenant.roomNumber}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle: Payment Info */}
                                        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                                                <p className="text-base font-bold text-green-600">{formatCurrency(tenant.monthlyRent)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 mb-1">Last Payment</p>
                                                <p className="text-sm font-semibold text-gray-900">{formatDate(tenant.lastPaymentDate)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 mb-1">Next Due</p>
                                                <p className="text-sm font-semibold text-gray-900">{formatDate(tenant.nextDueDate)}</p>
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            {tenant.paymentStatus !== 'paid' && (
                                                <>
                                                    <button
                                                        onClick={() => handleSendPaymentRequest(tenant.id)}
                                                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Send Request</span>
                                                        <span className="sm:hidden">Request</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkAsPaid(tenant.id)}
                                                        className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Mark Paid</span>
                                                        <span className="sm:hidden">Paid</span>
                                                    </button>
                                                </>
                                            )}
                                            <button className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-1.5">
                                                <History className="w-4 h-4" />
                                                <span className="hidden sm:inline">History</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile: Additional Info */}
                                    <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Monthly Rent</p>
                                            <p className="font-bold text-green-600">{formatCurrency(tenant.monthlyRent)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Last Payment</p>
                                            <p className="font-semibold text-gray-900">{formatDate(tenant.lastPaymentDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Next Due Date</p>
                                            <p className="font-semibold text-gray-900">{formatDate(tenant.nextDueDate)}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

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
                                        {tenants.map(tenant => (
                                            <option key={tenant.id} value={tenant.id}>
                                                {tenant.tenantName} - {tenant.propertyName} Room {tenant.roomNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>

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
            </div>
        </OwnerLayout>
    );
};

export default OwnerPayments;
