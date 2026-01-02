import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
  Users, Search, RefreshCw, ArrowUpRight, CheckCircle, XCircle,
  User, Phone, Mail, MapPin, Calendar, DollarSign, Home,
  Bed, Building, Eye, Clock, LogOut, MessageCircle
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

const Tenants = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/property/owner/tenants');

      if (response.status === 200) {
        const data = response.data;
        const rawTenants = Array.isArray(data.tenants) ? data.tenants : [];

        // Deduplicate tenants by unique combination of Email + Property + Room
        // This handles cases where backend has duplicate records for the same tenancy
        const uniqueTenantsMap = new Map();

        rawTenants.forEach(tenant => {
          // Create a composite key to identify duplicates
          // Use email if available, otherwise name (fallback)
          const distinctKey = `${tenant.userEmail || tenant.userName}-${tenant.propertyName}-${tenant.roomNumber}`;

          if (!uniqueTenantsMap.has(distinctKey)) {
            uniqueTenantsMap.set(distinctKey, tenant);
          }
        });

        const uniqueTenants = Array.from(uniqueTenantsMap.values());
        setTenants(uniqueTenants);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      setError(e.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tenants
      .filter((t) => {
        if (statusFilter === 'all') return true;
        return t.status === statusFilter;
      })
      .filter((t) => {
        if (!q) return true;
        const tenant = `${t.userName || ''} ${t.userEmail || ''}`.toLowerCase();
        const property = `${t.propertyName || ''}`.toLowerCase();
        const room = `${t.roomNumber || ''} ${t.roomType || ''}`.toLowerCase();
        return tenant.includes(q) || property.includes(q) || room.includes(q);
      })
      .sort((a, b) => new Date(b.actualCheckInDate) - new Date(a.actualCheckInDate));
  }, [tenants, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'active').length;
    const today = new Date().toDateString();
    const checkedInToday = tenants.filter(t =>
      new Date(t.actualCheckInDate).toDateString() === today
    ).length;
    return { total, active, checkedInToday };
  }, [tenants]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchTenants();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'checked_out': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleCheckoutClick = (tenant) => {
    setSelectedTenant(tenant);
    setShowCheckoutModal(true);
  };

  const handleCheckoutConfirm = async () => {
    if (!selectedTenant) return;

    try {
      setCheckingOut(true);
      setCheckingOut(true);

      const response = await apiClient.post(`/property/tenants/${selectedTenant._id}/check-out`);

      if (response.status !== 200) {
        throw new Error('Failed to check out tenant');
      }

      // Update tenant status locally
      setTenants(prev => prev.map(t =>
        t._id === selectedTenant._id
          ? { ...t, status: 'completed' }
          : t
      ));

      setShowCheckoutModal(false);
      setSelectedTenant(null);
    } catch (err) {
      setError(err.message || 'Failed to check out tenant');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCall = (phone) => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone) => {
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleMail = (email) => {
    if (email) window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading tenants...</p>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Checked-In Tenants</h1>
              <p className="text-gray-600">Manage and view all active tenants</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
              <button
                onClick={() => navigate('/owner-dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div
            className={`bg-gradient-to-br from-blue-50 to-blue-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'all' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-200'
              }`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-600 mb-1">Total Tenants</div>
                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-br from-green-50 to-green-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'active' ? 'border-green-400 ring-2 ring-green-200' : 'border-green-200'
              }`}
            onClick={() => setStatusFilter('active')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-600 mb-1">Active</div>
                <div className="text-3xl font-bold text-green-900">{stats.active}</div>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-purple-600 mb-1">Checked-In Today</div>
                <div className="text-3xl font-bold text-purple-900">{stats.checkedInToday}</div>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant name, email, property, or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tenants Grid */}
        {filteredTenants.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenants Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search criteria' : 'No checked-in tenants yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTenants.map((tenant, index) => (
              <motion.div
                key={tenant._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-shadow ${tenant.status === 'checked_out'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
                  }`}
              >
                <div className="p-4 sm:p-6 text-left">
                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 items-center">
                    {/* Left: Tenant Info (Col Span 4) */}
                    <div className="flex items-center gap-3 sm:gap-4 w-full lg:col-span-4">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${!tenant.profilePicture && (tenant.status === 'checked_out' ? 'bg-red-100' : 'bg-blue-100')}`}>
                        {tenant.profilePicture ? (
                          <img
                            src={tenant.profilePicture}
                            alt={tenant.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className={`w-6 h-6 sm:w-7 sm:h-7 ${tenant.status === 'checked_out' ? 'text-red-600' : 'text-blue-600'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 truncate" title={tenant.userName}>{tenant.userName}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                            {tenant.status === 'active' ? 'Active' : 'Checked Out'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate" title={tenant.userEmail}>{tenant.userEmail}</span>
                          </div>
                          {tenant.userPhone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{tenant.userPhone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCall(tenant.userPhone); }}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                              title="Call Tenant"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWhatsApp(tenant.userPhone); }}
                              className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors"
                              title="WhatsApp Tenant"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMail(tenant.userEmail); }}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                              title="Email Tenant"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Property & Room - Desktop Only (Col Span 4) */}
                    <div className="hidden lg:grid grid-cols-2 gap-4 lg:col-span-4 w-full">
                      <div className="text-center overflow-hidden px-1">
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Property</p>
                        <p className="text-sm font-semibold text-gray-900 truncate" title={tenant.propertyName}>{tenant.propertyName}</p>
                      </div>
                      <div className="text-center px-1">
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Room</p>
                        <p className="text-sm font-semibold text-gray-900">Room {tenant.roomNumber}</p>
                      </div>
                    </div>

                    {/* Right: Checkout Button (Col Span 4) */}
                    <div className="flex items-center gap-2 w-full lg:w-auto lg:justify-end lg:col-span-4">
                      {tenant.status === 'active' ? (
                        <>
                          <button
                            onClick={() => navigate(`/owner/tenants/${tenant._id}`)}
                            title="View Details"
                            className="p-2 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden xl:inline">Details</span>
                          </button>
                          <button
                            onClick={() => handleCheckoutClick(tenant)}
                            title="Checkout Tenant"
                            className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden xl:inline">Checkout</span>
                            <span className="lg:hidden">Checkout</span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full lg:w-auto px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center border border-red-100">
                          Checked Out
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile/Tablet: Additional Info */}
                  <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Property</p>
                      <p className="font-semibold text-gray-900 truncate">{tenant.propertyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Room</p>
                      <p className="font-semibold text-gray-900">Room {tenant.roomNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Monthly Rent</p>
                      <p className="font-semibold text-green-600">{formatCurrency(tenant.monthlyRent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Check-in Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(tenant.actualCheckInDate)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Checkout Confirmation Modal */}
        {showCheckoutModal && selectedTenant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">Confirm Checkout</h2>
                <p className="text-red-100">Are you sure you want to check out this tenant?</p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Tenant Name</p>
                    <p className="text-base font-semibold text-gray-900">{selectedTenant.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-base font-semibold text-gray-900">{selectedTenant.userEmail}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Property</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedTenant.propertyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Room</p>
                      <p className="text-sm font-semibold text-gray-900">Room {selectedTenant.roomNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Monthly Rent</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(selectedTenant.monthlyRent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Security Deposit</p>
                      <p className="text-sm font-semibold text-blue-600">{formatCurrency(selectedTenant.securityDeposit)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check-in Date</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(selectedTenant.actualCheckInDate)}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This action will mark the tenant as checked out. The security deposit will need to be processed separately.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setSelectedTenant(null);
                  }}
                  disabled={checkingOut}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckoutConfirm}
                  disabled={checkingOut}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking Out...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Confirm Checkout
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};

export default Tenants;
