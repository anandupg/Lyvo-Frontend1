import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Heart,
  Calendar,
  MessageCircle,
  User,
  Settings,
  LogOut
} from 'lucide-react';

const SeekerFooter = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    'Quick Links': [
      { name: 'Dashboard', href: '/seeker-dashboard', icon: Home },
      { name: 'Favorites', href: '/seeker-favorites', icon: Heart },
      { name: 'Bookings', href: '/seeker-bookings', icon: Calendar },
    ],
    'Account': [
      { name: 'Profile', href: '/seeker-profile', icon: User },
      { name: 'Settings', href: '/seeker-settings', icon: Settings },
    ]
  };

  const socialLinks = [
    { name: 'Facebook', href: '#', icon: '📘' },
    { name: 'Twitter', href: '#', icon: '🐦' },
    { name: 'Instagram', href: '#', icon: '📷' },
    { name: 'LinkedIn', href: '#', icon: '💼' }
  ];

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src="/Lyvo_no_bg.png"
                    alt="Lyvo Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-red-600">Lyvo</span>
                    <span className="text-xl font-bold text-gray-800">+</span>
                  </div>
                  <p className="text-sm text-gray-600">Seeker Portal</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Find your perfect PG, hostel, and co-living space with India's #1 platform.
                Verified properties, secure payments, and instant booking.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-sm">{social.icon}</span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <div key={category} className="space-y-4">
              <motion.h4
                className="text-lg font-semibold text-gray-800"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                {category}
              </motion.h4>
              <ul className="space-y-2">
                {links.map((link, linkIndex) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: categoryIndex * 0.1 + linkIndex * 0.05,
                      duration: 0.6
                    }}
                    viewport={{ once: true }}
                  >
                    <Link
                      to={link.href}
                      className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-200 group"
                    >
                      {link.icon && (
                        <link.icon className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors duration-200" />
                      )}
                      <span className="text-sm">{link.name}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>


      </div>

      {/* Mobile Quick Actions */}
      <div className="lg:hidden bg-gray-50 border-t border-gray-200">
        <div className="px-4 py-3">
          <div className="flex justify-around">
            <Link
              to="/seeker-dashboard"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-red-600 transition-colors duration-200"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </Link>
            <Link
              to="/seeker-favorites"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-red-600 transition-colors duration-200"
            >
              <Heart className="w-5 h-5" />
              <span className="text-xs">Favorites</span>
            </Link>
            <Link
              to="/seeker-bookings"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-red-600 transition-colors duration-200"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Bookings</span>
            </Link>
            <Link
              to="/seeker-profile"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-red-600 transition-colors duration-200"
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SeekerFooter;
