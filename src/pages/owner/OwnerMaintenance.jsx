import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
    Wrench, Search, RefreshCw, ArrowUpRight, CheckCircle, Clock,
    AlertCircle, User, Phone, Mail, MapPin, Calendar, Building,
    Bed, Filter, Eye, X
} from 'lucide-react';

import axios from 'axios';
import { getAuthToken } from '../../utils/authUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const OwnerMaintenance = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        requestId: null,
        newStatus: null,
        title: '',
        message: ''
    });

    const fetchRequests = async () => {
        try {
            const token = getAuthToken();
            const res = await axios.get(`${API_URL}/maintenance/owner`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const mapped = res.data.map(r => ({
                id: r._id,
                tenantName: r.tenantId?.name || 'Unknown',
                tenantEmail: r.tenantId?.email,
                tenantPhone: r.tenantId?.phone,
                propertyName: r.propertyId?.property_name || 'N/A',
                roomNumber: r.roomId?.room_number || 'N/A',
                title: r.title,
                description: r.description,
                category: r.category,
                priority: r.priority,
                status: r.status,
                dateSubmitted: r.createdAt,
                assignedTo: r.assignedTo
            }));
            setRequests(mapped);
        } catch (error) {
            console.error('Error fetching maintenance requests:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return requests
            .filter((r) => {
                if (statusFilter === 'all') return r.status !== 'completed';
                return r.status === statusFilter;
            })
            .filter((r) => {
                if (!q) return true;
                const tenant = `${r.tenantName} ${r.tenantEmail}`.toLowerCase();
                const property = r.propertyName.toLowerCase();
                const room = (r.roomNumber || '').toLowerCase();
                const title = r.title.toLowerCase();
                return tenant.includes(q) || property.includes(q) || room.includes(q) || title.includes(q);
            })
            .sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted));
    }, [requests, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'pending').length;
        const inProgress = requests.filter(r => r.status === 'in-progress').length;
        const completed = requests.filter(r => r.status === 'completed').length;
        const active = requests.filter(r => r.status !== 'completed').length;
        return { total, pending, inProgress, completed, active };
    }, [requests]);

    const refresh = () => {
        setIsRefreshing(true);
        fetchRequests();
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
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'in-progress': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-orange-100 text-orange-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const initiateStatusChange = (request, newStatus) => {
        const isStart = newStatus === 'in-progress';
        setConfirmModal({
            open: true,
            requestId: request.id,
            newStatus,
            title: isStart ? 'Start Maintenance?' : 'Complete Request?',
            message: isStart
                ? `Are you sure you want to start working on "${request.title}"? This will notify the tenant.`
                : `Are you sure you want to mark "${request.title}" as completed? This will notify the tenant.`
        });
    };

    const confirmStatusChange = async () => {
        try {
            const token = getAuthToken();
            await axios.patch(`${API_URL}/maintenance/${confirmModal.requestId}`,
                { status: confirmModal.newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchRequests();
            setConfirmModal({ open: false, requestId: null, newStatus: null, title: '', message: '' });
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status: ' + (error.response?.data?.message || error.message));
        }
    };

    if (loading) {
        return (
            <OwnerLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <RefreshCw className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading maintenance requests...</p>
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
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Requests</h1>
                            <p className="text-gray-600">Manage tenant maintenance requests</p>
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
                                onClick={() => navigate('/owner-dashboard')}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
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
                        className={`bg-gradient-to-br from-orange-50 to-orange-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'all' ? 'border-orange-400 ring-2 ring-orange-200' : 'border-orange-200'
                            }`}
                        onClick={() => setStatusFilter('all')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-orange-600 mb-1">Active Requests</div>
                                <div className="text-3xl font-bold text-orange-900">{stats.active}</div>
                            </div>
                            <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                                <Wrench className="w-6 h-6 text-orange-600" />
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
                                <AlertCircle className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-gradient-to-br from-blue-50 to-blue-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'in-progress' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-200'
                            }`}
                        onClick={() => setStatusFilter('in-progress')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-blue-600 mb-1">In Progress</div>
                                <div className="text-3xl font-bold text-blue-900">{stats.inProgress}</div>
                            </div>
                            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-gradient-to-br from-green-50 to-green-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'completed' ? 'border-green-400 ring-2 ring-green-200' : 'border-green-200'
                            }`}
                        onClick={() => setStatusFilter('completed')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-green-600 mb-1">Completed</div>
                                <div className="text-3xl font-bold text-green-900">{stats.completed}</div>
                            </div>
                            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
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
                            placeholder="Search by tenant, property, room, or request title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Requests List */}
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
                        <p className="text-gray-600">
                            {searchQuery ? 'Try adjusting your search criteria' : 'No maintenance requests yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRequests.map((request, index) => (
                            <motion.div
                                key={request.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="p-4 sm:p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Left: Request Info */}
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{request.title}</h3>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                        {request.status.replace('-', ' ')}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                                                        {request.priority}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-600">{request.description}</p>

                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-4 h-4" />
                                                    <span className="font-medium">{request.tenantName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Building className="w-4 h-4" />
                                                    <span>{request.propertyName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Bed className="w-4 h-4" />
                                                    <span>Room {request.roomNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{formatDate(request.dateSubmitted)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                                                    {request.category}
                                                </span>
                                                {request.assignedTo && (
                                                    <span className="text-gray-600">
                                                        Assigned to: <span className="font-medium">{request.assignedTo}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex lg:flex-col gap-2 lg:items-end">
                                            {request.status === 'pending' && (
                                                <button
                                                    onClick={() => initiateStatusChange(request, 'in-progress')}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                >
                                                    Start Work
                                                </button>
                                            )}
                                            {request.status === 'in-progress' && (
                                                <button
                                                    onClick={() => initiateStatusChange(request, 'completed')}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                                >
                                                    Mark Complete
                                                </button>
                                            )}

                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                                    className="p-1 hover:bg-gray-100 rounded-full"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <p className="text-gray-600 mb-6">
                                {confirmModal.message}
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmStatusChange}
                                    className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${confirmModal.newStatus === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </OwnerLayout>
    );
};

export default OwnerMaintenance;
