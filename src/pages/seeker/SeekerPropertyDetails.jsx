import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import {
  ArrowLeft, Heart, Share2, User, Mail, Phone, MapPin,
  Bed, Square, Users, CheckCircle, Wifi, Car, Tv, Utensils,
  Shield, Calendar, Clock, DollarSign, Star, Info, MessageCircle, ChevronDown, X, Grid
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SeekerPropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const roomsSectionRef = useRef(null);

  const handleCall = () => {
    if (property?.ownerDetails?.phone) {
      window.location.href = `tel:${property.ownerDetails.phone}`;
    } else {
      toast({
        title: "Contact Info Unavailable",
        description: "The owner's phone number is not available.",
        variant: "destructive"
      });
    }
  };

  const handleMessage = () => {
    if (property?.ownerDetails?.phone) {
      window.location.href = `sms:${property.ownerDetails.phone}`;
    } else {
      toast({
        title: "Contact Info Unavailable",
        description: "The owner's phone number is not available.",
        variant: "destructive"
      });
    }
  };

  // Derived state for images
  const getPropertyImages = (prop) => {
    if (!prop?.images) return [];
    const { gallery, ...singleImages } = prop.images;
    const distinctImages = Object.values(singleImages).filter(img => typeof img === 'string' && img.length > 0);
    const galleryImages = Array.isArray(gallery) ? gallery : [];
    return [...distinctImages, ...galleryImages];
  };

  const images = property ? getPropertyImages(property) : [];

  // Helper: format address
  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const { street, city, state, pincode, landmark } = addr;
    return [street, landmark, city, state, pincode].filter(Boolean).join(', ');
  };

  // Helper: Get Min Price
  const getMinPrice = () => {
    if (!property?.rooms || property.rooms.length === 0) return 0;
    const prices = property.rooms.map(r => r.rent || 0);
    return Math.min(...prices);
  }

  // Fetch Property Details
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/property/public/properties/${id}`);
        // apiClient throws on non-2xx status code by default if using axios, but let's be safe if checking response.
        // wait, axios response structure is { data: ... }. fetch response is stream.
        // apiClient is axios instance.

        const data = response.data;
        if (data.success && data.data) {
          setProperty(data.data);
          if (data.data.latitude && data.data.longitude) {
            setMapCenter([parseFloat(data.data.latitude), parseFloat(data.data.longitude)]);
          }
        } else {
          console.error('Property data missing:', data);
        }
      } catch (error) {
        console.error('Error fetching property details:', error);
        toast({
          title: "Error",
          description: "Failed to load property details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPropertyDetails();
  }, [id, toast]);

  const scrollToRooms = () => {
    roomsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Main Render
  if (loading) {
    return (
      <SeekerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SeekerLayout>
    );
  }

  if (!property) {
    return (
      <SeekerLayout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Go Back</button>
        </div>
      </SeekerLayout>
    );
  }

  const minPrice = getMinPrice();
  const owner = property.ownerDetails;


  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.property_name,
          text: `Check out this property: ${property.property_name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Property link copied to clipboard",
      });
    }
  };

  return (
    <SeekerLayout>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">

        {/* Photo Modal - Premium Lightbox */}
        <AnimatePresence>
          {showAllPhotos && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[3000] bg-white overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-4 md:px-8 border-b border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setShowAllPhotos(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-gray-600 font-semibold"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <h2 className="font-outfit font-black text-xl uppercase tracking-tight text-red-600">Property Gallery</h2>
                <div className="w-10" /> {/* Spacer */}
              </div>

              {/* Gallery Content */}
              <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
                <div className="grid grid-cols-1 gap-8">
                  {images.map((img, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="rounded-2xl overflow-hidden bg-gray-50 shadow-sm border border-gray-100">
                        <img
                          src={img}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-auto object-contain max-h-[90vh] mx-auto"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-gray-400 text-sm font-medium">Photo {idx + 1} of {images.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Back to top hint */}
              <div className="text-center py-12 bg-gray-50 border-t border-gray-100 mt-8">
                <p className="text-gray-400 text-sm mb-4 italic">End of gallery</p>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setShowAllPhotos(false);
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Back to Property
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Navbar Placeholder / Back Button */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">


          {/* Header Info */}
          <div className="mb-8 mt-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">{property.property_name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600 text-lg">
              <span className="flex items-center gap-1">
                <MapPin className="w-5 h-5" /> {formatAddress(property.address)}
              </span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <span className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> 4.8 (12 reviews)
              </span>

            </div>
          </div>

          {/* Image Grid */}
          <div className="relative rounded-2xl overflow-hidden h-[300px] md:h-[450px] mb-8">
            {images.length === 0 ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                No Images Available
              </div>
            ) : images.length === 1 ? (
              <img src={images[0]} alt="Property" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2">
                {/* Main Image */}
                <div className="col-span-2 row-span-2 relative group cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <img src={images[0]} alt="Main" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
                </div>

                {/* Secondary Images (Desktop) */}
                <div className="hidden md:block relative cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <img src={images[1]} alt="Side 1" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </div>
                <div className="hidden md:block relative cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <img src={images[2] || images[1]} alt="Side 2" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </div>
                <div className="hidden md:block relative cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <img src={images[3] || images[1]} alt="Side 3" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </div>
                <div className="hidden md:block relative cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <img src={images[4] || images[1]} alt="Side 4" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />

                  {/* View All Overlay Button on last image */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/40 transition-colors">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllPhotos(true); }}
                      className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-sm hover:scale-105 transition-transform flex items-center gap-2 text-red-600"
                    >
                      <Grid className="w-4 h-4" /> Show all photos
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile 'View All' Button (absolute positioned) */}
            <button
              onClick={() => setShowAllPhotos(true)}
              className="md:hidden absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 text-red-600"
            >
              <Grid className="w-3 h-3" /> Show all photos
            </button>
          </div>



          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-8">

              {/* Description */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About this place</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {property.description || "A beautiful property located in a prime area, offering comfortable living spaces and modern amenities for a hassle-free stay."}
                </p>
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <p className="text-gray-500 text-sm font-medium mb-1">Rent starts from</p>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold text-gray-900">₹{minPrice.toLocaleString()}</span>
                        <span className="text-gray-500 mb-1">/ month</span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Zero Brokerage
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Instant Booking
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Verified Listing
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={scrollToRooms}
                      className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg rounded-xl shadow-md shadow-red-100 hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 shrink-0 font-outfit uppercase tracking-tight"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Check Available Rooms
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Key Metrics */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Property Highlights</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Active Rooms */}
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Bed className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-xl text-gray-900 leading-none mb-1">
                        {property.rooms?.filter(r => r.is_available).length || 0}
                        <span className="text-sm font-medium text-gray-400 ml-1">/ {property.rooms?.length || 0}</span>
                      </p>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rooms Available</p>
                    </div>
                  </div>

                  {/* Max Occupancy */}
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-xl text-gray-900 leading-none mb-1">
                        {property.maxOccupancy || (property.rooms?.reduce((acc, r) => acc + (r.occupancy || 0), 0) || 'N/A')}
                      </p>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Capacity</p>
                    </div>
                  </div>

                  {/* Security Deposit */}
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-xl text-gray-900 leading-none mb-1">
                        ₹{(property.security_deposit || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Security Deposit</p>
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-xl text-gray-900 leading-none mb-1 text-purple-700">Verified</p>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Listing Status</p>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Amenities */}
              {property.amenities && Object.keys(property.amenities).some(k => property.amenities[k]) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">What this place offers</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(property.amenities).filter(([, v]) => v === true).map(([k]) => (
                      <div key={k} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700 font-medium capitalize">
                          {k.replace(/([A-Z0-9])/g, ' $1').trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-100" />

              {/* Property Rules */}
              {property.rules && Object.keys(property.rules).some(k => property.rules[k] !== undefined) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">House Rules</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(property.rules).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                        <span className="text-gray-700 font-medium capitalize flex items-center gap-2">
                          {key.replace(/([A-Z0-9])/g, ' $1').trim()}
                        </span>
                        {value ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                            Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                            Not Allowed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-100" />


              {/* Available Rooms Section */}
              <div ref={roomsSectionRef} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Available Rooms ({property.rooms?.length || 0})</h2>
                {property.rooms && property.rooms.length > 0 ? (
                  <div className="space-y-6">
                    {property.rooms.map((room) => (
                      <div
                        key={room._id}
                        className={`relative flex flex-col md:flex-row gap-6 p-5 bg-white border rounded-2xl transition-all duration-300 group cursor-pointer
                          ${room.is_available
                            ? 'border-gray-100 hover:border-blue-100 shadow-sm hover:shadow-lg'
                            : 'border-gray-100 bg-gray-50/50 opacity-90'
                          }`}
                        onClick={() => navigate(`/seeker/room/${room._id}`, { state: { fromPropertyId: id } })}
                      >
                        {/* Room Image with Overlay */}
                        <div className="w-full md:w-64 h-48 rounded-xl overflow-hidden shrink-0 relative bg-gray-200">
                          {room.room_image ? (
                            <img
                              src={room.room_image}
                              alt={`Room ${room.roomNumber}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Bed className="w-10 h-10" />
                            </div>
                          )}
                          {/* Type Badge */}
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                            {room.room_type || room.type}
                          </div>


                          {/* Compatibility Badge - New */}
                          {room.compatibility?.overallScore !== undefined && (
                            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                              <Star className={`w-3 h-3 ${room.compatibility.overallScore >= 80 ? 'fill-green-600 text-green-600' : room.compatibility.overallScore >= 60 ? 'fill-blue-600 text-blue-600' : 'fill-red-600 text-red-600'}`} />
                              <span className={`${room.compatibility.overallScore >= 80 ? 'text-green-600' : room.compatibility.overallScore >= 60 ? 'text-blue-600' : 'text-red-600'}`}>
                                {room.compatibility.overallScore}% Match
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  Room {room.roomNumber || room.room_number}
                                </h3>
                                {!room.is_available && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                                    Unavailable
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                  <Users className="w-4 h-4" />
                                  Occupancy: <span className={`${(room.current_occupants || 0) >= room.occupancy ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}`}>
                                    {room.current_occupants || 0} / {room.occupancy}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                  <Square className="w-4 h-4" />
                                  {room.room_size || room.dimension} sq ft
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-2xl font-bold text-blue-600">₹{room.rent?.toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium">per month</p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-gray-50 my-4" />

                          {/* Amenities Preview */}
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Includes</p>
                            <div className="flex flex-wrap gap-2">
                              {room.amenities && Object.entries(room.amenities)
                                .filter(([, v]) => v)
                                .slice(0, 5) // Show up to 5 amenities
                                .map(([k]) => (
                                  <span
                                    key={k}
                                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600 capitalize group-hover:bg-blue-50/50 group-hover:text-blue-700 group-hover:border-blue-100 transition-colors"
                                  >
                                    {k.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                ))}
                              {room.amenities && Object.values(room.amenities).filter(v => v).length > 5 && (
                                <span className="px-2 py-1 text-xs text-gray-400 self-center">
                                  +{Object.values(room.amenities).filter(v => v).length - 5} more
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Footer / CTA */}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            {room.is_available ? (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50/50 px-3 py-1.5 rounded-full">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-bold">Available Now</span>
                              </div>
                            ) : (
                              <div className="text-xs font-medium text-gray-400 px-2">
                                Currently Unavailable
                              </div>
                            )}

                            <span className="flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                              View Details <ArrowLeft className="w-4 h-4 rotate-180" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500 border border-dashed border-gray-300">
                    No rooms listed yet.
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />


              {/* Map Location */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Where you'll be</h2>
                <div className="h-64 md:h-[400px] w-full rounded-2xl overflow-hidden relative z-0 border border-gray-200">
                  {property.latitude && property.longitude ? (
                    <div className="relative h-full w-full group">
                      <MapContainer
                        center={mapCenter}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                        dragging={false}
                        zoomControl={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={mapCenter} />
                      </MapContainer>

                      {/* Map Overlay with Redirect Action */}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors z-[400] flex items-center justify-center"
                      >
                        <button className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm font-semibold text-gray-800 flex items-center gap-2 transform group-hover:scale-105 transition-all">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          Open in Google Maps
                        </button>
                      </a>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <MapPin className="w-8 h-8 mb-2" />
                      <p>Map location unavailable</p>
                    </div>
                  )}
                </div>
                <p className="text-gray-600">
                  {property.address?.city}, {property.address?.state}
                </p>
              </div>
            </div>

            {/* Right Column: Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">

                {/* Property Summary / Highlights Card */}
                {/* Property Summary moved to main column */}

                {/* Owner Card */}
                {owner && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {owner.profilePicture ? (
                        <img src={owner.profilePicture} alt={owner.name} className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500">Listed by</p>
                        <h4 className="font-bold text-gray-900 text-lg leading-tight">{owner.name || 'Verified Owner'}</h4>
                        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-1">
                          <Shield className="w-3 h-3 fill-blue-600" />
                          Verified
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleCall}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </button>
                      <button
                        onClick={handleMessage}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  </div>
                )}

                {/* Compact House Vibe Card */}
                {(property.house_vibe || (property.current_residents && property.current_residents.length > 0)) && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-6 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm text-indigo-600">
                          <Users className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">House Vibe</h4>
                      </div>
                      {property.house_vibe && (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm border ${property.house_vibe.overallScore >= 80 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-indigo-600 border-indigo-100'}`}>
                          {property.house_vibe.overallScore}% Match
                        </span>
                      )}
                    </div>


                    {property.house_vibe && (
                      <div className="space-y-3 mb-4">
                        <p className="text-sm font-semibold text-gray-700 leading-snug">
                          "{property.house_vibe.notes || property.house_vibe.label}"
                        </p>

                        {property.house_vibe.scoreBreakdown && property.house_vibe.scoreBreakdown.pros.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {property.house_vibe.scoreBreakdown.pros.slice(0, 3).map((attr, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 uppercase tracking-wide">
                                <CheckCircle className="w-2.5 h-2.5" /> {attr}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Compact Avatars */}
                    {property.current_residents && property.current_residents.length > 0 ? (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center justify-between">
                          Flatmates
                          <span className="text-gray-500">{property.current_residents.length} active</span>
                        </p>
                        <div className="flex items-center -space-x-2 overflow-hidden py-1">
                          {property.current_residents.slice(0, 5).map((t, i) => (
                            <img
                              key={i}
                              src={t.profilePicture || `https://ui-avatars.com/api/?name=${t.name}&background=random`}
                              alt={t.name}
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                              title={t.name}
                            />
                          ))}
                          {property.current_residents.length > 5 && (
                            <div className="flex flex-col items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 text-xs font-bold text-gray-500 z-10">
                              +{property.current_residents.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No flatmates yet. Be the first!</p>
                    )}
                  </div>
                )}


              </div>
            </div>

          </div>
        </div >
      </div >
    </SeekerLayout >
  );
};

export default SeekerPropertyDetails;
