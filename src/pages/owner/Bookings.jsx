import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import apiClient from '../../utils/apiClient';
import {
  Calendar,
  Search,
  RefreshCw,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Bed,
  DollarSign
} from 'lucide-react';

const OwnerBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | confirmed | pending | rejected | cancelled
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // table | cards
  const [expandedCards, setExpandedCards] = useState(new Set());

  useEffect(() => {
    fetchBookings();

    // Set up polling for automatic updates
    const intervalId = setInterval(() => {
      console.log('[AUTO-REFRESH] Polling for new bookings...');
      fetchBookings(true); // pass true to indicate silent refresh
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const fetchBookings = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      if (isSilent) setIsRefreshing(true);
      setError('');
      const resp = await apiClient.get('/property/owner/bookings');

      const data = resp.data;
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (e) {
      if (!isSilent) setError(e.message || 'Failed to load bookings');
    } finally {
      if (!isSilent) setLoading(false);
      if (isSilent) setIsRefreshing(false);
    }
  };


  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings
      .filter((b) => {
        if (statusFilter === 'all') return b.status !== 'checked_in';
        if (statusFilter === 'pending') {
          return ['pending_approval', 'payment_pending', 'pending'].includes(b.status);
        }
        if (statusFilter === 'confirmed') {
          return ['confirmed', 'checked_in'].includes(b.status);
        }
        return b.status === statusFilter;
      })
      .filter((b) => {
        if (!q) return true;
        const seeker = `${b.userSnapshot?.name || ''} ${b.userSnapshot?.email || ''}`.toLowerCase();
        const property = `${b.propertySnapshot?.name || ''}`.toLowerCase();
        const room = `${b.roomSnapshot?.roomNumber || ''} ${b.roomSnapshot?.roomType || ''}`.toLowerCase();
        return seeker.includes(q) || property.includes(q) || room.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt || b.bookedAt) - new Date(a.createdAt || a.bookedAt));
  }, [bookings, query, statusFilter]);

  const stats = useMemo(() => {
    const total = bookings.filter(b => b.status !== 'checked_in').length;
    const confirmed = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length;
    const pending = bookings.filter(b => ['pending_approval', 'payment_pending', 'pending'].includes(b.status)).length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const rejected = bookings.filter(b => b.status === 'rejected').length;
    return { total, confirmed, pending, cancelled, rejected };
  }, [bookings]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchBookings();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const toggleCardExpansion = (bookingId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusColor = (status, cancelledBy = null) => {
    switch (status) {
      case 'confirmed':
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'checked_in': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getStatusIcon = (status, cancelledBy = null) => {
    switch (status) {
      case 'confirmed':
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'checked_in': return <MapPin className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'pending_approval': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status, cancelledBy = null) => {
    switch (status) {
      case 'confirmed':
      case 'approved': return 'Approved';
      case 'checked_in': return 'Checked In';
      case 'rejected': return 'Rejected';
      case 'cancelled': return cancelledBy === 'user' ? 'Cancelled by User' : 'Cancelled';
      case 'pending_approval': return 'Pending Approval';
      default: return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <OwnerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookings Management</h1>
              <div className="flex items-center gap-2">
                <p className="text-gray-600">Manage and review all property bookings</p>
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded border border-green-100 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Live Updates
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Cards
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Refresh
                </button>
                <button
                  onClick={() => navigate('/owner-dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div
            className={`bg-gradient-to-br from-blue-50 to-blue-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'all'
              ? 'border-blue-400 ring-2 ring-blue-200'
              : 'border-blue-200'
              }`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-600 mb-1">Active Bookings</div>
                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-br from-green-50 to-green-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'confirmed'
              ? 'border-green-400 ring-2 ring-green-200'
              : 'border-green-200'
              }`}
            onClick={() => setStatusFilter('confirmed')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-600 mb-1">Confirmed</div>
                <div className="text-3xl font-bold text-green-900">{stats.confirmed}</div>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-br from-yellow-50 to-yellow-100 border rounded-xl p-6 hover:shadow-lg transition-shadow relative cursor-pointer ${statusFilter === 'pending'
              ? 'border-yellow-400 ring-2 ring-yellow-200'
              : 'border-yellow-200'
              }`}
            onClick={() => setStatusFilter('pending')}
          >
            {/* Pending Approval Badge */}
            {stats.pending > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                {stats.pending}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-yellow-600 mb-1">Pending</div>
                <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
                {stats.pending > 0 && (
                  <div className="text-xs text-yellow-700 mt-1">Awaiting your approval</div>
                )}
              </div>
              <div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-br from-gray-50 to-gray-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'cancelled'
              ? 'border-gray-400 ring-2 ring-gray-200'
              : 'border-gray-200'
              }`}
            onClick={() => setStatusFilter('cancelled')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Cancelled</div>
                <div className="text-3xl font-bold text-gray-900">{stats.cancelled}</div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-br from-red-50 to-red-100 border rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer ${statusFilter === 'rejected'
              ? 'border-red-400 ring-2 ring-red-200'
              : 'border-red-200'
              }`}
            onClick={() => setStatusFilter('rejected')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-red-600 mb-1">Rejected</div>
                <div className="text-3xl font-bold text-red-900">{stats.rejected}</div>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by seeker name, property, or room..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            {/* Active Filter Indicator */}
            {statusFilter !== 'all' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <span className="text-sm font-medium">
                  Showing: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} bookings
                </span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Bookings</h3>
            <p className="text-gray-600">Please wait while we fetch your bookings...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Bookings</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchBookings}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Yet</h3>
            <p className="text-gray-600 mb-4">New bookings will appear here when tenants make reservations.</p>
            <button
              onClick={() => navigate('/owner-dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              Go to Dashboard
            </button>
          </div>
        ) : (
          viewMode === 'table' ? (
            /* Compact Table View */
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">Seeker</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">Property</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Room</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Rent</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking) => {
                      const dateInfo = formatDate(booking.createdAt || booking.bookedAt);
                      return (
                        <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3">
                            <div className="text-xs font-medium text-gray-900">{dateInfo.date}</div>
                            <div className="text-xs text-gray-500">{dateInfo.time}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status, booking.cancelledBy)}`}>
                              {getStatusIcon(booking.status, booking.cancelledBy)}
                              <span className="hidden sm:inline">
                                {getStatusText(booking.status, booking.cancelledBy)}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {booking.userSnapshot?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {booking.userSnapshot?.email || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {booking.propertySnapshot?.name || booking.property?.propertyName || '-'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {booking.propertySnapshot?.address?.city || ''}
                              {booking.propertySnapshot?.address?.state ? `, ${booking.propertySnapshot.address.state}` : ''}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm text-gray-900">R{booking.roomSnapshot?.roomNumber || '-'}</div>
                            <div className="text-xs text-gray-500">{booking.roomSnapshot?.roomType || ''}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(booking.roomSnapshot?.rent)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              onClick={() => navigate(`/owner-bookings/${booking._id}`, {
                                state: {
                                  userId: booking.userId,
                                  ownerId: booking.ownerId,
                                  propertyId: booking.propertyId,
                                  roomId: booking.roomId
                                }
                              })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBookings.map((booking) => {
                const dateInfo = formatDate(booking.createdAt || booking.bookedAt);
                const isExpanded = expandedCards.has(booking._id);

                return (
                  <div key={booking._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{dateInfo.date}</div>
                            <div className="text-xs text-gray-500">{dateInfo.time}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status, booking.cancelledBy)}`}>
                          {getStatusIcon(booking.status, booking.cancelledBy)}
                          {getStatusText(booking.status, booking.cancelledBy)}
                        </span>
                      </div>

                      {/* Seeker Info */}
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {booking.userSnapshot?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">{booking.userSnapshot?.email || '-'}</div>
                        </div>
                      </div>

                      {/* Property Info */}
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {booking.propertySnapshot?.name || booking.property?.propertyName || '-'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          {booking.propertySnapshot?.address?.street || ''}
                          {booking.propertySnapshot?.address?.city ? `, ${booking.propertySnapshot.address.city}` : ''}
                          {booking.propertySnapshot?.address?.state ? `, ${booking.propertySnapshot.address.state}` : ''}
                        </div>
                      </div>

                      {/* Room & Rent */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Bed className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">Room {booking.roomSnapshot?.roomNumber || '-'}</div>
                            <div className="text-xs text-gray-500">{booking.roomSnapshot?.roomType || ''}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(booking.roomSnapshot?.rent)}
                          </div>
                          <div className="text-xs text-gray-500">per month</div>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 pt-4 mb-4">
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{booking.userSnapshot?.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{booking.userSnapshot?.email || 'Not provided'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleCardExpansion(booking._id)}
                          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          {isExpanded ? 'Show Less' : 'Show More'}
                        </button>
                        <button
                          onClick={() => navigate(`/owner-bookings/${booking._id}`, {
                            state: {
                              userId: booking.userId,
                              ownerId: booking.ownerId,
                              propertyId: booking.propertyId,
                              roomId: booking.roomId
                            }
                          })}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </OwnerLayout>
  );
};

export default OwnerBookings;


