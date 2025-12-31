import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign, Users, Plus, Send, CheckCircle, Clock,
    X, Calendar, User, AlertCircle, Receipt, Trash2, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';
import apiClient from '../../utils/apiClient';

const ExpenseSplit = () => {
    const { tenantData, loading: tenantLoading, error: tenantError } = useTenantStatus();
    const { toast } = useToast();
    const [roommates, setRoommates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    const getStrId = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        return (val._id || val.id || val).toString();
    };

    // Get UPI ID from local storage if available
    const savedUpiId = localStorage.getItem('userUpiId') || '';

    const [formData, setFormData] = useState({
        description: '',
        totalAmount: '',
        paidBy: '', // Will be set to current user name for display
        splitWith: [],
        category: 'groceries',
        date: new Date().toISOString().split('T')[0],
        targetUpiId: savedUpiId
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
    }, []);

    const fetchData = async () => {
        if (!tenantData?.roomId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const roomId = tenantData.roomId?._id || tenantData.roomId;

            // Fetch Roommates
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
            // Fetch Expenses
            const expensesRes = await apiClient.get(
                `/property/expenses`
            );
            setExpenses(expensesRes.data.expenses || []);

        } catch (error) {
            console.error('Error fetching data:', error);
            // Silent fail to avoid spam if backend is down
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

            toast({
                title: "Success",
                description: "Expense added successfully"
            });
            setShowForm(false);
            setFormData({
                description: '',
                totalAmount: '',
                paidBy: formData.paidBy,
                splitWith: [],
                category: 'groceries',
                date: new Date().toISOString().split('T')[0],
                targetUpiId: formData.targetUpiId // Keep the UPI ID
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

    const handlePayNow = async (expense, amount) => {
        // UPI Intent Flow
        const payerName = expense.paidBy?.name || expense.paidBy?.userName || 'Roommate';
        const upiLink = `upi://pay?pa=${expense.targetUpiId}&pn=${encodeURIComponent(payerName)}&tr=${expense._id}&tn=${encodeURIComponent(expense.description)}&am=${amount}&cu=INR`;

        // Open UPI app
        window.location.href = upiLink;

        // In a real app, we'd wait for a webhook or use a payment gateway.
        // Here, we'll ask the user if they completed it to mark it settled.
        // Simulating a delay to let the app open
        setTimeout(() => {
            const confirmed = window.confirm("Did you complete the payment via your UPI app?");
            if (confirmed) {
                settleExpense(expense._id);
            }
        }, 3000);
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

    // Calculate Dashboard Stats
    const totalYouOwe = expenses.reduce((acc, exp) => {
        // Find my split
        const mySplit = exp.splits.find(s => s.user._id === currentUserId || s.user === currentUserId);
        // If I'm NOT the payer and split is pending, I owe this.
        if (mySplit && exp.paidBy._id !== currentUserId && mySplit.status === 'pending') {
            return acc + mySplit.amount;
        }
        return acc;
    }, 0);

    const totalOwedToYou = expenses.reduce((acc, exp) => {
        // If I AM the payer
        if (exp.paidBy._id === currentUserId) {
            // Sum of all pending splits
            const pendingAmount = exp.splits.reduce((sum, split) => {
                // Ignore my own split (which is effectively paying myself)
                if (split.user._id !== currentUserId && split.status === 'pending') {
                    return sum + split.amount;
                }
                return sum;
            }, 0);
            return acc + pendingAmount;
        }
        return acc;
    }, 0);


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
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">You Owe</p>
                                <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalYouOwe)}</h3>
                            </div>
                            <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ArrowDownLeft className="w-16 h-16 text-red-600" />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Owed to You</p>
                                <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalOwedToYou)}</h3>
                            </div>
                            <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
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

                    {/* Expenses Feed */}
                    <div className="space-y-4">
                        {expenses.map((expense) => {
                            const isPayer = expense.paidBy._id === currentUserId;
                            const mySplit = expense.splits.find(s => s.user._id === currentUserId || s.user === currentUserId);
                            const isSettled = mySplit?.status === 'settled';

                            // If I am NOT involved (not payer and not in splits), don't show (should be filtered by API anyway)
                            if (!isPayer && !mySplit) return null;

                            return (
                                <motion.div
                                    key={expense._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPayer ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {isPayer ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-sm">{expense.description}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {isPayer ? `You paid ${formatCurrency(expense.totalAmount)}` : `${expense.paidBy?.name || expense.paidBy?.userName || 'Someone'} paid ${formatCurrency(expense.totalAmount)}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 mb-0.5">{formatDate(expense.date)}</p>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium capitalize">
                                                {expense.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Section */}
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm">
                                                {isPayer ? (
                                                    <span className="text-green-700 font-medium">
                                                        You are owed {formatCurrency(expense.splits.reduce((sum, s) => (s.user._id !== currentUserId && s.status === 'pending') ? sum + s.amount : sum, 0))}
                                                    </span>
                                                ) : (
                                                    <span className={isSettled ? "text-gray-500" : "text-red-700 font-medium"}>
                                                        {isSettled ? "You settled your share" : `You owe ${formatCurrency(mySplit?.amount)}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {!isPayer && !isSettled && (
                                            <button
                                                onClick={() => handlePayNow(expense, mySplit.amount)}
                                                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
                                            >
                                                Pay {(expense.paidBy?.name || expense.paidBy?.userName || 'Roommate').split(' ')[0]}
                                            </button>
                                        )}

                                        {/* Show settlement status for payers */}
                                        {isPayer && (
                                            <div className="flex -space-x-2">
                                                {expense.splits.filter(s => s.user._id !== currentUserId).map(s => (
                                                    <div key={s._id} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-white text-[10px] font-bold ${s.status === 'settled' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                                                        }`} title={`${s.user?.name || s.user?.userName || 'User'}: ${s.status}`}>
                                                        {(s.user?.name || s.user?.userName || '?').charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}

                        {expenses.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-400 text-sm">No shared expenses yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SeekerLayout>
    );
};

export default ExpenseSplit;
