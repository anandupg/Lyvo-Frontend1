import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import {
  Heart,
  MapPin,
  Star,
  Eye,
  MessageCircle,
  Trash2,
  Building,
  Wifi,
  Snowflake,
  Utensils,
  Car,
  Shield,
  Bed,
  Users,
  Camera,
  Search,
  Filter,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import apiClient from '../../utils/apiClient';
import ContactOwnerModal from '../../components/ContactOwnerModal';

const SeekerFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
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

  // Fetch user favorites
  const fetchFavorites = async () => {
    const userId = getUserId();
    if (!userId) {
      console.error('User ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/property/favorites');

      if (response.status === 200) {
        const data = response.data;
        console.log('Favorites data received:', data);

        // Map backend fields to frontend expectations
        const mappedFavorites = (data.favorites || []).map(fav => ({
          ...fav,
          property: {
            ...fav.propertyId,
            propertyName: fav.propertyId?.property_name, // Map snake_case to camelCase
            address: fav.propertyId?.address // Ensure address is accessible
          },
          room: {
            ...fav.roomId,
            roomNumber: fav.roomId?.room_number, // Map snake_case to camelCase
            roomImage: fav.roomId?.room_image, // Correct field from Room model
            toiletImage: fav.roomId?.toilet_image
          }
        }));

        setFavorites(mappedFavorites);
        setFilteredFavorites(mappedFavorites);
      } else {
        console.error('Failed to fetch favorites');
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (favoriteId, propertyId, roomId) => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const response = await apiClient.post('/property/favorites/remove', {
        userId: userId,
        propertyId: propertyId,
        roomId: roomId
      });

      if (response.status === 200) {
        const data = response.data;
        if (data.success) {
          // Remove from local state
          setFavorites(prev => prev.filter(fav => fav._id !== favoriteId));
          setFilteredFavorites(prev => prev.filter(fav => fav._id !== favoriteId));

          toast({
            title: "Removed from Favorites",
            description: "Property has been removed from your favorites",
          });
        }
      } else {
        console.error('Failed to remove from favorites');
        toast({
          title: "Error",
          description: "Failed to remove from favorites",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  // Filter favorites based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = favorites.filter(favorite => {
        const propertyName = favorite.property?.propertyName?.toLowerCase() || '';
        const address = favorite.property?.address
          ? (typeof favorite.property.address === 'string'
            ? favorite.property.address.toLowerCase()
            : `${favorite.property.address.street || ''} ${favorite.property.address.city || ''} ${favorite.property.address.state || ''}`.toLowerCase())
          : '';
        const roomNumber = favorite.room?.roomNumber?.toLowerCase() || '';

        const query = searchQuery.toLowerCase();
        return propertyName.includes(query) || address.includes(query) || roomNumber.includes(query);
      });
      setFilteredFavorites(filtered);
    } else {
      setFilteredFavorites(favorites);
    }
  }, [favorites, searchQuery]);

  // Load favorites on component mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  // Get amenity icon
  const getAmenityIcon = (amenity) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="w-4 h-4" />;
      case 'ac':
        return <Snowflake className="w-4 h-4" />;
      case 'food':
        return <Utensils className="w-4 h-4" />;
      case 'parking':
        return <Car className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Open contact modal
  const openContactModal = (favorite) => {
    setSelectedOwner({
      name: favorite.property?.ownerName,
      phone: favorite.property?.ownerPhone,
      email: favorite.property?.ownerEmail,
      ownerName: favorite.property?.ownerName
    });
    setContactModalOpen(true);
  };

  if (loading) {
    return (
      <SeekerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your favorites...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-gray-600">
            Properties and rooms you've saved for later.
          </p>
        </motion.div>

        {/* Search and Filter */}
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
                  placeholder="Search your favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredFavorites.length} of {favorites.length} favorites
            </p>
            <button
              onClick={fetchFavorites}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Favorites List */}
        {filteredFavorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Favorites Yet</h3>
            <p className="text-gray-600 mb-6">
              {favorites.length === 0
                ? "Start exploring properties and add them to your favorites to see them here!"
                : "No favorites match your current search. Try adjusting your search criteria."
              }
            </p>
            {favorites.length === 0 && (
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
            {filteredFavorites.map((favorite, index) => (
              <motion.div
                key={favorite._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Property/Room Image */}
                    <div className="lg:w-80 flex-shrink-0">
                      <div className="relative">
                        <img
                          src={favorite.room?.roomImage || favorite.property?.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'}
                          alt={favorite.property?.propertyName || 'Property'}
                          className="w-full h-48 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop';
                          }}
                        />
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={() => removeFromFavorites(favorite._id, favorite.propertyId, favorite.roomId)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {favorite.room && (
                          <div className="absolute bottom-3 left-3">
                            <span className="px-3 py-1 bg-black bg-opacity-70 text-white text-sm font-medium rounded-lg">
                              Room {favorite.room.roomNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Property/Room Details */}
                    <div className="flex-1">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                        <div>
                          {/* Property Name */}
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="w-5 h-5 text-blue-600" />
                            <h3 className="text-2xl font-bold text-gray-900">
                              {favorite.property?.propertyName || 'Unnamed Property'}
                            </h3>
                          </div>

                          {/* Address */}
                          <div className="flex items-center text-gray-600 mb-3">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="text-sm">
                              {favorite.property?.address
                                ? (typeof favorite.property.address === 'string'
                                  ? favorite.property.address
                                  : `${favorite.property.address.street || ''}, ${favorite.property.address.city || ''}, ${favorite.property.address.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''))
                                : 'Address not available'
                              }
                            </span>
                          </div>

                          {/* Room Details (if specific room is favorited) */}
                          {favorite.room && (
                            <div className="flex items-center text-gray-600 mb-2">
                              <Bed className="w-4 h-4 mr-1" />
                              <span className="text-sm font-medium">Room {favorite.room.roomNumber}</span>
                              <span className="mx-2">•</span>
                              <span className="text-sm">{favorite.room.roomType}</span>
                              {favorite.room.bedType && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-sm">{favorite.room.bedType}</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Property Type Badge */}
                          {favorite.property?.propertyType && (
                            <div className="inline-block mb-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {favorite.property.propertyType}
                              </span>
                            </div>
                          )}

                          {/* Added Date */}
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Added on {formatDate(favorite.addedAt)}</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mt-4 lg:mt-0 lg:text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {favorite.room?.rent ? formatCurrency(favorite.room.rent) : 'Contact for Price'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {favorite.room ? 'per month' : 'Property'}
                          </div>
                        </div>
                      </div>

                      {/* Amenities */}
                      {favorite.property?.amenities && Object.keys(favorite.property.amenities).length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Property Amenities</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(favorite.property.amenities)
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
                          </div>
                        </div>
                      )}

                      {/* Room Amenities (if specific room) */}
                      {favorite.room?.amenities && Object.keys(favorite.room.amenities).length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Room Amenities</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(favorite.room.amenities)
                              .filter(([key, value]) => value === true)
                              .slice(0, 6)
                              .map(([amenity, value]) => (
                                <span
                                  key={amenity}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                >
                                  {getAmenityIcon(amenity)}
                                  {amenity}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => navigate(`/seeker/property/${favorite.property?._id}`)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Property
                        </button>

                        {favorite.room && (
                          <button
                            onClick={() => navigate(`/seeker/room/${favorite.room?._id}`)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            <Bed className="w-4 h-4" />
                            View Room
                          </button>
                        )}

                        <button
                          onClick={() => openContactModal(favorite)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Contact Owner
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Owner Modal */}
      <ContactOwnerModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        owner={selectedOwner}
      />
    </SeekerLayout>
  );
};

export default SeekerFavorites;