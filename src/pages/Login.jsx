import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import apiClient from "../utils/apiClient";
import { getUserFromStorage, getAuthToken, getUserRole, getRedirectUrl } from "../utils/authUtils";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const API_URL = 'http://localhost:4002/api/user';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize Google Sign-In
  useEffect(() => {
    const loadGoogleScript = () => {
      // Check if Google Client ID is configured
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your-google-client-id') {
        console.warn('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      const renderGoogleButton = () => {
        if (window.google && document.getElementById('google-signin-button')) {
          // Calculate width - max 380px, but responsive for mobile
          const containerWidth = document.getElementById('google-btn-container')?.offsetWidth || 380;
          const buttonWidth = Math.min(containerWidth, 380);

          try {
            window.google.accounts.id.renderButton(
              document.getElementById('google-signin-button'),
              {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: buttonWidth.toString(),
              }
            );
          } catch (e) {
            console.error('Google button render error:', e);
          }
        }
      };

      script.onload = () => {
        if (window.google) {
          try {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleSignIn,
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            renderGoogleButton();

            // Handle resize
            window.addEventListener('resize', renderGoogleButton);
          } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
            const googleButton = document.getElementById('google-signin-button');
            if (googleButton) googleButton.style.display = 'none';
            toast.error('Google Sign-in is temporarily unavailable.');
          }
        }
      };

      script.onerror = () => {
        console.error('Failed to load Google Sign-In script');
        const googleButton = document.getElementById('google-signin-button');
        if (googleButton) googleButton.style.display = 'none';
        toast.error('Google Sign-in is temporarily unavailable. Please use email/password login.');
      };

      // Cleanup resize listener
      return () => {
        window.removeEventListener('resize', renderGoogleButton);
      };
    };

    loadGoogleScript();
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    const user = getUserFromStorage();

    if (token && user) {
      const userRole = getUserRole(user);

      // Role-based redirect for already logged-in users
      const redirectUrl = getRedirectUrl(user);
      navigate(redirectUrl, { replace: true });
    }
  }, [navigate]);

  const handleGoogleSignIn = async (response) => {
    try {
      setGoogleLoading(true);
      setError(null);

      // Check if response has credential
      if (!response || !response.credential) {
        throw new Error('No credential received from Google');
      }

      const result = await apiClient.post(`/user/google-signin`, {
        credential: response.credential,
        // Don't pass role for login - let backend use existing user's role
      });

      // Store user data and token
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      console.log('Login: Google sign-in successful, stored data:', {
        token: result.data.token ? 'present' : 'missing',
        user: result.data.user
      });

      // Dispatch login event to update navbar
      window.dispatchEvent(new Event('lyvo-login'));

      // After login, check if user needs behavioral questions first
      const u = result.data.user || {};

      // DEBUG: Log user data for troubleshooting
      console.log('Login: User data after Google sign-in:', {
        role: u.role,
        roleType: typeof u.role,
        isNewUser: u.isNewUser,
        hasCompletedBehaviorQuestions: u.hasCompletedBehaviorQuestions,
        email: u.email,
        name: u.name
      });

      // Check if user is new and hasn't completed behavioral questions
      // ONLY for seekers (role 1) - admins and owners go directly to their dashboards
      if (u.role === 1 && u.isNewUser && !u.hasCompletedBehaviorQuestions) {
        console.log('Login: Redirecting seeker to onboarding for behavioral questions');
        navigate('/onboarding');
        return;
      }

      // Then check if seeker needs profile completion
      const needsCompletion = u && u.role === 1 && (!u.phone || !u.location || u.age === undefined || u.age === null || u.age === '' || !u.occupation || !u.gender);

      // DEBUG: Log breakdown of completion check
      if (u && u.role === 1) {
        console.log('Login (Google): Profile Completion Check:', {
          needsCompletion,
          currentUser: u,
          checks: {
            phone: !u.phone,
            location: !u.location,
            age: u.age === undefined || u.age === null || u.age === '',
            occupation: !u.occupation,
            gender: !u.gender
          }
        });
      }

      if (needsCompletion) {
        console.log('Login (Google): Redirecting to /seeker-profile due to incomplete profile');
        navigate('/seeker-profile');
        return;
      }

      // Double-check tenancy if not detected and user is a seeker (fix for redirection delay)
      if (u && u.role === 1 && !u.isTenant) {
        try {
          console.log('Login: Double-checking tenancy status...');
          const tenantCheck = await apiClient.get('/property/user/tenant-status');
          if (tenantCheck.data.success && tenantCheck.data.isTenant) {
            console.log('Login: Tenancy found on double-check. Updating user session.');
            u.isTenant = true;

            // Update localStorage with fixed user object
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            storedUser.isTenant = true;
            localStorage.setItem('user', JSON.stringify(storedUser));
          }
        } catch (e) {
          console.warn('Login: Tenancy double-check failed', e);
        }
      }

      const redirectUrl = getRedirectUrl(u);
      console.log('Login: Final redirect URL for Google sign-in user:', {
        role: u.role,
        redirectUrl: redirectUrl,
        userData: u
      });
      navigate(redirectUrl);

    } catch (err) {
      console.error('Google Sign-in Error:', err);

      // Handle specific error cases
      if (err.response?.status === 403) {
        setError('Google Sign-in is not configured for this domain. Please use email/password login.');
      } else if (err.response?.status === 400) {
        setError('Invalid Google credentials. Please try again.');
      } else if (err.message === 'No credential received from Google') {
        setError('Google Sign-in failed. Please try again.');
      } else {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      }

      // Hide Google sign-in button on persistent errors
      const googleButton = document.getElementById('google-signin-button');
      if (googleButton) {
        googleButton.style.display = 'none';
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;

      /* 
      // STRICT VERIFICATION CHECK DISABLED TO ALLOW SYNC
      if (!firebaseUser.emailVerified) {
        setError('Please verify your email address before logging in.');
        setLoading(false);
        return;
      }
      */
      // Force reload user to get latest status if possible
      await firebaseUser.reload().catch(e => console.log('Reload user failed', e));

      if (!firebaseUser.emailVerified) {
        console.warn("User email verified status is FALSE. Proceeding to backend to update status if changed.");
      }

      // 2. Get ID Token
      const idToken = await firebaseUser.getIdToken();

      // 3. Exchange for Internal JWT
      const response = await apiClient.post(`/user/auth/firebase`, {}, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      // 4. Store Internal Session
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      console.log('Login: Firebase login successful, stored data:', {
        token: response.data.token ? 'present' : 'missing',
        user: response.data.user
      });

      // Dispatch login event to update navbar
      window.dispatchEvent(new Event('lyvo-login'));

      const u = response.data.user || {};

      // Check if user is new and hasn't completed behavioral questions
      // ONLY for seekers (role 1) - admins and owners go directly to their dashboards
      if (u.role === 1 && u.isNewUser && !u.hasCompletedBehaviorQuestions) {
        navigate('/onboarding');
        return;
      }

      // Then check if seeker needs profile completion
      const needsCompletion = u && u.role === 1 && (!u.phone || !u.location || u.age === undefined || u.age === null || u.age === '' || !u.occupation || !u.gender);

      // DEBUG: Log breakdown of completion check
      if (u && u.role === 1) {
        console.log('Login (Email): Profile Completion Check:', {
          needsCompletion,
          currentUser: u,
          checks: {
            phone: !u.phone,
            location: !u.location,
            age: u.age === undefined || u.age === null || u.age === '',
            occupation: !u.occupation,
            gender: !u.gender
          }
        });
      }

      if (needsCompletion) {
        console.log('Login (Email): Redirecting to /seeker-profile due to incomplete profile');
        navigate('/seeker-profile');
        return;
      }

      // Double-check tenancy if not detected and user is a seeker (fix for redirection delay)
      if (u && u.role === 1 && !u.isTenant) {
        try {
          console.log('Login: Double-checking tenancy status...');
          const tenantCheck = await apiClient.get('/property/user/tenant-status');
          if (tenantCheck.data.success && tenantCheck.data.isTenant) {
            console.log('Login: Tenancy found on double-check. Updating user session.');
            u.isTenant = true;

            // Update localStorage with fixed user object
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            storedUser.isTenant = true;
            localStorage.setItem('user', JSON.stringify(storedUser));
          }
        } catch (e) {
          console.warn('Login: Tenancy double-check failed', e);
        }
      }

      const redirectUrl = getRedirectUrl(u);
      navigate(redirectUrl);
    } catch (err) {
      console.error('Login Error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No user found with this email.');
      } else {
        setError(err.response?.data?.message || err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Lyvo+ Logo */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 overflow-hidden">
                    <img
                      src="/Lyvo_no_bg.png"
                      alt="Lyvo Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900"><span className="text-red-600">Lyvo</span><span className="text-black">+</span></span>
                  <span className="text-xs text-gray-500 font-medium">Co-Living Platform</span>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-gray-600 text-sm">
              Sign in to your account
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign-In Button */}
          <div className="mb-6 flex flex-col items-center w-full" id="google-btn-container">
            <div
              id="google-signin-button"
              className={`w-full flex justify-center ${googleLoading ? 'opacity-50 pointer-events-none' : ''}`}
            ></div>

            <AnimatePresence>
              {googleLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                  <span className="text-sm text-gray-600 font-medium">Signing in...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your-google-client-id' && (
              <div className="mt-3 text-center">
                <div className="text-xs text-gray-500">
                  Google Sign-In not configured.
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-red-600 hover:text-red-700 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Sign In Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold shadow-sm hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-red-600 hover:text-red-700 underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login; 