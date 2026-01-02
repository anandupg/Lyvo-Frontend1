import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import {
  Calendar,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  ArrowRight,
  Filter,
  Search,
  Building,
  Bed,
  Wifi,
  Car,
  Shield,
  Utensils,
  Dumbbell,
  Camera,
  Users,
  Phone,
  Mail,
  ExternalLink,
  X,
  LogIn,
  LogOut
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import apiClient from '../../utils/apiClient';
import ContactOwnerModal from '../../components/ContactOwnerModal';

const SeekerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [bookingToCheckIn, setBookingToCheckIn] = useState(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get user ID from localStorage
  const getUserId = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.id || userData._id;
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  };

  // Fetch user bookings
  const fetchBookings = async () => {
    const userId = getUserId();
    if (!userId) {
      console.error('User ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoading(true);
      const response = await apiClient.get('/property/user/bookings');

      if (response.status === 200) {
        const data = response.data;
        console.log('Bookings data received:', data);

        // Map backend snapshots to frontend expectations
        const mappedBookings = (data.bookings || []).map(booking => {
          const mapped = {
            ...booking,
            property: {
              ...booking.propertySnapshot,
              _id: booking.propertyId?._id || booking.propertyId,
              propertyName: booking.propertyId?.property_name || booking.propertyId?.propertyName || booking.propertySnapshot?.name,
              images: booking.propertyId?.images || booking.propertySnapshot?.images || [booking.propertySnapshot?.image],
              address: booking.propertyId?.address || booking.propertySnapshot?.address,
              security_deposit: booking.propertyId?.security_deposit || booking.propertyId?.securityDeposit || booking.propertySnapshot?.security_deposit
            },
            room: {
              ...booking.roomSnapshot,
              _id: booking.roomId?._id || booking.roomId,
              roomNumber: booking.roomId?.room_number || booking.roomId?.roomNumber || booking.roomSnapshot?.roomNumber,
              roomImage: booking.roomId?.room_image || booking.roomId?.roomImage || booking.roomSnapshot?.images?.room || booking.roomSnapshot?.roomImage || booking.roomSnapshot?.images?.[0],
              toiletImage: booking.roomId?.toilet_image || booking.roomId?.toiletImage || booking.roomSnapshot?.images?.toilet || booking.roomSnapshot?.toiletImage,
              rent: booking.roomId?.rent || booking.roomSnapshot?.rent,
              roomType: booking.roomId?.room_type || booking.roomId?.roomType || booking.roomSnapshot?.roomType
            }
          };
          console.log('[DEBUG] Final Mapped booking:', mapped._id, {
            propertyImage: mapped.property?.images,
            roomImage: mapped.room?.roomImage,
            payment: mapped.payment
          });
          return mapped;
        });

        setBookings(mappedBookings);
        setFilteredBookings(mappedBookings);
      } else {
        console.error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open cancel booking modal
  const openCancelModal = (booking) => {
    setBookingToCancel(booking);
    setCancelModalOpen(true);
  };

  // Close cancel booking modal
  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setBookingToCancel(null);
    setCancelling(false);
  };

  // Open check-in modal
  const openCheckInModal = (booking) => {
    setBookingToCheckIn(booking);
    setCheckInDate(booking.checkInDate ? new Date(booking.checkInDate).toISOString().split('T')[0] : '');
    setCheckInModalOpen(true);
  };

  // Close check-in modal
  const closeCheckInModal = () => {
    setCheckInModalOpen(false);
    setBookingToCheckIn(null);
    setCheckInDate('');
    setCheckingIn(false);
  };

  // Cancel booking function
  const cancelBooking = async () => {
    if (!bookingToCancel) return;

    try {
      setCancelling(true);
      const response = await apiClient.delete(`/property/bookings/${bookingToCancel._id}`);

      if (response.status === 200) {
        toast({
          title: "Success",
          description: bookingToCancel?.status === 'rejected'
            ? "Rejected booking removed successfully"
            : "Booking cancelled and removed successfully",
          variant: "default"
        });
        // Refresh bookings
        fetchBookings();
        // Dispatch event to update booking status in other components
        window.dispatchEvent(new Event('booking-cancelled'));
        // Close modal
        closeCancelModal();
      } else {

        const error = response.data || {};
        toast({
          title: "Error",
          description: error.message || "Failed to cancel booking",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
    }
  };

  // Mark check-in date function
  const markCheckIn = async () => {
    if (!bookingToCheckIn || !checkInDate) return;

    try {
      setCheckingIn(true);

      const response = await apiClient.post(`/property/user/check-in/${bookingToCheckIn._id}`, {
        checkInDate: checkInDate
      });

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Check-in date marked successfully",
          variant: "default"
        });
        // Refresh bookings
        fetchBookings();
        // Close modal
        closeCheckInModal();
      } else {

        const error = response.data || {};
        toast({
          title: "Error",
          description: error.message || "Failed to mark check-in date",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking check-in:', error);
      toast({
        title: "Error",
        description: "Failed to mark check-in date. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCheckingIn(false);
    }
  };

  // Filter bookings based on status and search query
  useEffect(() => {
    let filtered = bookings;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(booking => {
        const propertyName = booking.property?.propertyName?.toLowerCase() || '';
        const roomNumber = booking.room?.roomNumber?.toLowerCase() || '';

        // Handle address object or string
        let address = '';
        if (booking.property?.address) {
          if (typeof booking.property.address === 'string') {
            address = booking.property.address.toLowerCase();
          } else {
            address = `${booking.property.address.street || ''} ${booking.property.address.city || ''} ${booking.property.address.state || ''} ${booking.property.address.pincode || ''}`.toLowerCase();
          }
        }

        const query = searchQuery.toLowerCase();
        return propertyName.includes(query) || roomNumber.includes(query) || address.includes(query);
      });
    }

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, searchQuery]);

  // Load bookings on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Get status color and icon
  const getStatusInfo = (status, cancelledBy = null) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return {
          color: 'text-green-600 bg-green-100',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Approved'
        };
      case 'checked_in':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Checked In'
        };
      case 'pending_approval':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: <Clock className="w-4 h-4" />,
          text: 'Pending Approval'
        };
      case 'payment_pending':
        return {
          color: 'text-orange-600 bg-orange-100',
          icon: <Clock className="w-4 h-4" />,
          text: 'Payment Pending'
        };
      case 'rejected':
        return {
          color: 'text-red-600 bg-red-100',
          icon: <XCircle className="w-4 h-4" />,
          text: 'Rejected'
        };
      case 'checked_out':
        return {
          color: 'text-gray-600 bg-gray-200',
          icon: <LogOut className="w-4 h-4" />,
          text: 'Checked Out'
        };
      case 'cancelled':
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <XCircle className="w-4 h-4" />,
          text: cancelledBy === 'user' ? 'Cancelled by User' : 'Cancelled'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <Clock className="w-4 h-4" />,
          text: 'Unknown'
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Open contact modal
  // Open contact modal
  const openContactModal = (booking) => {
    // Check if ownerId is populated object (from .populate('ownerId'))
    // Or fall back to ownerSnapshot
    const ownerData = (booking.ownerId && typeof booking.ownerId === 'object')
      ? booking.ownerId
      : (booking.ownerSnapshot || {
        name: booking.property?.ownerName,
        phone: booking.property?.ownerPhone,
        email: booking.property?.ownerEmail
      });

    console.log('[DEBUG] Opening contact modal with owner:', ownerData);
    setSelectedOwner(ownerData);
    setContactModalOpen(true);
  };

  // Get amenity icon
  const getAmenityIcon = (amenity) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="w-4 h-4" />;
      case 'parking':
        return <Car className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'food':
        return <Utensils className="w-4 h-4" />;
      case 'gym':
        return <Dumbbell className="w-4 h-4" />;
      case 'cctv':
        return <Camera className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <SeekerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout>
      <div className="p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">
            Manage and track all your room bookings and reservations.
          </p>
        </motion.div>

        {/* Check-in Date Notification Banner */}
        {bookings.some(b => b.status === 'pending_approval' && !b.checkInDate) && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-4 shadow-sm"
          >
            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="text-purple-900 font-bold">Action Required: Set Check-in Date</h4>
              <p className="text-purple-700 text-sm mt-1">
                For bookings pending approval, please set your preferred check-in date. <b>Note: Owner approval is typically granted only after you've specified a check-in date.</b>
              </p>
            </div>
          </motion.div>
        )}

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by property name, room number, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </p>
            <button
              onClick={fetchBookings}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600 mb-6">
              {bookings.length === 0
                ? "You haven't made any bookings yet. Start exploring properties to book your perfect room!"
                : "No bookings match your current filters. Try adjusting your search criteria."
              }
            </p>
            {bookings.length === 0 && (
              <button
                onClick={() => navigate('/seeker-dashboard')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Properties
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking, index) => {
              const statusInfo = getStatusInfo(booking.status, booking.cancelledBy);
              console.log('Booking status:', booking.status, 'Booking ID:', booking._id); // Debug log


              return (
                <motion.div
                  key={booking._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Room and Property Images */}
                      <div className="lg:w-80 flex-shrink-0">
                        {booking.status === 'rejected' ? (
                          // Show rejection message instead of room details
                          <div className="relative">
                            <div className="w-full h-48 bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                                <p className="text-red-600 font-medium">Booking Rejected</p>
                                <p className="text-red-500 text-sm">Room details unavailable</p>
                              </div>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.text}
                              </span>
                            </div>
                          </div>
                        ) : (
                          // Show normal room details for non-rejected bookings
                          <div className="relative">
                            {/* Room Image (Primary) */}
                            <img
                              src={booking.room?.roomImage || booking.room?.room_image || booking.room?.toilet_image || booking.room?.toiletImage || booking.room?.images?.room || booking.room?.images?.toilet || (Array.isArray(booking.property?.images) ? booking.property.images[0] : (booking.property?.images?.front || booking.property?.images?.gallery?.[0])) || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'}
                              alt={`Room ${booking.room?.roomNumber || 'N/A'} - ${booking.property?.propertyName || 'Property'}`}
                              className="w-full h-48 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop';
                              }}
                            />
                            <div className="absolute top-3 right-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.text}
                              </span>
                            </div>
                            {/* Room Number Badge */}
                            <div className="absolute bottom-3 left-3">
                              <span className="px-3 py-1 bg-black bg-opacity-70 text-white text-sm font-medium rounded-lg">
                                Room {booking.room?.roomNumber || 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Property Image (Secondary) - Smaller - Only show if not rejected */}
                        {booking.status !== 'rejected' && (booking.property?.images?.[0] || booking.property?.images?.front) && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                              <Building className="w-3 h-3" />
                              <span>Property View</span>
                            </div>
                            <img
                              src={Array.isArray(booking.property?.images) ? booking.property.images[0] : (booking.property?.images?.front || booking.property?.images?.gallery?.[0])}
                              alt={booking.property.propertyName || 'Property'}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        {/* Room Image Gallery - If multiple room images - Only show if not rejected */}
                        {booking.status !== 'rejected' && ((booking.room?.images && booking.room.images.length > 1) || (booking.room?.roomImage && booking.room?.toiletImage)) && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                              <Camera className="w-3 h-3" />
                              <span>Room Gallery</span>
                            </div>
                            <div className="flex gap-1 overflow-x-auto">
                              {/* Room Image */}
                              {booking.room?.roomImage && (
                                <img
                                  src={booking.room.roomImage}
                                  alt={`Room ${booking.room?.roomNumber || 'N/A'} - Main`}
                                  className="w-16 h-12 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              {/* Toilet Image */}
                              {booking.room?.toiletImage && (
                                <img
                                  src={booking.room.toiletImage}
                                  alt={`Room ${booking.room?.roomNumber || 'N/A'} - Bathroom`}
                                  className="w-16 h-12 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              {/* Additional images from images array */}
                              {Array.isArray(booking.room?.images) && booking.room.images.slice(0, 2).map((image, idx) => (
                                <img
                                  key={idx}
                                  src={image}
                                  alt={`Room ${booking.room?.roomNumber || 'N/A'} - Photo ${idx + 1}`}
                                  className="w-16 h-12 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                          <div>
                            {/* Property Name - More Prominent */}
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="w-5 h-5 text-blue-600" />
                              <h3 className="text-2xl font-bold text-gray-900">
                                {booking.property?.propertyName || 'Unnamed Property'}
                              </h3>
                            </div>

                            {/* Address */}
                            <div className="flex items-center text-gray-600 mb-3">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span className="text-sm">
                                {booking.property?.address
                                  ? (typeof booking.property.address === 'string'
                                    ? booking.property.address
                                    : `${booking.property.address.street || ''}, ${booking.property.address.city || ''}, ${booking.property.address.state || ''} ${booking.property.address.pincode || ''}`.trim().replace(/^,\s*|,\s*$/g, ''))
                                  : 'Address not available'
                                }
                              </span>
                            </div>

                            {/* Room Details */}
                            {booking.status !== 'rejected' && (
                              <div className="flex items-center text-gray-600 mb-2">
                                <Bed className="w-4 h-4 mr-1" />
                                <span className="text-sm font-medium">Room {booking.room?.roomNumber || 'N/A'}</span>
                                <span className="mx-2">•</span>
                                <span className="text-sm">{booking.room?.roomType || 'Standard Room'}</span>
                                {booking.room?.bedType && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-sm">{booking.room.bedType}</span>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Additional Room Info */}
                            {booking.status !== 'rejected' && (
                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                {booking.room?.occupancy && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>{booking.room.occupancy} person{booking.room.occupancy > 1 ? 's' : ''}</span>
                                  </div>
                                )}
                                {booking.room?.roomSize && (
                                  <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    <span>{booking.room.roomSize} sq ft</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Property Type Badge */}
                            {booking.property?.propertyType && (
                              <div className="inline-block">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  {booking.property.propertyType}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 lg:mt-0 lg:text-right">
                            {booking.status === 'rejected' ? (
                              <div className="text-center">
                                <div className="text-lg font-bold text-red-600 mb-1">
                                  Booking Rejected
                                </div>
                                <div className="text-sm text-red-500">Room unavailable</div>
                              </div>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatCurrency(booking.room?.rent || 0)}
                                </div>
                                <div className="text-sm text-gray-600">per month</div>
                              </>
                            )}
                          </div>
                        </div>


                        {/* Booking Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Check-in:</span>
                                <span>{formatDate(booking.checkInDate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Check-out:</span>
                                <span>{formatDate(booking.checkOutDate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Security Deposit:</span>
                                <span>{formatCurrency(
                                  booking.payment?.securityDeposit ||
                                  booking.property?.security_deposit ||
                                  booking.property?.securityDeposit ||
                                  booking.securityDeposit || 0
                                )}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Amount:</span>
                                <span className="font-medium">{formatCurrency(
                                  booking.payment?.totalAmount ||
                                  booking.totalAmount ||
                                  ((booking.room?.rent || 0) + (booking.payment?.securityDeposit || booking.property?.security_deposit || 0)) || 0
                                )}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Payment Info</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Payment Status:</span>
                                <span className={`px-2 py-1 rounded text-xs ${booking.payment?.paymentStatus === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {booking.payment?.paymentStatus || 'Pending'}
                                </span>
                              </div>
                              {booking.payment?.paidAt && (
                                <div className="flex justify-between">
                                  <span>Paid On:</span>
                                  <span>{formatDate(booking.payment.paidAt)}</span>
                                </div>
                              )}
                              {booking.approvedAt && (
                                <div className="flex justify-between">
                                  <span>Approved On:</span>
                                  <span>{formatDate(booking.approvedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Room Amenities */}
                        {booking.status !== 'rejected' && booking.room?.amenities && Object.keys(booking.room.amenities).length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Room Amenities</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(booking.room.amenities)
                                .filter(([key, value]) => value === true)
                                .slice(0, 6)
                                .map(([amenity, value]) => (
                                  <span
                                    key={amenity}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                  >
                                    {getAmenityIcon(amenity)}
                                    {amenity}
                                  </span>
                                ))}
                              {Object.keys(booking.room.amenities).filter(key => booking.room.amenities[key] === true).length > 6 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                  +{Object.keys(booking.room.amenities).filter(key => booking.room.amenities[key] === true).length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Property Owner */}
                        {booking.property?.ownerName && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Property Owner</h4>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{booking.property.ownerName}</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <button
                            onClick={() => navigate(`/booking-dashboard/${booking._id}`)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>View Details</span>
                          </button>

                          <button
                            onClick={() => navigate(`/seeker/property/${booking.property?._id}`)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Property</span>
                          </button>

                          {/* Only show room-related actions if booking is not rejected */}
                          {booking.status !== 'rejected' && (
                            <button
                              onClick={() => navigate(`/seeker/room/${booking.room?._id}`)}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                            >
                              <Bed className="w-4 h-4" />
                              <span>View Room</span>
                            </button>
                          )}

                          <button
                            onClick={() => openContactModal(booking)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Contact Owner</span>
                          </button>

                          {/* Set Check-in Button - Hide if checked out */}
                          {booking.status !== 'checked_in' && booking.status !== 'rejected' && booking.status !== 'checked_out' && (
                            <button
                              onClick={() => openCheckInModal(booking)}
                              className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${!booking.checkInDate ? 'from-purple-600 to-indigo-700 animate-pulse' : 'from-purple-600 to-purple-700'} text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium`}
                            >
                              <LogIn className="w-4 h-4" />
                              <span>{booking.checkInDate ? 'Change Check-in' : 'Set Check-in Date'}</span>
                            </button>
                          )}



                          {/* Different actions based on booking status */}
                          {booking.status === 'rejected' ? (
                            /* No action button for rejected bookings */
                            <div className="text-center text-gray-500 text-sm py-2">
                              Booking was rejected by owner
                            </div>
                          ) : booking.status === 'checked_in' ? (
                            /* No cancel for checked-in */
                            <div className="text-center text-blue-600 text-sm py-2 font-medium">
                              Successfully Checked In
                            </div>
                          ) : booking.status === 'checked_out' ? (
                            /* Checked Out Message */
                            <div className="text-center text-gray-600 text-sm py-2 font-medium">
                              Checked Out on {booking.actualCheckOutDate ? new Date(booking.actualCheckOutDate).toLocaleDateString() : 'Unknown Date'}
                            </div>
                          ) : (
                            /* Cancel Booking Button for non-rejected, non-checked-in, non-checked-out bookings */
                            <button
                              onClick={() => openCancelModal(booking)}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium border-2 border-red-800"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Cancel Booking</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Owner Modal */}
      <ContactOwnerModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        owner={selectedOwner}
      />

      {/* Cancel Booking Confirmation Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCancelModal}
            >
              <motion.div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {bookingToCancel?.status === 'rejected' ? 'Remove Booking' : 'Cancel Booking'}
                      </h3>
                      <p className="text-sm text-gray-500">This action cannot be undone</p>
                    </div>
                  </div>
                  <button
                    onClick={closeCancelModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={cancelling}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-800 font-medium mb-1">Warning</p>
                        <p className="text-red-700 text-sm">
                          {bookingToCancel?.status === 'rejected'
                            ? 'Are you sure you want to remove this rejected booking from your list? This action cannot be undone and the booking will be permanently removed.'
                            : 'Are you sure you want to cancel this booking? This action cannot be undone and the booking will be permanently removed.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  {bookingToCancel && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Property:</span>
                          <span className="font-medium">{bookingToCancel.property?.propertyName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Room:</span>
                          <span className="font-medium">Room {bookingToCancel.room?.roomNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${bookingToCancel.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            bookingToCancel.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                            {bookingToCancel.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeCancelModal}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingToCancel?.status === 'rejected' ? 'Keep Booking' : 'Keep Booking'}
                  </button>
                  <button
                    onClick={cancelBooking}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{bookingToCancel?.status === 'rejected' ? 'Removing...' : 'Cancelling...'}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>{bookingToCancel?.status === 'rejected' ? 'Remove Booking' : 'Cancel Booking'}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Check-in Modal */}
      <AnimatePresence>
        {checkInModalOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCheckInModal}
            >
              <motion.div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <LogIn className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Mark Check-in Date</h3>
                      <p className="text-sm text-gray-500">Select your check-in date</p>
                    </div>
                  </div>
                  <button
                    onClick={closeCheckInModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={checkingIn}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="mb-6">
                  {/* Booking Details */}
                  {bookingToCheckIn && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Property:</span>
                          <span className="font-medium">{bookingToCheckIn.property?.propertyName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Room:</span>
                          <span className="font-medium">Room {bookingToCheckIn.room?.roomNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Check-in:</span>
                          <span className="font-medium">{formatDate(bookingToCheckIn.checkInDate)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date Input */}
                  <div className="space-y-2">
                    <label htmlFor="checkInDate" className="block text-sm font-medium text-gray-700">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      id="checkInDate"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={checkingIn}
                    />
                    <p className="text-xs text-gray-500">
                      Select the date when you plan to check into the room
                    </p>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeCheckInModal}
                    disabled={checkingIn}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={markCheckIn}
                    disabled={checkingIn || !checkInDate}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {checkingIn ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Marking...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Mark Check-in</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SeekerLayout>
  );
};

export default SeekerBookings;
