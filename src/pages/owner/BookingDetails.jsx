import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Home,
  Bed,
  Users,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Tag,
  Maximize,
  User,
  Building,
  AlertCircle,
  AlertTriangle,
  Shield
} from 'lucide-react';

const BookingDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showConfirmCheckIn, setShowConfirmCheckIn] = useState(false);
  const [actionType, setActionType] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const baseUrl = import.meta.env.VITE_PROPERTY_SERVICE_API_URL || 'http://localhost:3002';
        const token = localStorage.getItem('authToken');

        // Fix: Removed duplicate /api prefix. baseUrl includes /api/property
        // If token exists, use direct ID endpoint. Else, try the same endpoint (backend will reject if auth needed)
        // or rely on lookup loop below.
        let endpoint = token && bookingId ? `${baseUrl}/bookings/${bookingId}` : null;

        let resp;
        if (endpoint) {
          resp = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });
        }

        let data;
        if (resp && resp.ok) {
          data = await resp.json();
          setBooking({
            ...data.booking,
            seekerProfile: data.seekerProfile,
            kycAddress: data.kycAddress,
            isKycVerified: data.isKycVerified,
            aadharImages: data.aadharImages
          });
          console.log('Booking Data with Extended Info:', data); // Debug log
          setSource(data.source || 'booking');
        } else {
          // Second attempt: Public lookup if no direct access or failed
          // There is no /api/public/bookings/:id route in backend, so we skip that and go to lookup params.

          // Build lookup params from state or query
          const stateParams = location.state || {};
          const searchParams = new URLSearchParams(location.search);
          const userId = stateParams.userId || searchParams.get('userId');
          const ownerId = stateParams.ownerId || searchParams.get('ownerId');
          const propertyId = stateParams.propertyId || searchParams.get('propertyId');
          const roomId = stateParams.roomId || searchParams.get('roomId');

          if (userId && ownerId && propertyId && roomId) {
            // Fix: endpoint is /bookings/lookup/payment and removed /api prefix
            const lookupUrl = `${baseUrl}/bookings/lookup/payment?userId=${encodeURIComponent(userId)}&ownerId=${encodeURIComponent(ownerId)}&propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}`;
            const lookupResp = await fetch(lookupUrl);
            if (!lookupResp.ok) {
              const text = await lookupResp.text();
              throw new Error(text || `HTTP ${lookupResp.status}`);
            }
            const lookupData = await lookupResp.json();
            setBooking(lookupData.booking);
            setSource(lookupData.source || 'composed');
          } else {
            if (resp) {
              const text = await resp.text();
              throw new Error(text || `HTTP ${resp.status}`);
            } else {
              throw new Error('No booking ID or lookup parameters found');
            }
          }
        }
      } catch (e) {
        setError(e.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId, location.search, location.state]);

  const updateStatus = async (action) => {
    try {
      if (!booking?._id) return;
      setUpdating(true);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('authToken');

      const status = action === 'approve' ? 'approved' : 'rejected';

      const resp = await fetch(`${baseUrl}/property/bookings/${booking._id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setBooking(data.booking);
      setActionType(action);

      // Show success modal
      if (action === 'approve') {
        setShowApprovalModal(true);
      } else {
        setShowRejectionModal(true);
      }
    } catch (e) {
      setError(e.message || 'Failed to update booking');
    } finally {
      setUpdating(false);
    }
  };

  const finalizeCheckIn = async () => {
    try {
      if (!booking?._id) return;
      setUpdating(true);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('authToken');

      const resp = await fetch(`${baseUrl}/property/bookings/${booking._id}/finalize-check-in`, {
        method: 'POST',
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
      setBooking(prev => ({ ...prev, status: 'checked_in' }));
      setShowCheckInModal(true);
    } catch (e) {
      setError(e.message || 'Failed to finalize check-in');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending Approval' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Approved' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Approved' },
      checked_in: { bg: 'bg-blue-100', text: 'text-blue-800', icon: MapPin, label: 'Checked In' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.pending_approval;
    const StatusIcon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} ${config.text} font-medium`}>
        <StatusIcon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate('/owner-bookings')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Bookings</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
                <p className="text-gray-600 mt-1">Manage and review booking information</p>
              </div>
              {booking && (
                <div>
                  {getStatusBadge(booking.status)}
                </div>
              )}
            </div>
          </motion.div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading booking details...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-gray-700 text-lg">{error}</p>
            </div>
          ) : booking ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Property Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Building className="w-6 h-6" />
                      Property Details
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          Property Name
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.propertySnapshot?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Security Deposit
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.propertySnapshot?.security_deposit != null
                            ? `₹${Number(booking.propertySnapshot.security_deposit).toLocaleString()}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Address
                        </label>
                        <p className="mt-1 text-gray-900">
                          {booking.propertySnapshot?.address?.street && `${booking.propertySnapshot.address.street}, `}
                          {booking.propertySnapshot?.address?.city && `${booking.propertySnapshot.address.city}, `}
                          {booking.propertySnapshot?.address?.state && `${booking.propertySnapshot.address.state} `}
                          {booking.propertySnapshot?.address?.pincode && `- ${booking.propertySnapshot.address.pincode}`}
                          {!booking.propertySnapshot?.address && 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Room Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Bed className="w-6 h-6" />
                      Room Details
                    </h2>
                  </div>
                  <div className="p-6">
                    {/* Room Images */}
                    {(booking.roomSnapshot?.images?.room || booking.roomSnapshot?.images?.toilet) && (
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {booking.roomSnapshot?.images?.room && (
                          <div className="relative group overflow-hidden rounded-xl">
                            <img
                              src={booking.roomSnapshot.images.room}
                              alt="Room"
                              className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                              <p className="text-white font-medium">Room View</p>
                            </div>
                          </div>
                        )}
                        {booking.roomSnapshot?.images?.toilet && (
                          <div className="relative group overflow-hidden rounded-xl">
                            <img
                              src={booking.roomSnapshot.images.toilet}
                              alt="Bathroom"
                              className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                              <p className="text-white font-medium">Bathroom View</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Room Number
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.roomSnapshot?.roomNumber ?? 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Bed className="w-4 h-4" />
                          Room Type
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.roomSnapshot?.roomType || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Maximize className="w-4 h-4" />
                          Room Size
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.roomSnapshot?.roomSize != null ? `${booking.roomSnapshot.roomSize} sq ft` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bed Type</label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.roomSnapshot?.bedType || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Occupancy
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {booking.roomSnapshot?.occupancy ?? 'N/A'} {booking.roomSnapshot?.occupancy > 1 ? 'Persons' : 'Person'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Monthly Rent
                        </label>
                        <p className="mt-1 text-lg font-semibold text-green-600">
                          {booking.roomSnapshot?.rent != null ? `₹${Number(booking.roomSnapshot.rent).toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div className={booking.status === 'pending_approval' ? 'bg-purple-50 p-3 rounded-xl border border-purple-100' : ''}>
                        <label className="text-sm font-medium text-purple-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Requested Check-in
                        </label>
                        <p className={`mt-1 text-lg font-bold ${booking.checkInDate ? 'text-purple-700' : 'text-gray-400 italic'}`}>
                          {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Not set by seeker yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Booking Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-6 h-6" />
                      Booking Timeline
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Booking Date</label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {new Date(booking.createdAt || booking.bookedAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(booking.createdAt || booking.bookedAt).toLocaleTimeString('en-IN')}
                        </p>
                      </div>
                      {booking.checkInDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Requested Check-in Date</label>
                          <p className="mt-1 text-lg font-semibold text-purple-600">
                            {new Date(booking.checkInDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-500 italic">Expected arrival</p>
                        </div>
                      )}
                      {booking.approvedAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Approved Date</label>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {new Date(booking.approvedAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(booking.approvedAt).toLocaleTimeString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                {booking.status === 'pending_approval' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Actions</h3>

                    {!booking.checkInDate && booking.status === 'pending_approval' && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm">Awaiting Seeker's Check-in Date</p>
                          <p className="text-xs mt-1">The seeker needs to set their preferred check-in date from their dashboard before you can approve this booking.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                      <button
                        disabled={updating || !booking.checkInDate}
                        onClick={() => setShowConfirmApprove(true)}
                        className="flex-1 min-w-[200px] bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {updating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            {booking.checkInDate ? 'Approve Booking' : 'Awaiting Date'}
                          </>
                        )}
                      </button>
                      <button
                        disabled={updating}
                        onClick={() => updateStatus('reject')}
                        className="flex-1 min-w-[200px] bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {updating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5" />
                            Reject Booking
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {(booking.status === 'approved' || booking.status === 'confirmed') && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-600"
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Final Check-in Confirmation</h3>
                        <p className="text-gray-600 mt-1">Confirm that the seeker has arrived at the property and successfully checked in.</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 mb-6">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        What happens next?
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          Seeker will be officially added as a Tenant in this room
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          Room occupancy will be updated
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          Tenancy records will be visible in your Tenant Management area
                        </li>
                      </ul>
                    </div>

                    <button
                      disabled={updating}
                      onClick={() => setShowConfirmCheckIn(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3"
                    >
                      {updating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing Check-in...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          Confirm Final Check-in
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Seeker Information */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Seeker Information
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        {(booking.seekerProfile?.profilePicture || booking.userId?.profilePicture || booking.userId?.picture) ? (
                          <img
                            src={booking.seekerProfile?.profilePicture || booking.userId?.profilePicture || booking.userId?.picture}
                            alt="Seeker Profile"
                            className="w-24 h-24 rounded-full object-cover border-4 border-indigo-50 shadow-md"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-300 border-4 border-indigo-50 shadow-md">
                            <User className="w-12 h-12" />
                          </div>
                        )}
                        {booking.isKycVerified && (
                          <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white rounded-full p-1 shadow-sm">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {booking.userSnapshot?.name || 'N/A'}
                      </p>
                    </div>

                    {/* Gender & Occupation */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gender</label>
                        <p className="mt-1 text-gray-900 capitalize">
                          {booking.seekerProfile?.gender || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Occupation</label>
                        <p className="mt-1 text-gray-900 capitalize">
                          {booking.seekerProfile?.occupation || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Aadhar Card Image */}
                    {booking.aadharImages?.front && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4" />
                          Aadhar Card
                          {booking.isKycVerified && (
                            <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Verified
                            </span>
                          )}
                        </label>
                        <img
                          src={booking.aadharImages.front}
                          alt="Aadhar Card Front"
                          className="w-full h-auto rounded-xl border border-gray-200 shadow-sm object-cover"
                          onClick={() => window.open(booking.aadharImages.front, '_blank')}
                        />
                      </div>
                    )}

                    {!booking.aadharImages?.front && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4" />
                          Review
                        </label>
                        <p className="text-sm text-gray-400 italic">No ID proof uploaded yet.</p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <p className="mt-1 text-gray-900 break-words">
                        {booking.userSnapshot?.email || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </label>
                      <p className="mt-1 text-gray-900">
                        {booking.userSnapshot?.phone || 'N/A'}
                      </p>
                    </div>

                    {/* Contact Buttons */}
                    {(booking.userSnapshot?.phone) && (
                      <div className="flex gap-3 pt-2">
                        <a
                          href={`tel:${booking.userSnapshot.phone}`}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors font-medium text-sm"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${booking.userSnapshot.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-green-50 border border-green-200 text-green-700 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 transition-colors font-medium text-sm"
                        >
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                            alt="WhatsApp"
                            className="w-4 h-4"
                          />
                          Message
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Seeker Identity Verification */}
                {booking.userId && (booking.userId.govtIdFrontUrl || booking.userId.govtIdBackUrl) && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Identity Verification
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        {booking.userId.kycVerified ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-3">Government ID</p>
                      <div className="grid grid-cols-1 gap-4">
                        {booking.userId.govtIdFrontUrl && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Front Side</p>
                            <img
                              src={booking.userId.govtIdFrontUrl}
                              alt="ID Front"
                              className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(booking.userId.govtIdFrontUrl, '_blank')}
                            />
                          </div>
                        )}
                        {booking.userId.govtIdBackUrl && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Back Side</p>
                            <img
                              src={booking.userId.govtIdBackUrl}
                              alt="ID Back"
                              className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(booking.userId.govtIdBackUrl, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Owner Information */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Owner Information
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {booking.ownerSnapshot?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <p className="mt-1 text-gray-900 break-words">
                        {booking.ownerSnapshot?.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </label>
                      <p className="mt-1 text-gray-900">
                        {booking.ownerSnapshot?.phone || 'N/A'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Confirmation Modal for Approval */}
      {showConfirmApprove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Approve Booking?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this booking? The seeker will be notified immediately.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmApprove(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmApprove(false);
                  updateStatus('approve');
                }}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                Confirm Approval
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal for Check-in */}
      {showConfirmCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Check-in?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to check in this seeker? This will add them as an active tenant and update room occupancy.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmCheckIn(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmCheckIn(false);
                  finalizeCheckIn();
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
              >
                Confirm Check-in
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Approval Success Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Approved!</h3>
            <p className="text-gray-600 mb-6">
              The booking has been successfully approved. The seeker will be notified via email.
            </p>
            <button
              onClick={() => {
                setShowApprovalModal(false);
                navigate('/owner-bookings');
              }}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200"
            >
              Back to Bookings
            </button>
          </motion.div>
        </div>
      )}

      {/* Rejection Success Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Rejected</h3>
            <p className="text-gray-600 mb-6">
              The booking has been rejected. The seeker will be notified via email.
            </p>
            <button
              onClick={() => {
                setShowRejectionModal(false);
                navigate('/owner-bookings');
              }}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200"
            >
              Back to Bookings
            </button>
          </motion.div>
        </div>
      )}

      {/* Check-in Success Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Check-in Successful!</h3>
            <p className="text-gray-600 mb-6">
              The seeker has been successfully checked in.
            </p>
            <button
              onClick={() => {
                setShowCheckInModal(false);
                navigate('/owner-bookings');
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              Back to Bookings
            </button>
          </motion.div>
        </div>
      )}
    </OwnerLayout>
  );
};

export default BookingDetails;
