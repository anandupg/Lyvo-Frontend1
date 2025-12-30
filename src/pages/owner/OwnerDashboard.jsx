import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
  Building,
  Users,
  DollarSign,
  TrendingUp,
  Star,
  Calendar,
  Plus,
  Eye,
  Edit,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle
} from 'lucide-react';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantCount, setTenantCount] = useState(0);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantError, setTenantError] = useState(null);

  // Real data states
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeTenants: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    occupancyRate: 0,
    pendingApplications: 0
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');

      if (!authToken || !userData) {
        navigate('/login');
        return;
      }

      try {
        const user = JSON.parse(userData);
        // Check if user is a property owner (role 3 or specific role for property owners)
        if (user.role !== 3) {
          navigate('/login');
          return;
        }
        setUser(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Fetch tenant count with comprehensive error handling
  const fetchTenantCount = async () => {
    try {
      setTenantLoading(true);
      setTenantError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found for tenant fetch');
        setTenantError('Authentication required');
        return;
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      console.log('Fetching tenants from:', `${baseUrl}/property/owner/tenants`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${baseUrl}/property/owner/tenants`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Tenant fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Tenant fetch response data:', data);

        if (data.success) {
          const count = data.count || 0;
          setTenantCount(count);
          console.log(`Successfully fetched ${count} tenants`);

          // Clear any previous errors
          setTenantError(null);
        } else {
          console.warn('API returned success: false', data.message);
          setTenantError(data.message || 'Failed to fetch tenant data');
        }
      } else {
        const errorText = await response.text();
        console.error('Tenant fetch failed:', response.status, errorText);

        if (response.status === 401) {
          setTenantError('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          // No tenants found - this is not an error, just empty data
          setTenantCount(0);
          setTenantError(null);
          console.log('No tenants found for this owner');
        } else if (response.status >= 500) {
          setTenantError('Server error. Please try again later.');
        } else {
          setTenantError(`Failed to fetch tenants (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Network error fetching tenant count:', error);

      if (error.name === 'AbortError') {
        setTenantError('Request timed out. Please try again.');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setTenantError('Network error. Please check your connection.');
      } else {
        setTenantError('Unexpected error occurred');
      }
    } finally {
      setTenantLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Calculate stats whenever data changes
  useEffect(() => {
    if (properties.length > 0 || bookings.length > 0) {
      calculateDashboardStats();
    }
  }, [properties, bookings, tenantCount]);

  // Retry function for failed tenant fetch
  const retryTenantFetch = () => {
    console.log('Retrying tenant fetch...');
    fetchTenantCount();
  };

  // Fetch owner's properties
  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found for properties fetch');
        return;
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/property/owner/properties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setProperties(data.data);
          console.log(`Successfully fetched ${data.data.length} properties`);
        }
      } else {
        console.error('Failed to fetch properties:', response.status);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  // Fetch owner's bookings
  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found for bookings fetch');
        return;
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/property/owner/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.bookings) {
          setBookings(data.bookings);
          console.log(`Successfully fetched ${data.bookings.length} bookings`);
        }
      } else {
        console.error('Failed to fetch bookings:', response.status);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Calculate dashboard stats from real data
  const calculateDashboardStats = () => {
    try {
      // Total Properties
      const totalProperties = properties.length;

      // Active Tenants (already fetched)
      const activeTenants = tenantCount;

      // Monthly Revenue - sum of confirmed bookings' rent
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const monthlyRevenue = confirmedBookings.reduce((sum, booking) => {
        return sum + (booking.rent || 0);
      }, 0);

      // Average Rating - average of all property ratings
      const propertiesWithRatings = properties.filter(p => p.rating && p.rating > 0);
      const averageRating = propertiesWithRatings.length > 0
        ? (propertiesWithRatings.reduce((sum, p) => sum + p.rating, 0) / propertiesWithRatings.length)
        : 0;

      // Occupancy Rate - occupied rooms / total rooms
      let totalRooms = 0;
      let occupiedRooms = 0;
      properties.forEach(property => {
        if (property.rooms && Array.isArray(property.rooms)) {
          totalRooms += property.rooms.length;
          occupiedRooms += property.rooms.filter(room => !room.isAvailable).length;
        }
      });
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      // Pending Applications
      const pendingApplications = bookings.filter(b => b.status === 'pending').length;

      setStats({
        totalProperties,
        activeTenants,
        monthlyRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        occupancyRate,
        pendingApplications
      });

      console.log('Dashboard stats calculated:', {
        totalProperties,
        activeTenants,
        monthlyRevenue,
        averageRating,
        occupancyRate,
        pendingApplications
      });
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
    }
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      setDataError(null);

      await Promise.all([
        fetchProperties(),
        fetchBookings(),
        fetchTenantCount()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDataError('Failed to load dashboard data');
    } finally {
      setDataLoading(false);
    }
  };

  // Format properties for display
  const recentProperties = properties.slice(0, 3).map(property => {
    const rooms = property.rooms || [];
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(room => !room.isAvailable).length;
    const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Calculate revenue from confirmed bookings for this property
    const propertyBookings = bookings.filter(b =>
      String(b.propertyId) === String(property._id) && b.status === 'confirmed'
    );
    const propertyRevenue = propertyBookings.reduce((sum, b) => sum + (b.rent || 0), 0);

    // Get first image from property images
    const propertyImage = property.images && property.images[0]
      ? property.images[0]
      : property.frontImage || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=300&fit=crop&crop=center";

    // Format address object to string
    let locationString = 'Location not available';
    if (property.address) {
      if (typeof property.address === 'string') {
        locationString = property.address;
      } else if (typeof property.address === 'object') {
        // Format address object: "City, State"
        const parts = [];
        if (property.address.city) parts.push(property.address.city);
        if (property.address.state) parts.push(property.address.state);
        locationString = parts.length > 0 ? parts.join(', ') : 'Location not available';
      }
    }

    return {
      id: property._id,
      name: property.propertyName || property.property_name || 'Unnamed Property',
      location: locationString,
      type: property.propertyType || property.property_type || 'Property',
      tenants: occupiedRooms,
      occupancy: `${occupancyPercentage}%`,
      revenue: `₹${propertyRevenue.toLocaleString('en-IN')}`,
      status: property.status === 'approved' ? 'Active' : property.status || 'Pending',
      image: propertyImage
    };
  });

  // Format time ago helper function
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown time';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  };

  // Generate real activities from actual data
  const generateRecentActivities = () => {
    const activities = [];

    // Add booking activities
    bookings.slice(0, 3).forEach((booking) => {
      const property = properties.find(p => String(p._id) === String(booking.propertyId));
      const propertyName = property ? property.propertyName || property.property_name : 'Unknown Property';
      const seekerName = booking.userSnapshot?.name || 'Unknown User';

      let message = '';
      let status = '';
      let type = '';

      switch (booking.status) {
        case 'pending_approval':
          message = `New booking request from ${seekerName} for ${propertyName}`;
          status = 'pending';
          type = 'tenant';
          break;
        case 'confirmed':
          message = `Booking confirmed by ${seekerName} for ${propertyName}`;
          status = 'completed';
          type = 'payment';
          break;
        case 'checked_in':
          message = `${seekerName} successfully checked in to ${propertyName}`;
          status = 'completed';
          type = 'tenant';
          break;
        case 'rejected':
          message = `Booking rejected for ${propertyName}`;
          status = 'completed';
          type = 'tenant';
          break;
        case 'cancelled':
          message = `Booking cancelled for ${propertyName}`;
          status = 'completed';
          type = 'tenant';
          break;
        default:
          message = `Booking ${booking.status} for ${propertyName}`;
          status = 'in-progress';
          type = 'tenant';
      }

      activities.push({
        id: `booking-${booking._id}`,
        type,
        message,
        time: formatTimeAgo(booking.createdAt || booking.bookedAt),
        status,
        createdAt: booking.createdAt || booking.bookedAt
      });
    });

    // Add property activities
    properties.slice(0, 2).forEach((property) => {
      const propertyName = property.propertyName || property.property_name || 'Unnamed Property';

      activities.push({
        id: `property-${property._id}`,
        type: 'property',
        message: `Property "${propertyName}" ${property.status === 'approved' ? 'approved' : 'pending approval'}`,
        time: formatTimeAgo(property.createdAt),
        status: property.status === 'approved' ? 'completed' : 'pending',
        createdAt: property.createdAt
      });
    });

    // Sort by creation date (most recent first) and limit to 4
    return activities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);
  };

  const recentActivities = generateRecentActivities();

  const getActivityIcon = (type) => {
    switch (type) {
      case 'tenant':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'maintenance':
        return <Building className="w-5 h-5 text-orange-600" />;
      case 'property':
        return <Plus className="w-5 h-5 text-purple-600" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'in-progress':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'Owner'}!</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Here's what's happening with your properties today.</p>
          </div>
          <div className="sm:mt-0 flex space-x-3">
            <button
              onClick={() => navigate('/owner-messages')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
            </button>
            <button
              onClick={() => navigate('/owner-add-property')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Building className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-green-600">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>+2 this month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Active Tenants</p>
                {tenantLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : tenantError ? (
                  <div className="space-y-1">
                    <p className="text-sm text-red-600">Error loading tenants</p>
                    <button
                      onClick={retryTenantFetch}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeTenants}</p>
                )}
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${tenantError ? 'bg-red-100' : 'bg-green-100'
                }`}>
                <Users className={`w-5 h-5 sm:w-6 sm:h-6 ${tenantError ? 'text-red-600' : 'text-green-600'
                  }`} />
              </div>
            </div>
            {!tenantLoading && !tenantError && (
              <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-green-600">
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span>{stats.activeTenants > 0 ? '+3 this week' : 'No tenants yet'}</span>
              </div>
            )}
            {tenantError && (
              <div className="mt-3 sm:mt-4">
                <p className="text-xs text-gray-500">
                  {tenantError === 'No tenants found for this owner'
                    ? 'Start by adding properties and getting bookings'
                    : 'Check your connection and try again'
                  }
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-green-600">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>+12% vs last month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.averageRating}</p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-green-600">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>+0.2 this month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Occupancy Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-green-600">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>+5% vs last month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending Applications</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-blue-600">
              <span>Requires attention</span>
            </div>
          </motion.div>
        </div>

        {/* Recent Properties and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Properties */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg border border-gray-200"
          >
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Properties</h2>
              <p className="text-xs sm:text-sm text-gray-600">Your latest property listings and their performance</p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mb-4"></div>
                  <p className="text-sm text-gray-500">Loading properties...</p>
                </div>
              ) : recentProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Building className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm font-medium text-gray-900 mb-1">No properties yet</p>
                  <p className="text-xs text-gray-500 mb-4">Add your first property to get started</p>
                  <button
                    onClick={() => navigate('/owner-add-property')}
                    className="px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
                  >
                    Add Property
                  </button>
                </div>
              ) : (
                recentProperties.map((property) => (
                  <div key={property.id} className="flex items-center space-x-3 sm:space-x-4">
                    <img
                      src={property.image}
                      alt={property.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{property.name}</h3>
                      <p className="text-xs text-gray-500">{property.location}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-600">{property.tenants} tenants</span>
                        <span className="text-xs text-gray-600">•</span>
                        <span className="text-xs text-gray-600">{property.occupancy} occupied</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{property.revenue}</p>
                      <p className="text-xs text-green-600">{property.status}</p>
                    </div>
                    <button className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
                      <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/owner-properties')}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View all properties →
              </button>
            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-lg border border-gray-200"
          >
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activities</h2>
              <p className="text-xs sm:text-sm text-gray-600">Latest updates and notifications</p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mb-4"></div>
                  <p className="text-sm text-gray-500">Loading activities...</p>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm font-medium text-gray-900 mb-1">No recent activities</p>
                  <p className="text-xs text-gray-500">Activities will appear here as bookings and properties are created</p>
                </div>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)} flex-shrink-0`}>
                      {activity.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerDashboard; 