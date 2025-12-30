import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  Home,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Building,
  Bed,
  Bath,
  Wifi,
  Car,
  Utensils,
  Zap,
  Shield,
  User,
  Navigation,
  Share2,
  Heart,
  Settings,
  Camera,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Edit3,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Bell,
  FileText,
  CreditCard,
  Download,
  MessageCircle,
  ExternalLink,
  QrCode,
  Printer
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import apiClient from '../../utils/apiClient';

const BasicRoomDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [room, setRoom] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    amenities: false,
    contact: false,
    documents: false
  });

  useEffect(() => {
    fetchUserConfirmedBooking();
  }, []);

  const fetchUserConfirmedBooking = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (!authToken) {
        navigate('/login');
        return;
      }

      // Fetch user's bookings to find confirmed one
      const response = await apiClient.get('/property/user/bookings');

      if (response.status === 200) {
        const bookings = response.data.bookings || [];

        // Find confirmed booking
        const confirmedBooking = bookings.find(booking =>
          booking.status === 'confirmed' &&
          booking.payment?.paymentStatus === 'completed'
        );

        if (confirmedBooking) {
          await fetchBookingDetails(confirmedBooking._id);
        } else {
          setError('No confirmed booking found');
        }
      } else {
        throw new Error('Failed to fetch user bookings');
      }
    } catch (error) {
      console.error('Error fetching user confirmed booking:', error);
      setError('Failed to load your booking details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async (bookingId) => {
    try {
      const authToken = localStorage.getItem('authToken');

      if (!authToken) {
        navigate('/login');
        return;
      }

      // Fetch booking details
      const bookingResponse = await apiClient.get(`/property/bookings/${bookingId}`);

      if (bookingResponse.status !== 200) {
        throw new Error('Failed to fetch booking details');
      }

      const bookingData = bookingResponse.data;
      setBooking(bookingData.booking);

      // Fetch property details
      if (bookingData.booking.propertyId) {
        try {
          const propertyResponse = await apiClient.get(`/property/public/properties/${bookingData.booking.propertyId}`);
          if (propertyResponse.status === 200) {
            const propertyData = propertyResponse.data;
            setProperty(propertyData.property);

            // Find the specific room
            if (propertyData.property.rooms) {
              const roomData = propertyData.property.rooms.find(r => r._id === bookingData.booking.roomId);
              setRoom(roomData);
            }
          }
        } catch (propError) {
          console.error('Error fetching property details:', propError);
        }
      }

      // Fetch owner details (if available)
      if (bookingData.booking.ownerId) {
        try {
          const ownerResponse = await apiClient.get(`/user/profile/${bookingData.booking.ownerId}`);
          if (ownerResponse.status === 200) {
            const ownerData = ownerResponse.data;
            setOwner(ownerData);
          }
        } catch (ownerError) {
          console.error('Error fetching owner details:', ownerError);
        }
      }

    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to load booking details');
    }
  };

  const getAmenityIcon = (amenity) => {
    const icons = {
      wifi: <Wifi className="w-4 h-4" />,
      parking: <Car className="w-4 h-4" />,
      kitchen: <Utensils className="w-4 h-4" />,
      powerBackup: <Zap className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />,
      parking4w: <Car className="w-4 h-4" />,
      parking2w: <Car className="w-4 h-4" />,
      gym: <Settings className="w-4 h-4" />,
      laundry: <Settings className="w-4 h-4" />,
      balcony: <Home className="w-4 h-4" />,
      ac: <Zap className="w-4 h-4" />,
      tv: <Settings className="w-4 h-4" />,
      refrigerator: <Home className="w-4 h-4" />,
      geyser: <Zap className="w-4 h-4" />,
      cctv: <Camera className="w-4 h-4" />,
      lift: <Settings className="w-4 h-4" />,
      waterSupply: <Home className="w-4 h-4" />,
      housekeeping: <Users className="w-4 h-4" />
    };
    return icons[amenity] || <Home className="w-4 h-4" />;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    if (!booking?.checkInDate) return 0;
    const today = new Date();
    const checkIn = new Date(booking.checkInDate);
    const diffTime = checkIn - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const contactOwner = () => {
    if (owner && owner.phone) {
      window.open(`tel:${owner.phone}`, '_self');
    } else if (owner && owner.email) {
      window.open(`mailto:${owner.email}`, '_self');
    } else {
      toast({
        title: "Contact Information Not Available",
        description: "Owner contact details are not available",
        variant: "destructive",
      });
    }
  };

  const getDirections = () => {
    if (property && property.latitude && property.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "Location Not Available",
        description: "Property location coordinates are not available",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <SeekerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your room details...</p>
          </div>
        </div>
      </SeekerLayout>
    );
  }

  if (error || !booking) {
    return (
      <SeekerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Confirmed Booking</h2>
            <p className="text-gray-600 mb-6">
              {error || 'You don\'t have any confirmed bookings yet. Book a room to access this dashboard.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/seeker-dashboard')}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Rooms
              </button>
              <button
                onClick={() => navigate('/seeker-bookings')}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                View My Bookings
              </button>
            </div>
          </div>
        </div>
      </SeekerLayout>
    );
  }

  // Check if booking is confirmed
  const isBookingConfirmed = booking.status === 'confirmed' || booking.status === 'approved';

  if (!isBookingConfirmed) {
    return (
      <SeekerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Ready</h2>
            <p className="text-gray-600 mb-4">
              This dashboard is only available for confirmed bookings.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/seeker-dashboard')}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6"
          >
            {/* Property Image */}
            {property?.images && property.images.length > 0 && (
              <div className="relative h-64 sm:h-80 lg:h-96">
                <img
                  src={property.images[0]}
                  alt={property.propertyName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button className="bg-white/90 backdrop-blur-sm text-gray-700 p-2 rounded-full hover:bg-white transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="bg-white/90 backdrop-blur-sm text-gray-700 p-2 rounded-full hover:bg-white transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-semibold">4.8</span>
                      <span className="text-sm text-gray-600">• Excellent</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Property Info */}
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {property?.propertyName || 'Property Name'}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property?.address || 'Address'}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>Room {room?.roomNumber || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{room?.maxOccupancy || property?.maxOccupancy || 'N/A'} guests</span>
                    </div>
                    <div className="flex items-center">
                      <Home className="w-4 h-4 mr-1" />
                      <span>{room?.roomSize || 'N/A'} sq ft</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 lg:mt-0 lg:ml-6">
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(room?.rent)}
                    </div>
                    <div className="text-sm text-gray-600">per month</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/booking-dashboard/${booking._id}`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Details
                </button>
                <button
                  onClick={getDirections}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Directions
                </button>
                <button
                  onClick={contactOwner}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Owner
                </button>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Booking Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Booking Status</h2>
                  <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Confirmed
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Check-in</div>
                    <div className="font-semibold">{formatDate(booking.checkInDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Check-out</div>
                    <div className="font-semibold">{formatDate(booking.checkOutDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Days Remaining</div>
                    <div className="font-semibold text-blue-600">{getDaysRemaining()} days</div>
                  </div>
                </div>
              </motion.div>

              {/* Room Details */}
              {room && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Room Type</div>
                      <div className="font-semibold">{room.roomType}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Room Size</div>
                      <div className="font-semibold">{room.roomSize} sq ft</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Max Occupancy</div>
                      <div className="font-semibold">{room.maxOccupancy || property?.maxOccupancy} people</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Monthly Rent</div>
                      <div className="font-semibold">{formatCurrency(room.rent)}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Amenities */}
              {property?.amenities && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Amenities</h2>
                    <button
                      onClick={() => toggleSection('amenities')}
                      className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                    >
                      {expandedSections.amenities ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="ml-1">View All</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(property.amenities).slice(0, expandedSections.amenities ? undefined : 6).map(([amenity, available]) => {
                      if (available) {
                        return (
                          <div key={amenity} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                            {getAmenityIcon(amenity)}
                            <span className="text-sm font-medium text-gray-700">
                              {amenity.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </motion.div>
              )}

              {/* Property Description */}
              {property?.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Place</h2>
                  <p className="text-gray-600 leading-relaxed">{property.description}</p>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Owner Contact */}
              {owner && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Host
                  </h3>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="font-semibold text-gray-900">{owner.name || 'Host Name'}</p>
                    <p className="text-sm text-gray-600">{owner.email}</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={contactOwner}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Host
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Quick Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-semibold">{formatCurrency(booking.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-semibold">
                      {Math.ceil((new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/booking-dashboard/${booking._id}`)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Details
                  </button>
                  <button
                    onClick={getDirections}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </button>
                  <button
                    onClick={() => navigate('/seeker-bookings')}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View All Bookings
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default BasicRoomDashboard;
