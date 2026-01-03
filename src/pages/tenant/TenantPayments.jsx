import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Calendar, CheckCircle, Clock, Download,
    CreditCard, Receipt, TrendingUp, AlertCircle, Filter
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';

import apiClient from '../../utils/apiClient';

const TenantPayments = () => {
    const { tenantData, loading } = useTenantStatus();
    const [filter, setFilter] = useState('all'); // all, paid, pending

    const [payments, setPayments] = useState([]);
    const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle', 'success', 'error', 'cancelled'
    const [processedPayment, setProcessedPayment] = useState(null); // Payment data for modal/receipt

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const response = await apiClient.get('/property/user/payments');
                if (response.data.success) {
                    setPayments(response.data.payments);
                }
            } catch (error) {
                console.error('Error fetching payments:', error);
            }
        };
        fetchPayments();
    }, []);

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
        if (filter === 'pending') return payment.status === 'pending' || payment.status === 'overdue';
        return payment.status === filter;
    });

    const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    const handleDownloadReceipt = (payment) => {
        console.log('Downloading receipt for payment:', payment);
        console.log('Tenant Data:', tenantData);
        const receiptWindow = window.open('', '_blank');
        const receiptDate = new Date().toLocaleDateString();

        // Extract values safely to avoid [object Object] issues
        const propertyTitle = payment.propertyId?.title || tenantData?.property?.title || '';
        const propertyAddress = payment.propertyId?.address || tenantData?.property?.address || '';
        const ownerName = payment.ownerId?.name || tenantData?.owner?.name || '';
        const ownerEmail = payment.ownerId?.email || tenantData?.owner?.email || '';
        const tenantName = tenantData?.userName || tenantData?.name || 'Tenant';

        const receiptContent = `
            <html>
                <head>
                    <title>Rent Receipt - ${payment.description || 'Payment'}</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
                        .receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 8px; }
                        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                        .title { font-size: 24px; font-weight: bold; color: #2563eb; }
                        .subtitle { font-size: 16px; font-weight: bold; color: #444; margin-top: 10px; }
                        .contact { font-size: 14px; color: #666; }
                        .date { color: #666; font-size: 14px; margin-top: 5px; }
                        .section-title { font-size: 14px; font-weight: bold; color: #888; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 15px; }
                        .label { font-weight: bold; color: #555; }
                        .value { text-align: right; }
                        .total { border-top: 2px solid #eee; padding-top: 15px; margin-top: 15px; font-size: 18px; font-weight: bold; }
                        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; }
                        @media print { body { padding: 0; } .receipt-container { border: none; } }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            <div class="title">PAYMENT RECEIPT</div>
                            <div class="date">Date: ${receiptDate}</div>
                            
                            <!-- Owner Details -->
                            <div class="subtitle">${propertyTitle}</div>
                            <div class="contact">${propertyAddress}</div>
                            <div class="contact">Owner: ${ownerName} (${ownerEmail})</div>
                        </div>
                        
                        <div class="section-title">Details</div>

                        <div class="row">
                            <span class="label">Receipt ID:</span>
                            <span class="value">#${payment._id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div class="row">
                            <span class="label">Tenant Name:</span>
                            <span class="value">${tenantName}</span>
                        </div>
                        <div class="row">
                            <span class="label">Payment For:</span>
                            <span class="value">${payment.description || 'Monthly Rent'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Payment Date:</span>
                            <span class="value">${formatDate(payment.paidAt || new Date())}</span>
                        </div>
                        <div class="row">
                            <span class="label">Transaction ID:</span>
                            <span class="value">${payment.transactionId || 'N/A'}</span>
                        </div>
                        
                        <div class="row total">
                            <span class="label">TOTAL PAID</span>
                            <span class="value">${formatCurrency(payment.amount)}</span>
                        </div>

                        <div class="footer">
                            <p>Thank you for your payment!</p>
                            <p>Lyvo Property Management</p>
                        </div>
                    </div>
                    <script>
                        window.print();
                    </script>
                </body>
            </html>
        `;

        receiptWindow.document.write(receiptContent);
        receiptWindow.document.close();
    };

    // Load Razorpay SDK
    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayNow = async (payment) => {
        const res = await loadRazorpay();
        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        try {
            // 1. Create Order
            const orderData = {
                amount: payment.amount,
                currency: 'INR',
                receipt_id: `rcpt_${payment._id}`
            };
            const { data: orderResponse } = await apiClient.post('/property/payments/create-order', orderData);

            if (!orderResponse.success) {
                throw new Error(orderResponse.message || 'Order creation failed');
            }

            // 2. Open Razorpay
            const options = {
                key: 'rzp_test_RL5vMta3bKvRd4', // Matching backend key
                amount: orderResponse.amount,
                currency: orderResponse.currency,
                name: 'Lyvo Rent',
                description: payment.description,
                order_id: orderResponse.order_id,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        const verifyData = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            paymentId: payment._id
                        };

                        const { data: verifyResponse } = await apiClient.post('/property/user/payments/verify', verifyData);

                        if (verifyResponse.success) {
                            // Instead of alert, show Success Modal
                            setProcessedPayment({ ...payment, paidAt: new Date() });
                            setPaymentStatus('success');
                        } else {
                            setPaymentStatus('error');
                        }
                    } catch (err) {
                        console.error('Verification error', err);
                        setPaymentStatus('error');
                    }
                },
                modal: {
                    ondismiss: function () {
                        setPaymentStatus('cancelled');
                    }
                },
                prefill: {
                    // name: tenantData.name,
                    // email: tenantData.email,
                    // contact: tenantData.phone
                },
                theme: {
                    color: '#3399cc'
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (error) {
            console.error('Payment Error:', error);
            setPaymentStatus('error');
        }
    };

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
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(tenantData?.monthlyRent || tenantData?.room?.rent)}</p>
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
                                    {/* Prioritize: Room Record -> Property Record -> Tenant Record (Historical) */}
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(tenantData?.room?.security_deposit || tenantData?.property?.security_deposit || tenantData?.securityDeposit)}</p>
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
                                key={payment._id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${payment.status === 'paid' ? 'bg-green-100'
                                                : payment.status === 'overdue' ? 'bg-red-100' : 'bg-orange-100'
                                                }`}>
                                                {payment.status === 'paid' ? (
                                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                                ) : payment.status === 'overdue' ? (
                                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                                ) : (
                                                    <Clock className="w-6 h-6 text-orange-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {payment.description || (payment.type === 'rent' ? 'Monthly Rent' : 'Payment')}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Due: {formatDate(payment.dueDate)}
                                                </p>
                                                {payment.paidAt && (
                                                    <p className="text-sm text-green-600 mt-1">
                                                        Paid: {formatDate(payment.paidAt)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:items-end gap-2">
                                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-800'
                                                    : payment.status === 'overdue' ? 'bg-red-100 text-red-800'
                                                        : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
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

                                    {payment.status === 'paid' ? (
                                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                            <button
                                                onClick={() => handleDownloadReceipt(payment)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download Receipt
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                            <button
                                                onClick={() => handlePayNow(payment)}
                                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-transform transform hover:-translate-y-0.5"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                Pay Now
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

                <AnimatePresence>
                    {/* Payment Success Modal */}
                    {paymentStatus === 'success' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
                            >
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                                <p className="text-gray-600 mb-6">
                                    Thank you! Your payment of <span className="font-bold text-gray-900">{processedPayment ? formatCurrency(processedPayment.amount) : ''}</span> has been received.
                                </p>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleDownloadReceipt(processedPayment)}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download Receipt
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPaymentStatus('idle');
                                            window.location.reload();
                                        }}
                                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Payment Cancelled/Failed Modal */}
                    {(paymentStatus === 'cancelled' || paymentStatus === 'error') && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
                            >
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${paymentStatus === 'cancelled' ? 'bg-orange-100' : 'bg-red-100'}`}>
                                    <AlertCircle className={`w-10 h-10 ${paymentStatus === 'cancelled' ? 'text-orange-600' : 'text-red-600'}`} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {paymentStatus === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    {paymentStatus === 'cancelled'
                                        ? "The payment process was cancelled."
                                        : "Something went wrong during the transaction."}
                                </p>
                                <button
                                    onClick={() => setPaymentStatus('idle')}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SeekerLayout>
    );
};
export default TenantPayments;
