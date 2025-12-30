import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle, X } from "lucide-react";
import apiClient from "../utils/apiClient";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";

// Password strength interface
const PasswordStrength = {
  score: 0,
  label: '',
  color: '',
  barColor: ''
};

const RoomOwnerSignup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      setSuccess(null);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Get ID Token
      const idToken = await user.getIdToken();

      // Exchange with backend - specifying ROLE 3 (Owner)
      const backendResponse = await apiClient.post('/user/auth/firebase', {
        role: 3
      }, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      // Store user data and token
      localStorage.setItem('authToken', backendResponse.data.token);
      localStorage.setItem('user', JSON.stringify(backendResponse.data.user));

      // Dispatch login event
      window.dispatchEvent(new Event('lyvo-login'));

      // Navigate to owner dashboard
      navigate('/owner-dashboard');

    } catch (err) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else {
        setError(err.message || 'Google sign-in failed');
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
      return { score: 0, label: '', color: 'text-gray-400', barColor: 'bg-gray-200' };
    }

    let score = 0;
    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    // Character variety
    if (/[a-z]/.test(password)) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[@$!%*?&]/.test(password)) score += 20;
    // Complexity
    if (password.length > 8 && /[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10;
    if (password.length > 8 && /\d/.test(password) && /[@$!%*?&]/.test(password)) score += 10;

    score = Math.min(score, 100);

    let label = '', color = '', barColor = '';
    if (score < 40) { label = 'weak'; color = 'text-orange-500'; barColor = 'bg-orange-500'; }
    else if (score < 80) { label = 'good'; color = 'text-yellow-500'; barColor = 'bg-yellow-500'; }
    else { label = 'strong'; color = 'text-green-500'; barColor = 'bg-green-500'; }

    let feedback = '';
    if (score < 40) feedback = 'Weak password.';
    else if (score < 80) feedback = 'Good password.';
    else feedback = 'Strong password!';

    setPasswordFeedback(feedback);
    return { score, label, color, barColor };
  };

  const validateFullName = (name) => (!name.trim() ? 'Name required' : name.length < 2 ? 'Too short' : undefined);
  const validateEmail = (email) => (!email.trim() ? 'Email required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email' : undefined);

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[@$!%*?&]/.test(password)) return 'Password must contain at least one special character (@$!%*?&)';
    return undefined;
  };

  const validateConfirmPassword = (confirm, original) => (confirm !== original ? 'Passwords do not match' : undefined);

  // Check if a field can be accessed (previous field must be completed and valid)
  const canAccessField = (fieldName) => {
    const fieldOrder = ['name', 'email', 'password', 'confirmPassword'];
    const currentIndex = fieldOrder.indexOf(fieldName);
    if (currentIndex === 0) return true;
    const previousField = fieldOrder[currentIndex - 1];

    // Check if previous field is completed
    const isPreviousFieldCompleted = completedFields[previousField];

    // Special case for password field - email must be completed AND either:
    // 1. Email doesn't exist in DB, OR
    // 2. Email exists but user is not verified (unverified users can re-register)
    if (fieldName === 'password') {
      const isEmailCompleted = completedFields.email;
      const isEmailBlocked = emailExists && emailInfo && emailInfo.isVerified;
      return isEmailCompleted && !isEmailBlocked;
    }

    return isPreviousFieldCompleted;
  };

  const allPasswordValid = Object.values(passwordValidation).every(Boolean);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData.password]);

  useEffect(() => {
    if (allPasswordValid && showPasswordValidation) {
      const timer = setTimeout(() => setShowPasswordValidation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [allPasswordValid, showPasswordValidation]);

  // Check if email exists in database
  const checkEmailExists = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailExists(false);
      setEmailInfo(null);
      return;
    }

    try {
      setEmailChecking(true);
      const response = await apiClient.get(`/user/check-email?email=${encodeURIComponent(email)}`);
      const data = response.data;

      console.log('Email check response:', data);

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
      case 'name': error = validateFullName(formData.name); break;
      case 'email': error = validateEmail(formData.email); break;
      case 'password': error = validatePassword(formData.password); break;
      case 'confirmPassword': error = validateConfirmPassword(formData.confirmPassword, formData.password); break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    setCompletedFields(prev => ({ ...prev, [field]: !error }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'password' && value.length > 0) setShowPasswordValidation(true);

    // Clear error when user starts typing
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }));
    }

    // Real-time validation
    let currentError = '';
    switch (id) {
      case 'name': currentError = validateFullName(value); break;
      case 'email': currentError = validateEmail(value); break;
      case 'password': currentError = validatePassword(value); break;
      case 'confirmPassword': currentError = validateConfirmPassword(value, formData.password); break;
    }
    setErrors(prev => ({ ...prev, [id]: currentError || '' }));
    setCompletedFields(prev => ({ ...prev, [id]: !currentError }));

    if (id === 'password' && touched.confirmPassword) {
      const confirmError = validateConfirmPassword(formData.confirmPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError || '' }));
    }
  };

  const isFormValid = () => {
    return completedFields.name && completedFields.email && completedFields.password && completedFields.confirmPassword && !errors.name && !errors.email && !errors.password && !errors.confirmPassword && !emailChecking && (!emailExists || (emailInfo && emailInfo.isUnverified));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    // Touch all fields to show errors
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    // Validate all fields manually
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

    if (nameError || emailError || passwordError || confirmPasswordError || (emailExists && emailInfo?.isVerified)) {
      setError("Please fix the highlighted errors before submitting.");
      return;
    }

    if (emailChecking) {
      setError("Please wait, checking email availability...");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create User in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Profile
      await updateProfile(user, { displayName: formData.name });

      // 3. Send Verification Email
      await sendEmailVerification(user);

      // 4. Sync with Backend (Create User in MongoDB with Role 3 - OWNER)
      const idToken = await user.getIdToken();
      await apiClient.post('/user/auth/firebase', {
        role: 3 // CRITICAL: Ensure they are marked as Property Owner
      }, {
        headers: { Authorization: `Bearer ${idToken}` }
      });

      // 5. Sign Out (Don't auto-login until verified)
      await signOut(auth);

      setSuccess("Account created successfully!");
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setEmailExists(false);
      setEmailInfo(null);
      setCompletedFields({ name: false, email: false, password: false, confirmPassword: false });
      setTouched({ name: false, email: false, password: false, confirmPassword: false });

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email is already registered. Please log in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak.");
      } else {
        setError(err.message || 'Signup failed.');
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
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-3 group">
                <span className="text-2xl font-bold text-gray-900"><span className="text-red-600">Lyvo</span><span className="text-black">+</span></span>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-3 relative">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Join <span className="text-red-600">Lyvo</span><span className="text-black">+</span> as a
              </span>
              <br />
              <span className="text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent drop-shadow-sm">
                PROPERTY OWNER
              </span>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              List your properties and connect with room seekers
            </p>
          </div>

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
                    Please check your email and click the verification link.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all font-medium"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>Sign up with Google</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

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
                Password
                {emailExists && emailInfo && emailInfo.isVerified && (
                  <span className="text-xs text-red-500 ml-2">(Email already registered - use different email)</span>
                )}
                {emailExists && emailInfo && emailInfo.isUnverified && (
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

              {/* Strength Meter */}
              {showPasswordValidation && (
                <div className="mt-2">
                  <div className="flex h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.barColor}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className={`${passwordStrength.color} font-medium`}>{passwordFeedback}</span>
                  </div>
                  {/* Validation Requirements */}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                    <div className={passwordValidation.length ? 'text-green-600' : ''}>• 8+ characters</div>
                    <div className={passwordValidation.uppercase ? 'text-green-600' : ''}>• Uppercase</div>
                    <div className={passwordValidation.lowercase ? 'text-green-600' : ''}>• Lowercase</div>
                    <div className={passwordValidation.number ? 'text-green-600' : ''}>• Number</div>
                    <div className={passwordValidation.special ? 'text-green-600' : ''}>• Special char</div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={!canAccessField('confirmPassword')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${!canAccessField('confirmPassword')
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : touched.confirmPassword && errors.confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : completedFields.confirmPassword
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                    }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur('confirmPassword')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all transform hover:scale-[1.02] ${loading ? 'opacity-70 cursor-not-allowed' : ''
                } ${isFormValid()
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  : 'bg-gray-400 cursor-pointer hover:bg-gray-500' // Make it look clickable but greyish if invalid, or just let them click it.
                }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Create Owner Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-red-600 hover:text-red-500 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RoomOwnerSignup;