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
  Layers,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

const SeekerDashboard = () => {
  const [user, setUser] = useState({});
  const [favoritePGs, setFavoritePGs] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Location Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [radius, setRadius] = useState(5); // in kilometers
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyPGs, setNearbyPGs] = useState([]);
  const [allProperties, setAllProperties] = useState([]); // Store all properties
  const [recentSearches, setRecentSearches] = useState([]); // Store recent searches
  const [recentlyViewed, setRecentlyViewed] = useState([]); // Store recently viewed properties
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
      timestamp: new Date().toISOString(),
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

    // Persist to localStorage
    localStorage.setItem('lyvo_recent_searches', JSON.stringify(newSearches));
  };

  // Add property to recently viewed
  const addToRecentlyViewed = (property) => {
    const viewEntry = {
      ...property,
      viewedAt: new Date().toISOString()
    };

    // Remove if already exists
    const filteredViews = recentlyViewed.filter(view => view.id !== property.id);

    // Add to beginning
    const newViews = [viewEntry, ...filteredViews].slice(0, 4); // Keep last 4
    setRecentlyViewed(newViews);

    // Persist to localStorage
    localStorage.setItem('lyvo_recently_viewed', JSON.stringify(newViews));
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
        .map((property, index) => {
          const dKm = getDistanceKm(lat, lng, property.latitude, property.longitude);
          return {
            id: property._id,
            name: property.property_name || property.propertyName || 'Unnamed Property',
            address: formatAddress(property.address),
            lat: property.latitude,
            lng: property.longitude,
            price: property.min_rent ? `₹${property.min_rent.toLocaleString()}` : (property.rent ? `₹${property.rent.toLocaleString()}` : 'Price not available'),
            securityDeposit: property.security_deposit ? `₹${property.security_deposit.toLocaleString()}` : 'N/A',
            rating: 4.5, // Default rating since we don't have ratings yet
            distance: `${dKm.toFixed(1)} km`,
            _distanceKm: dKm,
            amenities: property.amenities ? Object.entries(property.amenities).filter(([key, value]) => value === true).map(([key]) => key) : [],
            propertyType: property.propertyType || 'PG',
            totalRooms: property.totalRooms || property.maxOccupancy || 'N/A',
            images: property.images ? [property.images.front, property.images.hall, ...(property.images.gallery || [])].filter(Boolean) : [],
            ownerName: property.ownerName || 'Unknown Owner',
            roomDetails: property.room_details || [],
            matchScore: property.matchScore || null
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
    setRecentSearches(prevSearches => {
      const newSearches = prevSearches.map(search =>
        Math.abs(search.lat - lat) < 0.001 && Math.abs(search.lng - lng) < 0.001
          ? { ...search, pgCount }
          : search
      );
      localStorage.setItem('lyvo_recent_searches', JSON.stringify(newSearches));
      return newSearches;
    });
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
            price: property.min_rent ? `₹${property.min_rent.toLocaleString()}` : (property.rent ? `₹${property.rent.toLocaleString()}` : 'Price not available'),
            securityDeposit: property.security_deposit ? `₹${property.security_deposit.toLocaleString()}` : 'N/A',
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
    // Find the property in either nearbyPGs or recommendations to save to recently viewed
    const property = [...nearbyPGs, ...recommendations, ...allProperties].find(p => p.id === propertyId);
    if (property) {
      addToRecentlyViewed(property);
    }
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
    const performCheck = async () => {
      setIsCheckingStatus(true);
      const redirected = await checkAndRedirectToDashboard();
      if (!redirected) {
        setIsCheckingStatus(false);
        // Only fetch data if no redirect happened

        // Load and filter persistent data (2 day expiry)
        const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();

        const storedSearches = JSON.parse(localStorage.getItem('lyvo_recent_searches') || '[]');
        const validSearches = storedSearches.filter(s => {
          const timestamp = s.timestamp ? new Date(s.timestamp).getTime() : 0;
          return now - timestamp < TWO_DAYS;
        });
        setRecentSearches(validSearches);
        if (validSearches.length !== storedSearches.length) {
          localStorage.setItem('lyvo_recent_searches', JSON.stringify(validSearches));
        }

        const storedViews = JSON.parse(localStorage.getItem('lyvo_recently_viewed') || '[]');
        const validViews = storedViews.filter(v => {
          const timestamp = v.viewedAt ? new Date(v.viewedAt).getTime() : 0;
          return now - timestamp < TWO_DAYS;
        });
        setRecentlyViewed(validViews);
        if (validViews.length !== storedViews.length) {
          localStorage.setItem('lyvo_recently_viewed', JSON.stringify(validViews));
        }

        // Fetch real data
        fetchPropertyRecommendations();
        fetchFavoritesCount();
        fetchBookingsCount();
      }
    };

    performCheck();

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
          location: property.address ? [property.address.landmark, property.address.city, property.address.state].filter(Boolean).join(', ') : 'Location not available',
          price: property.min_rent ? `₹${property.min_rent.toLocaleString()}` : (property.rent ? `₹${property.rent.toLocaleString()}` : 'Price not available'),
          securityDeposit: property.security_deposit ? `₹${property.security_deposit.toLocaleString()}` : 'N/A',
          rating: 4.5, // Default rating
          image: (property.images?.front || property.images?.hall || (property.images?.gallery && property.images.gallery[0]))
            ? (property.images?.front || property.images?.hall || property.images?.gallery?.[0])
            : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
          distance: `${(index + 1) * 2}.${index + 1} km`, // Mock distance for now
          matchScore: 95 - (index * 5), // Decreasing match score
          propertyType: property.propertyType || 'PG',
          totalRooms: property.maxOccupancy || 'N/A',
          amenities: property.amenities ? Object.entries(property.amenities).filter(([key, value]) => value === true).map(([key]) => key) : [],
          roomDetails: property.room_details || []
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

  if (isCheckingStatus) {
    return (
      <SeekerLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying account status...</p>
          </div>
        </div>
      </SeekerLayout>
    );
  }

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

          <div className="flex flex-col md:flex-row gap-6">
            {/* Search Input */}
            <div className="flex-1">
              <UniversalSearchInput
                mapType="leaflet"
                onLocationSelect={handleLocationSelect}
                placeholder="Search location (e.g. Koramangala)"
              />
            </div>

            {/* Radius Setting - Modern Pill */}
            <div className="flex items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 min-w-[280px]">
              <div className="flex items-center space-x-2 mr-4">
                <SlidersHorizontal className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Radius: <span className="text-red-600">{radius} km</span></span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={radius}
                onChange={handleRadiusChange}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedLocation.name}</p>
                  <p className="text-xs text-gray-600 line-clamp-1">{selectedLocation.address}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedLocation(null); setSearchQuery(''); }}
                className="text-xs text-red-600 hover:text-red-800 font-medium px-2"
              >
                Clear
              </button>
            </motion.div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-yellow-800">Locating you...</span>
            </div>
          )}

          {/* Error State */}
          {locationError && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700 flex items-center justify-between">
              <span>{locationError}</span>
              <button onClick={() => setLocationError(null)} className="text-red-900 underline font-medium">Dismiss</button>
            </div>
          )}

          {/* Map Container - Leaflet Only */}
          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative group">
            <LeafletMap
              properties={selectedLocation ? nearbyPGs : allProperties}
              selectedLocation={selectedLocation}
              radius={radius}
              onPropertyClick={openPropertyDetails}
              height="350px"
              showRadius={!!selectedLocation}
            />
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] text-gray-500 z-[400] shadow-sm pointer-events-none">
              OpenStreetMap
            </div>
          </div>

          {/* Nearby PGs Results - Horizontal Cards */}
          {nearbyPGs.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <h3 className="text-2xl font-black text-gray-900 font-outfit tracking-tight">
                  Found {nearbyPGs.length} PGs nearby
                </h3>
                <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold w-fit border border-red-100 uppercase tracking-wider">
                  Within {radius} km
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {nearbyPGs.map((pg, index) => (
                  <motion.div
                    key={pg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    className="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-[0_20px_50px_rgba(239,68,68,0.15)] hover:border-red-200 transition-all duration-500 cursor-pointer flex flex-col md:flex-row overflow-hidden md:min-h-[14rem] border-l-4 border-l-red-500"
                    onClick={() => openPropertyDetails(pg.id)}
                  >
                    {/* Left/Top: Image Section */}
                    <div className="w-full md:w-48 h-44 md:h-full relative flex-shrink-0 overflow-hidden">
                      <img
                        src={pg.images && pg.images[0] ? pg.images[0] : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=400&fit=crop'}
                        alt={pg.name}
                        className="w-full h-full object-cover group-hover:scale-110 group-hover:brightness-90 transition-all duration-700 will-change-transform"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=400&fit=crop';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-[10px] font-black px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500" />
                          {pg.distance}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <div className="bg-red-600 text-white p-1.5 rounded-full shadow-lg">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Content */}
                    {/* Right/Bottom: Content Section */}
                    <div className="flex-1 p-4 flex flex-col min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-red-600 transition-colors text-lg leading-tight uppercase font-outfit">
                            {pg.name}
                          </h4>
                          <div className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2 leading-relaxed">{pg.address}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold text-yellow-700">{pg.rating}</span>
                          </div>
                          {pg.matchScore && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-red-400 text-white text-[9px] font-black shadow-sm uppercase tracking-tighter">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{pg.matchScore}% Match</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Room Card - The "Little Big Room Card" */}
                      <div className="bg-red-50/40 rounded-xl p-2 md:p-3 border border-red-100/50 mb-3 group/room">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${pg.roomDetails?.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {pg.roomDetails?.length > 0 ? 'Available Rooms' : 'Occupancy Status'}
                          </span>
                          <ChevronRight className="w-3 h-3 text-red-400 group-hover/room:translate-x-1 transition-transform" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {pg.roomDetails && pg.roomDetails.length > 0 ? (
                            pg.roomDetails.slice(0, 3).map((room, i) => (
                              <div key={i} className="bg-white px-2 py-1 rounded-lg shadow-sm border border-red-100 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="text-[10px] font-bold text-gray-800">R{room.room_number}: {room.room_type}</span>
                                <span className="text-[10px] font-black text-red-600 ml-0.5">₹{room.rent?.toLocaleString()}</span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-lg border border-gray-200 w-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="text-[10px] text-gray-600 font-bold uppercase">Fully Occupied</span>
                            </div>
                          )}
                          {pg.roomDetails.length > 3 && (
                            <div className="bg-white/50 px-2 py-1 rounded-lg border border-dashed border-red-200">
                              <span className="text-[9px] font-bold text-red-400">+{pg.roomDetails.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Price & Alignment */}
                      <div className="flex flex-row items-end justify-between mt-auto pt-3 border-t border-gray-50/50">
                        <div className="flex flex-col flex-shrink-0">
                          <div className="flex items-baseline gap-1">
                            {pg.roomDetails?.length > 0 ? (
                              <>
                                <span className="text-2xl font-black text-gray-900 tracking-tighter font-outfit leading-none">{pg.price}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">/mo</span>
                              </>
                            ) : (
                              <span className="text-sm font-black text-red-600 uppercase tracking-tight font-outfit">FULLY OCCUPIED</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-0.5">
                          {/* Amenities Preview */}
                          <div className="hidden sm:flex gap-1 pr-2 border-r border-gray-100">
                            {pg.amenities.slice(0, 2).map((am, i) => (
                              <div key={i} title={am} className="p-1 bg-gray-50 rounded-md border border-gray-100">
                                <CheckCircle className="w-3 h-3 text-red-500 opacity-70" />
                              </div>
                            ))}
                          </div>
                          <div className="bg-gray-900 group-hover:bg-red-600 text-white p-2 rounded-xl shadow-lg transition-all duration-300 transform group-hover:scale-105">
                            <Search className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 order-1 lg:order-1">
            {/* Recent Searches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 font-outfit">Recent Searches</h2>
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

            {/* Recently Viewed Properties */}
            {recentlyViewed.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-outfit flex items-center gap-2">
                    <Eye className="w-5 h-5 text-red-500" />
                    Recently Viewed Rooms
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {recentlyViewed.map((pg, index) => (
                    <motion.div
                      key={`view-${pg.id}-${index}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                      className="group bg-gray-50 rounded-xl border border-gray-100 p-3 hover:bg-white hover:shadow-[0_10px_30px_-5px_rgba(239,68,68,0.1)] hover:border-red-200 transition-all duration-300 cursor-pointer"
                      onClick={() => openPropertyDetails(pg.id)}
                    >
                      <div className="aspect-video rounded-lg overflow-hidden mb-3">
                        <img
                          src={pg.image || (pg.images && pg.images[0]) || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'}
                          alt={pg.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 will-change-transform"
                        />
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1 group-hover:text-red-600 transition-colors font-outfit">
                        {pg.name}
                      </h4>
                      <div className="flex items-center justify-between">
                        {pg.roomDetails?.length === 0 ? (
                          <span className="text-red-600 font-black text-[10px] font-outfit uppercase bg-red-50 px-2 py-0.5 rounded">Fully Occupied</span>
                        ) : (
                          <span className="text-red-600 font-black text-sm font-outfit">{pg.price}</span>
                        )}
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{pg.propertyType}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 font-outfit">Available Rooms</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendations.map((pg, index) => (
                  <motion.div
                    key={pg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
                    onClick={() => openPropertyDetails(pg.id)}
                  >
                    {/* Image Header */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={pg.image}
                        alt={pg.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Floating Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                        <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-blue-600 text-xs font-bold rounded-full shadow-sm">
                          {pg.matchScore}% Match
                        </span>
                        {/* Status Badge */}
                        {pg.roomDetails?.length > 0 ? (
                          <span className="px-3 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Available
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Fully Occupied
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 left-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> View on Map
                        </p>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {pg.name}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="line-clamp-1">{pg.location}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold text-yellow-700">{pg.rating}</span>
                          </div>
                        </div>
                      </div>

                      {/* Room Summary & Amenities Preview */}
                      <div className="space-y-3 mt-3 mb-4">
                        {/* Room Numbers & Types */}
                        {pg.roomDetails && pg.roomDetails.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {pg.roomDetails.slice(0, 4).map((room, i) => (
                              <span key={i} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-medium">
                                Room {room.room_number}: {room.room_type}
                              </span>
                            ))}
                            {pg.roomDetails.length > 4 && <span className="text-[10px] text-gray-400 font-medium">+{pg.roomDetails.length - 4}</span>}
                          </div>
                        )}

                        {/* Amenities Preview */}
                        <div className="flex flex-wrap gap-2">
                          {pg.amenities.slice(0, 3).map((amenity, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-medium uppercase tracking-wide rounded-md border border-gray-100">
                              {amenity.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          ))}
                          {pg.amenities.length > 3 && (
                            <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[10px] font-medium rounded-md border border-gray-100">
                              +{pg.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Starting from</p>
                          <p className={`text-xl font-bold ${pg.roomDetails?.length > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {pg.roomDetails?.length > 0 ? (
                              <>
                                {pg.price}
                                <span className="text-xs text-gray-400 font-normal ml-1">/mo</span>
                              </>
                            ) : (
                              "Fully Occupied"
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span className="font-medium">Deposit:</span> {pg.securityDeposit}
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm group-hover:shadow-md">
                          View Details
                        </button>
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
