import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import {
    ArrowLeft, Heart, Share2, User, Mail, Phone, MapPin,
    Bed, Square, Users, CheckCircle, Wifi, Car, Tv, Utensils,
    Shield, Calendar, Clock, DollarSign, Star, Info, X,
    Wind, Dog, Ban, Camera
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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);
    const [bookingStatus, setBookingStatus] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState([0, 0]);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [loadingTenants, setLoadingTenants] = useState(false);

    // Derived state for images
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

                {/* Gallery Hero */}
                <div className="relative h-[40vh] md:h-[50vh] bg-gray-900 group">
                    {images.length > 0 ? (
                        <img
                            src={images[currentImageIndex]}
                            alt={property.property_name}
                            className="w-full h-full object-cover opacity-90"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                            <span className="text-lg">No Images Available</span>
                        </div>
                    )}

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Top Navigation */}
                    <div className="absolute top-4 left-4 z-10">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-3">
                        <button
                            onClick={handleToggleFavorite}
                            className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                        >
                            <Heart className={`w-6 h-6 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                        >
                            <Share2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Bottom Info in Hero */}
                    <div className="absolute bottom-6 left-4 right-4 md:left-8 md:right-8 text-white">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <span className="inline-block px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold mb-2 uppercase tracking-wider">
                                    {room.room_type || room.type || 'Standard'} Room
                                </span>
                                <h1 className="text-3xl md:text-4xl font-bold mb-1">
                                    {property.property_name} - Room {room.room_number || room.roomNumber}
                                </h1>
                                <p className="text-gray-200 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {property.address?.city}, {property.address?.state}
                                </p>
                            </div>
                            <div className="text-right hidden md:block">
                                <p className="text-3xl font-bold">₹{room.rent?.toLocaleString()}</p>
                                <p className="text-sm opacity-80">per month</p>
                            </div>
                        </div>
                    </div>

                    {/* Image Navigation Dots (if multiple) */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Details */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Key Metrics Card */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                                    <p className="text-xs text-gray-500 uppercase">Occupancy</p>
                                    <p className="font-semibold text-gray-900">{room.occupancy} Person(s)</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                    <Square className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                                    <p className="text-xs text-gray-500 uppercase">Size</p>
                                    <p className="font-semibold text-gray-900">{room.room_size || room.dimension || 'N/A'} sq ft</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                    <Bed className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                                    <p className="text-xs text-gray-500 uppercase">Bed Type</p>
                                    <p className="font-semibold text-gray-900 capitalize">{room.bed_type || 'N/A'}</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                    <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                                    <p className="text-xs text-gray-500 uppercase">Status</p>
                                    <p className="font-semibold text-gray-900 capitalize">{room.is_available ? 'Available' : 'Occupied'}</p>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">About the Property</h2>
                                <p className="text-gray-600 leading-relaxed">
                                    {property.description || "A beautiful property located in a prime area, offering comfortable living spaces and modern amenities for a hassle-free stay."}
                                </p>
                            </div>

                            {/* Mobile-only Booking Card */}
                            <div className="lg:hidden">
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <span className="text-3xl font-bold text-gray-900">₹{room.rent?.toLocaleString()}</span>
                                            <span className="text-gray-500">/month</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Deposit</p>
                                            <p className="font-semibold text-gray-700">₹{property.security_deposit?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <hr className="border-gray-100 my-4" />

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Service Fee</span>
                                            <span className="font-medium text-gray-900">₹0</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Maintenance</span>
                                            <span className="font-medium text-gray-900">Included</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBookNow}
                                        disabled={bookingLoading || bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved' || bookingStatus?.status === 'pending_approval'}
                                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 ${bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved'
                                            ? 'bg-green-600 cursor-default'
                                            : bookingStatus?.status === 'pending_approval'
                                                ? 'bg-amber-500 cursor-default'
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
                            </div>

                            {/* Mobile-only Compatibility Card */}
                            <div className="lg:hidden">
                                <div className="bg-white rounded-2xl shadow-sm p-6 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                            <Star className="w-4 h-4 text-blue-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Compatibility</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-3xl font-black text-blue-600">92%</p>
                                                <p className="text-xs text-gray-500 font-medium">Lifestyle Match</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Excellent</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '92%' }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            Based on your preferences for <span className="text-gray-900 font-semibold">Quiet Evenings</span> and <span className="text-gray-900 font-semibold">Shared Kitchen</span> usage.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Room Features */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 font-primary">Room Features</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {room.amenities && Object.entries(room.amenities).map(([key, value]) => {
                                        if (!value) return null;
                                        const iconMap = {
                                            ac: <Wind className="w-5 h-5 text-blue-600" />,
                                            wifi: <Wifi className="w-5 h-5 text-blue-600" />,
                                            tv: <Tv className="w-5 h-5 text-blue-600" />,
                                            fridge: <Utensils className="w-5 h-5 text-blue-600" />, // Use Utensils for fridge or similar
                                            wardrobe: <Square className="w-5 h-5 text-blue-600" />,
                                            studyTable: <Square className="w-5 h-5 text-blue-600" />,
                                            balcony: <Square className="w-5 h-5 text-blue-600" />,
                                            attachedBathroom: <Shield className="w-5 h-5 text-blue-600" />
                                        };
                                        return (
                                            <div key={key} className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 transition-hover hover:border-blue-200">
                                                {iconMap[key] || <CheckCircle className="w-5 h-5 text-blue-600" />}
                                                <span className="text-xs font-medium text-gray-600 mt-2 text-center capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </div>
                                        );
                                    })}
                                    {(!room.amenities || Object.values(room.amenities).every(v => !v)) && (
                                        <p className="text-sm text-gray-500 italic col-span-full">No specific room features listed.</p>
                                    )}
                                </div>
                            </div>

                            {/* Property Amenities */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 font-primary">Property Amenities</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {property.amenities && Object.entries(property.amenities)
                                        .filter(([_, v]) => v)
                                        .map(([key]) => (
                                            <div key={key} className="flex items-center gap-3 p-3 bg-blue-50/30 rounded-xl border border-blue-50">
                                                <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                                                    {key.includes('parking') ? <Car className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* House Rules */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 font-primary">House Rules</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {property.rules && Object.entries(property.rules).map(([key, value]) => {
                                        const labelMap = {
                                            petsAllowed: value ? "Pets Welcome" : "No Pets Allowed",
                                            smokingAllowed: value ? "Smoking Allowed" : "No Smoking",
                                            visitorsAllowed: value ? "Visitors Allowed" : "No Visitors",
                                            cookingAllowed: value ? "Cooking Allowed" : "No Cooking Indoors"
                                        };
                                        const iconMap = {
                                            petsAllowed: <Dog className={`w-5 h-5 ${value ? 'text-green-600' : 'text-red-500'}`} />,
                                            smokingAllowed: <Wind className={`w-5 h-5 ${value ? 'text-green-600' : 'text-red-500'}`} />,
                                            visitorsAllowed: <Users className={`w-5 h-5 ${value ? 'text-green-600' : 'text-red-500'}`} />,
                                            cookingAllowed: <Utensils className={`w-5 h-5 ${value ? 'text-green-600' : 'text-red-500'}`} />
                                        };
                                        return (
                                            <div key={key} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                                <div className={`p-2 rounded-full ${value ? 'bg-green-50' : 'bg-red-50'}`}>
                                                    {iconMap[key]}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold ${value ? 'text-gray-900' : 'text-gray-700'}`}>{labelMap[key]}</p>
                                                    <p className="text-xs text-gray-500">{value ? 'Permitted' : 'Strictly prohibited'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Current Tenants Section */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 overflow-hidden relative">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 font-primary">Living With</h2>
                                    <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">
                                        {tenants.length} / {room.occupancy || 1} Occupied
                                    </span>
                                </div>

                                {loadingTenants ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-sm text-gray-500 animate-pulse">Finding your future roommates...</p>
                                    </div>
                                ) : tenants.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {tenants.map((tenant, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                key={tenant._id || idx}
                                                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                                                            {(tenant.profilePicture || tenant.userId?.profilePicture) ? (
                                                                <img
                                                                    src={tenant.profilePicture || tenant.userId?.profilePicture}
                                                                    alt={tenant.userName || 'Resident'}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <User className="w-6 h-6 text-blue-400" />
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                                {tenant.userName || 'Resident'}
                                                            </h3>
                                                        </div>
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                <Mail className="w-3 h-3 text-blue-500" /> {tenant.userEmail}
                                                            </p>
                                                            {tenant.userPhone && (
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <Phone className="w-3 h-3 text-green-500" /> {tenant.userPhone}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3 text-purple-500" /> Member since {tenant.actualCheckInDate ? new Date(tenant.actualCheckInDate).getFullYear() : new Date().getFullYear()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-8 border border-dashed border-gray-200 text-center">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                                            <Users className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h3 className="text-gray-900 font-bold mb-1">Room is Currently Empty</h3>
                                        <p className="text-sm text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                                            Be the first one to move in and set the vibe for this beautiful space!
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Location (Text Only) */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 font-primary">Location Details</h2>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                                        <div>
                                            <p className="text-gray-900 font-medium">Address</p>
                                            <p className="text-gray-600">
                                                {property.address?.street}, {property.address?.city}, {property.address?.state}, {property.address?.pincode}
                                            </p>
                                        </div>
                                    </div>
                                    {property.address?.landmark && (
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                                            <div>
                                                <p className="text-gray-900 font-medium">Landmark</p>
                                                <p className="text-gray-600">{property.address.landmark}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Leaflet Map */}
                                {mapCenter[0] !== 0 && (
                                    <div className="mt-6 h-64 w-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner relative" style={{ zIndex: 1 }}>
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
                                                        <p className="text-xs text-gray-600 mt-1">{property.address?.city}</p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        </MapContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Pricing & Owner (Sticky on Desktop) */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-6">

                                {/* Booking Card (Desktop) */}
                                <div className="hidden lg:block bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <span className="text-3xl font-bold text-gray-900">₹{room.rent?.toLocaleString()}</span>
                                            <span className="text-gray-500">/month</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Deposit</p>
                                            <p className="font-semibold text-gray-700">₹{property.security_deposit?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <hr className="border-gray-100 my-4" />

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Service Fee</span>
                                            <span className="font-medium text-gray-900">₹0</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Maintenance</span>
                                            <span className="font-medium text-gray-900">Included</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBookNow}
                                        disabled={bookingLoading || bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved' || bookingStatus?.status === 'pending_approval'}
                                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 ${bookingStatus?.status === 'confirmed' || bookingStatus?.status === 'approved'
                                            ? 'bg-green-600 cursor-default'
                                            : bookingStatus?.status === 'pending_approval'
                                                ? 'bg-amber-500 cursor-default'
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
                                    <div className="bg-white rounded-2xl shadow-sm p-6">
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

                                {/* Behavioral Match (Desktop) */}
                                <div className="hidden lg:block bg-white rounded-2xl shadow-sm p-6 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                            <Star className="w-4 h-4 text-blue-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Compatibility</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-3xl font-black text-blue-600">92%</p>
                                                <p className="text-xs text-gray-500 font-medium">Lifestyle Match</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Excellent</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '92%' }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            Based on your preferences for <span className="text-gray-900 font-semibold">Quiet Evenings</span> and <span className="text-gray-900 font-semibold">Shared Kitchen</span> usage.
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Booking Confirmation Modal */}
            <AnimatePresence>
                {showConfirmationModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Summary</h2>
                                <p className="text-gray-500 mb-6">Please review the costs before proceeding</p>

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
                                        <p className="text-[10px] text-blue-600 font-semibold mt-0.5">{property.property_name}</p>
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
                                        <span className="text-xl font-bold text-blue-600">₹{parseFloat(room.rent) + parseFloat(property.security_deposit || 0)}</span>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-5 mb-8">
                                    <div className="flex gap-3">
                                        <Info className="w-6 h-6 text-blue-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-blue-900">Booking Fee: 10%</p>
                                            <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                                You need to pay ₹{((parseFloat(room.rent) + parseFloat(property.security_deposit || 0)) * 0.10).toFixed(2)} to reserve this room. This amount will be adjusted in your first month's payment.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={initiatePayment}
                                    disabled={bookingLoading}
                                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
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
        </SeekerLayout>
    );
};

export default SeekerRoomDetails;
