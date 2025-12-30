import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Home, Calendar, DollarSign, User, Phone, Mail, MapPin,
    Building, Bed, CheckCircle, Clock, AlertCircle, FileText,
    Wrench, MessageCircle, TrendingUp, Shield, Key, Zap
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';

const TenantDashboard = () => {
    const { tenantData, loading } = useTenantStatus();
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading your dashboard...</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    if (!tenantData) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Tenancy</h2>
                        <p className="text-gray-600">You don't have an active tenancy at the moment.</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    const { property, room } = tenantData;
    const daysAsTenant = Math.floor((new Date() - new Date(tenantData.actualCheckInDate)) / (1000 * 60 * 60 * 24));
    const nextRentDue = new Date(tenantData.actualCheckInDate);
    nextRentDue.setMonth(nextRentDue.getMonth() + 1);
    const daysUntilRent = Math.ceil((nextRentDue - new Date()) / (1000 * 60 * 60 * 24));

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
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Welcome Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                            {/* Animated background pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome Home! 🏠</h1>
                                        <p className="text-red-100 text-lg">You've been a tenant for {daysAsTenant} days</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-red-100 text-sm">Current Time</p>
                                        <p className="text-2xl font-bold">{currentDate.toLocaleTimeString()}</p>
                                        <p className="text-red-100 text-sm">{currentDate.toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-400"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Monthly Rent</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(tenantData.monthlyRent)}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-red-500" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Next Rent Due</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{daysUntilRent} days</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-green-600" />
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
                                    <p className="text-gray-500 text-sm font-medium">Room Number</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">Room {room?.roomNumber}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Bed className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Status</p>
                                    <p className="text-2xl font-bold text-green-600 mt-1 capitalize">{tenantData.status}</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Your Room */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="bg-gradient-to-r from-red-500 to-rose-500 p-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center">
                                        <Home className="w-6 h-6 mr-2" />
                                        Your Room
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {room?.roomImage && (
                                            <div className="md:w-1/3">
                                                <img
                                                    src={room.roomImage}
                                                    alt="Your Room"
                                                    className="w-full h-48 object-cover rounded-xl shadow-md"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-500 font-medium">Room Number</p>
                                                    <p className="text-lg font-semibold text-gray-900">Room {room?.roomNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 font-medium">Room Type</p>
                                                    <p className="text-lg font-semibold text-gray-900">{room?.roomType}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 font-medium">Monthly Rent</p>
                                                    <p className="text-lg font-semibold text-green-600">{formatCurrency(room?.rent)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 font-medium">Check-in Date</p>
                                                    <p className="text-lg font-semibold text-gray-900">{formatDate(tenantData.actualCheckInDate)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Property Details */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-white rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center">
                                        <Building className="w-6 h-6 mr-2" />
                                        Property Details
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Property Name</p>
                                            <p className="text-xl font-semibold text-gray-900">{property?.propertyName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium flex items-center">
                                                <MapPin className="w-4 h-4 mr-1" />
                                                Address
                                            </p>
                                            <p className="text-base text-gray-700">
                                                {typeof property?.address === 'string'
                                                    ? property.address
                                                    : `${property?.address?.street || ''}, ${property?.address?.city || ''}, ${property?.address?.state || ''} ${property?.address?.pincode || ''}`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Payment Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="bg-white rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center">
                                        <DollarSign className="w-6 h-6 mr-2" />
                                        Payment Information
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-green-50 rounded-xl p-4">
                                            <p className="text-sm text-green-700 font-medium mb-1">Monthly Rent</p>
                                            <p className="text-2xl font-bold text-green-900">{formatCurrency(tenantData.monthlyRent)}</p>
                                        </div>
                                        <div className="bg-red-50 rounded-xl p-4">
                                            <p className="text-sm text-red-700 font-medium mb-1">Security Deposit</p>
                                            <p className="text-2xl font-bold text-red-900">{formatCurrency(tenantData.securityDeposit)}</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-xl p-4">
                                            <p className="text-sm text-purple-700 font-medium mb-1">Next Payment Due</p>
                                            <p className="text-lg font-bold text-purple-900">{formatDate(nextRentDue)}</p>
                                            <p className="text-xs text-purple-600 mt-1">In {daysUntilRent} days</p>
                                        </div>
                                        <div className="bg-orange-50 rounded-xl p-4">
                                            <p className="text-sm text-orange-700 font-medium mb-1">Total Paid</p>
                                            <p className="text-2xl font-bold text-orange-900">{formatCurrency(tenantData.amountPaid)}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Owner Contact */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 }}
                                className="bg-white rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4">
                                    <h3 className="text-lg font-bold text-white flex items-center">
                                        <User className="w-5 h-5 mr-2" />
                                        Property Owner
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="text-center mb-4">
                                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <User className="w-10 h-10 text-indigo-600" />
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">{tenantData.ownerName}</p>
                                    </div>
                                    <div className="space-y-3">
                                        <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                                            <Phone className="w-4 h-4 mr-2" />
                                            Call Owner
                                        </button>
                                        <button className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center">
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            Send Message
                                        </button>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Quick Actions */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.9 }}
                                className="bg-white rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4">
                                    <h3 className="text-lg font-bold text-white flex items-center">
                                        <Zap className="w-5 h-5 mr-2" />
                                        Quick Actions
                                    </h3>
                                </div>
                                <div className="p-6 space-y-3">
                                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center">
                                        <Wrench className="w-4 h-4 mr-3 text-orange-600" />
                                        <span className="font-medium">Request Maintenance</span>
                                    </button>
                                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center">
                                        <FileText className="w-4 h-4 mr-3 text-red-500" />
                                        <span className="font-medium">View Agreement</span>
                                    </button>
                                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center">
                                        <TrendingUp className="w-4 h-4 mr-3 text-green-600" />
                                        <span className="font-medium">Payment History</span>
                                    </button>
                                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg transition-colors flex items-center">
                                        <Shield className="w-4 h-4 mr-3 text-purple-600" />
                                        <span className="font-medium">Property Rules</span>
                                    </button>
                                </div>
                            </motion.div>

                            {/* Important Info */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.0 }}
                                className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-xl p-6 border-2 border-yellow-200"
                            >
                                <div className="flex items-start space-x-3">
                                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-2">Reminder</h4>
                                        <p className="text-sm text-gray-700">
                                            Your next rent payment of {formatCurrency(tenantData.monthlyRent)} is due on {formatDate(nextRentDue)}.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </SeekerLayout>
    );
};

export default TenantDashboard;
