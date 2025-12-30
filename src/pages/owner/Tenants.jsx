import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
  Users, Search, RefreshCw, ArrowUpRight, CheckCircle, XCircle,
  User, Phone, Mail, MapPin, Calendar, DollarSign, Home,
  Bed, Building, Eye, Clock, LogOut
} from 'lucide-react';

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
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${baseUrl}/property/owner/tenants`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setTenants(Array.isArray(data.tenants) ? data.tenants : []);
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
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('authToken');

      const resp = await fetch(`${baseUrl}/property/tenants/${selectedTenant._id}/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!resp.ok) {
        throw new Error('Failed to check out tenant');
      }

      // Update tenant status locally
      setTenants(prev => prev.map(t =>
        t._id === selectedTenant._id
          ? { ...t, status: 'checked_out' }
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
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: Tenant Info */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${tenant.status === 'checked_out' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                        <User className={`w-6 h-6 sm:w-7 sm:h-7 ${tenant.status === 'checked_out' ? 'text-red-600' : 'text-blue-600'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{tenant.userName}</h3>
                          <span className={`inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                            {tenant.status}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{tenant.userEmail}</span>
                          </div>
                          {tenant.userPhone && (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{tenant.userPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Property & Room - Desktop Only */}
                    <div className="hidden lg:flex items-center gap-6 xl:gap-8">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Property</p>
                        <p className="text-sm xl:text-base font-semibold text-gray-900">{tenant.propertyName}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Room</p>
                        <p className="text-sm xl:text-base font-semibold text-gray-900">Room {tenant.roomNumber}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Rent</p>
                        <p className="text-sm xl:text-base font-semibold text-green-600">{formatCurrency(tenant.monthlyRent)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Check-in</p>
                        <p className="text-sm xl:text-base font-semibold text-gray-900">{formatDate(tenant.actualCheckInDate)}</p>
                      </div>
                    </div>

                    {/* Right: Checkout Button */}
                    <div className="flex items-center gap-2 sm:justify-end">
                      {tenant.status === 'active' && (
                        <>
                          <button
                            onClick={() => navigate(`/owner/tenants/${tenant._id}`)}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Details</span>
                          </button>
                          <button
                            onClick={() => handleCheckoutClick(tenant)}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Checkout</span>
                          </button>
                        </>
                      )}
                      {tenant.status === 'checked_out' && (
                        <div className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-red-100 text-red-800 rounded-lg text-sm font-medium text-center">
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
