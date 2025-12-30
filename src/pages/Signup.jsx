import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle, Shield, X, Check } from "lucide-react";
import apiClient from "../utils/apiClient";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

const API_URL = 'http://localhost:4002/api/user';

// Password strength interface
const PasswordStrength = {
  score: 0,
  label: '',
  color: '',
  barColor: ''
};

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(PasswordStrength);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [completedFields, setCompletedFields] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailInfo, setEmailInfo] = useState(null);
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

      script.onload = () => {
        if (window.google) {
          try {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleSignIn,
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            window.google.accounts.id.renderButton(
              document.getElementById('google-signin-button'),
              {
                theme: 'outline',
                size: 'large',
                text: 'signup_with',
                shape: 'rectangular',
                width: '100%',
              }
            );
          } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
          }
        }
      };

      script.onerror = () => {
        console.error('Failed to load Google Sign-In script');
      };
    };

    loadGoogleScript();
  }, []);

  const handleGoogleSignIn = async (response) => {
    try {
      setGoogleLoading(true);
      setError(null);
      setSuccess(null);

      const result = await apiClient.post(`/user/google-signin`, {
        credential: response.credential,
        role: 1, // Set role as seeker for regular signup
      });

      // Store user data and token
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      // Dispatch login event to update navbar
      window.dispatchEvent(new Event('lyvo-login'));

      // Role-based redirect for seeker
      const user = result.data.user;
      if (user.isNewUser && !user.hasCompletedBehaviorQuestions) {
        navigate('/seeker-onboarding');
      } else {
        navigate('/seeker-dashboard');
      }

    } catch (err) {
      if (err.response?.data?.errorCode === 'ROLE_CONFLICT') {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Password validation rules
  const passwordValidation = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[@$!%*?&]/.test(formData.password)
  };

  const calculatePasswordStrength = (password) => {
    if (!password) {
      return {
        score: 0,
        label: '',
        color: 'text-gray-400',
        barColor: 'bg-gray-200'
      };
    }

    let score = 0;
    let feedback = '';

    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[@$!%*?&]/.test(password)) score += 20;

    // Additional complexity
    if (password.length > 8 && /[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10;
    if (password.length > 8 && /\d/.test(password) && /[@$!%*?&]/.test(password)) score += 10;

    // Cap at 100
    score = Math.min(score, 100);

    // Determine strength level and colors
    let label = '';
    let color = '';
    let barColor = '';

    if (score < 20) {
      label = 'weak';
      color = 'text-orange-500';
      barColor = 'bg-orange-500';
    } else if (score < 40) {
      label = 'weak';
      color = 'text-orange-500';
      barColor = 'bg-orange-500';
    } else if (score < 60) {
      label = 'medium';
      color = 'text-yellow-500';
      barColor = 'bg-gradient-to-r from-orange-500 to-yellow-500';
    } else if (score < 80) {
      label = 'good';
      color = 'text-yellow-500';
      barColor = 'bg-gradient-to-r from-orange-500 to-yellow-500';
    } else {
      label = 'strong';
      color = 'text-green-500';
      barColor = 'bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 to-green-500';
    }

    // Generate feedback
    if (score < 20) {
      feedback = 'This password is not acceptable. Add another word or two.';
    } else if (score < 40) {
      feedback = 'Weak password. Try adding numbers and special characters.';
    } else if (score < 60) {
      feedback = 'Fair password. Add more variety to make it stronger.';
    } else if (score < 80) {
      feedback = 'Good password. Almost there!';
    } else {
      feedback = 'Excellent! Your password is strong.';
    }

    setPasswordFeedback(feedback);

    return {
      score,
      label,
      color,
      barColor
    };
  };

  // Minimize password validation card if all requirements are met
  const allPasswordValid = Object.values(passwordValidation).every(Boolean);

  // Calculate password strength when password changes
  useEffect(() => {
    const strength = calculatePasswordStrength(formData.password);
    setPasswordStrength(strength);
  }, [formData.password]);

  // Auto-minimize when all requirements are met
  useEffect(() => {
    if (allPasswordValid && showPasswordValidation) {
      const timer = setTimeout(() => {
        setShowPasswordValidation(false);
      }, 1000); // Auto-minimize after 1 second
      return () => clearTimeout(timer);
    }
  }, [allPasswordValid, showPasswordValidation]);

  const validateFullName = (name) => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters long';
    }
    if (name.trim().length > 50) {
      return 'Full name must be less than 50 characters';
    }
    return undefined;
  };

  const validateEmail = (email) => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[@$!%*?&]/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  // Check if a field can be accessed (previous field must be completed and valid)
  const canAccessField = (fieldName) => {
    const fieldOrder = ['name', 'email', 'password', 'confirmPassword'];
    const currentIndex = fieldOrder.indexOf(fieldName);

    if (currentIndex === 0) return true; // First field is always accessible

    // Check if previous field is completed
    const previousField = fieldOrder[currentIndex - 1];
    const isPreviousFieldCompleted = completedFields[previousField];

    // Special case for password field - email must be completed AND either:
    // 1. Email doesn't exist in DB, OR
    // 2. Email exists but user is not verified (unverified users can re-register)
    if (fieldName === 'password') {
      // Always allow if email field is completed and no blocking conditions
      const isEmailCompleted = completedFields.email;
      const isEmailBlocked = emailExists && emailInfo && emailInfo.isVerified;

      return isEmailCompleted && !isEmailBlocked;
    }

    return isPreviousFieldCompleted;
  };

  // Check if all fields are completed and valid
  const isFormReady = () => {
    // Allow form submission if email exists but user is not verified (unverified users can re-register)
    return completedFields.name && completedFields.email && completedFields.password && completedFields.confirmPassword;
  };

  // Check if email exists in database
  const checkEmailExists = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailExists(false);
      setEmailInfo(null);
      return;
    }

    try {
      setEmailChecking(true);
      console.log('Checking email:', email);

      const response = await apiClient.get(`/user/check-email`, {
        params: { email }
      });
      const data = response.data;

      console.log('Email check response:', data);

      if (response.status === 200) {
        if (data.exists === true) {
          // User exists and is verified - show error
          setEmailExists(true);
          setEmailInfo({
            isVerified: true,
            note: 'This email is already registered. Please use a different email or try logging in.'
          });
          setErrors(prev => ({ ...prev, email: 'Email already registered. Please use a different email.' }));
          setCompletedFields(prev => ({ ...prev, email: false }));
        } else if (data.isUnverified === true) {
          // User exists but not verified - allow registration
          setEmailExists(true);
          setEmailInfo({
            isUnverified: true,
            note: 'This email was previously registered but not verified. You can register again.'
          });
          setErrors(prev => ({ ...prev, email: '' }));
          // Allow unverified users to proceed regardless of email format
          setCompletedFields(prev => ({ ...prev, email: true }));
        } else {
          // Email is completely new and available
          setEmailExists(false);
          setEmailInfo(null);
          setErrors(prev => ({ ...prev, email: '' }));
          // Re-validate email format
          const emailError = validateEmail(email);
          setCompletedFields(prev => ({ ...prev, email: !emailError }));
        }
      } else {
        console.error('Email check failed:', data);
        setEmailExists(false);
        setEmailInfo(null);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(false);
      setEmailInfo(null);
    } finally {
      setEmailChecking(false);
    }
  };

  // Debounced email check - runs as user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email && formData.email.includes('@') && formData.email.includes('.')) {
        checkEmailExists(formData.email);
      } else if (formData.email && !formData.email.includes('@')) {
        // Reset email exists state if email format is invalid
        setEmailExists(false);
        setErrors(prev => ({ ...prev, email: '' }));
        setCompletedFields(prev => ({ ...prev, email: false }));
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    let error;

    switch (field) {
      case 'name':
        error = validateFullName(formData.name);
        break;
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'password':
        error = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword, formData.password);
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));

    // Mark field as completed if no error
    setCompletedFields(prev => ({ ...prev, [field]: !error }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });

    // Clear error when user starts typing
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }));
    }

    // Show password validation when user starts typing password
    if (id === 'password' && value && !showPasswordValidation) {
      setShowPasswordValidation(true);
    }

    // Real-time validation and completion status
    let currentError = '';
    switch (id) {
      case 'name':
        currentError = validateFullName(value);
        break;
      case 'email':
        currentError = validateEmail(value);
        break;
      case 'password':
        currentError = validatePassword(value);
        break;
      case 'confirmPassword':
        currentError = validateConfirmPassword(value, formData.password);
        break;
    }

    // Update errors and completion status
    setErrors(prev => ({ ...prev, [id]: currentError || '' }));
    setCompletedFields(prev => ({ ...prev, [id]: !currentError }));

    // If password changes, also re-validate confirm password if it's been touched
    if (id === 'password' && touched.confirmPassword) {
      const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: confirmPasswordError || '' }));
      setCompletedFields(prev => ({ ...prev, confirmPassword: !confirmPasswordError }));
    }
  };


  const handleSignup = async (e) => {
    e.preventDefault();

    // Validate all fields
    const nameError = validateFullName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);

    setErrors({
      name: nameError || '',
      email: emailError || '',
      password: passwordError || '',
      confirmPassword: confirmPasswordError || ''
    });

    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    // Check if there are any errors
    if (nameError || emailError || passwordError || confirmPasswordError) {
      setError("Please fix the errors above before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Firebase Signup
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Update Profile (Name)
      await updateProfile(user, {
        displayName: formData.name
      });

      // Send Verification Email
      await sendEmailVerification(user);

      // Sync with MongoDB Immediately
      const idToken = await user.getIdToken(true);
      await apiClient.post(`/user/auth/firebase`, {
        name: formData.name
      }, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      // Show success message
      setSuccess("Account created successfully! Please check your email to verify your account.");

      // Clear form data
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setPasswordStrength(PasswordStrength);
      setPasswordFeedback('');
      setShowPasswordValidation(false);
      setErrors({ name: '', email: '', password: '', confirmPassword: '' });
      setTouched({ name: false, email: false, password: false, confirmPassword: false });
      setCompletedFields({ name: false, email: false, password: false, confirmPassword: false });
      setEmailChecking(false);
      setEmailExists(false);

    } catch (err) {
      console.error('Signup Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
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
              Join <span className="text-red-600">Lyvo</span><span className="text-black">+</span> as a Room Seeker
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Find your perfect co-living space and connect with roommates
            </p>


          </div>

          {/* Error and Success Messages */}
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

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5" />
                <div className="text-sm">
                  <div className="font-medium">{success}</div>
                  <div className="text-xs mt-1">
                    Please check your email and click the verification link to complete your registration.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <div id="google-signin-button" className="w-full"></div>
            {googleLoading && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                  Signing in with Google...
                </div>
              </div>
            )}
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your-google-client-id' && (
              <div className="mt-3 text-center">
                <div className="text-xs text-gray-500">
                  Google Sign-In not configured. Please set up your Google OAuth credentials.
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
          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name {completedFields.name && <CheckCircle className="inline w-4 h-4 text-green-500 ml-1" />}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="name"
                  type="text"
                  required
                  disabled={!canAccessField('name')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${!canAccessField('name')
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : touched.name && errors.name
                      ? 'border-red-300 bg-red-50'
                      : completedFields.name
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                />
              </div>
              {touched.name && errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  {errors.name}
                </motion.p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email {completedFields.email && !emailExists && <CheckCircle className="inline w-4 h-4 text-green-500 ml-1" />}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  required
                  disabled={!canAccessField('email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${!canAccessField('email')
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : formData.email && (errors.email || emailExists)
                      ? 'border-red-300 bg-red-50'
                      : formData.email && completedFields.email && !emailExists
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                />
                {emailChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  </div>
                )}
              </div>
              {(formData.email && (errors.email || (emailExists && emailInfo && emailInfo.isVerified))) && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  {emailExists && emailInfo && emailInfo.isVerified ? 'Email already registered. Please use a different email.' : errors.email}
                </motion.p>
              )}
              {formData.email && !errors.email && !emailExists && completedFields.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-green-600 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Email is available
                </motion.p>
              )}
              {formData.email && !errors.email && emailInfo && emailInfo.isUnverified && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-blue-600 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  {emailInfo.note || 'This email was previously registered but not verified. You can register again.'}
                </motion.p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password {completedFields.password && <CheckCircle className="inline w-4 h-4 text-green-500 ml-1" />}
                {!canAccessField('password') && emailExists && emailInfo && emailInfo.isVerified && (
                  <span className="text-xs text-red-500 ml-2">(Email already registered - use different email)</span>
                )}
                {!canAccessField('password') && emailExists && emailInfo && emailInfo.isUnverified && (
                  <span className="text-xs text-blue-500 ml-2">(Complete email validation first)</span>
                )}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={!canAccessField('password')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${!canAccessField('password')
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : touched.password && errors.password
                      ? 'border-red-300 bg-red-50'
                      : completedFields.password
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!canAccessField('password')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {formData.password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-3"
                >
                  {/* Strength Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">Password strength</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${passwordStrength.barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordStrength.score}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Password Feedback */}
                  {passwordFeedback && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-xs ${passwordStrength.color}`}
                    >
                      {passwordFeedback}
                    </motion.p>
                  )}

                  {/* Password Requirements */}
                  <AnimatePresence>
                    {showPasswordValidation && !allPasswordValid && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-medium text-gray-700">Password requirements</span>
                        </div>
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 text-xs ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            {passwordValidation.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>At least 8 characters</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${passwordValidation.uppercase ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            {passwordValidation.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>One uppercase letter</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${passwordValidation.lowercase ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            {passwordValidation.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>One lowercase letter</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${passwordValidation.number ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            {passwordValidation.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>One number</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${passwordValidation.special ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            {passwordValidation.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>One special character (@$!%*?&)</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {touched.password && errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  {errors.password}
                </motion.p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password {completedFields.confirmPassword && <CheckCircle className="inline w-4 h-4 text-green-500 ml-1" />}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  disabled={!canAccessField('confirmPassword')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${!canAccessField('confirmPassword')
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : touched.confirmPassword && errors.confirmPassword
                      ? 'border-red-300 bg-red-50'
                      : touched.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.password
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={!canAccessField('confirmPassword')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  {errors.confirmPassword}
                </motion.p>
              )}
              {touched.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.password && !errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-green-600 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Passwords match
                </motion.p>
              )}
            </div>

            {/* Create Account Button */}
            <motion.button
              whileHover={isFormReady() ? { scale: 1.02 } : {}}
              whileTap={isFormReady() ? { scale: 0.98 } : {}}
              type="submit"
              disabled={loading || !isFormReady()}
              className={`w-full py-3 px-4 rounded-lg font-semibold shadow-sm transition-all duration-200 ${isFormReady()
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Creating account..." : !isFormReady() ? "Complete all fields to continue" : "Create account"}
            </motion.button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-red-600 hover:text-red-700 underline"
              >
                Sign in
              </Link>
            </p>

            {/* Owner Signup Link */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Are you a property owner?</p>
              <Link
                to="/room-owner-signup"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                <Shield className="w-4 h-4 mr-1" />
                Sign up as Property Owner
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup; 