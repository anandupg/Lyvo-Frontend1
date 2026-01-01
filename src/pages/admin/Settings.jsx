import React, { useState } from 'react';
import { Shield, Database, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion } from 'framer-motion';
import apiClient from '../../utils/apiClient';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('security');
  const [settings, setSettings] = useState({
    enableTwoFactor: false,
  });

  // Password change states
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [touchedFields, setTouchedFields] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Validate password strength
  const validatePasswordStrength = (password) => {
    const strength = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    setPasswordStrength(strength);
    return Object.values(strength).every(Boolean);
  };

  // Real-time password validation
  const validatePasswordField = (field, value) => {
    const errors = { ...passwordErrors };

    if (field === 'oldPassword') {
      if (!value) {
        errors.oldPassword = 'Current password is required';
      } else {
        delete errors.oldPassword;
      }
    }

    if (field === 'newPassword') {
      if (!value) {
        errors.newPassword = 'New password is required';
      } else if (!validatePasswordStrength(value)) {
        errors.newPassword = 'Password does not meet all requirements';
      } else if (value === passwordData.oldPassword) {
        errors.newPassword = 'New password must be different from current password';
      } else {
        delete errors.newPassword;
      }
    }

    if (field === 'confirmPassword') {
      if (!value) {
        errors.confirmPassword = 'Please confirm your new password';
      } else if (value !== passwordData.newPassword) {
        errors.confirmPassword = 'Passwords do not match';
      } else {
        delete errors.confirmPassword;
      }
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));

    if (field === 'newPassword') {
      validatePasswordStrength(value);
    }

    if (touchedFields[field]) {
      validatePasswordField(field, value);
    }

    // Also revalidate confirm password if new password changes
    if (field === 'newPassword' && touchedFields.confirmPassword) {
      validatePasswordField('confirmPassword', passwordData.confirmPassword);
    }
  };

  const handlePasswordBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    validatePasswordField(field, passwordData[field]);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordChangeSuccess(false);
    setPasswordChangeError('');

    // Mark all fields as touched
    setTouchedFields({
      oldPassword: true,
      newPassword: true,
      confirmPassword: true
    });

    // Validate all fields
    const isOldValid = validatePasswordField('oldPassword', passwordData.oldPassword);
    const isNewValid = validatePasswordField('newPassword', passwordData.newPassword);
    const isConfirmValid = validatePasswordField('confirmPassword', passwordData.confirmPassword);

    if (!isOldValid || !isNewValid || !isConfirmValid) {
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await apiClient.post('/user/change-password', {
        currentPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });

      const data = response.data;

      if (response.status !== 200 || !data.success) {
        throw new Error(data.message || 'Failed to change password');
      }

      setPasswordChangeSuccess(true);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTouchedFields({ oldPassword: false, newPassword: false, confirmPassword: false });
      setPasswordErrors({});

      // Hide success message after 5 seconds
      setTimeout(() => setPasswordChangeSuccess(false), 5000);

    } catch (error) {
      console.error('Password change error:', error);
      setPasswordChangeError(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Database }
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm lg:text-base text-gray-600 mt-1">Configure platform settings and preferences</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200"
        >
          {/* Tab Navigation - Mobile Dropdown / Desktop Tabs */}
          <div className="border-b border-gray-200">
            {/* Mobile Dropdown */}
            <div className="lg:hidden p-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Tab Navigation */}
            <nav className="hidden lg:flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 lg:p-6">
            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

                {/* Success Message */}
                {passwordChangeSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-green-800 font-medium">Password changed successfully!</p>
                      <p className="text-green-700 text-sm mt-1">Your password has been updated.</p>
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {passwordChangeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 font-medium">{passwordChangeError}</span>
                  </motion.div>
                )}

                {/* Password Change Form */}
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="oldPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.old ? "text" : "password"}
                        id="oldPassword"
                        value={passwordData.oldPassword}
                        onChange={(e) => handlePasswordChange('oldPassword', e.target.value)}
                        onBlur={() => handlePasswordBlur('oldPassword')}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${passwordErrors.oldPassword && touchedFields.oldPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.old ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordErrors.oldPassword && touchedFields.oldPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {passwordErrors.oldPassword}
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        onBlur={() => handlePasswordBlur('newPassword')}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${passwordErrors.newPassword && touchedFields.newPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && touchedFields.newPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {passwordErrors.newPassword}
                      </p>
                    )}

                    {/* Password Strength Indicators */}
                    {passwordData.newPassword && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 mb-1.5">Password must contain:</p>
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

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        onBlur={() => handlePasswordBlur('confirmPassword')}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${passwordErrors.confirmPassword && touchedFields.confirmPassword ? 'border-red-500' :
                            touchedFields.confirmPassword && !passwordErrors.confirmPassword && passwordData.confirmPassword ? 'border-green-500' :
                              'border-gray-300'
                          }`}
                        placeholder="Re-enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && touchedFields.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {passwordErrors.confirmPassword}
                      </p>
                    )}
                    {touchedFields.confirmPassword && !passwordErrors.confirmPassword && passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                      <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Passwords match!
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <motion.button
                      type="submit"
                      disabled={isChangingPassword || Object.keys(passwordErrors).length > 0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          Change Password
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">System Status</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">All systems operational</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Database</h3>
                    <span className="text-sm text-gray-600">MongoDB v5.0</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Version</h3>
                    <span className="text-sm text-gray-600">v2.1.0</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Last Updated</h3>
                    <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage; 