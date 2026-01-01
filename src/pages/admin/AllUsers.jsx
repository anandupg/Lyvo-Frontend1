import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  Shield,
  User,
  Home,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import apiClient from '../../utils/apiClient';
import ConfirmModal from '../../components/admin/ConfirmModal';

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    userId: null,
    userName: '',
    currentStatus: null
  });


  // Role mapping
  const getRoleName = (role) => {
    const roles = {
      1: 'Seeker',
      2: 'Admin',
      3: 'Owner'
    };
    return roles[role] || 'Unknown';
  };

  const getRoleBadge = (role) => {
    const badges = {
      1: { color: 'bg-blue-100 text-blue-800', icon: User },
      2: { color: 'bg-purple-100 text-purple-800', icon: Shield },
      3: { color: 'bg-green-100 text-green-800', icon: Home }
    };
    return badges[role] || { color: 'bg-gray-100 text-gray-800', icon: User };
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const authToken = localStorage.getItem('authToken');

      const response = await apiClient.get('/user/all');

      if (response.status !== 200) {
        throw new Error('Failed to fetch users');
      }

      const data = response.data;
      console.log('Fetched users:', data);

      // Handle different response formats
      const usersList = data.users || data.data || data || [];
      setUsers(Array.isArray(usersList) ? usersList : []);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Toggle user active status
  const toggleUserStatus = async (userId, userName, currentStatus) => {
    setConfirmModal({
      isOpen: true,
      userId,
      userName,
      currentStatus
    });
  };

  const handleConfirmToggle = async () => {
    const { userId, currentStatus } = confirmModal;

    try {
      setUpdatingUserId(userId);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));

      const response = await apiClient.patch(`/user/${userId}/status`, {
        isActive: !currentStatus
      });

      if (response.status !== 200) {
        throw new Error('Failed to update user status');
      }

      // Update user in local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId
            ? { ...user, isActive: !currentStatus }
            : user
        )
      );

      setShowSuccessMessage(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setShowSuccessMessage(''), 3000);

    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err.message || 'Failed to update user status');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filter users (exclude admins - role 2)
  const filteredUsers = users.filter(user => {
    // Don't display admin users
    if (user.role === 2) {
      return false;
    }

    const matchesSearch =
      searchTerm === '' ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesRole = filterRole === 'all' || user.role === parseInt(filterRole);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.isActive !== false) ||
      (filterStatus === 'inactive' && user.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate statistics (excluding admins)
  const nonAdminUsers = users.filter(u => u.role !== 2);
  const stats = {
    total: nonAdminUsers.length,
    active: nonAdminUsers.filter(u => u.isActive !== false).length,
    inactive: nonAdminUsers.filter(u => u.isActive === false).length,
    seekers: nonAdminUsers.filter(u => u.role === 1).length,
    owners: nonAdminUsers.filter(u => u.role === 3).length
  };

  return (
    <AdminLayout>
      <div className="bg-gray-50 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-red-600" />
                All Users
              </h1>
              <p className="text-gray-600 mt-1">Manage all users across the platform</p>
            </div>
          </div>

          {/* Success Message */}
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">{showSuccessMessage}</span>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Seekers</p>
                <p className="text-2xl font-bold text-blue-600">{stats.seekers}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Owners</p>
                <p className="text-2xl font-bold text-green-600">{stats.owners}</p>
              </div>
              <Home className="w-8 h-8 text-green-500" />
            </div>
          </motion.div>

        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Roles</option>
                <option value="1">Seekers</option>
                <option value="3">Owners</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No users found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-hidden">
              {/* Desktop Table - Hidden on Mobile/Tablet */}
              <div className="hidden lg:block overflow-x-auto -mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user, index) => {
                        const roleBadge = getRoleBadge(user.role);
                        const RoleIcon = roleBadge.icon;
                        const isActive = user.isActive !== false;

                        return (
                          <motion.tr
                            key={user._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {/* User Info */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.name || 'Unknown User'}
                                  </div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.color}`}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {getRoleName(user.role)}
                              </span>
                            </td>

                            {/* Contact */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {user.phone || 'N/A'}
                              </div>
                            </td>

                            {/* Joined Date */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {user.createdAt
                                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                  : 'N/A'}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {isActive ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => toggleUserStatus(user._id, user.name, isActive)}
                                disabled={updatingUserId === user._id}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {updatingUserId === user._id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                ) : isActive ? (
                                  <XCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                {updatingUserId === user._id
                                  ? 'Updating...'
                                  : isActive
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards - Shown on Mobile/Tablet */}
              <div className="lg:hidden p-4 space-y-4 bg-gray-50">
                {filteredUsers.map((user, index) => {
                  const roleBadge = getRoleBadge(user.role);
                  const RoleIcon = roleBadge.icon;
                  const isActive = user.isActive !== false;

                  return (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                      {/* Card Header: User Info & Role */}
                      <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="ml-3 overflow-hidden">
                            <div className="text-sm font-bold text-gray-900 truncate">
                              {user.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadge.color}`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {getRoleName(user.role)}
                        </span>
                      </div>

                      {/* Card Body: Contact & Meta */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          {user.phone || 'N/A'}
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>

                      {/* Card Footer: Status & Actions */}
                      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>

                        <button
                          onClick={() => toggleUserStatus(user._id, user.name, isActive)}
                          disabled={updatingUserId === user._id}
                          className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isActive
                            ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            } disabled:opacity-50`}
                        >
                          {updatingUserId === user._id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                          ) : null}
                          {updatingUserId === user._id
                            ? '...'
                            : isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Results Count */}
        {
          !loading && filteredUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 text-center text-sm text-gray-600"
            >
              Showing {filteredUsers.length} of {users.length} users
            </motion.div>
          )
        }

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={handleConfirmToggle}
          title={confirmModal.currentStatus ? 'Deactivate User' : 'Activate User'}
          message={`Are you sure you want to ${confirmModal.currentStatus ? 'deactivate' : 'activate'} ${confirmModal.userName}? ${confirmModal.currentStatus ? 'They will no longer be able to log in or use the platform.' : 'They will regain access to the platform.'}`}
          confirmText={confirmModal.currentStatus ? 'Deactivate' : 'Activate'}
          type={confirmModal.currentStatus ? 'danger' : 'success'}
          isLoading={updatingUserId === confirmModal.userId}
        />
      </div >
    </AdminLayout >
  );
};

export default AllUsers;

