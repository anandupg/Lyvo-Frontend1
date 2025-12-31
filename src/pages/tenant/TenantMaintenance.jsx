import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wrench, AlertCircle, CheckCircle, Clock, Send,
    MessageSquare, Calendar, X
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';

import apiClient from '../../utils/apiClient';

const TenantMaintenance = () => {
    const { tenantData, loading: statusLoading } = useTenantStatus();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [cancelModal, setCancelModal] = useState({ open: false, id: null });
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        priority: 'medium',
        description: '',
        images: []
    });

    const fetchRequests = async () => {
        try {
            const response = await apiClient.get('/maintenance/tenant');
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    useEffect(() => {
        if (tenantData) {
            fetchRequests();
        } else if (!statusLoading) {
            setLoading(false);
        }
    }, [tenantData, statusLoading]);

    const categories = [
        'Plumbing',
        'Electrical',
        'Carpentry',
        'Painting',
        'Cleaning',
        'Appliances',
        'Other'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post('/maintenance', formData);
            await fetchRequests();
            setFormData({
                title: '',
                category: '',
                priority: 'medium',
                description: '',
                images: []
            });
            setShowForm(false);
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Failed to submit request: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = (id) => {
        setCancelModal({ open: true, id });
    };

    const confirmCancel = async () => {
        try {
            await apiClient.patch(`/maintenance/${cancelModal.id}`, { status: 'cancelled' });
            await fetchRequests();
            setCancelModal({ open: false, id: null });
        } catch (error) {
            console.error('Error cancelling request:', error);
            alert('Failed to cancel request');
        }
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (statusLoading) {
        return (
            <SeekerLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <Wrench className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading maintenance portal...</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    if (!tenantData) {
        return (
            <SeekerLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Tenancy</h2>
                    <p className="text-gray-600 max-w-md">
                        You need to have an active tenancy to submit maintenance requests.
                    </p>
                </div>
            </SeekerLayout>
        );
    }

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center">
                                            <Wrench className="w-10 h-10 mr-3" />
                                            Maintenance Requests
                                        </h1>
                                        <p className="text-orange-100 text-lg">Report and track maintenance issues</p>
                                    </div>
                                    <button
                                        onClick={() => setShowForm(!showForm)}
                                        className="bg-white text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition-colors shadow-lg"
                                    >
                                        {showForm ? 'Cancel' : '+ New Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Pending</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {requests.filter(r => r.status === 'pending').length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-yellow-600" />
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
                                    <p className="text-gray-500 text-sm font-medium">In Progress</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {requests.filter(r => r.status === 'in-progress').length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Wrench className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Completed</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {requests.filter(r => r.status === 'completed').length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* New Request Form */}
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-xl p-6 mb-8"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">New Maintenance Request</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Brief description of the issue"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category *
                                        </label>
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            <option value="">Select category</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority *
                                    </label>
                                    <div className="flex gap-4">
                                        {['low', 'medium', 'high'].map(priority => (
                                            <label key={priority} className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="priority"
                                                    value={priority}
                                                    checked={formData.priority === priority}
                                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                    className="mr-2"
                                                />
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getPriorityColor(priority)}`}>
                                                    {priority}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Provide detailed information about the issue..."
                                    />
                                </div>

                                <div className="flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* Requests List */}
                    <div className="space-y-4">
                        {requests.map((request, index) => (
                            <motion.div
                                key={request._id || request.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: showForm ? 0 : 0.4 + index * 0.1 }}
                                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${request.status === 'completed' ? 'bg-green-100' :
                                                    request.status === 'in-progress' ? 'bg-blue-100' : 'bg-yellow-100'
                                                    }`}>
                                                    {request.status === 'completed' ? (
                                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                                    ) : request.status === 'in-progress' ? (
                                                        <Wrench className="w-6 h-6 text-blue-600" />
                                                    ) : (
                                                        <Clock className="w-6 h-6 text-yellow-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-gray-900">{request.title}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{request.category}</p>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 mb-3">{request.description}</p>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Created: {formatDate(request.createdAt)}
                                                </div>
                                                {request.assignedTo && (
                                                    <div className="flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {request.assignedTo}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(request.status)}`}>
                                                {request.status.replace('-', ' ')}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(request.priority)}`}>
                                                {request.priority} Priority
                                            </span>
                                            {request.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancel(request._id)}
                                                    className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium hover:bg-red-100 transition-colors border border-red-200"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {requests.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg">No maintenance requests yet</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                            >
                                Create Your First Request
                            </button>
                        </motion.div>
                    )}

                    {/* Cancel Confirmation Modal */}
                    <AnimatePresence>
                        {cancelModal.open && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Cancel Request?</h3>
                                        <button onClick={() => setCancelModal({ open: false, id: null })} className="p-1 hover:bg-gray-100 rounded-full">
                                            <X className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                    <p className="text-gray-600 mb-6">
                                        Are you sure you want to cancel this maintenance request? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setCancelModal({ open: false, id: null })}
                                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Keep Request
                                        </button>
                                        <button
                                            onClick={confirmCancel}
                                            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            Yes, Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </SeekerLayout>
    );
};

export default TenantMaintenance;
