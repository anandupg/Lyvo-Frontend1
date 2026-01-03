import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, User, Phone, Mail, Calendar, Home,
    MapPin, Shield, AlertCircle, UserCheck, DollarSign, MessageSquare
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';
import apiClient from '../../utils/apiClient';
import { useToast } from '../../hooks/use-toast';

const TenantDetails = () => {
    const { tenantData, loading: tenantLoading } = useTenantStatus();
    const { toast } = useToast();
    const [roommates, setRoommates] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleCall = (phone) => {
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            toast({
                title: "Unavailable",
                description: "Phone number not available.",
                variant: "destructive"
            });
        }
    };

    const handleMessage = (phone) => {
        if (phone) {
            window.location.href = `sms:${phone}`;
        } else {
            toast({
                title: "Unavailable",
                description: "Contact information not available.",
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        const fetchRoommates = async () => {
            if (!tenantData?.roomId) return;

            try {
                setLoading(true);
                const token = localStorage.getItem('authToken');
                const roomId = tenantData.roomId?._id || tenantData.roomId;
                const response = await apiClient.get(
                    `/property/public/rooms/${roomId}/tenants`
                );

                // De-duplicate roommates by userId
                const allTenants = response.data.tenants || [];
                const uniqueTenants = [];
                const seenUserIds = new Set();

                const getStrId = (val) => {
                    if (!val) return '';
                    if (typeof val === 'string') return val;
                    return (val._id || val.id || val).toString();
                };

                const loggedInUser = JSON.parse(localStorage.getItem('user'));
                const currentUserId = loggedInUser?.id || loggedInUser?._id || loggedInUser?.userId;

                allTenants.forEach(tenant => {
                    const uid = getStrId(tenant.userId);
                    // Add distinct check and exclude current user
                    if (uid && !seenUserIds.has(uid) && uid !== getStrId(currentUserId)) {
                        seenUserIds.add(uid);
                        uniqueTenants.push(tenant);
                    }
                });

                setRoommates(uniqueTenants);
            } catch (error) {
                console.error('Error fetching roommates:', error);
            } finally {
                setLoading(false);
            }
        };

        if (tenantData) {
            fetchRoommates();
        }
    }, [tenantData]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (tenantLoading || loading) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading roommates...</p>
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
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center">
                                            <Users className="w-10 h-10 mr-3" />
                                            Your Roommates
                                        </h1>
                                        <p className="text-indigo-100 text-lg">People living in Room {room?.roomNumber}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                                        <p className="text-indigo-100 text-sm">Total Tenants</p>
                                        <p className="text-4xl font-bold">{roommates.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Room Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl shadow-lg p-6 mb-8"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <Home className="w-5 h-5 mr-2 text-indigo-600" />
                            Room Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-indigo-50 rounded-lg p-4">
                                <p className="text-sm text-indigo-700 font-medium mb-1">Property</p>
                                <p className="text-base font-semibold text-gray-900">{property?.property_name || property?.propertyName || tenantData.propertyName || 'N/A'}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                                <p className="text-sm text-purple-700 font-medium mb-1">Room Number</p>
                                <p className="text-base font-semibold text-gray-900">Room {room?.roomNumber || tenantData.roomNumber || 'N/A'}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-sm text-blue-700 font-medium mb-1">Room Type</p>
                                <p className="text-base font-semibold text-gray-900">{room?.roomType || room?.room_type || 'Standard'}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-sm text-green-700 font-medium mb-1 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Monthly Rent
                                </p>
                                <p className="text-base font-semibold text-gray-900">{formatCurrency(room?.rent || tenantData.monthlyRent)}</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4 md:col-span-2 lg:col-span-2">
                                <p className="text-sm text-amber-700 font-medium mb-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Address
                                </p>
                                <p className="text-base font-semibold text-gray-900">
                                    {property?.address
                                        ? (typeof property.address === 'object'
                                            ? `${property.address.street || ''}, ${property.address.city || ''}, ${property.address.state || ''} - ${property.address.pincode || ''}`
                                            : property.address)
                                        : (tenantData.propertySnapshot?.address || 'Address not available')}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Roommates List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roommates.map((roommate, index) => {
                            const isCurrentUser = roommate.userId === currentUserId;

                            return (
                                <motion.div
                                    key={roommate._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${isCurrentUser ? 'ring-2 ring-indigo-500' : ''
                                        }`}
                                >
                                    <div className={`p-6 ${isCurrentUser ? 'bg-gradient-to-r from-indigo-50 to-purple-50' : ''}`}>
                                        {/* Profile Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            {(roommate.profilePicture || (typeof roommate.userId === 'object' && roommate.userId?.profilePicture)) ? (
                                                <img
                                                    src={roommate.profilePicture || roommate.userId?.profilePicture}
                                                    alt={roommate.userName}
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                                    <User className="w-8 h-8 text-white" />
                                                </div>
                                            )}
                                            <div className="flex flex-col items-end gap-2">
                                                {isCurrentUser && (
                                                    <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-sm">
                                                        YOU
                                                    </span>
                                                )}
                                                {roommate.status === 'active' && (
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                                                        <UserCheck className="w-3 h-3" />
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                                            {roommate.userName} {isCurrentUser && <span className="text-indigo-600 text-sm font-semibold">(You)</span>}
                                        </h3>

                                        {/* Contact Info */}
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                                <span className="truncate">{roommate.userEmail}</span>
                                            </div>
                                            {roommate.userPhone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Phone className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                                    <span>{roommate.userPhone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons - Only for others */}
                                        {!isCurrentUser && (
                                            <div className="flex gap-2 mb-6">
                                                <button
                                                    onClick={() => handleCall(roommate.userPhone)}
                                                    className="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">Call</span>
                                                </button>
                                                <button
                                                    onClick={() => handleMessage(roommate.userPhone)}
                                                    className="flex-1 bg-purple-50 text-purple-600 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors border border-purple-100"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    <span className="text-sm font-semibold">Message</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Check-in Date */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                                    <Calendar className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Checked in</p>
                                                    <p className="font-semibold text-gray-900">{formatDate(roommate.actualCheckInDate)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Button */}

                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {roommates.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg">No roommates found</p>
                            <p className="text-gray-500 text-sm mt-2">You might be the only tenant in this room</p>
                        </motion.div>
                    )}

                    {/* Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200"
                    >
                        <div className="flex items-start gap-3">
                            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">Privacy Notice</h4>
                                <p className="text-sm text-gray-700">
                                    Contact information is shared only with tenants residing in the same room.
                                    Please respect each other's privacy and maintain a friendly environment.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </SeekerLayout>
    );
};

export default TenantDetails;
