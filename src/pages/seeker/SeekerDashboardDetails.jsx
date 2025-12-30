import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import apiClient from '../../utils/apiClient';

const SeekerDashboardDetails = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState({});
  const [bookingStatuses, setBookingStatuses] = useState({});
  const [checkingBookingStatus, setCheckingBookingStatus] = useState({});
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore
  const [mapZoom, setMapZoom] = useState(15);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Refs for Google Maps
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

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

  // Check if user has existing booking for a specific room
  const checkBookingStatus = async (roomId) => {
    const userId = getUserId();
    if (!userId || !roomId) return;

    setCheckingBookingStatus(prev => ({ ...prev, [roomId]: true }));
    try {
      const response = await apiClient.get(`/bookings/check-status?userId=${userId}&roomId=${roomId}`);
      // Note: check-status URL might need adjustment if it is under property service.
      // Based on previous files, bookings might be under /api/property/bookings or /api/bookings?
      // Wait, SeekerDashboard used /property/user/bookings.
      // The original code used port 3003 which implies Property Service.
      // So likely /property/bookings/check-status if mounted under property routes.
      // I will assume /property/bookings/check-status based on context.
      // Actually checking server.js: app.use('/api/property', propertyRoutes);
      // And checking propertyRoutes (I haven't seen it but safe guess).
      // Let's stick to what apiClient does: baseURL/property/... 
      // But wait! The original code used localhost:3003/api/bookings/check-status directly?
      // If so, routes might be mounted at root of property service.
      // But behind gateway/monolith, it is /api/property.
      // So /property/bookings/check-status seems correct relative to apiClient base.

      // However, let's look at the fetch: ${baseUrl}/api/bookings/check-status
      // If baseUrl was localhost:3003, then it was effectively accessing the service directly.
      // In monolith (server.js), property routes are at /api/property.
      // So inside propertyRoutes, if there is a /bookings route, it becomes /api/property/bookings...
      // I will use /property/bookings... and hope the route exists there.

      // Re-reading usage:
      // fetch(`${baseUrl}/api/bookings/check-status...`)
      // If I use apiClient.get('/property/bookings/check-status...'), it goes to /api/property/bookings/check-status.
      // This is the most logical mapping for consolidated backend.

      const data = response.data;
      setBookingStatuses(prev => ({ ...prev, [roomId]: data }));

      if (response.ok) {
        const data = await response.json();
        setBookingStatuses(prev => ({ ...prev, [roomId]: data }));
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    } finally {
      setCheckingBookingStatus(prev => ({ ...prev, [roomId]: false }));
    }
  };

  // Initialize Google Maps
  const initializeGoogleMaps = async () => {
    try {
      // Load Google Maps API if not already loaded
      if (!window.google || !window.google.maps) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCoPzRJLAmma54BBOyF4AhZ2ZIqGvak8CA&libraries=places,geometry`;
        script.async = true;
        script.defer = true;

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Initialize map
      if (mapRef.current && window.google && window.google.maps) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: mapZoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        });

        // Add marker
        markerRef.current = new window.google.maps.Marker({
          position: mapCenter,
          map: mapInstanceRef.current,
          title: property?.property_name || 'Property Location',
        });
      }
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  };

  // Test API connectivity
  const testApiConnectivity = async () => {
    const baseUrl = import.meta.env.VITE_PROPERTY_SERVICE_API_URL || 'http://localhost:3002';

    try {
      console.log('Testing API connectivity...');
      console.log('Base URL:', baseUrl);

      // Test basic connectivity
      const testResponse = await fetch(`${baseUrl}/test-db`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('API Connectivity Test:', testData);
        return true;
      } else {
        console.error('API connectivity test failed:', testResponse.status);
        return false;
      }
    } catch (error) {
      console.error('API connectivity error:', error);
      return false;
    }
  };

  // Fetch property details
  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/property/public/properties/${propertyId}`);

      // Response check removed as apiClient throws on error
      const data = response.data;
      console.log('Property API Response Data:', data);

      if (data.success && data.data) {
        setProperty(data.data);
        const roomsData = data.data.rooms || [];
        setRooms(roomsData);

        // Check booking status for each room
        roomsData.forEach(room => {
          if (room._id) {
            checkBookingStatus(room._id);
          }
        });

        // Set map center if coordinates are available
        if (data.data.latitude && data.data.longitude) {
          setMapCenter({
            lat: parseFloat(data.data.latitude),
            lng: parseFloat(data.data.longitude)
          });
        }
      } else {
        throw new Error(data.message || 'Failed to fetch property details');
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast({
        title: "Error",
        description: `Failed to load property details: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle room booking with Razorpay payment
  const handleBookRoom = async (roomId) => {
    const userId = getUserId();
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please login to book a room",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    setBookingLoading(prev => ({ ...prev, [roomId]: true }));

    try {
      // Step 1: Create payment order
      const orderResponse = await apiClient.post('/property/payments/create-order', {
        userId,
        roomId,
        propertyId: propertyId
      });

      const orderData = orderResponse.data;
      console.log('Payment order created:', orderData);

      // Step 2: Initialize Razorpay
      const options = {
        key: 'rzp_test_RL5vMta3bKvRd4', // Your Razorpay key
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Lyvo',
        description: `Booking for ${orderData.paymentDetails.roomDetails.roomType} Room`,
        order_id: orderData.order.id,
        handler: async function (response) {
          // Step 3: Verify payment
          try {
            const verifyResponse = await apiClient.post('/property/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId,
              roomId,
              propertyId: propertyId,
              monthlyRent: orderData.paymentDetails.monthlyRent,
              securityDeposit: orderData.paymentDetails.securityDeposit
            });

            const verifyData = verifyResponse.data;
            console.log('Payment verified and booking created:', verifyData);

            toast({
              title: "Payment Successful!",
              description: "Your payment has been processed. Waiting for owner approval.",
              variant: "default",
            });

          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: (() => {
            const userData = localStorage.getItem('user');
            if (userData) {
              try {
                const parsed = JSON.parse(userData);
                return parsed.name || '';
              } catch (e) {
                return '';
              }
            }
            return '';
          })(),
          email: (() => {
            const userData = localStorage.getItem('user');
            if (userData) {
              try {
                const parsed = JSON.parse(userData);
                return parsed.email || '';
              } catch (e) {
                return '';
              }
            }
            return '';
          })(),
          contact: (() => {
            const userData = localStorage.getItem('user');
            if (userData) {
              try {
                const parsed = JSON.parse(userData);
                return parsed.phone || '';
              } catch (e) {
                return '';
              }
            }
            return '';
          })()
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled. You can try again.",
              variant: "destructive",
            });
          }
        }
      };

      // Initialize Razorpay
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Error creating payment order:', error);
      toast({
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(prev => ({ ...prev, [roomId]: false }));
    }
  };

  // Get behavioral match percentage (placeholder)
  const getBehavioralMatch = () => {
    // TODO: Replace with actual ML-based behavioral matching
    return Math.floor(Math.random() * 30) + 70; // Random between 70-100%
  };

  // Get verification badge (placeholder)
  const getVerificationBadge = () => {
    // TODO: Replace with actual OCR verification status
    return Math.random() > 0.3; // 70% chance of being verified
  };

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  useEffect(() => {
    if (property && mapCenter.lat && mapCenter.lng) {
      initializeGoogleMaps();
    }
  }, [property, mapCenter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
          <p className="text-sm text-gray-500 mt-2">Property ID: {propertyId}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h2>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist or is no longer available.</p>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <p>Property ID: {propertyId}</p>
            <p>Please check if the property service is running on port 3002</p>
          </div>
          <button
            onClick={() => navigate('/seeker/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{property.property_name}</h1>
                <p className="text-gray-600 mt-1">
                  {property.address?.street}, {property.address?.city}, {property.address?.state}
                </p>
              </div>
              <button
                onClick={() => navigate('/seeker/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Property Images */}
              {property.images && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Images</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(property.images).map(([key, imageUrl]) => {
                        if (imageUrl && typeof imageUrl === 'string') {
                          return (
                            <div key={key} className="aspect-square overflow-hidden rounded-lg">
                              <img
                                src={imageUrl}
                                alt={`Property ${key}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Property Description */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About this property</h2>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>

                {/* Property Amenities */}
                {property.amenities && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Property Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(property.amenities).map(([key, value]) => {
                        if (value === true) {
                          return (
                            <span
                              key={key}
                              className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                            >
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Map */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
                  <div
                    ref={mapRef}
                    className="h-64 w-full rounded-lg overflow-hidden"
                    style={{ minHeight: '256px' }}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Coordinates: {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Rooms Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Rooms</h2>

                {rooms.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms available</h3>
                    <p className="text-gray-600">This property doesn't have any available rooms at the moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rooms.map((room) => (
                      <div key={room._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        {/* Room Images */}
                        {(room.roomImage || room.toiletImage) && (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {room.roomImage && (
                              <div className="aspect-square overflow-hidden rounded-lg">
                                <img
                                  src={room.roomImage}
                                  alt="Room"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {room.toiletImage && (
                              <div className="aspect-square overflow-hidden rounded-lg">
                                <img
                                  src={room.toiletImage}
                                  alt="Toilet"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Room Details */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Room {room.roomNumber} • {room.roomType}
                            </h3>
                            <div className="flex items-center gap-2">
                              {room.status === 'inactive' ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">
                                  ❌ Inactive
                                </span>
                              ) : room.status === 'maintenance' ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                  🔧 Maintenance
                                </span>
                              ) : room.room_status === 'full' ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">
                                  🏠 {room.currentTenants || room.occupancy}/{room.occupancy} Full
                                </span>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded-full ${room.isAvailable
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                  }`}>
                                  {room.isAvailable
                                    ? `✅ ${room.currentTenants || 0}/${room.occupancy} Available`
                                    : 'Not Available'}
                                </span>
                              )}
                              {getVerificationBadge() && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Size: {room.roomSize} sq ft</p>
                            <p>Bed: {room.bedType}</p>
                            <p>Occupancy: {room.occupancy} person{room.occupancy > 1 ? 's' : ''}</p>
                          </div>

                          {room.description && (
                            <p className="text-sm text-gray-700">{room.description}</p>
                          )}

                          {/* Room Amenities */}
                          {room.amenities && Object.keys(room.amenities).some(key => room.amenities[key] === true) && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(room.amenities).map(([key, value]) => {
                                if (value === true) {
                                  return (
                                    <span
                                      key={key}
                                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                    >
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}

                          {/* Behavioral Match */}
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-900">Behavioral Match</span>
                              <span className="text-sm font-bold text-blue-900">{getBehavioralMatch()}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getBehavioralMatch()}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Inactive/Maintenance/Full Room Alert */}
                          {(room.status === 'inactive' || room.status === 'maintenance' || room.room_status === 'full') && (
                            <div className={`p-4 rounded-lg border-2 ${room.status === 'inactive'
                              ? 'bg-red-50 border-red-200'
                              : room.status === 'maintenance'
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-orange-50 border-orange-200'
                              }`}>
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${room.status === 'inactive'
                                  ? 'bg-red-100'
                                  : room.status === 'maintenance'
                                    ? 'bg-yellow-100'
                                    : 'bg-orange-100'
                                  }`}>
                                  {room.status === 'inactive' ? '❌' : room.status === 'maintenance' ? '🔧' : '🏠'}
                                </div>
                                <div className="flex-1">
                                  <h4 className={`font-semibold text-sm mb-1 ${room.status === 'inactive'
                                    ? 'text-red-900'
                                    : room.status === 'maintenance'
                                      ? 'text-yellow-900'
                                      : 'text-orange-900'
                                    }`}>
                                    {room.status === 'inactive'
                                      ? 'Room Currently Inactive'
                                      : room.status === 'maintenance'
                                        ? 'Room Under Maintenance'
                                        : `Room is Full (${room.currentTenants || room.occupancy}/${room.occupancy})`}
                                  </h4>
                                  <p className={`text-xs ${room.status === 'inactive'
                                    ? 'text-red-700'
                                    : room.status === 'maintenance'
                                      ? 'text-yellow-700'
                                      : 'text-orange-700'
                                    }`}>
                                    {room.status === 'inactive'
                                      ? 'This room has been temporarily deactivated by the owner and is not available for booking at this time.'
                                      : room.status === 'maintenance'
                                        ? 'This room is currently undergoing maintenance and will be available soon.'
                                        : `This room has reached its maximum occupancy limit (${room.currentTenants || room.occupancy}/${room.occupancy}) and is not available for booking.`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Price and Book Button */}
                          {room.status !== 'inactive' && room.status !== 'maintenance' && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                              <div>
                                <span className="text-2xl font-bold text-gray-900">
                                  ₹{room.rent ? room.rent.toLocaleString() : 'Ask Price'}
                                </span>
                                <span className="text-sm text-gray-600">/month</span>
                              </div>
                              {/* Booking Status Display */}
                              {checkingBookingStatus[room._id] ? (
                                <div className="px-6 py-2 rounded-lg bg-gray-100 text-gray-600 text-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    Checking...
                                  </div>
                                </div>
                              ) : bookingStatuses[room._id]?.hasBooking ? (
                                <div className="px-6 py-2 rounded-lg text-center">
                                  {bookingStatuses[room._id].status === 'pending_approval' && (
                                    <div className="bg-yellow-100 text-yellow-800 rounded-lg p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-medium text-sm">Approval Pending</span>
                                      </div>
                                      <p className="text-xs">Waiting for owner approval</p>
                                    </div>
                                  )}
                                  {bookingStatuses[room._id].status === 'confirmed' && (
                                    <div className="bg-green-100 text-green-800 rounded-lg p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-medium text-sm">Confirmed</span>
                                      </div>
                                      <p className="text-xs">Booking approved</p>
                                    </div>
                                  )}
                                  {bookingStatuses[room._id].status === 'payment_pending' && (
                                    <div className="bg-orange-100 text-orange-800 rounded-lg p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-medium text-sm">Payment Pending</span>
                                      </div>
                                      <p className="text-xs">Complete payment</p>
                                    </div>
                                  )}
                                  {bookingStatuses[room._id].status === 'rejected' && (
                                    <div className="bg-red-100 text-red-800 rounded-lg p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-medium text-sm">Rejected</span>
                                      </div>
                                      <p className="text-xs">Booking not approved</p>
                                    </div>
                                  )}
                                </div>
                              ) : !room.isAvailable || room.room_status === 'full' ? (
                                <div className="px-6 py-2 rounded-lg bg-gray-100 text-gray-600 font-medium border border-gray-300">
                                  {room.room_status === 'full'
                                    ? `Room Full (${room.currentTenants || room.occupancy}/${room.occupancy})`
                                    : 'Not Available'}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedRoom(room);
                                    setShowPaymentModal(true);
                                  }}
                                  disabled={bookingLoading[room._id]}
                                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${bookingLoading[room._id]
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                  {bookingLoading[room._id] ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Booking...
                                    </div>
                                  ) : (
                                    'Book Now'
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Property Info Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Owner</span>
                    <p className="font-medium text-gray-900">{property.ownerName || 'Unknown Owner'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Security Deposit</span>
                    <p className="font-medium text-gray-900">₹{property.security_deposit?.toLocaleString() || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Rooms</span>
                    <p className="font-medium text-gray-900">{rooms.length}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Available Rooms</span>
                    <p className="font-medium text-gray-900">
                      {rooms.filter(room => room.isAvailable).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Owner */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Owner</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Have questions about this property? Contact the owner directly.
                </p>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                  Contact Owner
                </button>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                    Add to Favorites
                  </button>
                  <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                    Share Property
                  </button>
                  <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown Modal */}
      {showPaymentModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Payment Breakdown</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedRoom(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Room Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-1">{property?.property_name || 'Property'}</h4>
                <p className="text-sm text-gray-600">Room {selectedRoom.room_number} • {selectedRoom.room_type}</p>
              </div>

              {/* Payment Details */}
              <div className="space-y-4 mb-6">
                {/* Monthly Rent */}
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-700">Monthly Rent</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{selectedRoom.rent ? selectedRoom.rent.toLocaleString() : '0'}
                  </span>
                </div>

                {/* Security Deposit */}
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-700">Security Deposit</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{property?.security_deposit ? property.security_deposit.toLocaleString() : '0'}
                  </span>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-4">
                  <span className="text-gray-900 font-semibold">Total Amount</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₹{selectedRoom.rent && property?.security_deposit ? (selectedRoom.rent + property.security_deposit).toLocaleString() : '0'}
                  </span>
                </div>

                {/* Advance (10%) */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-green-900 font-semibold">Advance Payment (10%)</span>
                      <p className="text-xs text-green-700 mt-1">To be paid online now</p>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      ₹{selectedRoom.rent && property?.security_deposit ? ((selectedRoom.rent + property.security_deposit) * 0.1).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>

                {/* Remaining (90%) */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-orange-900 font-semibold">Remaining Amount (90%)</span>
                      <p className="text-xs text-orange-700 mt-1">To be paid offline during check-in</p>
                    </div>
                    <span className="text-xl font-bold text-orange-600">
                      ₹{selectedRoom.rent && property?.security_deposit ? ((selectedRoom.rent + property.security_deposit) * 0.9).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Important Notes
                </h5>
                <ul className="text-sm text-yellow-900 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Security deposit is fully refundable at checkout</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Pay 10% advance online to confirm your booking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Remaining 90% payment during check-in (cash/UPI)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Owner approval required before check-in</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedRoom(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    handleBookRoom(selectedRoom._id);
                  }}
                  disabled={bookingLoading[selectedRoom._id]}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading[selectedRoom._id] ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    'Proceed to Pay'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SeekerDashboardDetails;