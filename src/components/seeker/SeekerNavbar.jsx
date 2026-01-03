import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Bell,
  User,
  LogOut,
  X
} from 'lucide-react';

// Helper function to format time ago
const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

const SeekerNavbar = ({ onMenuToggle }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [user, setUser] = useState({});
  const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face";

  const location = useLocation();
  const navigate = useNavigate();

  // Safely parse user from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      setUser({});
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const userId = user._id || user.id;
      if (!userId) {
        return;
      }

      // Use apiClient which handles base URL and Authorization automatically
      const response = await apiClient.get('/notifications', {
        headers: {
          'x-user-id': userId
        }
      });

      if (response.status === 200) {
        const data = response.data;
        if (data.success) {
          setNotifications(data.data || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      if (!userData._id && !user._id) {
        return;
      }

      const response = await apiClient.put(`/notifications/${notificationId}/read`, {}, {
        headers: {
          'x-user-id': userData._id || userData.id || user._id || user.id
        }
      });

      if (response.status === 200) {
        // Refresh notifications
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      if (!userData._id && !user._id) {
        return;
      }

      const response = await apiClient.put('/notifications/mark-all-read', {}, {
        headers: {
          'x-user-id': userData._id || userData.id || user._id || user.id
        }
      });

      if (response.status === 200) {
        // Refresh notifications
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      if (!(userData._id || userData.id || user._id || user.id)) {
        return;
      }

      const response = await apiClient.delete(`/notifications/${notificationId}`, {
        headers: {
          'x-user-id': userData._id || userData.id || user._id || user.id
        }
      });

      if (response.status === 200) {
        // Refresh notifications
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(fetchNotifications, 30000);

    // Track intervals for cleanup
    if (!window.lyvoIntervals) {
      window.lyvoIntervals = [];
    }
    window.lyvoIntervals.push(pollInterval);

    return () => {
      clearInterval(pollInterval);
      // Remove from tracking array
      if (window.lyvoIntervals) {
        const index = window.lyvoIntervals.indexOf(pollInterval);
        if (index > -1) {
          window.lyvoIntervals.splice(index, 1);
        }
      }
    };
  }, []);

  // Listen for notification events
  useEffect(() => {
    const handleNewNotification = (event) => {
      console.log('🔔 SeekerNavbar received new-notification event:', event.detail);
      fetchNotifications();
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on logout button or profile button
      if (event.target.closest('[data-logout-button]') || event.target.closest('[data-profile-button]')) {
        return;
      }

      if (!event.target.closest('.dropdown-container')) {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    console.log('🔄 Navbar handleLogout called');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('📡 Dispatching logout event...');
    window.dispatchEvent(new Event('lyvo-logout'));
    console.log('🚀 Navigating to login...');
    navigate('/login');
    console.log('✅ Navbar logout completed');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Logo */}
          <Link to="/seeker-dashboard" className="flex items-center space-x-2">
            <motion.div
              className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src="/Lyvo_no_bg.png"
                alt="Lyvo Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>
            <div className="hidden sm:flex items-center">
              <span className="text-xl font-bold text-red-600">Lyvo</span>
              <span className="text-xl font-bold text-black">+</span>
            </div>
          </Link>

        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">

          {/* Notifications */}
          <div className="relative dropdown-container">
            <motion.button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <motion.div
                    className="fixed inset-0 z-40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowNotifications(false)}
                  />
                  <motion.div
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-red-600 hover:text-red-700 transition-colors"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-8 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                          <p className="mt-2">Loading notifications...</p>
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            className={`p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50' : ''
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${notification.type === 'booking_approved' ? 'bg-green-500' :
                                notification.type === 'booking_rejected' ? 'bg-red-500' :
                                  notification.type === 'booking_request' ? 'bg-blue-500' :
                                    notification.type === 'expense_reminder' ? 'bg-orange-500' :
                                      notification.type === 'expense_added' ? 'bg-rose-500' :
                                        notification.type === 'expense_settled' ? 'bg-emerald-500' : 'bg-yellow-500'
                                }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {getTimeAgo(notification.createdAt || notification.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                                <button
                                  onClick={() => deleteNotification(notification._id)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                  title="Close notification"
                                >
                                  <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>


          {/* Profile Menu */}
          <div className="relative">
            <motion.button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-red-50 transition-colors group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="relative w-8 h-8 rounded-full overflow-hidden shadow-md"
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={user?.profilePicture || DEFAULT_AVATAR}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                />
              </motion.div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 group-hover:text-red-700 transition-colors">
                {user.name || 'User'}
              </span>
            </motion.button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <motion.div
                    className="fixed inset-0 z-40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="py-2">
                      <Link
                        to="/seeker-profile"
                        data-profile-button
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          console.log('🔄 Profile button clicked');
                          setShowProfileMenu(false);
                        }}
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile
                      </Link>
                      <hr className="my-2" />
                      <button
                        data-logout-button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔄 Navbar logout button clicked');
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </nav>
  );
};

export default SeekerNavbar;
