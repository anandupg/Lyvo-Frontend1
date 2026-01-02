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
      <div className={`min-h-screen bg-gray-50 pb-20 md:pb-10 ${showAllPhotos ? 'overflow-hidden h-screen' : ''}`}>

        {/* Photo Modal */}
        <AnimatePresence>
          {showAllPhotos && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col"
            >
              <div className="flex justify-between items-center p-4 text-white border-b border-gray-800">
                <button
                  onClick={() => setShowAllPhotos(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <span className="font-medium">All Photos ({images.length})</span>
                <div className="w-10" /> {/* Spacer */}
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="aspect-video relative group overflow-hidden rounded-lg">
                      <img src={img} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
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
                      className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-sm hover:scale-105 transition-transform flex items-center gap-2"
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
              className="md:hidden absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2"
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
                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-green-500" /> <span>Zero Brokerage</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-green-500" /> <span>Instant Booking</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={scrollToRooms}
                      className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 shrink-0"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Check Availability
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Key Metrics */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Property Highlights</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <Bed className="w-6 h-6 mb-2 text-gray-700" />
                    <p className="font-semibold text-gray-900">
                      {property.rooms?.filter(r => r.isAvailable).length || 0} Active Rooms
                    </p>
                    <p className="text-xs text-gray-500">of {property.rooms?.length || 0} Total</p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <Users className="w-6 h-6 mb-2 text-gray-700" />
                    <p className="font-semibold text-gray-900">Max {property.maxOccupancy || 'N/A'}</p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <DollarSign className="w-6 h-6 mb-2 text-gray-700" />
                    <p className="font-semibold text-gray-900">₹{property.security_deposit || 0} Dep.</p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <Shield className="w-6 h-6 mb-2 text-gray-700" />
                    <p className="font-semibold text-gray-900">Verified</p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Amenities */}
              {property.amenities && Object.keys(property.amenities).some(k => property.amenities[k]) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">What this place offers</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                    {Object.entries(property.amenities).filter(([, v]) => v === true).map(([k]) => (
                      <div key={k} className="flex items-center gap-3 text-gray-600">
                        <CheckCircle className="w-5 h-5 text-gray-400" />
                        <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
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
                      <div key={key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                        <span className="text-gray-700 capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        {value ? (
                          <span className="text-green-700 text-sm font-bold bg-green-50 px-3 py-1 rounded-full">Allowed</span>
                        ) : (
                          <span className="text-red-700 text-sm font-bold bg-red-50 px-3 py-1 rounded-full">No</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-100" />


              {/* Available Rooms Section */}
              <div ref={roomsSectionRef} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
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
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-blue-600 shadow-sm flex items-center gap-1">
                            <Star className="w-3 h-3 fill-blue-600" />
                            {room.compatibility_score || 92}% Match
                          </div>
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


              </div>
            </div>

          </div>
        </div >
      </div >
    </SeekerLayout >
  );
};

export default SeekerPropertyDetails;
