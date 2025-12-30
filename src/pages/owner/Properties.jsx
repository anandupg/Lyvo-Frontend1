import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
  Building,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Power,
  PowerOff
} from 'lucide-react';

const Properties = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [imageLoading, setImageLoading] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState({});

  // Fetch properties from backend
  const fetchProperties = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Properties fetched:', result.data);
          setProperties(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  // Update property status
  const updatePropertyStatus = async (propertyId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [propertyId]: true }));

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${propertyId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the property in the local state
          setProperties(prev => prev.map(property =>
            property._id === propertyId
              ? { ...property, status: newStatus, updated_at: new Date().toISOString() }
              : property
          ));
          console.log('Property status updated successfully');
        }
      } else {
        console.error('Failed to update property status');
      }
    } catch (error) {
      console.error('Error updating property status:', error);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [propertyId]: false }));
    }
  };

  // Refresh properties (can be called from other components)
  window.refreshProperties = fetchProperties;

  // Check authentication and fetch properties
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
        if (user.role !== 3) {
          navigate('/login');
          return;
        }
        setUser(user);
        fetchProperties(); // Fetch properties after auth
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Transform properties data for display
  const transformedProperties = properties.map(property => {
    // Collect all uploaded images
    let allImages = [];
    let hasUploadedImages = false;

    console.log('Processing property:', property.property_name);
    console.log('Property images:', property.images);

    if (property.images) {
      // Handle both old format (frontImage, backImage, etc.) and new format (front, back, etc.)
      const imageOptions = [
        // New format
        { url: property.images.front, label: 'Front' },
        { url: property.images.hall, label: 'Hall' },
        { url: property.images.room, label: 'Room' },
        { url: property.images.back, label: 'Back' },
        { url: property.images.toilet, label: 'Toilet' },
        // Old format (fallback)
        { url: property.images.frontImage, label: 'Front' },
        { url: property.images.hallImage, label: 'Hall' },
        { url: property.images.roomImage, label: 'Room' },
        { url: property.images.backImage, label: 'Back' },
        { url: property.images.toiletImage, label: 'Toilet' }
      ].filter(img => img.url); // Remove null/undefined values

      // Add additional images array if it exists
      if (property.images.images && Array.isArray(property.images.images)) {
        property.images.images.forEach((url, index) => {
          if (url) {
            imageOptions.push({ url, label: `Image ${index + 1}` });
          }
        });
      }

      allImages = imageOptions;
      hasUploadedImages = imageOptions.length > 0;

      console.log('Found images:', allImages.length);
    }

    // Add default fallback image if no uploaded images
    if (!hasUploadedImages) {
      allImages = [{
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=300&fit=crop&crop=center',
        label: 'Default'
      }];
    }

    return {
      id: property._id || property.id, // Use _id from MongoDB, fallback to id
      name: property.property_name,
      location: `${property.address?.city || ''}, ${property.address?.state || ''}`,
      type: property.property_type,
      status: property.status === 'active' ? 'Active' : 'Inactive',
      tenants: property.rooms ? property.rooms.filter(room => !room.is_available).length : 0, // Count of occupied rooms
      maxTenants: property.rooms ? property.rooms.length : 0, // Total rooms available
      monthlyRent: property.pricing?.monthly_rent || property.rooms?.reduce((sum, room) => sum + (room.rent || 0), 0) || 0, // Sum of all room rents or property rent
      totalRooms: property.rooms ? property.rooms.length : 0, // Total number of rooms
      lastUpdated: property.updated_at ? new Date(property.updated_at).toISOString().split('T')[0] : (property.created_at ? new Date(property.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      images: allImages,
      hasUploadedImages: hasUploadedImages
    };
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'text-green-600 bg-green-100';
      case 'Under Construction':
        return 'text-yellow-600 bg-yellow-100';
      case 'Maintenance':
        return 'text-orange-600 bg-orange-100';
      case 'Inactive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPropertyTypeColor = (type) => {
    switch (type) {
      case 'Apartment Complex':
        return 'text-blue-600 bg-blue-100';
      case 'Independent Houses':
        return 'text-green-600 bg-green-100';
      case 'Studio Apartments':
        return 'text-purple-600 bg-purple-100';
      case 'Villas':
        return 'text-red-600 bg-red-100';
      case 'Serviced Apartments':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredProperties = transformedProperties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your property portfolio and listings</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search properties by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Under Construction">Under Construction</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProperties.map((property, index) => (
            <div
              key={property.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              {/* Property Images Gallery */}
              <div
                className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden"
              >
                {/* Current image display */}
                <div className="relative w-full h-full">
                  <img
                    src={property.images[0]?.url}
                    alt={`${property.name} - ${property.images[0]?.label}`}
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      setImageLoading(prev => ({
                        ...prev,
                        [property.id]: false
                      }));
                    }}
                    onError={(e) => {
                      // Fallback to default image if Cloudinary image fails to load
                      e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=400&h=300&fit=crop&crop=center';
                      setImageLoading(prev => ({
                        ...prev,
                        [property.id]: false
                      }));
                    }}
                  />

                  {/* Loading overlay */}
                  {imageLoading[property.id] !== false && (
                    <motion.div
                      className="absolute inset-0 bg-gray-200 flex items-center justify-center"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      <motion.div
                        className="w-8 h-8 border-2 border-gray-300 border-t-red-600 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  )}

                  {/* Image label overlay */}
                  {property.images[0]?.label !== 'Default' && (
                    <div className="absolute bottom-1 left-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-black bg-opacity-50 text-white">
                        {property.images[0]?.label}
                      </span>
                    </div>
                  )}
                </div>


                {/* Status badge with animation */}
                <motion.div
                  className="absolute top-2 sm:top-3 right-2 sm:right-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                    {property.status}
                  </span>
                </motion.div>



              </div>

              {/* Property Details */}
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{property.name}</h3>
                  <button className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-3 sm:mb-4">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{property.location}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4 text-center">
                  <div>
                    <div className="text-sm sm:text-lg font-semibold text-gray-900">{property.totalRooms}</div>
                    <div className="text-xs text-gray-500">Rooms</div>
                  </div>
                  <div>
                    <div className="text-sm sm:text-lg font-semibold text-gray-900">{property.type || 'N/A'}</div>
                    <div className="text-xs text-gray-500">Type</div>
                  </div>
                  <div>
                    <div className="text-sm sm:text-lg font-semibold text-gray-900">{property.status}</div>
                    <div className="text-xs text-gray-500">Status</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      console.log('View button clicked for property:', property.id);
                      console.log('Navigating to:', `/owner-property/${property.id}`);
                      navigate(`/owner-property/${property.id}`);
                    }}
                    className="flex-1 flex items-center justify-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/owner-edit-property/${property.id}`)}
                    className="flex-1 flex items-center justify-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => updatePropertyStatus(property.id, property.status === 'Active' ? 'inactive' : 'active')}
                    disabled={updatingStatus[property.id]}
                    className={`flex items-center justify-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 ${property.status === 'Active'
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                      } ${updatingStatus[property.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updatingStatus[property.id] ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : property.status === 'Active' ? (
                      <PowerOff className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <Power className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </button>
                </div>

                {/* Last Updated */}
                <div className="mt-2 sm:mt-3 text-xs text-gray-500 text-center">
                  Last updated: {new Date(property.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProperties.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Building className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No properties available'
              }
            </p>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};

export default Properties; 