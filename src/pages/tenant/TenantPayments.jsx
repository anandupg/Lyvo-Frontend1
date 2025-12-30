import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign, Calendar, CheckCircle, Clock, Download,
    CreditCard, Receipt, TrendingUp, AlertCircle, Filter
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';

const TenantPayments = () => {
    const { tenantData, loading } = useTenantStatus();
    const [filter, setFilter] = useState('all'); // all, paid, pending

    // Mock payment history - Replace with actual API call
    const [payments, setPayments] = useState([
        {
            id: 1,
            month: 'January 2025',
            amount: 12000,
            dueDate: '2025-01-05',
            paidDate: '2025-01-03',
            status: 'paid',
            paymentMethod: 'UPI',
            transactionId: 'TXN123456789'
        },
        {
            id: 2,
            month: 'December 2024',
            amount: 12000,
            dueDate: '2024-12-05',
            paidDate: '2024-12-04',
            status: 'paid',
            paymentMethod: 'Bank Transfer',
            transactionId: 'TXN123456788'
        },
        {
            id: 3,
            month: 'November 2024',
            amount: 12000,
            dueDate: '2024-11-05',
            paidDate: '2024-11-02',
            status: 'paid',
            paymentMethod: 'UPI',
            transactionId: 'TXN123456787'
        }
    ]);

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

    const filteredPayments = payments.filter(payment => {
        if (filter === 'all') return true;
        return payment.status === filter;
    });

    const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    if (loading) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading payment history...</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center">
                                            <DollarSign className="w-10 h-10 mr-3" />
                                            Payment History
                                        </h1>
                                        <p className="text-green-100 text-lg">Track all your rent payments</p>
                                    </div>
                                    <div className="text-right bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                        <p className="text-green-100 text-sm">Total Paid</p>
                                        <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Payments Made</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{payments.filter(p => p.status === 'paid').length}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Monthly Rent</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(tenantData?.monthlyRent)}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Security Deposit</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(tenantData?.securityDeposit)}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Filter Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-6 flex items-center gap-4 flex-wrap"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-600" />
                            <span className="text-gray-700 font-medium">Filter:</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('paid')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'paid'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                Paid
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                Pending
                            </button>
                        </div>
                    </motion.div>

                    {/* Payment List */}
                    <div className="space-y-4">
                        {filteredPayments.map((payment, index) => (
                            <motion.div
                                key={payment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${payment.status === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                                                }`}>
                                                {payment.status === 'paid' ? (
                                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                                ) : (
                                                    <Clock className="w-6 h-6 text-orange-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{payment.month}</h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Due: {formatDate(payment.dueDate)}
                                                </p>
                                                {payment.paidDate && (
                                                    <p className="text-sm text-green-600 mt-1">
                                                        Paid: {formatDate(payment.paidDate)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:items-end gap-2">
                                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${payment.status === 'paid'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {payment.status === 'paid' ? 'Paid' : 'Pending'}
                                                </span>
                                                {payment.paymentMethod && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {payment.paymentMethod}
                                                    </span>
                                                )}
                                            </div>
                                            {payment.transactionId && (
                                                <p className="text-xs text-gray-500">TXN: {payment.transactionId}</p>
                                            )}
                                        </div>
                                    </div>

                                    {payment.status === 'paid' && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                                <Download className="w-4 h-4" />
                                                Download Receipt
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {filteredPayments.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg">No payments found</p>
                        </motion.div>
                    )}
                </div>
            </div>
        </SeekerLayout>
    );
};

export default TenantPayments;
