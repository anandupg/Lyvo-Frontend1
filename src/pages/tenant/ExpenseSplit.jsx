import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign, Users, Plus, Send, CheckCircle, Clock,
    X, Calendar, User, AlertCircle, Receipt, Trash2, ArrowUpRight, ArrowDownLeft, BellRing
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';
import apiClient from '../../utils/apiClient';
import { useToast } from '../../hooks/use-toast';

const ExpenseSplit = () => {
    const { tenantData, loading: tenantLoading, error: tenantError } = useTenantStatus();
    const { toast } = useToast();
    const [roommates, setRoommates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    // UPI ID State
    const [myUpiId, setMyUpiId] = useState(localStorage.getItem('userUpiId') || '');
    const [isEditingUpi, setIsEditingUpi] = useState(false);
    const [tempUpiId, setTempUpiId] = useState('');

    const getStrId = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        return (val._id || val.id || val).toString();
    };

    const [formData, setFormData] = useState({
        description: '',
        totalAmount: '',
        paidBy: '', // Will be set to current user name for display
        splitWith: [],
        category: 'groceries',
        date: new Date().toISOString().split('T')[0],
        targetUpiId: '' // Will sync with myUpiId in useEffect or init
    });

    const categories = [
        'Groceries',
        'Utilities',
        'Food Delivery',
        'Cleaning Supplies',
        'Internet',
        'Maintenance',
        'Other'
    ];

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setCurrentUserId(user.id || user._id || user.userId);
            setFormData(prev => ({ ...prev, paidBy: user.name || '' }));
        }
        // Sync form with saved UPI
        setFormData(prev => ({ ...prev, targetUpiId: myUpiId }));
    }, [myUpiId]);

    const handleSaveUpi = () => {
        if (!tempUpiId.trim()) {
            toast({ variant: "destructive", title: "Invalid ID", description: "UPI ID cannot be empty" });
            return;
        }
        localStorage.setItem('userUpiId', tempUpiId);
        setMyUpiId(tempUpiId);
        setIsEditingUpi(false);
        toast({ title: "Updated", description: "Your default UPI ID has been updated." });
    };

    const fetchData = async () => {
        if (!tenantData?.roomId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const roomId = tenantData.roomId?._id || tenantData.roomId;

            // Fetch Roommates
            const roommatesRes = await apiClient.get(
                `/property/public/rooms/${roomId}/tenants`
            );

            // De-duplicate roommates by userId
            const allTenants = roommatesRes.data.tenants || [];
            const uniqueTenants = [];
            const seenUserIds = new Set();

            allTenants.forEach(tenant => {
                const uid = getStrId(tenant.userId);
                if (uid && !seenUserIds.has(uid)) {
                    seenUserIds.add(uid);
                    uniqueTenants.push(tenant);
                }
            });

            setRoommates(uniqueTenants);

            // Fetch Expenses
            const expensesRes = await apiClient.get(
                `/property/expenses`
            );

            // Client-side LIFO Sorting (Newest Created First)
            const fetchedExpenses = expensesRes.data.expenses || [];
            fetchedExpenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setExpenses(fetchedExpenses);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenantData) {
            fetchData();
        }
    }, [tenantData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Calculate split amounts
        const involvedUserIds = [...formData.splitWith, currentUserId];
        const uniqueInvolved = [...new Set(involvedUserIds)];
        const sharePerPerson = parseFloat(formData.totalAmount) / uniqueInvolved.length;

        // Construct splits array for backend
        const splits = uniqueInvolved.map(uid => ({
            user: uid,
            amount: sharePerPerson
        }));

        try {
            const token = localStorage.getItem('authToken');
            await apiClient.post(
                `/property/expenses`,
                {
                    description: formData.description,
                    totalAmount: parseFloat(formData.totalAmount),
                    category: formData.category,
                    date: formData.date,
                    targetUpiId: formData.targetUpiId,
                    splits: splits
                }
            );

            // Save UPI ID for future use
            localStorage.setItem('userUpiId', formData.targetUpiId);
            setMyUpiId(formData.targetUpiId); // Update global state

            toast({
                title: "Success",
                description: "Expense added and roommates notified!"
            });
            setShowForm(false);
            setFormData({
                description: '',
                totalAmount: '',
                paidBy: formData.paidBy,
                splitWith: [],
                category: 'groceries',
                date: new Date().toISOString().split('T')[0],
                targetUpiId: formData.targetUpiId // Keep key
            });
            fetchData(); // Refresh list
        } catch (err) {
            console.error('Error adding expense:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: err.response?.data?.message || 'Failed to add expense'
            });
        }
    };

    const [paymentStatusModal, setPaymentStatusModal] = useState({ show: false, status: 'success', title: '', message: '' });

    const handlePayNow = async (expense, amount) => {
        try {
            // 1. Create Razorpay Order
            const orderResponse = await apiClient.post('/property/payments/create-order', {
                amount: amount,
                // Razorpay max receipt length is 40. 
                // ID is 24 chars, Date is 13 chars. "exp_" is 4 chars. Total 41+ > 40.
                // We'll use a shorter version.
                receipt_id: `e${expense._id.slice(-8)}_${Date.now()}` // e + 8 + 1 + 13 = 23 chars (Safe)
            });

            if (!orderResponse.data.success) {
                throw new Error('Failed to create payment order');
            }

            const { order_id, currency } = orderResponse.data;
            const payerName = expense.paidBy?.name || 'Roommate';

            // 2. Initialize Razorpay
            const options = {
                key: 'rzp_test_RL5vMta3bKvRd4', // Using the same test key as booking
                amount: orderResponse.data.amount, // in paise
                currency: currency,
                name: "Lyvo Expense",
                description: `Paying ${expense.targetUpiId}`,
                order_id: order_id,
                prefill: {
                    name: tenantData?.tenantName || 'User',
                    contact: tenantData?.phone || '',
                    email: tenantData?.email || ''
                },
                notes: {
                    payment_for: expense.description,
                    target_upi: expense.targetUpiId
                },
                modal: {
                    ondismiss: function () {
                        setPaymentStatusModal({
                            show: true,
                            status: 'error',
                            title: 'Payment Cancelled',
                            message: 'You cancelled the payment process. No money was deducted.'
                        });
                    }
                },
                handler: async function (response) {
                    try {
                        // On success, settle the expense backend
                        // Ideally we would verify signature here, but for expense split MVP we trust the callback + settle call
                        await settleExpense(expense._id);
                        setPaymentStatusModal({
                            show: true,
                            status: 'success',
                            title: 'Payment Successful',
                            message: `Successfully paid ₹${formatCurrency(amount).replace('₹', '')} to ${payerName}.`
                        });
                    } catch (error) {
                        console.error('Settlement Error:', error);
                        setPaymentStatusModal({
                            show: true,
                            status: 'error',
                            title: 'Settlement Failed',
                            message: 'Payment was successful, but we failed to update the system. Please support.'
                        });
                    }
                },
                theme: {
                    color: "#22c55e" // Green theme for expense
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                setPaymentStatusModal({
                    show: true,
                    status: 'error',
                    title: 'Payment Failed',
                    message: response.error.description || 'The payment could not be processed.'
                });
            });
            rzp1.open();

        } catch (error) {
            console.error('Payment Error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not initiate payment. Please try again."
            });
        }
    };

    const settleExpense = async (expenseId) => {
        try {
            const token = localStorage.getItem('authToken');
            await apiClient.post(
                `/property/expenses/${expenseId}/settle`,
                {}
            );
            toast({
                title: "Success",
                description: "Payment settled!"
            });
            fetchData();
        } catch (err) {
            console.error('Error settling expense:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update payment status"
            });
        }
    };

    const handleRemind = async (expenseId, userId) => {
        try {
            await apiClient.post(`/property/expenses/${expenseId}/remind`, { userId });
            return true;
        } catch (error) {
            console.error('Error sending reminder:', error);
            return false;
        }
    };

    const handleRemindAll = async (expense) => {
        const pendingUsers = expense.displaySplits || [];
        if (pendingUsers.length === 0) return;

        let successCount = 0;

        // Show loading toast? Or just process in background?
        // Let's do optimistic UI or just process
        for (const split of pendingUsers) {
            const splitUserId = split.user._id || split.user;
            const success = await handleRemind(expense._id, splitUserId);
            if (success) successCount++;
        }

        if (successCount > 0) {
            toast({
                title: "Reminders Sent",
                description: `Sent payment reminders to ${successCount} roommate(s).`
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send reminders."
            });
        }
    };

    const toggleRoommate = (roommateId) => {
        if (!roommateId || !currentUserId) return;

        const rId = getStrId(roommateId);
        const cId = getStrId(currentUserId);

        if (rId === cId) return;

        setFormData(prev => {
            const isSelected = prev.splitWith.some(id => id.toString() === rId);
            return {
                ...prev,
                splitWith: isSelected
                    ? prev.splitWith.filter(id => id.toString() !== rId)
                    : [...prev.splitWith, rId]
            };
        });
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

    // Calculate Dashboard Stats & Filter Lists
    const moneyIOweList = [];
    const moneyOwedToMeList = [];
    const historyList = [];

    // Global reduce for total stats
    const totalYouOwe = expenses.reduce((acc, exp) => {
        const mySplit = exp.splits.find(s => getStrId(s.user) === getStrId(currentUserId) || getStrId(s.user._id) === getStrId(currentUserId));
        if (mySplit && exp.paidBy._id !== currentUserId && mySplit.status === 'pending') {
            return acc + mySplit.amount;
        }
        return acc;
    }, 0);

    const totalOwedToYou = expenses.reduce((acc, exp) => {
        if (exp.paidBy._id === currentUserId) {
            const pendingAmount = exp.splits.reduce((sum, split) => {
                if (getStrId(split.user) !== getStrId(currentUserId) && getStrId(split.user._id) !== getStrId(currentUserId) && split.status === 'pending') {
                    return sum + split.amount;
                }
                return sum;
            }, 0);
            return acc + pendingAmount;
        }
        return acc;
    }, 0);

    // Calculate Lifetime Stats (Settled)
    const totalSent = expenses.reduce((acc, exp) => {
        const mySplit = exp.splits.find(s => getStrId(s.user) === getStrId(currentUserId) || getStrId(s.user._id) === getStrId(currentUserId));
        if (mySplit && exp.paidBy._id !== currentUserId && mySplit.status === 'settled') {
            return acc + mySplit.amount;
        }
        return acc;
    }, 0);

    const totalReceived = expenses.reduce((acc, exp) => {
        if (exp.paidBy._id === currentUserId) {
            const settledAmount = exp.splits.reduce((sum, split) => {
                if (getStrId(split.user) !== getStrId(currentUserId) && getStrId(split.user._id) !== getStrId(currentUserId) && split.status === 'settled') {
                    return sum + split.amount;
                }
                return sum;
            }, 0);
            return acc + settledAmount;
        }
        return acc;
    }, 0);

    // Build Split Lists
    expenses.forEach(expense => {
        const isPayer = expense.paidBy._id === currentUserId;

        if (isPayer) {
            // 1. Pending Splits (Money Owed to Me)
            const pendingSplits = expense.splits.filter(s =>
                (getStrId(s.user) !== getStrId(currentUserId) && getStrId(s.user._id) !== getStrId(currentUserId)) &&
                s.status === 'pending'
            );

            if (pendingSplits.length > 0) {
                moneyOwedToMeList.push({ ...expense, displaySplits: pendingSplits });
            }

            // 2. Settled Splits (History)
            const settledSplits = expense.splits.filter(s =>
                (getStrId(s.user) !== getStrId(currentUserId) && getStrId(s.user._id) !== getStrId(currentUserId)) &&
                s.status === 'settled'
            );

            if (settledSplits.length > 0) {
                // Clone expense for history entry, or push individual entries?
                // Let's keep expense structure but only show relevant splits
                historyList.push({ ...expense, displaySplits: settledSplits, type: 'received' });
            }

        } else {
            // I am the debtor
            const mySplit = expense.splits.find(s => getStrId(s.user) === getStrId(currentUserId) || getStrId(s.user._id) === getStrId(currentUserId));

            if (mySplit) {
                if (mySplit.status === 'pending') {
                    moneyIOweList.push({ ...expense, mySplit });
                } else {
                    // I settled this, goes to history
                    historyList.push({ ...expense, mySplit, type: 'paid' });
                }
            }
        }
    });

    // History Filter State
    const [historyFilter, setHistoryFilter] = useState('all'); // all, week, month, year

    // Filter History List
    const getSettledDate = (item) => {
        if (item.mySplit) return new Date(item.mySplit.settledAt || item.updatedAt);
        if (item.displaySplits) {
            const dates = item.displaySplits.map(s => new Date(s.settledAt || item.updatedAt));
            return new Date(Math.max(...dates));
        }
        return new Date(item.createdAt);
    };

    const filteredHistoryList = historyList.filter(item => {
        if (historyFilter === 'all') return true;
        const date = getSettledDate(item);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (historyFilter === 'week') return diffDays <= 7;
        if (historyFilter === 'month') return diffDays <= 30;
        if (historyFilter === 'year') return diffDays <= 365;
        return true;
    });

    // Sort history by settledAt
    filteredHistoryList.sort((a, b) => getSettledDate(b) - getSettledDate(a));


    // Loading state for Tenant Status Check
    if (tenantLoading) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Verifying tenant status...</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    // Access Restricted / Error State
    if (!tenantData) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-xl">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                        <p className="text-gray-600 mb-6">
                            Unable to verify tenant status.
                            {tenantError ? <span className="block mt-2 text-red-500 text-sm">Error: {tenantError}</span> : <span className="block mt-2 text-sm text-gray-500">Please make sure the backend server is running.</span>}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Receipt className="w-8 h-8 text-green-600" />
                                Expense Split
                            </h1>
                            <p className="text-gray-500 text-sm">Manage shared expenses easily</p>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2 text-sm"
                        >
                            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showForm ? 'Cancel' : 'Add Expense'}
                        </button>
                    </div>

                    {/* Dashboard Stats (Google Pay Style) */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-between h-auto min-h-[140px] relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">You Owe Now</p>
                                <h3 className="text-3xl font-bold text-red-600 mb-4">{formatCurrency(totalYouOwe)}</h3>
                                <div className="border-t border-red-50 pt-2">
                                    <p className="text-[10px] text-gray-400 font-medium">LIFETIME SENT</p>
                                    <p className="text-sm font-bold text-gray-600">{formatCurrency(totalSent)}</p>
                                </div>
                            </div>
                            <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                <ArrowDownLeft className="w-16 h-16 text-red-600" />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col h-auto relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Owed to You Now</p>
                                <h3 className="text-3xl font-bold text-green-600 mb-2">{formatCurrency(totalOwedToYou)}</h3>

                                {/* UPI ID Management Section */}
                                <div className="mt-2 pt-2 border-t border-green-50 mb-2">
                                    {isEditingUpi ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={tempUpiId}
                                                onChange={(e) => setTempUpiId(e.target.value)}
                                                className="w-full text-xs px-2 py-1 border border-green-200 rounded focus:outline-none focus:border-green-500"
                                                placeholder="username@upi"
                                            />
                                            <button onClick={handleSaveUpi} className="bg-green-600 text-white p-1 rounded hover:bg-green-700">
                                                <CheckCircle className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => setIsEditingUpi(false)} className="bg-gray-200 text-gray-600 p-1 rounded hover:bg-gray-300">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/upi">
                                            <p className="text-xs text-gray-500">
                                                Receive at: <span className="font-mono font-medium text-gray-700 bg-green-50 px-1 rounded">{myUpiId || 'Set UPI ID'}</span>
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setTempUpiId(myUpiId);
                                                    setIsEditingUpi(true);
                                                }}
                                                className="text-gray-400 hover:text-green-600 transition-colors opacity-100 sm:opacity-0 sm:group-hover/upi:opacity-100"
                                                title="Edit UPI ID"
                                            >
                                                <Receipt className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-green-50 pt-2">
                                    <p className="text-[10px] text-gray-400 font-medium">LIFETIME RECEIVED</p>
                                    <p className="text-sm font-bold text-gray-600">{formatCurrency(totalReceived)}</p>
                                </div>
                            </div>
                            <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                <ArrowUpRight className="w-16 h-16 text-green-600" />
                            </div>
                        </div>
                    </div>


                    {/* Add Expense Form */}
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100"
                        >
                            <h2 className="text-lg font-bold text-gray-900 mb-4">New Expense</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        placeholder="What's this for?"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400">₹</span>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                onKeyDown={(e) => {
                                                    if (e.key === '-' || e.key === 'e') {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                value={formData.totalAmount}
                                                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                                                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Your UPI ID (for receiving payment)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.targetUpiId}
                                        onChange={(e) => setFormData({ ...formData, targetUpiId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-gray-50"
                                        placeholder="username@upi"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Roommates will pay to this ID.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2">Split with</label>
                                    <div className="flex flex-wrap gap-2">
                                        {roommates.filter(r => getStrId(r.userId) !== getStrId(currentUserId)).map(roommate => {
                                            const rId = getStrId(roommate.userId);
                                            const isSelected = formData.splitWith.some(id => getStrId(id) === rId);
                                            return (
                                                <button
                                                    key={roommate._id}
                                                    type="button"
                                                    onClick={() => toggleRoommate(roommate.userId)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${isSelected
                                                        ? 'bg-green-50 border-green-500 text-green-700'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                                                        }`}
                                                >
                                                    {(roommate.profilePicture || (typeof roommate.userId === 'object' && roommate.userId?.profilePicture)) ? (
                                                        <img
                                                            src={roommate.profilePicture || roommate.userId?.profilePicture}
                                                            alt={roommate.userName}
                                                            className="w-5 h-5 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <User className="w-3 h-3" />
                                                    )}
                                                    {roommate.userName}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Implicitly include self */}
                                    <p className="text-xs text-gray-400 mt-2">
                                        You + {formData.splitWith.length} others.
                                        Share: <strong className="text-gray-700">
                                            {formatCurrency(formData.totalAmount && (formData.splitWith.length + 1) ? formData.totalAmount / (formData.splitWith.length + 1) : 0)}/person
                                        </strong>
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={formData.splitWith.length === 0}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                >
                                    Add Expense
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* Section: Money I Owe (Priority) */}
                    {(moneyIOweList.length > 0) && (
                        <div className="mb-0">
                            <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                                <ArrowDownLeft className="w-5 h-5" />
                                Money I Owe
                            </h2>
                            <div className="space-y-4">
                                {moneyIOweList.map(expense => (
                                    <motion.div
                                        key={expense._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{expense.description}</h3>
                                                <p className="text-xs text-gray-500">
                                                    Owed to <span className="font-semibold text-gray-700">{expense.paidBy.name || 'Roommate'}</span>
                                                </p>
                                                {expense.targetUpiId && (
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1 rounded">
                                                        UPI: {expense.targetUpiId}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">{formatDate(expense.date)}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <span className="text-lg font-bold text-red-600">{formatCurrency(expense.mySplit.amount)}</span>
                                                <button
                                                    onClick={() => handlePayNow(expense, expense.mySplit.amount)}
                                                    className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-700 transition-colors shadow-sm"
                                                >
                                                    Pay Now
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="my-8 border-b border-gray-100"></div>

                    {/* Section: Money Owed to Me */}
                    {(moneyOwedToMeList.length > 0) && (
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
                                <ArrowUpRight className="w-5 h-5" />
                                Money Owed to Me
                            </h2>
                            <div className="space-y-4">
                                {moneyOwedToMeList.map(expense => (
                                    <motion.div
                                        key={expense._id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-4"
                                    >
                                        <div className="flex justify-between mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{expense.description}</h3>
                                                {expense.targetUpiId && (
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1 rounded">
                                                        UPI: {expense.targetUpiId}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400">{formatDate(expense.date)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">
                                                    Total: {formatCurrency(expense.totalAmount)}
                                                </span>
                                                {expense.displaySplits.length > 0 && (
                                                    <button
                                                        onClick={() => handleRemindAll(expense)}
                                                        className="text-[10px] text-orange-600 font-medium hover:text-orange-700 underline flex items-center gap-1"
                                                    >
                                                        <BellRing className="w-3 h-3" />
                                                        Remind All Pending
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-3">
                                            {expense.displaySplits.map(split => {
                                                const splitUser = split.user?.name ? split.user : (roommates.find(r => getStrId(r.userId) === getStrId(split.user)) || { userName: 'Unknown User' });
                                                const splitUserName = splitUser.name || splitUser.userName;
                                                const splitUserId = split.user._id || split.user;

                                                return (
                                                    <div key={split._id || splitUser.userId} className="flex items-center justify-between bg-white p-2 rounded-lg border border-green-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                                                {splitUserName.charAt(0)}
                                                            </div>
                                                            <span className="text-sm text-gray-700">{splitUserName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(split.amount)}</span>
                                                            <button
                                                                onClick={async () => {
                                                                    const success = await handleRemind(expense._id, splitUserId);
                                                                    if (success) toast({ title: "Reminder Sent", description: `Reminded ${splitUserName}` });
                                                                }}
                                                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                                                                title={`Remind ${splitUserName}`}
                                                            >
                                                                <BellRing className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section: History (Settled) */}
                    {(historyList.length > 0) && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-500 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Payment History
                                </h2>
                                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                                    {['all', 'week', 'month', 'year'].map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setHistoryFilter(filter)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${historyFilter === filter
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {filteredHistoryList.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 py-4">No payments in this period.</p>
                                ) : (
                                    filteredHistoryList.map(item => {
                                        // Helper to render content based on type
                                        const isReceived = item.type === 'received';

                                        return (
                                            <motion.div
                                                key={`${item._id}-${item.type}`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-gray-50 rounded-xl border border-gray-100 p-4 opacity-75 hover:opacity-100 transition-opacity"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isReceived ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            <CheckCircle className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-gray-700 text-sm line-through decoration-gray-400">{item.description}</h3>
                                                            <p className="text-xs text-gray-500">
                                                                {isReceived
                                                                    ? `Received from ${item.displaySplits.map(s => {
                                                                        const u = s.user?.name ? s.user : (roommates.find(r => getStrId(r.userId) === getStrId(s.user)) || { userName: 'Unknown' });
                                                                        return u.name || u.userName;
                                                                    }).join(', ')}`
                                                                    : `You paid ${item.paidBy?.name || item.paidBy?.userName || 'Roommate'}`
                                                                }
                                                            </p>
                                                            <div className="flex gap-3 mt-1">
                                                                <p className="text-[10px] text-gray-400">Added: {formatDate(item.date)}</p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    Paid: {isReceived
                                                                        ? formatDate(item.displaySplits.reduce((latest, s) => {
                                                                            const current = new Date(s.settledAt || item.updatedAt);
                                                                            return current > latest ? current : latest;
                                                                        }, new Date(0)))
                                                                        : formatDate(item.mySplit?.settledAt || item.updatedAt)
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-sm font-bold ${isReceived ? 'text-green-600' : 'text-gray-600'}`}>
                                                            {formatCurrency(
                                                                isReceived
                                                                    ? item.displaySplits.reduce((acc, s) => acc + s.amount, 0)
                                                                    : item.mySplit.amount
                                                            )}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400">Settled</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    }))}
                            </div>
                        </div>
                    )}

                    {expenses.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-sm">No shared expenses yet.</p>
                        </div>
                    )}
                </div>

                {/* Payment Status Modal */}
                {paymentStatusModal.show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
                        >
                            <div className={`p-6 text-center ${paymentStatusModal.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${paymentStatusModal.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {paymentStatusModal.status === 'success' ? (
                                        <CheckCircle className={`w-8 h-8 ${paymentStatusModal.status === 'success' ? 'text-green-600' : 'text-red-600'}`} />
                                    ) : (
                                        <AlertCircle className="w-8 h-8 text-red-600" />
                                    )}
                                </div>
                                <h3 className={`text-xl font-bold mb-2 ${paymentStatusModal.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                    {paymentStatusModal.title}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    {paymentStatusModal.message}
                                </p>
                            </div>
                            <div className="p-4 bg-white border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        setPaymentStatusModal(prev => ({ ...prev, show: false }));
                                        if (paymentStatusModal.status === 'success') {
                                            // Optional: perform additional cleanup or refresh if needed
                                            // fetchData() is already called in settleExpense
                                        }
                                    }}
                                    className={`w-full py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90 ${paymentStatusModal.status === 'success' ? 'bg-green-600' : 'bg-gray-900'}`}
                                >
                                    {paymentStatusModal.status === 'success' ? 'Done' : 'Close'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </SeekerLayout>
    );
};

export default ExpenseSplit;
