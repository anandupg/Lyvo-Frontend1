import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OwnerNavbar from './OwnerNavbar';
import OwnerSidebar from './OwnerSidebar';
import OwnerFooter from './OwnerFooter';
import { Toaster } from '../ui/toaster';
import NotificationListener from '../NotificationListener';
import apiClient from '../../utils/apiClient';

const OwnerLayout = ({ children, hideFooter = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGovtIdPrompt, setShowGovtIdPrompt] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Animation variants for mobile sidebar
  const sidebarVariants = {
    hidden: {
      x: '-100%',
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    exit: {
      x: '-100%',
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: "easeInOut"
      }
    }
  };

  const overlayVariants = {
    hidden: {
      opacity: 0,
      transition: {
        duration: 0.2
      }
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15
      }
    }
  };

  // Helper: decide whether to show KYC prompt
  const computeShowKycPrompt = (user) => {
    if (!user || user.role !== 3) return false;
    const hasAnyDoc = Boolean(user.govtIdFrontUrl) || Boolean(user.govtIdBackUrl);
    const isApproved = user.kycVerified === true || user.kycStatus === 'approved';
    // Show prompt only if user has no docs and not approved
    return !(hasAnyDoc || isApproved);
  };

  // Check owner KYC prompt flag with DB fetch for freshness
  useEffect(() => {
    const check = async () => {
      try {
        const userRaw = localStorage.getItem('user');
        if (!userRaw) return;
        const parsed = JSON.parse(userRaw);
        if (parsed?.role !== 3) return;
        // Default local decision first
        setShowGovtIdPrompt(computeShowKycPrompt(parsed));
        // Try to refresh from API
        const token = localStorage.getItem('authToken');
        if (!token || !parsed?._id) return;
        const res = await apiClient.get(`/user/profile/${parsed._id}`);
        if (res.data) {
          const fresh = res.data;
          if (fresh?._id) {
            localStorage.setItem('user', JSON.stringify(fresh));
            setShowGovtIdPrompt(computeShowKycPrompt(fresh));
          }
        }
      } catch (_) { }
    };
    check();
    // Listen for user updates (e.g., after KYC upload)
    const handler = () => check();
    window.addEventListener('lyvo-user-updated', handler);
    return () => window.removeEventListener('lyvo-user-updated', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <OwnerSidebar onClose={closeSidebar} />
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Navbar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm">
          <OwnerNavbar onMenuToggle={toggleSidebar} />
        </div>

        {/* Govt ID prompt (top-right) */}
        {showGovtIdPrompt && (
          <div className="fixed top-20 right-4 z-40 max-w-xs">
            <div className="bg-white border border-yellow-300 rounded-xl shadow-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-1">Add Govt ID</div>
              <div className="text-xs text-gray-600 mb-3">Verify your identity to boost trust. Upload any govt-approved ID.</div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => { window.location.href = '/owner-settings#kyc'; }}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                >
                  Add ID
                </button>
                <button
                  onClick={() => setShowGovtIdPrompt(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        {!hideFooter && (
          <OwnerFooter />
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-y-0 left-0 w-64 max-w-[80vw]"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <OwnerSidebar onClose={closeSidebar} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      {/* Toast notifications */}
      <Toaster />
      <NotificationListener />
    </div>
  );
};

export default OwnerLayout; 