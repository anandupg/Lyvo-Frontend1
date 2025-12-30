import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, AlertCircle, LogIn } from "lucide-react";
import apiClient from "../utils/apiClient";

const API_URL = 'http://localhost:4002/api/user';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      if (!token) {
        // No token - show error modal
        setVerificationStatus('error');
        setErrorMessage('No verification token provided. Please check your email link.');
        setShowModal(true);
        return;
      }

      try {
        console.log('Verifying email with token:', token);
        const response = await apiClient.get(`/user/verify-email/${token}`, {
          timeout: 10000 // 10 second timeout
        });

        console.log('Verification response:', response);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        // Check if verification is successful
        if (response.data && response.data.message && response.data.message.includes('verified successfully')) {
          setVerificationStatus('success');
          setMessage(response.data.message);
          setShowModal(true);
        } else {
          // Verification failed - show error modal
          setVerificationStatus('error');
          setErrorMessage(response.data?.message || 'Email verification failed. The link may be invalid or expired.');
          setShowModal(true);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('error');
        setErrorMessage(error.response?.data?.message || 'Email verification failed. Please try again.');
        setShowModal(true);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleCloseModal = () => {
    setShowModal(false);
    navigate('/login');
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-stone-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Loading State */}
      {verificationStatus === 'verifying' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg mb-6"
            >
              <span className="text-2xl">🏠</span>
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-900 font-display">
              Verifying Email...
            </h2>
            <p className="mt-2 text-gray-600">
              Please wait while we verify your email address
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-blue-200"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="mb-6"
              >
                <div className="w-12 h-12 animate-spin text-red-500 mx-auto border-4 border-red-200 border-t-red-500 rounded-full"></div>
              </motion.div>

              <h3 className="text-xl font-bold text-gray-900 mb-4 font-display">
                Processing Verification
              </h3>

              <p className="text-sm text-blue-700 mb-6">
                We're verifying your email address...
              </p>

              <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
                <div className="w-4 h-4 animate-spin border-2 border-blue-200 border-t-blue-600 rounded-full"></div>
                <span>Please wait...</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Success/Error Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center">
                {verificationStatus === 'success' ? (
                  <>
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="mb-6"
                    >
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-4 font-display">
                      🎉 Email Verified Successfully!
                    </h3>

                    <p className="text-gray-700 mb-6">
                      {message}
                    </p>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-green-700 font-medium">
                        ✅ Your email has been verified! You can now log in to your account.
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCloseModal}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-semibold shadow-sm hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      Go to Login
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="mb-6"
                    >
                      <AlertCircle className="w-16 h-16 text-blue-500 mx-auto" />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-4 font-display">
                      🔐 Login Using Your Account
                    </h3>

                    <p className="text-gray-700 mb-6">
                      Your account may already be verified or the verification link has expired.
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-700 font-medium">
                        💡 Try logging in with your email and password. If you don't have an account, you can sign up.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCloseModal}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-4 rounded-lg font-semibold shadow-sm hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-5 h-5" />
                        Go to Login
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/signup')}
                        className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200"
                      >
                        Try Signing Up Again
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerifyEmail; 