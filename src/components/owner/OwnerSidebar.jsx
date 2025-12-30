import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Building,
  Users,
  User,
  Calendar,
  Settings,
  BarChart3,
  MessageCircle,
  LogOut,
  Plus,
  X,
  Wrench,
  DollarSign
} from 'lucide-react';

const OwnerSidebar = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('lyvo-logout'));
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/owner-dashboard', icon: Home },
    { name: 'Properties', href: '/owner-properties', icon: Building },
    { name: 'Tenants', href: '/owner-tenants', icon: Users },
    { name: 'Bookings', href: '/owner-bookings', icon: Calendar },
    { name: 'Maintenance', href: '/owner-maintenance', icon: Wrench },
    { name: 'Payments', href: '/owner-payments', icon: DollarSign },
    { name: 'Analytics', href: '/owner-analytics', icon: BarChart3 },
    { name: 'Profile Settings', href: '/owner-settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  // Animation variants for navigation items
  const navItemVariants = {
    hover: {
      x: 4,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-white border-r border-gray-200 flex flex-col shadow-xl"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
        <motion.div
          className="flex items-center space-x-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <motion.div
            className="w-8 h-8 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <img
              src="/Lyvo_no_bg.png"
              alt="Lyvo Owner"
              className="w-full h-full object-contain"
            />
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900"><span className="text-red-600">Lyvo</span><span className="text-black">+</span> Owner</h1>
            <p className="text-xs text-gray-500">Property Management</p>
          </div>
        </motion.div>
        {/* Close Button for Mobile */}
        <motion.button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
          aria-label="Close sidebar"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* User Info */}
      <motion.div
        className="flex-shrink-0 p-4 border-b border-gray-200"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Users className="w-6 h-6 text-red-600" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name || 'Property Owner'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email || 'owner@lyvo+.com'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 space-y-2">
          {/* Add Property Button */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Link
              to="/owner-add-property"
              onClick={onClose}
              className="group flex items-center px-3 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200 mb-4 shadow-sm"
            >
              <Plus className="mr-3 h-5 w-5" />
              Add Property
            </Link>
          </motion.div>

          {/* Navigation Items */}
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.25 + (index * 0.05),
                  duration: 0.3,
                  ease: "easeOut"
                }}
              >
                <motion.div
                  variants={navItemVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive(item.href)
                      ? 'text-red-700 bg-red-50 border-r-2 border-red-700'
                      : 'text-gray-700 hover:text-red-700 hover:bg-red-50'
                      }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-red-700' : 'text-gray-400 group-hover:text-red-700'
                      }`} />
                    {item.name}
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <motion.div
        className="flex-shrink-0 p-4 border-t border-gray-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <motion.button
          onClick={handleLogout}
          className="group flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-700" />
          Logout
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default OwnerSidebar; 