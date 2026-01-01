import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  User,
  Menu,
  LogOut,
  Settings,
  UserPlus,
  Building2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

const AdminNavbar = ({ onMenuClick }) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();


  // Get user data from main authentication
  const getUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const user = getUserData();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsProfileDropdownOpen(false);
        setIsNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsNotificationDropdownOpen(false);
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
    setIsProfileDropdownOpen(false);
  };

  // Fetch real notifications from database
  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      if (!authToken || !userData._id) {
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-user-id': userData._id
      };

      // Fetch admin notifications from database and real-time data
      const [dbNotificationsRes, usersRes, propertiesRes] = await Promise.all([
        apiClient.get('/notifications', { headers: { 'x-user-id': userData._id } }),
        apiClient.get('/user/all', { headers: { 'x-user-id': userData._id } }),
        apiClient.get('/property/admin/properties?limit=100', { headers: { 'x-user-id': userData._id } })
      ]);

      const dbNotifications = dbNotificationsRes.data;
      const usersData = usersRes.data;
      const propertiesData = propertiesRes.data;

      const users = usersData.data || [];
      const properties = propertiesData.data || propertiesData.properties || [];

      const notificationsList = [];

      // Add database notifications for admin
      if (dbNotifications.success && dbNotifications.data) {
        dbNotifications.data
          .filter(n => !n.is_read)
          .forEach(notification => {
            notificationsList.push({
              _id: notification._id,
              id: notification._id,
              type: notification.type || 'general',
              icon: notification.type?.includes('property') ? Building2 :
                notification.type?.includes('user') ? UserPlus : AlertCircle,
              title: notification.title,
              message: notification.message,
              time: getTimeAgo(notification.createdAt),
              actionUrl: notification.action_url,
              isRead: notification.is_read,
              createdAt: notification.createdAt
            });
          });
      }

      // Get dismissed notifications list
      const dismissedList = getDismissedNotifications();

      // Get pending properties (need approval) - only add if not in DB notifications
      const pendingProperties = properties.filter(p => p.approval_status === 'pending');
      pendingProperties.slice(0, 3).forEach(prop => {
        const notifId = `pending-prop-${prop._id}`;

        // Skip if dismissed
        if (dismissedList.includes(notifId)) {
          return;
        }

        const existingNotif = notificationsList.find(n =>
          n.message && n.message.includes(prop.property_name) && n.type.includes('property')
        );

        if (!existingNotif) {
          notificationsList.push({
            id: notifId,
            type: 'property_approval',
            icon: Building2,
            title: 'Property Approval Required',
            message: `${prop.property_name} is waiting for approval`,
            time: getTimeAgo(prop.createdAt),
            actionUrl: `/admin-property-details/${prop._id}`,
            isRead: false,
            createdAt: prop.createdAt,
            isSystemGenerated: true // Flag for system-generated notifications
          });
        }
      });

      // Get recently registered users (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentUsers = users
        .filter(u => u.role !== 2 && new Date(u.createdAt) > oneDayAgo)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);

      recentUsers.forEach(user => {
        const notifId = `new-user-${user._id}`;

        // Skip if dismissed
        if (dismissedList.includes(notifId)) {
          return;
        }

        const roleType = user.role === 1 ? 'Seeker' : user.role === 3 ? 'Owner' : 'User';
        const existingNotif = notificationsList.find(n =>
          n.message && n.message.includes(user.name) && n.type.includes('user')
        );

        if (!existingNotif) {
          notificationsList.push({
            id: notifId,
            type: 'user_registration',
            icon: UserPlus,
            title: `New ${roleType} Registered`,
            message: `${user.name} just joined the platform`,
            time: getTimeAgo(user.createdAt),
            actionUrl: user.role === 3 ? '/admin-owners' : '/admin-seekers',
            isRead: false,
            createdAt: user.createdAt,
            isSystemGenerated: true
          });
        }
      });

      // Sort by most recent and priority
      notificationsList.sort((a, b) => {
        // Prioritize property approvals
        const priorityA = a.type === 'property_approval' ? 0 : 1;
        const priorityB = b.type === 'property_approval' ? 0 : 1;
        if (priorityA !== priorityB) return priorityA - priorityB;

        // Then sort by date
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setNotifications(notificationsList);
      setUnreadCount(notificationsList.length);

      // Cleanup dismissed list periodically
      cleanupDismissedList();
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Get dismissed notifications from localStorage
  const getDismissedNotifications = () => {
    try {
      const dismissed = localStorage.getItem('admin_dismissed_notifications');
      return dismissed ? JSON.parse(dismissed) : [];
    } catch {
      return [];
    }
  };

  // Add notification to dismissed list
  const addToDismissedList = (notificationId) => {
    try {
      const dismissed = getDismissedNotifications();
      if (!dismissed.includes(notificationId)) {
        dismissed.push(notificationId);
        localStorage.setItem('admin_dismissed_notifications', JSON.stringify(dismissed));
      }
    } catch (error) {
      console.error('Error saving dismissed notification:', error);
    }
  };

  // Clean up dismissed list - remove IDs that are no longer relevant
  const cleanupDismissedList = (currentNotificationIds) => {
    try {
      const dismissed = getDismissedNotifications();
      // Keep only system-generated notification IDs that still exist
      const validDismissed = dismissed.filter(id => {
        // Keep if it starts with known prefixes
        return id.startsWith('pending-prop-') || id.startsWith('new-user-');
      });

      // Remove IDs that are older than 7 days (approximate cleanup)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const cleanedList = validDismissed.slice(-50); // Keep last 50 dismissed items max

      localStorage.setItem('admin_dismissed_notifications', JSON.stringify(cleanedList));
    } catch (error) {
      console.error('Error cleaning up dismissed notifications:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId, isSystemGenerated) => {
    try {
      // If it's a system-generated notification (not in DB), simply add to dismissed list
      if (isSystemGenerated) {
        addToDismissedList(notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        return;
      }

      const authToken = localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      if (!authToken || !userData._id) return;

      const response = await apiClient.delete(`/notifications/${notificationId}`, {
        headers: {
          'x-user-id': userData._id
        }
      });

      if (response.status === 200) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Helper function to format time ago
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 2592000)}mo ago`;
  };

  // Fetch notifications on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Clear main authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Dispatch logout event to update navbar
    window.dispatchEvent(new Event('lyvo-logout'));

    // Redirect to main login
    navigate('/login');
  };

  const handleNotificationClick = (notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsNotificationDropdownOpen(false);
    }
  };

  // Listen for notification events
  useEffect(() => {
    const handleNewNotification = (event) => {
      console.log('🔔 AdminNavbar received new-notification event:', event.detail);
      fetchNotifications();
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, []);

  // Animation variants
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transformOrigin: "top right"
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const buttonHoverVariants = {
    hover: {
      scale: 1.05,
      transition: { duration: 0.1 }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and Menu Toggle */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile Menu Toggle */}
          <motion.button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
            aria-label="Toggle menu"
            variants={buttonHoverVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          {/* Logo */}
          <Link to="/admin-dashboard" className="flex items-center space-x-2 sm:space-x-3">
            <motion.div
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src="/Lyvo_no_bg.png"
                alt="Lyvo Admin"
                className="w-full h-full object-contain"
              />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Lyvo Admin</h1>
              <p className="text-xs text-gray-500">Co-Living Platform</p>
            </div>
          </Link>
        </div>

        {/* Right side - Notifications and User Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <div className="relative dropdown-container">
            <motion.button
              onClick={toggleNotificationDropdown}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 relative"
              aria-label="Notifications"
              variants={buttonHoverVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {isNotificationDropdownOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="p-8 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                        <p className="text-sm">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">No notifications</p>
                        <p className="text-xs mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notification, index) => {
                        const IconComponent = notification.icon;
                        return (
                          <motion.div
                            key={notification.id}
                            className={`relative p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group ${notification.type === 'property_approval' ? 'bg-orange-50 hover:bg-orange-100' : ''
                              }`}
                            whileHover={{ backgroundColor: notification.type === 'property_approval' ? '#fed7aa' : '#f9fafb' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.2 }}
                          >
                            <div
                              className="flex items-start space-x-3 pr-8"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className={`p-2 rounded-lg ${notification.type === 'property_approval'
                                ? 'bg-orange-200 text-orange-700'
                                : 'bg-blue-100 text-blue-600'
                                }`}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-700 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                                  {notification.time}
                                </p>
                              </div>
                              {notification.type === 'property_approval' && (
                                <div className="flex-shrink-0">
                                  <AlertCircle className="w-4 h-4 text-orange-600" />
                                </div>
                              )}
                            </div>
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id || notification.id, notification.isSystemGenerated);
                              }}
                              className="absolute top-3 right-3 p-1 rounded-full hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                              title="Dismiss notification"
                            >
                              <XCircle className="w-4 h-4 text-gray-400 hover:text-red-600" />
                            </button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          setIsNotificationDropdownOpen(false);
                          navigate('/admin-properties');
                        }}
                        className="w-full text-sm text-red-600 hover:text-red-700 font-medium py-2 hover:bg-red-50 rounded-md transition-colors"
                      >
                        View all pending approvals →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative dropdown-container">
            <motion.button
              onClick={toggleProfileDropdown}
              className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
              aria-label="User menu"
              variants={buttonHoverVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <motion.div
                className="w-7 h-7 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </motion.div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.name || 'Admin'}
              </span>
            </motion.button>

            {/* User Dropdown */}
            <AnimatePresence>
              {isProfileDropdownOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="py-2">
                    <motion.div
                      whileHover={{ backgroundColor: "#f3f4f6" }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        to="/admin-settings"
                        className="block px-4 py-2 text-sm text-gray-700 flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                    </motion.div>
                    <motion.div
                      whileHover={{ backgroundColor: "#f3f4f6" }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar; 