import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import apiClient from '../../utils/apiClient';

const AddAdmin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // null, true, or false


  // Check if email already exists (real-time)
  const checkEmailExists = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailExists(null);
      return;
    }

    setEmailCheckLoading(true);
    try {
      const response = await apiClient.get(`/user/check-email?email=${encodeURIComponent(email.toLowerCase().trim())}`);
      const data = response.data;

      if (response.status === 200) {
        setEmailExists(data.exists ? data : null);
      } else {
        setEmailExists(null);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(null);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  // Debounce email check
  useEffect(() => {
    if (formData.email && touchedFields.email) {
      const timeoutId = setTimeout(() => {
        checkEmailExists(formData.email);
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setEmailExists(null);
    }
  }, [formData.email, touchedFields.email]);

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Name must not exceed 50 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (emailExists && emailExists.exists) {
      // Email already exists
      const roleType = emailExists.role === 1 ? 'Seeker' : emailExists.role === 3 ? 'Owner' : 'Admin';
      errors.email = `This email is already registered as a ${roleType}`;
    } else if (formData.email.trim().length > 100) {
      errors.email = 'Email must not exceed 100 characters';
    }

    // Password validation - Enhanced
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordErrors = [];

      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }

      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('one uppercase letter');
      }

      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('one lowercase letter');
      }

      if (!/[0-9]/.test(formData.password)) {
        passwordErrors.push('one number');
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        passwordErrors.push('one special character (!@#$%^&*...)');
      }

      if (passwordErrors.length > 0) {
        errors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time password strength checker
  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  // Handle input change with real-time validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation
    if (name === 'password') {
      checkPasswordStrength(value);
    }

    // Validate on change if field has been touched
    if (touchedFields[name]) {
      validateFieldRealtime(name, value);
    }
  };

  // Handle field blur (when user leaves field)
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({
      ...prev,
      [name]: true
    }));
    validateFieldRealtime(name, formData[name]);
  };

  // Real-time field validation
  const validateFieldRealtime = (fieldName, value) => {
    const errors = { ...validationErrors };

    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          errors.name = 'Name is required';
        } else if (value.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          errors.name = 'Name must not exceed 50 characters';
        } else {
          delete errors.name;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else if (value.trim().length > 100) {
          errors.email = 'Email must not exceed 100 characters';
        } else {
          delete errors.email;
        }
        break;

      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (!passwordStrength.length || !passwordStrength.uppercase ||
          !passwordStrength.lowercase || !passwordStrength.number ||
          !passwordStrength.special) {
          // Error message is shown via password strength indicators
          errors.password = '';
        } else {
          delete errors.password;
        }
        break;

      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm password';
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post('/admin/create-admin', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 2 // Admin role
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data.message || 'Failed to create admin');
      }

      setSuccess(`Admin account created successfully! Login credentials have been sent to ${formData.email}`);

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/admin-dashboard');
      }, 3000);

    } catch (err) {
      console.error('Error creating admin:', err);
      setError(err.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Admin</h1>
              <p className="text-gray-600 mt-1">Create a new administrator account</p>
            </div>
          </div>
        </motion.div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">{success}</p>
              <p className="text-green-700 text-sm mt-1">📧 Email notification sent with login credentials.</p>
              <p className="text-green-700 text-sm">Redirecting to dashboard...</p>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium">{error}</p>
          </motion.div>
        )}

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Admin Info Notice */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-1">Administrator Privileges</p>
                  <p>This account will have full access to the admin panel including user management, property approvals, and system settings.</p>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${validationErrors.name ? 'border-red-500' : touchedFields.name && !validationErrors.name && formData.name ? 'border-green-500' : 'border-gray-200'
                    }`}
                  placeholder="Enter admin's full name"
                  disabled={loading}
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${emailExists && emailExists.exists ? 'border-red-500' :
                        validationErrors.email ? 'border-red-500' :
                          touchedFields.email && !validationErrors.email && formData.email && !emailCheckLoading && !emailExists ? 'border-green-500' :
                            'border-gray-200'
                      }`}
                    placeholder="admin@example.com"
                    disabled={loading}
                  />
                  {/* Loading spinner while checking email */}
                  {emailCheckLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {/* Success checkmark when email is available */}
                  {!emailCheckLoading && touchedFields.email && formData.email && !validationErrors.email && !emailExists && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  {/* Error icon when email exists */}
                  {!emailCheckLoading && emailExists && emailExists.exists && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                {/* Email exists error */}
                {emailExists && emailExists.exists && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {`This email is already registered as a ${emailExists.role === 1 ? 'Seeker' : emailExists.role === 3 ? 'Owner' : 'Admin'}`}
                  </p>
                )}
                {/* Other validation errors */}
                {validationErrors.email && !emailExists && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.email}
                  </p>
                )}
                {/* Email available message */}
                {!emailCheckLoading && touchedFields.email && formData.email && !validationErrors.email && !emailExists && (
                  <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Email is available!
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${validationErrors.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="Enter secure password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.password && validationErrors.password !== '' && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.password}
                  </p>
                )}
                {/* Real-time Password Strength Indicators */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Password requirements:</p>
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-xs transition-all ${passwordStrength.length ? 'text-green-600' : 'text-gray-500'
                        }`}>
                        {passwordStrength.length ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        )}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-all ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-500'
                        }`}>
                        {passwordStrength.uppercase ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        )}
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-all ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-500'
                        }`}>
                        {passwordStrength.lowercase ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        )}
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-all ${passwordStrength.number ? 'text-green-600' : 'text-gray-500'
                        }`}>
                        {passwordStrength.number ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        )}
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-all ${passwordStrength.special ? 'text-green-600' : 'text-gray-500'
                        }`}>
                        {passwordStrength.special ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        )}
                        <span>One special character (!@#$%^&*...)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${validationErrors.confirmPassword ? 'border-red-500' : touchedFields.confirmPassword && !validationErrors.confirmPassword && formData.confirmPassword ? 'border-green-500' : 'border-gray-200'
                      }`}
                    placeholder="Re-enter password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
                {touchedFields.confirmPassword && !validationErrors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Passwords match!
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin-dashboard')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || emailCheckLoading || (emailExists && emailExists.exists)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Admin Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Security Reminder</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Share admin credentials securely</li>
                  <li>Use strong, unique passwords</li>
                  <li>Only create admin accounts for trusted personnel</li>
                  <li>Admin accounts have unrestricted system access</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AddAdmin;

