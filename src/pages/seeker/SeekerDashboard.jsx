import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import Chatbot from '../../components/Chatbot';
import LeafletMap from '../../components/maps/LeafletMap';
import UniversalSearchInput from '../../components/search/UniversalSearchInput';
import locationService from '../../services/locationService';
import {
  Search,
  Heart,
  Calendar,
  MapPin,
  Star,
  Users,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

const SeekerDashboard = () => {
  const [user, setUser] = useState({});
  const [favoritePGs, setFavoritePGs] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Location Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [radius, setRadius] = useState(5); // in kilometers
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyPGs, setNearbyPGs] = useState([]);
  const [allProperties, setAllProperties] = useState([]); // Store all properties
  const [recentSearches, setRecentSearches] = useState([]); // Store recent searches
  const navigate = useNavigate();
  const [locationError, setLocationError] = useState(null);

  // Load all properties on component mount
  useEffect(() => {
    loadAllPropertiesOnMap();
  }, []);

  // Location selection handler for Leaflet maps
  const handleLocationSelect = (locationData) => {
    setSelectedLocation(locationData);
    setSearchQuery(locationData.name);

    // Add to recent searches
    addToRecentSearches(locationData);

    // Search for nearby PGs
    searchNearbyPGs(locationData.lat, locationData.lng, radius);
  };

  // Add location to recent searches
  const addToRecentSearches = (locationData) => {
    const searchEntry = {
      id: Date.now(),
      location: locationData.name,
      address: locationData.address,
      lat: locationData.lat,
      lng: locationData.lng,
      timestamp: new Date().toLocaleString(),
      radius: radius,
      pgCount: 0 // Will be updated after search
    };

    // Remove if already exists (to avoid duplicates)
    const filteredSearches = recentSearches.filter(search =>
      search.lat !== locationData.lat || search.lng !== locationData.lng
    );

    // Add to beginning of array
    const newSearches = [searchEntry, ...filteredSearches].slice(0, 5); // Keep only last 5
    setRecentSearches(newSearches);
  };

  // Get current location using Nominatim
  const getCurrentLocation = async () => {
    setIsSearching(true);
    setLocationError(null);

    try {
      const locationData = await locationService.getCurrentLocation('leaflet');

      setCurrentLocation({
        lat: locationData.lat,
        lng: locationData.lng,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp
      });

      // Use the location handler
      handleLocationSelect(locationData);

    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationError(error.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to format address
  const formatAddress = (addr) => {
    if (!addr) return 'Address not available';
    if (typeof addr === 'string') return addr;
    const { street, city, state, pincode, landmark } = addr;
    return [street, landmark, city, state, pincode].filter(Boolean).join(', ');
  };

  // Calculate distance between two coordinates using Haversine formula
  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    return calculateDistance(lat1, lng1, lat2, lng2);
  };

  const searchNearbyPGs = async (lat, lng, radiusKm = radius) => {
    try {
      // Fetch real properties from the database using apiClient
      const response = await apiClient.get('/property/public/properties');

      const properties = response.data.data || [];

      // Transform properties to match the expected format and filter by radius
      const nearbyProperties = properties
        .filter(property => property.latitude && property.longitude) // Only include properties with coordinates
        .map((property) => {
          const dKm = getDistanceKm(lat, lng, property.latitude, property.longitude);
          return {
            id: property._id,
            name: property.property_name || property.propertyName || 'Unnamed Property',
            address: formatAddress(property.address),
            lat: property.latitude,
            lng: property.longitude,
            price: property.rent ? `₹${property.rent.toLocaleString()}` : 'Price not available',
            rating: 4.5, // Default rating since we don't have ratings yet
            distance: `${dKm.toFixed(1)} km`,
            _distanceKm: dKm,
            amenities: property.amenities ? Object.entries(property.amenities).filter(([key, value]) => value === true).map(([key]) => key) : [],
            propertyType: property.propertyType || 'PG',
            totalRooms: property.totalRooms || property.maxOccupancy || 'N/A',
            images: property.images ? [property.images.front, property.images.hall, ...(property.images.gallery || [])].filter(Boolean) : [],
            ownerName: property.ownerName || 'Unknown Owner',
          };
        })
        .filter(pg => pg._distanceKm <= radiusKm)
        .sort((a, b) => a._distanceKm - b._distanceKm); // Sort by distance

      setNearbyPGs(nearbyProperties);

      // Update recent searches with PG count
      updateRecentSearchPGCount(lat, lng, nearbyProperties.length);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setNearbyPGs([]);
    }
  };

  // Update recent search with PG count
  const updateRecentSearchPGCount = (lat, lng, pgCount) => {
    setRecentSearches(prevSearches =>
      prevSearches.map(search =>
        Math.abs(search.lat - lat) < 0.001 && Math.abs(search.lng - lng) < 0.001
          ? { ...search, pgCount }
          : search
      )
    );
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadAllPropertiesOnMap = async () => {
    try {
      // Use apiClient to fetch properties
      const response = await apiClient.get('/property/public/properties');

      const properties = response.data.data || [];

      // Transform properties to match the expected format
      const allProperties = properties
        .filter(property => property.latitude && property.longitude) // Only include properties with coordinates
        .map((property) => {
          return {
            id: property._id,
            name: property.property_name || property.propertyName || 'Unnamed Property',
            address: formatAddress(property.address),
            lat: property.latitude,
            lng: property.longitude,
            price: property.rent ? `₹${property.rent.toLocaleString()}` : 'Price not available',
            rating: 4.5, // Default rating since we don't have ratings yet
            distance: '0 km', // Will be calculated when user searches
            _distanceKm: 0,
            amenities: property.amenities ? Object.entries(property.amenities).filter(([key, value]) => value === true).map(([key]) => key) : [],
            propertyType: property.propertyType || 'PG',
            totalRooms: property.totalRooms || property.maxOccupancy || 'N/A',
            images: property.images || [],
            ownerName: property.ownerName || 'Unknown Owner'
          };
        });

      console.log(`Loaded ${allProperties.length} properties`);
      setAllProperties(allProperties);
      // Properties will be displayed on Leaflet map automatically
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  // Open property modal and fetch full details
  const openPropertyDetails = (propertyId) => {
    navigate(`/seeker/property/${propertyId}`);
  };


  // Handle radius change
  const handleRadiusChange = (e) => {
    const newRadius = parseInt(e.target.value);
    setRadius(newRadius);
    if (selectedLocation) {
      searchNearbyPGs(selectedLocation.lat, selectedLocation.lng, newRadius);
    } else if (currentLocation) {
      searchNearbyPGs(currentLocation.lat, currentLocation.lng, newRadius);
    }
  };


  // Check if user has confirmed booking or active tenancy and redirect
  const checkAndRedirectToDashboard = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id || userData._id || userData.userId;

      if (!userId) return;

      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. Check for Active Tenancy (Higher Priority)
      // 1. Check for Active Tenancy (Higher Priority)
      try {
        const tenantResponse = await apiClient.get('/property/user/tenant-status');

        const tenantData = tenantResponse.data;
        if (tenantData.success && tenantData.isTenant) {
          console.log('User has active tenancy, redirecting to TenantDashboard');
          navigate('/tenant-dashboard');
          return true;
        }
      } catch (err) {
        console.error('Error checking tenant status:', err);
      }

      // 2. Check for Confirmed Booking (Optional: could redirect to a "Booking Confirmed" view, but user wants to stay on Seeker Dashboard)
      // Removed redirect to /my-room here to keep user on seeker dashboard until checked-in.
    } catch (error) {
      console.error('Error checking dashboard redirect status:', error);
    }
    return false;
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    // Check if this is the user's first login
    const checkFirstLogin = () => {
      const userId = userData._id || userData.id;
      const lastLoginKey = `lastLogin_${userId}`;
      const lastLogin = localStorage.getItem(lastLoginKey);

      if (!lastLogin) {
        // First time logging in
        setIsFirstLogin(true);
        // Set current timestamp as last login
        localStorage.setItem(lastLoginKey, new Date().toISOString());
      } else {
        // Not first login
        setIsFirstLogin(false);
        // Update last login timestamp
        localStorage.setItem(lastLoginKey, new Date().toISOString());
      }
    };

    checkFirstLogin();

    // Check if user has confirmed booking or active tenancy and redirect
    checkAndRedirectToDashboard().then((redirected) => {
      if (!redirected) {
        // Only fetch data if no redirect happened
        // Clear mock sections until real endpoints exist
        setRecentSearches([]);

        // Fetch real data
        fetchPropertyRecommendations();
        fetchFavoritesCount();
        fetchBookingsCount();
      }
    });

    // Listen for booking status changes
    const handleBookingStatusChange = (event) => {
      console.log('Booking status change detected:', event.detail);
      if (event.detail.status === 'confirmed' || event.detail.status === 'approved') {
        // Redirect to PostBookingDashboard when booking is confirmed
        setTimeout(() => {
          checkAndRedirectToDashboard();
        }, 1000); // Small delay to ensure booking is saved
      }
    };

    // Add event listeners
    window.addEventListener('booking-approved', handleBookingStatusChange);
    window.addEventListener('booking-status-changed', handleBookingStatusChange);

    // Cleanup
    return () => {
      window.removeEventListener('booking-approved', handleBookingStatusChange);
      window.removeEventListener('booking-status-changed', handleBookingStatusChange);
    };
  }, []);

  // Fetch property recommendations from the database
  const fetchPropertyRecommendations = async () => {
    try {
      const response = await apiClient.get('/property/public/properties');

      const properties = response.data.data || [];

      console.log('=== RAW PROPERTIES DATA ===');
      console.log('Total properties from API:', properties.length);
      properties.forEach((property, index) => {
        console.log(`\nProperty ${index + 1}:`);
        console.log('  _id:', property._id);
        console.log('  propertyName:', property.propertyName);
        console.log('  address:', property.address);
        console.log('  rent:', property.rent);
        console.log('  propertyType:', property.propertyType);
        console.log('  maxOccupancy:', property.maxOccupancy);
        console.log('  amenities:', property.amenities);
        console.log('  images:', property.images);
        console.log('  description:', property.description);
        console.log('  latitude:', property.latitude);
        console.log('  longitude:', property.longitude);
      });
      console.log('=== END RAW PROPERTIES ===');

      // Transform properties to recommendations format (limit to 4 for display)
      const recommendations = properties
        .slice(0, 4)
        .map((property, index) => ({
          id: property._id,
          name: property.property_name || property.propertyName || 'Unnamed Property',
          location: formatAddress(property.address),
          price: property.rent ? `₹${property.rent.toLocaleString()}` : 'Price not available',
          rating: 4.5, // Default rating
          image: (property.images?.front || property.images?.hall || (property.images?.gallery && property.images.gallery[0]))
            ? (property.images?.front || property.images?.hall || property.images?.gallery?.[0])
            : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
          distance: `${(index + 1) * 2}.${index + 1} km`, // Mock distance for now
          matchScore: 95 - (index * 5), // Decreasing match score
          propertyType: property.propertyType || 'PG',
          totalRooms: property.maxOccupancy || 'N/A', // Using maxOccupancy as fallback since rooms array is not available in this endpoint
          amenities: property.amenities || []
        }));

      setRecommendations(recommendations);
      console.log('=== RECOMMENDATIONS DATA ===');
      console.log('Total recommendations:', recommendations.length);
      recommendations.forEach((rec, index) => {
        console.log(`\nRecommendation ${index + 1}:`);
        console.log('  ID:', rec.id);
        console.log('  Name:', rec.name);
        console.log('  Location:', rec.location);
        console.log('  Price:', rec.price);
        console.log('  Rating:', rec.rating);
        console.log('  Distance:', rec.distance);
        console.log('  Match Score:', rec.matchScore + '%');
        console.log('  Property Type:', rec.propertyType);
        console.log('  Max Occupancy:', rec.maxOccupancy);
        console.log('  Amenities:', rec.amenities);
        console.log('  Image URL:', rec.image);
      });
      console.log('=== END RECOMMENDATIONS ===');
    } catch (error) {
      console.error('Error fetching property recommendations:', error);

      setRecommendations([]);
    }
  };

  // Fetch favorites count
  const fetchFavoritesCount = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.userId || user._id;
      console.log('Fetching favorites for userId:', userId);

      if (!userId) {
        console.log('No userId found in localStorage');
        return;
      }

      const url = `/property/favorites`;
      console.log('Favorites API URL:', url);

      const response = await apiClient.get(url);

      console.log('Favorites API response status:', response.status);

      if (response.status === 200) {
        const data = response.data;
        console.log('Favorites data received:', data);
        setFavoritePGs(data.favorites || []);
        console.log('Favorites count:', (data.favorites || []).length);
      }
    } catch (error) {
      console.error('Error fetching favorites count:', error);
      setFavoritePGs([]);
    }
  };

  // Fetch bookings count
  const fetchBookingsCount = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.userId || user._id;
      console.log('Fetching bookings for userId:', userId);

      if (!userId) {
        console.log('No userId found in localStorage');
        return;
      }

      const url = `/property/user/bookings`;
      console.log('Bookings API URL:', url);

      const response = await apiClient.get(url);

      console.log('Bookings API response status:', response.status);

      if (response.status === 200) {
        const data = response.data;
        console.log('Bookings data received:', data);
        setUpcomingBookings(data.bookings || []);
        console.log('Bookings count:', (data.bookings || []).length);
      }
    } catch (error) {
      console.error('Error fetching bookings count:', error);
      setUpcomingBookings([]);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <SeekerLayout>
      <div className="p-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isFirstLogin ? 'Welcome' : 'Welcome back'}, {user.name || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            {isFirstLogin
              ? "Welcome to Lyvo+! Let's help you find your perfect co-living space."
              : "Ready to find your perfect PG? Here's what's happening with your account."
            }
          </p>
        </motion.div>


        {/* Location Search Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-red-600" />
              Find PGs Near You
            </h2>

            {/* Map Info */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Interactive Map:</span>
              <div className="flex items-center space-x-1 text-xs text-blue-600">
                <Layers className="w-3 h-3" />
                <span>Leaflet + OpenStreetMap</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <UniversalSearchInput
                mapType="leaflet"
                onLocationSelect={handleLocationSelect}
                placeholder="Search for a location (e.g., Koramangala, Bangalore)"
              />
            </div>

          </div>

          {/* Radius Setting */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Search Radius:</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="20"
                value={radius}
                onChange={handleRadiusChange}
                className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 min-w-[3rem]">{radius} km</span>
            </div>
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">{selectedLocation.name}</p>
                  <p className="text-sm text-gray-600">{selectedLocation.address}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Getting Your Location...</h4>
                  <p className="text-sm text-gray-600">Please allow location access and wait a moment.</p>
                </div>
              </div>
            </div>
          )}


          {/* Error State */}
          {locationError && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Location Error</h4>
                  <p className="text-sm text-gray-600 mb-2">{locationError}</p>
                  <button
                    onClick={() => setLocationError(null)}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Map Container - Leaflet Only */}
          <div className="mt-4">
            <LeafletMap
              properties={selectedLocation ? nearbyPGs : allProperties}
              selectedLocation={selectedLocation}
              radius={radius}
              onPropertyClick={openPropertyDetails}
              height="320px"
              showRadius={!!selectedLocation}
            />

            {/* Map Info */}
            <div className="mt-2 text-xs text-gray-500">
              <span className="text-green-600">✓ Leaflet Map Loaded</span>
              <span className="ml-2 text-blue-600">OpenStreetMap Tiles</span>
            </div>
          </div>

          {/* Nearby PGs Results */}
          {nearbyPGs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Found {nearbyPGs.length} PGs within {radius} km
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyPGs.map((pg, index) => (
                  <motion.div
                    key={pg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openPropertyDetails(pg.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{pg.name}</h4>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                        {pg.distance}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{pg.address}</p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">{pg.rating}</span>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {pg.propertyType}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Total Rooms:</span>
                        <span className="font-medium">{pg.totalRooms || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pg.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Searches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Searches</h2>
              </div>
              <div className="space-y-3">
                {recentSearches.map((search, index) => (
                  <motion.div
                    key={search.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleLocationSelect(search)}
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{search.location}</p>
                        <p className="text-sm text-gray-500">{search.timestamp}</p>
                        <p className="text-xs text-blue-600">{search.radius}km radius</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {search.pgCount > 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {search.pgCount} PGs
                        </span>
                      )}
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </motion.div>
                ))}
                {recentSearches.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No recent searches yet</p>
                    <p className="text-sm">Search for a location to see it here</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Available Rooms</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((pg, index) => (
                  <motion.div
                    key={pg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className="group cursor-pointer"
                    onClick={() => openPropertyDetails(pg.id)}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={pg.image}
                        alt={pg.name}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {pg.matchScore}% Match
                        </div>
                        {pg.rooms && pg.rooms.length > 0 && (
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${pg.rooms.filter(room => room.room_status === 'available' && room.isAvailable).length > 0
                            ? 'bg-green-600 text-white'
                            : 'bg-orange-600 text-white'
                            }`}>
                            {pg.rooms.filter(room => room.room_status === 'available' && room.isAvailable).length > 0
                              ? 'Rooms Available'
                              : 'Fully Booked'
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {pg.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">{pg.location}</span>
                        <span className="text-xs text-gray-400">• {pg.distance}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{pg.rating}</span>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          {pg.propertyType}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 mt-2">
                        <div className="flex items-center justify-between">
                          <span>Total Rooms:</span>
                          <span className="font-medium">{pg.totalRooms || 'N/A'}</span>
                        </div>
                        {pg.rooms && pg.rooms.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span>Available:</span>
                            <span className="font-medium text-green-600">
                              {pg.rooms.filter(room => room.room_status === 'available' && room.isAvailable).length}/{pg.rooms.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-pink-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Favorites</span>
                  </div>
                  <span className="text-2xl font-bold text-pink-600">{favoritePGs.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Bookings</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{upcomingBookings.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Searches</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{recentSearches.length}</span>
                </div>
              </div>
            </motion.div>

            {/* Upcoming Bookings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bookings</h3>
              <div className="space-y-3">
                {upcomingBookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <h4 className="font-medium text-gray-900 text-sm mb-1">{booking.pgName}</h4>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Check-in: {booking.checkIn}</p>
                      <p>Check-out: {booking.checkOut}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-gray-900">{booking.amount}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)} flex items-center space-x-1`}>
                        {getStatusIcon(booking.status)}
                        <span className="capitalize">{booking.status}</span>
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Link
                to="/seeker-bookings"
                className="mt-4 w-full text-center text-red-600 hover:text-red-700 text-sm font-medium block"
              >
                View All Bookings
              </Link>
            </motion.div>

            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Quick Tips</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Save PGs to favorites for quick access</li>
                <li>• Use filters to find exact matches</li>
                <li>• Read reviews before booking</li>
                <li>• Contact owners for questions</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </SeekerLayout>
  );
};

export default SeekerDashboard;
