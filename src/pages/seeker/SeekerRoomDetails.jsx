import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import {
    ArrowLeft, Heart, Share2, User, Mail, Phone, MapPin,
    Bed, Square, Users, CheckCircle, Wifi, Car, Tv, Utensils,
    Shield, Calendar, Clock, DollarSign, Star, Info, X,
    Wind, Dog, Ban, Camera, AlertCircle
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiClient from '../../utils/apiClient';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import { motion, AnimatePresence } from 'framer-motion';



const SeekerRoomDetails = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const location = useLocation();

    // State
    const [room, setRoom] = useState(null);
    const [property, setProperty] = useState(null);
    const [owner, setOwner] = useState(null);

    const handleCall = () => {
        if (owner?.phone) {
            window.location.href = `tel:${owner.phone}`;
        } else {
            toast({
                title: "Contact Info Unavailable",
                description: "The owner's phone number is not available.",
                variant: "destructive"
            });
        }
    };

    const handleMessage = () => {
        if (owner?.phone) {
            window.location.href = `sms:${owner.phone}`;
        } else {
            toast({
                title: "Contact Info Unavailable",
                description: "The owner's phone number is not available.",
                variant: "destructive"
            });
        }
    };
    const [loading, setLoading] = useState(true);
    const [compatibility, setCompatibility] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);
    const [bookingStatus, setBookingStatus] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState([0, 0]);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [showAllPhotosModal, setShowAllPhotosModal] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [loadingTenants, setLoadingTenants] = useState(false);

    // Derived state for images
    const getPropertyImages = (prop) => {
        if (!prop?.images) return [];
        // Handle if images is an array (legacy?) or object
        if (Array.isArray(prop.images)) return prop.images;

        const { gallery, ...singleImages } = prop.images;
        const distinctImages = Object.values(singleImages).filter(img => typeof img === 'string' && img.length > 0);
        const galleryImages = Array.isArray(gallery) ? gallery : [];
        return [...distinctImages, ...galleryImages];
    };

    const images = [
        ...(room?.room_image ? [room.room_image] : []),
        ...(room?.toilet_image ? [room.toilet_image] : []),
        ...getPropertyImages(property)
    ];



    // Helper: Get User ID
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

    // 1. Fetch Room Details
    const fetchRoomDetails = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/property/public/rooms/${roomId}`);
            const data = response.data;
            if (data.success && data.data) {
                console.log('Room Data Fetched Support:', data.data);
                setRoom(data.data.room);
                setProperty(data.data.property);
                setOwner(data.data.owner);
                setTenants(data.data.residents || []);
                setCompatibility(data.data.compatibility);

                if (data.data.property?.latitude && data.data.property?.longitude) {
                    setMapCenter([parseFloat(data.data.property.latitude), parseFloat(data.data.property.longitude)]);
                }
            } else {
                console.error('Room data missing or invalid structure:', data);
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
            toast({
                title: "Error",
                description: "Failed to load room details",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // 2. Check Favorite Status
    const checkFavoriteStatus = async () => {
        const userId = getUserId();
        const token = localStorage.getItem('authToken');

        if (!userId || !roomId || !property || !token) return;

        try {
            const response = await apiClient.get(`/property/favorites/check`, {
                params: { propertyId: property._id, roomId }
            });

            if (response.status === 200) {
                setIsFavorited(response.data.isFavorite);
            }
        } catch (error) {
            console.error('Error checking favorite:', error);
        }
    };

    // 3. Check Booking Status
    const checkBookingStatus = async () => {
        const userId = getUserId();
        const token = localStorage.getItem('authToken');

        // Need property to be loaded to send propertyId if required, or just roomId
        // Controller expects propertyId and roomId
        if (!userId || !roomId || !property || !token) return;

        try {
            const response = await apiClient.get(`/property/user/check-booking`, {
                params: { propertyId: property._id, roomId }
            });

            if (response.status === 200) {
                setBookingStatus(response.data);
            }
        } catch (error) {
            console.error('Error checking booking status:', error);
        }
    };

    // 4. Fetch Tenant Details
    const fetchTenantDetails = async () => {
        if (!roomId) return;
        try {
            setLoadingTenants(true);
            const response = await apiClient.get(`/property/public/rooms/${roomId}/tenants`);
            if (response.status === 200) {
                const data = response.data;
                setTenants(data.tenants || []);
            }
        } catch (error) {
            console.error('Error fetching tenant details:', error);
        } finally {
            setLoadingTenants(false);
        }
    };

    // Effects
    useEffect(() => {
        if (roomId) {
            fetchRoomDetails();
            fetchTenantDetails();
        }
    }, [roomId]);

    useEffect(() => {
        if (room && property) {
            checkFavoriteStatus();
            checkBookingStatus();
        }
    }, [room, property]);


    // Handlers
    const handleToggleFavorite = async () => {
        const userId = getUserId();
        const token = localStorage.getItem('authToken');

        if (!userId) {
            toast({ title: "Please Login", description: "You need to specific login to add favorites", variant: "destructive" });
            return;
        }

        try {
            const endpoint = isFavorited ? '/property/favorites/remove' : '/property/favorites';

            const response = await apiClient.post(endpoint, { userId, propertyId: property._id, roomId });

            if (response.status === 200) {
                setIsFavorited(!isFavorited);
                toast({
                    title: isFavorited ? "Removed from Favorites" : "Added to Favorites",
                    description: isFavorited ? "Room removed from your list" : "Room saved to your favorites"
                });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update favorites", variant: "destructive" });
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${property.property_name} - Room ${room.roomNumber}`,
                    text: `Check out this room for ₹${room.rent}/month!`,
                    url: window.location.href,
                });
            } catch (error) { console.log('Error sharing:', error); }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link Copied", description: "Room link copied to clipboard" });
        }
    };

    const handleBookNow = async () => {
        const userId = getUserId();
        const token = localStorage.getItem('authToken');

        if (!userId) {
            toast({ title: "Please Login", description: "You need to log in to book a room", variant: "destructive" });
            return;
        }

        // 1. Check Booking Status
        if (bookingStatus?.status === 'confirmed') {
            toast({ title: "Already Booked", description: "You have already booked this room." });
            return;
        }
        if (bookingStatus?.status === 'pending_approval') {
            toast({ title: "Pending Approval", description: "You already have a pending booking request for this room. Please wait for owner approval." });
            return;
        }

        // 2. Refresh User Profile and Check KYC Status
        try {
            setBookingLoading(true);
            const profileResponse = await apiClient.get(`/user/profile/${userId}`);

            if (profileResponse.status === 200) {
                const profileData = profileResponse.data;
                if (profileData.kycStatus !== 'approved' && profileData.user?.kycStatus !== 'approved') {
                    const status = profileData.kycStatus || profileData.user?.kycStatus;
                    toast({
                        title: "KYC Verification Required",
                        description: `Your KYC status is '${status || 'Not Verified'}'. You must be Approved to book this room.`,
                        variant: "destructive",
                        action: <button onClick={() => navigate('/seeker-kyc')} className="bg-white text-destructive px-2 py-1 rounded text-xs">Verify Now</button>
                    });
                    // Optional: Automatically redirect after a short delay
                    setTimeout(() => navigate('/seeker-kyc'), 2000);
                    setBookingLoading(false);
                    return;
                }
            }
        } catch (e) {
            console.log('Error fetching profile for KYC check', e);
            toast({ title: "Verification Failed", description: "Could not verify your KYC status. Please try again.", variant: "destructive" });
            setBookingLoading(false);
            return;
        } finally {
            setBookingLoading(false);
        }

        // Open Confirmation Modal
        setShowConfirmationModal(true);
    };

    const initiatePayment = async () => {
        const userId = getUserId();
        const token = localStorage.getItem('authToken');
        const rent = parseFloat(room.rent);
        const deposit = parseFloat(property.security_deposit || 0);
        const total = rent + deposit;
        const bookingFee = total * 0.10; // 10% of total

        try {
            setBookingLoading(true);
            // A. Create Order
            const orderResponse = await apiClient.post('/property/payments/create-order', {
                amount: bookingFee,
                receipt_id: `rcpt_${Date.now().toString().slice(-10)}`
            });

            const orderData = orderResponse.data;

            // B. Open Razorpay
            const options = {
                key: 'rzp_test_RL5vMta3bKvRd4',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Lyvo",
                description: `Booking Fee (10%) for ${property.property_name}`,
                order_id: orderData.order_id,
                handler: async function (response) {
                    try {
                        const verifyResponse = await apiClient.post('/property/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingDetails: {
                                propertyId: property._id,
                                roomId: roomId,
                                userId: userId,
                                amount: bookingFee,
                                securityDeposit: deposit,
                                monthlyRent: rent
                            }
                        });

                        const verifyData = verifyResponse.data;
                        if (verifyData.success) {
                            setBookingStatus({ status: 'pending_approval', bookingId: verifyData.bookingId });
                            setShowConfirmationModal(false);
                            toast({ title: "Booking Requested", description: "Payment successful! Your booking request is now pending owner approval." });
                            // Redirect to My Bookings page
                            setTimeout(() => navigate('/seeker-bookings'), 1500);
                        } else {
                            toast({ title: "Booking Failed", description: verifyData.message, variant: "destructive" });
                        }
                    } catch (err) {
                        console.error('Verification Error:', err);
                        toast({ title: "Verification Error", description: "Payment verified but booking creation failed. Contact support.", variant: "destructive" });
                    }
                },
                theme: { color: "#3399cc" }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
            });
            rzp1.open();

        } catch (error) {
            console.error(error);
            toast({ title: "Payment Error", description: "Could not initiate payment", variant: "destructive" });
        } finally {
            setBookingLoading(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!bookingStatus?.bookingId) return;

        const confirmed = window.confirm("Are you sure you want to cancel this booking? This will remove your booking request.");
        if (!confirmed) return;

        try {
            setBookingLoading(true);
            const token = localStorage.getItem('authToken');
            const response = await apiClient.delete(`/property/bookings/${bookingStatus.bookingId}`);

            if (response.status === 200) {
                setBookingStatus(null);
                toast({ title: "Booking Cancelled", description: "Your booking request has been cancelled." });
            } else {
                const err = response.data || {};
                toast({ title: "Cancellation Failed", description: err.message || "Failed to cancel booking", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Cancellation failed", variant: "destructive" });
        } finally {
            setBookingLoading(false);
        }
    };


    // Main Render
    if (loading) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </SeekerLayout>
        );
    }

    if (!room || !property) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold mb-4">Room Not Found</h2>
                    <button onClick={() => navigate('/seeker-dashboard')} className="text-blue-600 hover:underline">Return to Dashboard</button>
                </div>
            </SeekerLayout>
        );
    }

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6 relative">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </button>

                    {/* Header Section */}
                    <div className="mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                    {property.property_name} - Room {room.room_number || room.roomNumber}
                                </h1>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1 font-medium text-gray-900">
                                        <Star className="w-4 h-4 fill-black text-black" />
                                        4.8 <span className="text-gray-500 font-normal">(12 reviews)</span>
                                    </span>
                                    <span className="hidden md:inline">•</span>
                                    <span className="flex items-center gap-1 underline cursor-pointer hover:text-gray-900">
                                        {property.address?.city}, {property.address?.state}, {property.address?.country || 'India'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-300 text-sm font-semibold text-gray-700 group"
                                >
                                    <Share2 className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                                    Share
                                </button>
                                <button
                                    onClick={handleToggleFavorite}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-md group ${isFavorited
                                        ? 'border-red-100 bg-red-50 text-red-600'
                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover:text-red-500'}`} />
                                    {isFavorited ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Image Grid - Adaptive */}
                    <div className="relative rounded-xl overflow-hidden shadow-sm h-[40vh] md:h-[60vh]">
                        {images.length === 1 ? (
                            <img
                                src={images[0]}
                                alt="Room View"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
                                onClick={() => {
                                    setCurrentImageIndex(0);
                                }}
                            />
                        ) : images.length >= 2 ? (
                            <div className="grid grid-cols-2 gap-2 h-full">
                                {images.slice(0, 2).map((img, idx) => (
                                    <div key={idx} className="relative overflow-hidden group">
                                        <img
                                            src={img}
                                            alt={`View ${idx + 1}`}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                                            onClick={() => setCurrentImageIndex(idx)}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                <p>No images available</p>
                            </div>
                        )}

                        {/* Show All Photos Button */}
                        <button
                            onClick={() => setShowAllPhotosModal(true)}
                            className="absolute bottom-4 right-4 bg-white border border-black/10 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Square className="w-4 h-4" /> Show all photos
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Left Column: Details */}
                        <div className="md:col-span-2 space-y-6">



                            {/* Key Metrics - Advanced Card Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                                    <Users className="w-8 h-8 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors stroke-[1.5]" />
                                    <p className="font-bold text-xl text-gray-900 leading-none mb-1">{tenants?.length || 0} / {room.occupancy}</p>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Occupied</p>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                                    <Square className="w-8 h-8 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors stroke-[1.5]" />
                                    <p className="font-bold text-xl text-gray-900 leading-none mb-1">{room.room_size || room.dimension || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">sq ft</p>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                                    <Bed className="w-8 h-8 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors stroke-[1.5]" />
                                    <p className="font-bold text-xl text-gray-900 leading-none mb-1 capitalize truncate">{room.bed_type || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bed Type</p>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                                    <Calendar className="w-8 h-8 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors stroke-[1.5]" />
                                    <p className={`font-bold text-xl leading-none mb-1 capitalize truncate ${room.is_available ? 'text-green-600' : 'text-red-500'}`}>
                                        {room.is_available ? 'Available' : 'Room is Full'}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300 mt-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">About this place</h2>
                                <p className="text-gray-600 leading-relaxed text-lg">
                                    {property.description || "A beautiful property located in a prime area, offering comfortable living spaces and modern amenities for a hassle-free stay."}
                                </p>
                            </div>

                            {/* Living With Section (Main Content) */}
                            {tenants && tenants.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">Living With</h2>
                                            <p className="text-gray-500 mt-1">Get to know your potential future housemates</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full">
                                            <div className="flex -space-x-3">
                                                {tenants.slice(0, 3).map((t, i) => (
                                                    <img
                                                        key={i}
                                                        src={t.profilePicture || `https://ui-avatars.com/api/?name=${t.name}&background=random`}
                                                        alt={t.name}
                                                        className="w-8 h-8 rounded-full border-2 border-white object-cover"
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-sm font-bold text-blue-700">{tenants.length} Residents</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {tenants.map((t, i) => (
                                            <div key={i} className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-lg hover:border-blue-100 transition-all duration-300 items-center">
                                                {/* Left: Avatar */}
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={t.profilePicture || `https://ui-avatars.com/api/?name=${t.name}&background=random`}
                                                        alt={t.name}
                                                        className="w-16 h-16 rounded-full object-cover shadow-sm bg-gray-100"
                                                    />
                                                    {/* Compatibility Badge (Percentage) */}
                                                    {t.matchScore !== undefined && (
                                                        <div className={`absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${t.matchScore >= 80 ? 'bg-green-500' : t.matchScore >= 60 ? 'bg-blue-500' : 'bg-red-500'}`} title="Lifestyle Match Score">
                                                            <span className="text-[10px] font-bold text-white">{t.matchScore}%</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-lg font-bold text-gray-900 truncate">{t.name}</h4>
                                                        <span className="flex items-center gap-0.5 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 uppercase tracking-wide">
                                                            <CheckCircle className="w-3 h-3" /> VERIFIED
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-gray-500 font-medium mb-3">
                                                        Joined {t.joinedAt ? new Date(t.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {t.lifestyle?.occupation && (
                                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-200">
                                                                {t.lifestyle.occupation}
                                                            </span>
                                                        )}
                                                        {t.lifestyle?.smoking !== undefined && (
                                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-200">
                                                                {t.lifestyle.smoking === 'Yes' ? 'Smoker' : 'Non-Smoker'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <hr className="border-gray-100" />

                            {/* Mobile-only Booking Card - Simplified */}
                            <div className="md:hidden">
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <span className="text-3xl font-bold text-gray-900">₹{room.rent?.toLocaleString()}</span>
                                            <span className="text-gray-500">/month</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleBookNow}
                                        disabled={bookingLoading || bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved' || bookingStatus?.status === 'pending_approval' || !room.is_available}
                                        className={`w-full py-4 text-white font-bold text-lg rounded-xl shadow-lg transition-all font-outfit uppercase tracking-tight
                                          ${!room.is_available && !(bookingStatus && ['confirmed', 'approved', 'pending_approval'].includes(bookingStatus.status))
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-red-100'
                                            }`}
                                    >
                                        {!room.is_available && !(bookingStatus && ['confirmed', 'approved', 'pending_approval'].includes(bookingStatus.status)) ? "Room is Full" : "Book Now"}
                                    </button>
                                </div>
                            </div>

                            {/* Mobile-only Compatibility Card */}
                            {compatibility && (
                                <div className="lg:hidden">
                                    <div className="bg-white rounded-2xl shadow-sm p-6 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${compatibility.overallScore >= 80 ? 'bg-green-50' : compatibility.overallScore >= 60 ? 'bg-blue-50' : 'bg-red-50'}`}>
                                                <Star className={`w-4 h-4 ${compatibility.overallScore >= 80 ? 'text-green-600' : compatibility.overallScore >= 60 ? 'text-blue-600' : 'text-red-600'}`} />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 font-outfit">Compatibility</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className={`text-3xl font-black ${compatibility.overallScore >= 80 ? 'text-green-600' : compatibility.overallScore >= 60 ? 'text-blue-600' : 'text-red-600'}`}>{compatibility.overallScore}%</p>
                                                    <p className="text-xs text-gray-500 font-medium">Lifestyle Match</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold px-2 py-0.5 rounded ${compatibility.overallScore >= 80 ? 'text-green-600 bg-green-50' : compatibility.overallScore >= 60 ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'}`}>{compatibility.label}</p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${compatibility.overallScore}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={`h-full bg-gradient-to-r ${compatibility.overallScore >= 80 ? 'from-green-500 to-emerald-600' : compatibility.overallScore >= 60 ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-pink-600'}`}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {compatibility.notes}
                                            </p>
                                            {/* Deterministic Insights Mobile */}
                                            {compatibility.scoreBreakdown && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Strong Matches
                                                        </h4>
                                                        {compatibility.scoreBreakdown.pros.length > 0 ? (
                                                            <ul className="text-xs text-gray-600 space-y-1">
                                                                {compatibility.scoreBreakdown.pros.map((attr, i) => (
                                                                    <li key={i} className="flex items-center gap-1.5">
                                                                        <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                                                                        {attr}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">No specific strong matches.</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Potential Friction
                                                        </h4>
                                                        {compatibility.scoreBreakdown.cons.length > 0 ? (
                                                            <ul className="text-xs text-gray-600 space-y-1">
                                                                {compatibility.scoreBreakdown.cons.map((attr, i) => (
                                                                    <li key={i} className="flex items-center gap-1.5">
                                                                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                                                                        {attr}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">No major friction points.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Room Features - Card Grid */}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Room Features</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {room.amenities && Object.entries(room.amenities).map(([key, value]) => {
                                        if (!value) return null;
                                        const iconMap = {
                                            ac: <Wind className="w-6 h-6" />,
                                            wifi: <Wifi className="w-6 h-6" />,
                                            tv: <Tv className="w-6 h-6" />,
                                            fridge: <Utensils className="w-6 h-6" />,
                                            wardrobe: <Square className="w-6 h-6" />,
                                            studyTable: <Square className="w-6 h-6" />,
                                            balcony: <Square className="w-6 h-6" />,
                                            attachedBathroom: <Shield className="w-6 h-6" />
                                        };
                                        return (
                                            <div key={key} className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default">
                                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-50 transition-colors">
                                                    <span className="text-gray-500 group-hover:text-blue-600 transition-colors">
                                                        {iconMap[key] || <CheckCircle className="w-6 h-6" />}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 capitalize text-center leading-tight group-hover:text-gray-900">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {(!room.amenities || Object.values(room.amenities).every(v => !v)) && (
                                        <div className="col-span-full p-6 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                                            <p className="text-gray-500 font-medium">No specific room features listed.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Property Amenities - Shadowed Card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Property Amenities</h2>
                                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full uppercase tracking-wider">Common Areas</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {property.amenities && Object.entries(property.amenities)
                                        .filter(([_, v]) => v)
                                        .map(([key]) => (
                                            <div key={key} className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-gray-50 transition-colors group cursor-default">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                                                    <CheckCircle className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 capitalize text-center leading-tight group-hover:text-gray-900">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* House Rules - Shadowed Card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">House Rules</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {property.rules && Object.entries(property.rules).map(([key, value]) => {
                                        return (
                                            <div key={key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                                                <span className="text-gray-700 capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').replace('Allowed', '').trim()}</span>
                                                {value ? (
                                                    <span className="text-green-700 text-sm font-bold bg-green-50 px-3 py-1 rounded-full">Allowed</span>
                                                ) : (
                                                    <span className="text-red-700 text-sm font-bold bg-red-50 px-3 py-1 rounded-full">No</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Current Tenants Section - Detailed Cards */}


                            {/* Location */}
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900">Location Details</h2>
                                <p className="text-gray-600 flex items-start gap-2">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                                    <span>
                                        {property.address?.street}, {property.address?.city}, {property.address?.state}, {property.address?.pincode}
                                        {property.address?.landmark && <span className="block text-sm text-gray-500 mt-1">Landmark: {property.address.landmark}</span>}
                                    </span>
                                </p>

                                {/* Leaflet Map */}
                                {mapCenter[0] !== 0 && (
                                    <div className="mt-4 h-[250px] w-full rounded-2xl overflow-hidden relative z-0 border border-gray-200">
                                        <MapContainer
                                            center={mapCenter}
                                            zoom={15}
                                            style={{ height: '100%', width: '100%' }}
                                            scrollWheelZoom={false}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Marker position={mapCenter}>
                                                <Popup>
                                                    <div className="p-2">
                                                        <p className="font-bold text-gray-900">{property.property_name}</p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        </MapContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Pricing & Owner (Sticky on Desktop) */}
                        <div className="md:col-span-1">
                            <div className="sticky top-24 space-y-6 mt-6">

                                {/* Booking Card (Desktop) */}
                                <div className="hidden md:block bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-3xl font-bold text-gray-900 tracking-tight">₹{room.rent?.toLocaleString()}</span>
                                            <span className="text-gray-500 text-sm font-medium">/month</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Deposit</p>
                                            <p className="font-bold text-lg text-gray-900">₹{property.security_deposit?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <hr className="border-gray-100 my-4" />

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-base">
                                            <span className="text-gray-600">Service Fee</span>
                                            <span className="font-medium text-gray-900">₹0</span>
                                        </div>
                                        {/* Additional rows can be added here */}
                                    </div>

                                    <button
                                        onClick={handleBookNow}
                                        disabled={bookingLoading || bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved' || bookingStatus?.status === 'pending_approval' || (!room.is_available && !bookingStatus)}
                                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 ${bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved'
                                            ? 'bg-green-600 cursor-default'
                                            : bookingStatus?.status === 'pending_approval'
                                                ? 'bg-amber-500 cursor-default'
                                                : !room.is_available
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                            }`}
                                    >
                                        {bookingLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processing...
                                            </span>
                                        ) : bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved' ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <CheckCircle className="w-5 h-5" /> Booked
                                            </span>
                                        ) : bookingStatus?.status === 'pending_approval' ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Clock className="w-5 h-5" /> Waiting for Approval
                                            </span>
                                        ) : bookingStatus?.status === 'pending_payment' ? (
                                            "Complete Payment"
                                        ) : !room.is_available ? (
                                            "Room is Full"
                                        ) : (
                                            "Book Now"
                                        )}
                                    </button>

                                    {(bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved' || bookingStatus?.status === 'pending_approval') && (
                                        <button
                                            onClick={handleCancelBooking}
                                            disabled={bookingLoading}
                                            className="w-full mt-3 py-3 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <X className="w-4 h-4" /> Cancel Booking
                                        </button>
                                    )}

                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        {bookingStatus?.status === 'pending_approval'
                                            ? "Your request is being reviewed by the owner."
                                            : "You'll pay a 10% booking fee to reserve."}
                                    </p>
                                </div>

                                {/* Owner Card */}
                                {owner && (
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                                                {owner.profilePicture ? (
                                                    <img src={owner.profilePicture} alt={owner.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                        <User className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{owner.name}</h3>
                                                <p className="text-sm text-gray-500">Property Owner</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleMessage}
                                                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Mail className="w-4 h-4" /> Message
                                            </button>
                                            <button
                                                onClick={handleCall}
                                                className="flex-1 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Phone className="w-4 h-4" /> Call
                                            </button>
                                        </div>
                                    </div>
                                )}


                                {/* Living With (Desktop) */}


                                {/* Behavioral Match (Desktop) */}
                                {compatibility && (
                                    <div className="hidden md:block bg-white rounded-2xl shadow-lg border border-gray-100 p-6 overflow-hidden relative hover:shadow-xl transition-shadow duration-300">
                                        <div className="absolute top-0 right-0 p-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${compatibility.overallScore >= 80 ? 'bg-green-50' : compatibility.overallScore >= 60 ? 'bg-blue-50' : 'bg-red-50'}`}>
                                                <Star className={`w-4 h-4 ${compatibility.overallScore >= 80 ? 'text-green-600' : compatibility.overallScore >= 60 ? 'text-blue-600' : 'text-red-600'}`} />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Compatibility</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className={`text-3xl font-black ${compatibility.overallScore >= 80 ? 'text-green-600' : compatibility.overallScore >= 60 ? 'text-blue-600' : 'text-red-600'}`}>{compatibility.overallScore}%</p>
                                                    <p className="text-xs text-gray-500 font-medium">Lifestyle Match</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold px-2 py-0.5 rounded ${compatibility.overallScore >= 80 ? 'text-green-600 bg-green-50' : compatibility.overallScore >= 60 ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'}`}>{compatibility.label}</p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${compatibility.overallScore}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={`h-full bg-gradient-to-r ${compatibility.overallScore >= 80 ? 'from-green-500 to-emerald-600' : compatibility.overallScore >= 60 ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-pink-600'}`}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {compatibility.notes || <span>Based on your preferences for <span className="text-gray-900 font-semibold">Quiet Evenings</span> and <span className="text-gray-900 font-semibold">Shared Kitchen</span> usage.</span>}
                                            </p>

                                            {/* Deterministic Insights */}
                                            {compatibility.scoreBreakdown && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Strong Matches
                                                        </h4>
                                                        {compatibility.scoreBreakdown.pros.length > 0 ? (
                                                            <ul className="text-xs text-gray-600 space-y-1">
                                                                {compatibility.scoreBreakdown.pros.map((attr, i) => (
                                                                    <li key={i} className="flex items-center gap-1.5">
                                                                        <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                                                                        {attr}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">No specific strong matches.</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Potential Friction
                                                        </h4>
                                                        {compatibility.scoreBreakdown.cons.length > 0 ? (
                                                            <ul className="text-xs text-gray-600 space-y-1">
                                                                {compatibility.scoreBreakdown.cons.map((attr, i) => (
                                                                    <li key={i} className="flex items-center gap-1.5">
                                                                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                                                                        {attr}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">No major friction points.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* Booking Confirmation Modal */}
                <AnimatePresence>
                    {showConfirmationModal && (
                        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
                            >
                                <button
                                    onClick={() => setShowConfirmationModal(false)}
                                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="p-8">
                                    <h2 className="text-2xl font-black text-gray-900 mb-2 font-outfit uppercase tracking-tight">Booking Summary</h2>
                                    <p className="text-gray-500 mb-6 text-sm">Please review the costs before proceeding</p>

                                    {/* Room Preview in Modal */}
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
                                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white">
                                            <img
                                                src={room.room_image || room.roomImage || (Array.isArray(property.images) ? property.images[0] : property.image)}
                                                alt="Room"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">Room {room.room_number || room.roomNumber}</h4>
                                            <p className="text-xs text-gray-500">{room.room_type} • {room.bed_type}</p>
                                            <p className="text-[10px] text-red-600 font-semibold mt-0.5">{property.property_name}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Monthly Rent</span>
                                            <span className="font-semibold text-gray-900">₹{room.rent}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Security Deposit</span>
                                            <span className="font-semibold text-gray-900">₹{property.security_deposit || 0}</span>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-gray-900 font-bold">Total Amount</span>
                                            <span className="text-xl font-bold text-red-600">₹{parseFloat(room.rent) + parseFloat(property.security_deposit || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="bg-red-50 rounded-xl p-5 mb-8">
                                        <div className="flex gap-3">
                                            <Info className="w-6 h-6 text-red-600 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-red-900">Booking Fee: 10%</p>
                                                <p className="text-sm text-red-700 mt-1 leading-relaxed">
                                                    You need to pay ₹{((parseFloat(room.rent) + parseFloat(property.security_deposit || 0)) * 0.10).toFixed(2)} to reserve this room. This amount will be adjusted in your first month's payment.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={initiatePayment}
                                        disabled={bookingLoading}
                                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-600 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                                    >
                                        {bookingLoading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>Pay ₹{((parseFloat(room.rent) + parseFloat(property.security_deposit || 0)) * 0.10).toFixed(2)} & Book Now</>
                                        )}
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-5">
                                        By proceeding, you agree to Lyvo's Terms and Conditions
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* All Photos Gallery Modal */}
                <AnimatePresence>
                    {showAllPhotosModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[3000] bg-white overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-4 md:px-8 border-b border-gray-100 flex items-center justify-between">
                                <button
                                    onClick={() => setShowAllPhotosModal(false)}
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
                                        setShowAllPhotosModal(false);
                                    }}
                                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                                >
                                    Back to Room
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SeekerLayout>
    );
};

export default SeekerRoomDetails;
