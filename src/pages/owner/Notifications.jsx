import React, { useState, useEffect } from 'react';
import OwnerLayout from '../../components/owner/OwnerLayout';
import apiClient from '../../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    CheckCircle2,
    Clock,
    Trash2,
    AlertCircle,
    MessageSquare,
    Home,
    CheckCircle
} from 'lucide-react';

const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = userData._id || userData.id;

            if (!userId) return;

            const response = await apiClient.get('/notifications', {
                headers: { 'x-user-id': userId }
            });

            if (response.data.success) {
                setNotifications(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            const response = await apiClient.put(`/notifications/${id}/read`);
            if (response.data.success) {
                setNotifications(prev => prev.map(n =>
                    n._id === id ? { ...n, is_read: true } : n
                ));
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await apiClient.put('/notifications/mark-all-read');
            if (response.data.success) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const response = await apiClient.delete(`/notifications/${id}`);
            if (response.data.success) {
                setNotifications(prev => prev.filter(n => n._id !== id));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'property_approved': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'property_rejected': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'booking_request': return <Clock className="w-5 h-5 text-blue-500" />;
            case 'general': return <MessageSquare className="w-5 h-5 text-purple-500" />;
            default: return <Bell className="w-5 h-5 text-gray-400" />;
        }
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    return (
        <OwnerLayout>
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-sm text-gray-500 mt-1">Stay updated with your property management activities</p>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'unread'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Unread {notifications.filter(n => !n.is_read).length > 0 && `(${notifications.filter(n => !n.is_read).length})`}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading notifications...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No notifications found</h3>
                            <p className="text-gray-500 mt-1">We'll notify you when something important happens.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            <AnimatePresence initial={false}>
                                {filteredNotifications.map((notification) => (
                                    <motion.div
                                        key={notification._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className={`p-5 flex items-start space-x-4 hover:bg-gray-50 transition-colors group relative ${!notification.is_read ? 'bg-blue-50/30' : ''
                                            }`}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                                    }`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-xs text-gray-400">
                                                    {getTimeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {notification.message}
                                            </p>

                                            <div className="flex items-center mt-3 space-x-4">
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={() => markAsRead(notification._id)}
                                                        className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center"
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Mark as read
                                                    </button>
                                                )}
                                                {notification.action_url && (
                                                    <a
                                                        href={notification.action_url}
                                                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center"
                                                    >
                                                        <Home className="w-3 h-3 mr-1" />
                                                        View details
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteNotification(notification._id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 transition-all rounded-full hover:bg-red-50"
                                            title="Delete notification"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </OwnerLayout>
    );
};

export default Notifications;
