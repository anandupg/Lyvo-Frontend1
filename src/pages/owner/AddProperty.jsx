import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.jsx';
import {
  Building,
  MapPin,
  DollarSign,
  Users,
  Home,
  Car,
  Wifi,
  Snowflake,
  Utensils,
  Dumbbell,
  Shield,
  Camera,
  X,
  Plus,
  ArrowLeft,
  Save,
  FileText,
  Eye,
  Sparkles // Import Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import apiClient from '../../utils/apiClient';
import OwnerLayout from '../../components/owner/OwnerLayout';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    }
  });
  return null;
};

// Map update component to handle center changes
const MapUpdater = ({ center }) => {
  const map = useMapEvents({});
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const AddProperty = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsKyc, setNeedsKyc] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [formData, setFormData] = useState({
    // Basic Information
    propertyName: '',
    description: '',
    numberOfRooms: '',
    propertyMode: 'room', // Only room mode supported
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      latitude: '',
      longitude: ''
    },

    // Pricing (only security deposit retained; monthly rent moved per-room)
    monthlyRent: '',
    securityDeposit: '',

    // Amenities (limited set per requirements)
    amenities: {
      parking4w: false,
      parking2w: false,
      kitchen: false,
      powerBackup: false
    },

    // Rules and Policies
    rules: {
      petsAllowed: false,
      smokingAllowed: false,
      visitorsAllowed: true,
      cookingAllowed: true
    },

    // Images
    images: [],
    requiredImages: {
      front: null,
      back: null,
      hall: null,
      kitchen: null
    },
    toiletOutside: false,
    outsideToiletImage: null,

    // Property Document (only Land Tax Receipt)
    landTaxReceipt: null,
    documents: [], // Additional documents array (currently not used but prevents errors)

    // Room Details
    rooms: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState(false);

  // Function to generate room details based on number of rooms
  const generateRoomDetails = (roomCount) => {
    const rooms = [];
    for (let i = 1; i <= roomCount; i++) {
      rooms.push({
        roomNumber: i,
        roomType: '',
        roomSize: '',
        bedType: '',
        occupancy: 1, // Default to 1, will be updated when room type is selected
        rent: '',
        predictedRent: null, // Store prediction
        rentRange: null, // Store range
        amenities: {
          ac: false,
          wifi: false,
          tv: false,
          fridge: false,
          wardrobe: false,
          studyTable: false,
          balcony: false,
          attachedBathroom: false
        },
        description: '',
        roomImage: null,
        toiletImage: null
      });
    }
    return rooms;
  };

  // Handle number of rooms change
  const handleRoomCountChange = (value) => {
    const raw = parseInt(value);
    const roomCount = isNaN(raw) ? 0 : Math.min(raw, 6);
    setFormData(prev => ({
      ...prev,
      numberOfRooms: String(roomCount),
      rooms: roomCount > 0 ? generateRoomDetails(roomCount) : []
    }));
    setShowRoomDetails(roomCount > 0);
    // Validation feedback for exceeding max
    if (!isNaN(raw) && raw > 6) {
      setErrors(prev => ({ ...prev, numberOfRooms: 'Maximum 6 rooms allowed' }));
    } else if (errors.numberOfRooms === 'Maximum 6 rooms allowed') {
      setErrors(prev => ({ ...prev, numberOfRooms: '' }));
    }
  };


  // Function to get occupancy based on room type
  const getOccupancyFromRoomType = (roomType) => {
    const occupancyMap = {
      'Single': 1,
      'Double': 2,
      'Triple': 3,
      'Quad': 4,
      'Master': 2,
      'Studio': 1
    };
    return occupancyMap[roomType] || 1;
  };

  // Handle room detail changes
  const handleRoomChange = (roomIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) => {
        if (index === roomIndex) {
          const updatedRoom = { ...room, [field]: value };

          // Auto-set occupancy when room type changes
          if (field === 'roomType' && value) {
            updatedRoom.occupancy = getOccupancyFromRoomType(value);
          }

          return updatedRoom;
        }
        return room;
      })
    }));
  };

  // Handle room amenity changes
  const handleRoomAmenityChange = (roomIndex, amenity, value) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) =>
        index === roomIndex
          ? {
            ...room,
            amenities: {
              ...room.amenities,
              [amenity]: value
            }
          }
          : room
      )
    }));
  };

  // Per-room image handlers
  const handleRoomImageUpload = (roomIndex, kind, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const entry = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    };
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) =>
        index === roomIndex ? { ...room, [kind]: entry } : room
      )
    }));
    // clear specific field error
    const errKey = kind === 'roomImage' ? `room_${roomIndex}_roomImage` : `room_${roomIndex}_toiletImage`;
    if (errors[errKey]) {
      setErrors(prev => ({ ...prev, [errKey]: '' }));
    }
  };

  const removeRoomImage = (roomIndex, kind) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) =>
        index === roomIndex ? { ...room, [kind]: null } : room
      )
    }));
  };

  // Leaflet Map state
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [placeSearch, setPlaceSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const listRef = useRef(null);
  const selectingRef = useRef(false);
  const [markerPosition, setMarkerPosition] = useState([12.9716, 77.5946]); // Default: Bangalore


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
        if (user.role !== 3) {
          navigate('/login');
          return;
        }
        setUser(user);
        const requiresKyc = !user.kycVerified && !(user.govtIdFrontUrl && user.govtIdBackUrl);
        setNeedsKyc(requiresKyc);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Stay on this page; do not auto-redirect. Show prompt instead.

  // Initialize marker position from existing coordinates
  useEffect(() => {
    if (formData.address.latitude && formData.address.longitude) {
      const lat = parseFloat(formData.address.latitude);
      const lng = parseFloat(formData.address.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMarkerPosition([lat, lng]);
      }
    }
  }, [formData.address.latitude, formData.address.longitude]);

  // Handle location selection from map click or marker drag
  const handleLocationSelect = (lat, lng) => {
    setMarkerPosition([lat, lng]);
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        latitude: String(lat),
        longitude: String(lng),
      }
    }));
  };

  // Handle marker drag end
  const handleMarkerDragEnd = (event) => {
    const { lat, lng } = event.target.getLatLng();
    handleLocationSelect(lat, lng);
  };

  const toggleSatellite = () => {
    setIsSatellite(!isSatellite);
  };

  const copyCoords = () => {
    const lat = formData.address.latitude;
    const lng = formData.address.longitude;
    if (!lat || !lng) {
      alert('Set a location first (drag marker or select a place).');
      return;
    }
    const text = `${lat}, ${lng}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Coordinates copied to clipboard');
      }).catch(() => {
        window.prompt('Copy coordinates:', text);
      });
    } else {
      window.prompt('Copy coordinates:', text);
    }
  };

  // Fetch place suggestions using OpenStreetMap Nominatim (debounced)
  useEffect(() => {
    if (!placeSearch || placeSearch.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (selectingRef.current) {
      // Ignore suggestion fetch right after a selection
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(placeSearch)}` +
          `&format=json` +
          `&addressdetails=1` +
          `&limit=5` +
          `&countrycodes=in`, // Restrict to India
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'LyvoPropertyApp/1.0'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
          setActiveSuggestionIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.error('Error fetching place suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [placeSearch]);

  // Keep active item visible when navigating via keyboard
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeSuggestionIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeSuggestionIndex]);

  const selectPlace = (place) => {
    if (!place) return;
    selectingRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setShowSuggestions(false);
    setSuggestions([]);

    // Extract address components from Nominatim data
    const addr = place.address || {};
    const street = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const state = addr.state || '';
    const pincode = addr.postcode || '';
    const landmark = place.name || addr.amenity || '';
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    // Update marker position
    if (!isNaN(lat) && !isNaN(lng)) {
      setMarkerPosition([lat, lng]);
    }

    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        street: street || prev.address.street,
        city: city || prev.address.city,
        state: state || prev.address.state,
        pincode: pincode || prev.address.pincode,
        landmark: landmark || prev.address.landmark,
        latitude: !isNaN(lat) ? String(lat) : prev.address.latitude,
        longitude: !isNaN(lng) ? String(lng) : prev.address.longitude,
      }
    }));
    setPlaceSearch(place.display_name || '');
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    // allow suggestion fetching after the value settles
    setTimeout(() => { selectingRef.current = false; }, 0);
  };

  const onKeyDownPlace = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestionIndex((p) => (p + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestionIndex((p) => (p - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0) { e.preventDefault(); selectPlace(suggestions[activeSuggestionIndex]); }
    } else if (e.key === 'Escape') { setShowSuggestions(false); setActiveSuggestionIndex(-1); }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAmenityChange = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [amenity]: !prev.amenities[amenity]
      }
    }));
  };

  const handleRuleChange = (rule) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [rule]: !prev.rules[rule]
      }
    }));
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const handleRequiredImageUpload = (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const entry = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    };
    setFormData(prev => ({
      ...prev,
      requiredImages: { ...prev.requiredImages, [type]: entry }
    }));
    // Clear field error for this slot
    if (errors[`requiredImages.${type}`]) {
      setErrors(prev => ({ ...prev, [`requiredImages.${type}`]: '' }));
    }
  };

  const handleOutsideToiletImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const entry = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    };
    setFormData(prev => ({ ...prev, outsideToiletImage: entry }));
    if (errors['outsideToiletImage']) {
      setErrors(prev => ({ ...prev, outsideToiletImage: '' }));
    }
  };

  const removeRequiredImage = (type) => {
    setFormData(prev => ({
      ...prev,
      requiredImages: { ...prev.requiredImages, [type]: null }
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Document upload functions
  const handleLandTaxReceiptUpload = (event) => {
    // ... existing ... 
  }; // Don't modify this block, just anchoring for insertion before it 

  // Rent Prediction Handler
  const handlePredictRent = async (index) => {
    const room = formData.rooms[index];

    // Validate required fields for prediction
    // Validate required fields for prediction
    if (!room.roomSize || !formData.address.city) {
      setWarningMessage("Please enter Location (City) and Room Size first to get an accurate suggestion.");
      setWarningModalOpen(true);
      return;
    }

    try {
      const response = await apiClient.post('/property/predict-rent', {
        location: formData.address.city, // Use City as location proxy
        roomType: room.roomType,
        roomSize: room.roomSize,
        amenities: room.amenities,
        propertyAmenities: formData.amenities
      });

      const data = response.data;
      if (data.success) {
        // Update state with prediction result to show in UI
        setFormData(prev => ({
          ...prev,
          rooms: prev.rooms.map((r, i) => i === index ? {
            ...r,
            predictedRent: data.predicted_rent,
            rentRange: data.range
          } : r)
        }));
      } else {
        setWarningMessage("Could not predict rent: " + (data.message || "Unknown error"));
        setWarningModalOpen(true);
      }
    } catch (error) {
      console.error("Prediction Error:", error);
      setWarningMessage("Failed to get rent suggestion. Ensure backend is running.");
      setWarningModalOpen(true);
    }
  };
  // Deprecated: generic documents list removed

  const removeLandTaxReceipt = () => {
    setFormData(prev => ({ ...prev, landTaxReceipt: null }));
  };


  // previewDoc no longer used for generic docs

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.propertyName.trim()) newErrors.propertyName = 'Property name is required';
    // Description is always required
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.propertyMode === 'room') {
      const n = parseInt(formData.numberOfRooms);
      if (!n || n <= 0) newErrors.numberOfRooms = 'Number of rooms is required';
      else if (n > 6) newErrors.numberOfRooms = 'Maximum 6 rooms allowed';
    } else {
      if (!formData.dormitory.numDorms) newErrors['dormitory.numDorms'] = 'Number of dorms is required';
      const count = parseInt(formData.dormitory.numDorms || '0');
      if (count > 0) {
        const missing = (formData.dormitory.bedsPerDorms || []).findIndex(v => !v || parseInt(v) <= 0);
        if (missing !== -1) newErrors['dormitory.bedsPerDorms'] = 'Enter beds for each dorm';
      }
      if (!formData.dormitory.pricePerBed) newErrors['dormitory.pricePerBed'] = 'Price per bed is required';
    }

    // Room details validation
    if (formData.propertyMode === 'room' && formData.rooms.length > 0) {
      formData.rooms.forEach((room, index) => {
        if (!room.roomType) newErrors[`room_${index}_type`] = `Room ${index + 1} type is required`;
        if (!room.roomSize || parseInt(room.roomSize) <= 0) newErrors[`room_${index}_size`] = `Room ${index + 1} size is required`;
        if (!room.bedType) newErrors[`room_${index}_bed`] = `Room ${index + 1} bed type is required`;
        // Occupancy is automatically set based on room type, no validation needed
        if (!room.rent || parseInt(room.rent) <= 0) newErrors[`room_${index}_rent`] = `Room ${index + 1} rent is required`;
        if (!room.roomImage) newErrors[`room_${index}_roomImage`] = `Room ${index + 1} image is required`;
        if (room.amenities?.attachedBathroom && !room.toiletImage) newErrors[`room_${index}_toiletImage`] = `Room ${index + 1} toilet image is required`;
      });
    }
    if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required';
    if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required';
    if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
    if (!formData.address.pincode.trim()) newErrors['address.pincode'] = 'Pincode is required';

    // Property details validation
    if (!formData.securityDeposit) newErrors.securityDeposit = 'Security deposit is required';

    // Required image slots
    const slots = ['front', 'back', 'hall'];
    // Only require kitchen image if kitchen amenity is checked
    if (formData.amenities.kitchen) {
      slots.push('kitchen');
    }
    slots.forEach((s) => {
      if (!formData.requiredImages[s]) {
        newErrors[`requiredImages.${s}`] = 'Required';
      }
    });

    if (formData.toiletOutside && !formData.outsideToiletImage) {
      newErrors['outsideToiletImage'] = 'Outside toilet image is required';
    }

    // Required property document: Latest Land Tax Receipt (PDF)
    if (!formData.landTaxReceipt) {
      newErrors['landTaxReceipt'] = 'Latest Land Tax Receipt (PDF) is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      // Prepare form data for API
      const formDataToSend = new FormData();

      // Clone data and strip file objects
      const payload = { ...formData };
      if (formData.propertyMode === 'room') {
        // Remove room details for dormitory listing
        payload.rooms = (payload.rooms || []).map((r) => {
          const { roomImage, toiletImage, ...rest } = r;
          return rest;
        });
      } else {
        payload.rooms = [];
      }

      // Add property data as JSON string
      formDataToSend.append('propertyData', JSON.stringify(payload));

      // Add required property images
      if (formData.requiredImages.front?.file) {
        formDataToSend.append('frontImage', formData.requiredImages.front.file);
      }
      if (formData.requiredImages.back?.file) {
        formDataToSend.append('backImage', formData.requiredImages.back.file);
      }
      if (formData.requiredImages.hall?.file) {
        formDataToSend.append('hallImage', formData.requiredImages.hall.file);
      }
      if (formData.requiredImages.kitchen?.file) {
        formDataToSend.append('kitchenImage', formData.requiredImages.kitchen.file);
      }

      // Add per-room images or dormitory images accordingly
      if (formData.propertyMode === 'room') {
        (formData.rooms || []).forEach((room, idx) => {
          if (room.roomImage?.file) {
            formDataToSend.append(`rooms[${idx}][roomImage]`, room.roomImage.file);
          }
          if (room.toiletImage?.file) {
            formDataToSend.append(`rooms[${idx}][toiletImage]`, room.toiletImage.file);
          }
        });
      } else {
        (formData.dormitory.images || []).forEach((img, idx) => {
          if (img.file) formDataToSend.append(`dormitoryImages`, img.file);
        });
        if (formData.dormitory.toiletImage?.file) {
          formDataToSend.append('dormitoryToiletImage', formData.dormitory.toiletImage.file);
        }
      }

      // Add outside toilet flag and image
      formDataToSend.append('toiletOutside', String(!!formData.toiletOutside));
      if (formData.toiletOutside && formData.outsideToiletImage?.file) {
        formDataToSend.append('outsideToiletImage', formData.outsideToiletImage.file);
      }

      // Add documents
      console.log('Documents:', formData.documents);
      if (formData.landTaxReceipt?.file) {
        formDataToSend.append('landTaxReceipt', formData.landTaxReceipt.file);
      }

      // Handle additional documents if they exist
      if (formData.documents && Array.isArray(formData.documents)) {
        formData.documents.forEach((documentData, index) => {
          if (documentData.file) {
            console.log(`Adding document: documents`, documentData.file.name);
            formDataToSend.append('documents', documentData.file);
          }
        });
      }

      console.log('FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }

      // Make API call to unified backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create property');
      }

      if (result.success) {
        // Success - refresh properties list and redirect
        if (window.refreshProperties) {
          window.refreshProperties();
        }
        navigate('/owner-properties');
      } else {
        throw new Error(result.message || 'Failed to create property');
      }
    } catch (error) {
      console.error('Error adding property:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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

  // If KYC not completed, show blocking prompt and allow navigating to dedicated page
  const showKycBlock = !loading && user && needsKyc;

  return (
    <OwnerLayout>
      <div className="max-w-4xl mx-auto p-3 sm:p-0 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => navigate('/owner-dashboard')}
              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl sm:text-2xl font-bold text-gray-900">Add New Property</h1>
              <p className="text-xs sm:text-sm text-gray-600">Fill in the details to list your property</p>
            </div>
          </div>
        </div>

        {/* Govt ID (KYC) Reminder */}
        {showKycBlock && (
          <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs sm:text-sm text-yellow-900">
              To add a property, please upload and verify your Government ID.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/owner-settings#kyc')}
                className="px-3 py-2 bg-red-600 text-white rounded-md text-xs sm:text-sm hover:bg-red-700"
              >
                Go to Upload Documents
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-6 sm:space-y-8 ${showKycBlock ? 'pointer-events-none opacity-50 select-none' : ''}`}>
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <Building className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleInputChange('propertyName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.propertyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter property name"
                />
                {errors.propertyName && (
                  <p className="mt-1 text-sm text-red-600">{errors.propertyName}</p>
                )}
              </div>

              {/* Map Search & Pinning Moved to Basic Info */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search PG/Property via Google Maps
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={placeSearch}
                    onChange={(e) => setPlaceSearch(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={onKeyDownPlace}
                    placeholder="Start typing address, area, landmark..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {showSuggestions && (
                    <div ref={listRef} className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-auto">
                      {suggestions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                      )}
                      {suggestions.map((s, idx) => (
                        <button
                          key={`${s.place_id}-${idx}`}
                          type="button"
                          data-idx={idx}
                          onMouseEnter={() => setActiveSuggestionIndex(idx)}
                          onMouseLeave={() => setActiveSuggestionIndex(-1)}
                          onClick={() => selectPlace(s)}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${idx === activeSuggestionIndex ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className="text-gray-700 leading-snug line-clamp-2">{s.display_name || s.name || ''}</div>
                          {s.type && (
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">{s.type}</div>
                          )}
                        </button>
                      ))}
                      <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-500">Powered by OpenStreetMap</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Pin Property Location</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleSatellite} className="px-2 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 text-xs">
                      {isSatellite ? 'Satellite' : 'Street'} view
                    </button>
                    <button type="button" onClick={copyCoords} className="px-2 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 text-xs">Copy Coords</button>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-hidden h-[350px] relative z-0">
                  <MapContainer
                    center={markerPosition}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url={isSatellite
                        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      }
                      key={isSatellite ? 'satellite' : 'street'}
                    />
                    {markerPosition && markerPosition[0] && markerPosition[1] && (
                      <Marker
                        position={markerPosition}
                        draggable={true}
                        eventHandlers={{
                          dragend: handleMarkerDragEnd
                        }}
                      />
                    )}
                    <MapUpdater center={markerPosition} />
                    <MapClickHandler onLocationSelect={handleLocationSelect} />
                  </MapContainer>

                  {/* Overlay information */}
                  <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1.5 rounded-md shadow-md text-xs font-medium z-[1000] border border-gray-200">
                    Lat: {formData.address.latitude || '—'} | Lng: {formData.address.longitude || '—'}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Drag the marker or click on the map to set the exact property location.
                </p>
              </div>

              {/* Security Deposit moved to Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (₹) *
                </label>
                <input
                  type="number"
                  value={formData.securityDeposit}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (/^\d+$/.test(val) && parseInt(val) >= 0)) {
                      handleInputChange('securityDeposit', val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.securityDeposit ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Security deposit amount"
                  min="0"
                />
                {errors.securityDeposit && (
                  <p className="mt-1 text-sm text-red-600">{errors.securityDeposit}</p>
                )}
              </div>


              {formData.propertyMode === 'room' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Rooms *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.numberOfRooms}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty string to let user backspace, but otherwise only digits
                      if (val === '' || (/^\d+$/.test(val) && parseInt(val) > 0)) {
                        handleRoomCountChange(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.numberOfRooms ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter number of rooms (max 6)"
                  />
                  {errors.numberOfRooms && (
                    <p className="mt-1 text-sm text-red-600">{errors.numberOfRooms}</p>
                  )}
                </div>
              )}


              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Describe your property, its features, and what makes it special..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>
            </div>
          </motion.div>


          {/* Room Details Section */}
          {showRoomDetails && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Home className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Room Details</h2>
              </div>

              <div className="space-y-4">
                {formData.rooms.map((room, index) => (
                  <div key={index} className="border border-red-200 rounded-md p-3 sm:p-4 shadow-sm hover:shadow-md transition-all bg-red-50">
                    <div className="flex items-center justify-between mb-3 rounded-md px-3 py-2 border border-red-200 bg-red-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                          {room.roomNumber}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 tracking-wide">Room {room.roomNumber}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {room.roomType && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                {room.roomType}
                              </span>
                            )}
                            {room.roomSize && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                {room.roomSize} sq ft
                              </span>
                            )}
                            {room.occupancy && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                {room.occupancy} pax
                              </span>
                            )}
                            {room.rent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                                ₹{room.rent}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">Room Details</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-start">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Room Type *
                        </label>
                        <Select
                          value={room.roomType}
                          onValueChange={(val) => handleRoomChange(index, 'roomType', val)}
                        >
                          <SelectTrigger className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors[`room_${index}_type`] ? 'border-red-500' : 'border-gray-300'
                            }`}>
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Double">Double</SelectItem>
                            <SelectItem value="Triple">Triple</SelectItem>
                            <SelectItem value="Quad">Quad</SelectItem>
                            <SelectItem value="Master">Master</SelectItem>
                            <SelectItem value="Studio">Studio</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors[`room_${index}_type`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`room_${index}_type`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Room Size (sq ft) *
                        </label>
                        <input
                          type="number"
                          min="50"
                          value={room.roomSize}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^\d+$/.test(val) && parseInt(val) >= 0)) {
                              handleRoomChange(index, 'roomSize', val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors[`room_${index}_size`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter room size"
                        />
                        {errors[`room_${index}_size`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`room_${index}_size`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bed Type *
                        </label>
                        <Select
                          value={room.bedType}
                          onValueChange={(val) => handleRoomChange(index, 'bedType', val)}
                        >
                          <SelectTrigger className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors[`room_${index}_bed`] ? 'border-red-500' : 'border-gray-300'
                            }`}>
                            <SelectValue placeholder="Select bed type" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="Single Bed">Single Bed</SelectItem>
                            <SelectItem value="Double Bed">Double Bed</SelectItem>
                            <SelectItem value="Queen Bed">Queen Bed</SelectItem>
                            <SelectItem value="King Bed">King Bed</SelectItem>
                            <SelectItem value="Bunk Bed">Bunk Bed</SelectItem>
                            <SelectItem value="No Bed">No Bed</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors[`room_${index}_bed`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`room_${index}_bed`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Occupancy *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={room.occupancy}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed border-gray-300"
                          placeholder="Auto-set based on room type"
                        />
                        <p className="mt-1 text-xs text-gray-500">Automatically set based on room type</p>
                      </div>

                      <div className="md:mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Attached Bathroom
                        </label>
                        <div className="flex items-center h-10 gap-2">
                          <button
                            type="button"
                            onClick={() => handleRoomAmenityChange(index, 'attachedBathroom', !room.amenities.attachedBathroom)}
                            className={`relative inline-flex items-center h-9 w-16 rounded-full transition-colors border ${room.amenities.attachedBathroom ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-300'}`}
                            title="Toggle attached bathroom"
                            aria-pressed={room.amenities.attachedBathroom}
                          >
                            <span className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${room.amenities.attachedBathroom ? 'translate-x-7' : 'translate-x-0'}`}></span>
                            <span className="sr-only">Attached bathroom toggle</span>
                          </button>
                          <span className={`text-xs font-semibold ${room.amenities.attachedBathroom ? 'text-green-700' : 'text-gray-600'}`}>
                            {room.amenities.attachedBathroom ? 'YES' : 'NO'}
                          </span>
                        </div>
                      </div>



                      {/* Description + Image (and Toilet Image if attached) in one row */}
                      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div className="flex flex-col h-full">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Description
                          </label>
                          <textarea
                            value={room.description}
                            onChange={(e) => handleRoomChange(index, 'description', e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent border-gray-300 h-36"
                            placeholder="Describe this room's features..."
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Image *
                          </label>
                          {!room.roomImage ? (
                            <label className={`flex items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer ${errors[`room_${index}_roomImage`] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100`}>
                              <div className="text-xs text-gray-500 text-center px-2">Upload Room Image</div>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleRoomImageUpload(index, 'roomImage', e)} />
                            </label>
                          ) : (
                            <div className="relative inline-block">
                              <img src={room.roomImage.preview} alt={room.roomImage.name} className="w-full max-w-[220px] h-36 object-cover rounded-lg border" />
                              <button type="button" onClick={() => removeRoomImage(index, 'roomImage')} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {errors[`room_${index}_roomImage`] && (
                            <div className="mt-1 text-[11px] text-red-600">{errors[`room_${index}_roomImage`]}</div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          {room.amenities.attachedBathroom && (
                            <>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Toilet Image (for attached bathroom) *
                              </label>
                              {!room.toiletImage ? (
                                <label className={`flex items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer ${errors[`room_${index}_toiletImage`] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100`}>
                                  <div className="text-xs text-gray-500 text-center px-2">Upload Toilet Image</div>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleRoomImageUpload(index, 'toiletImage', e)} />
                                </label>
                              ) : (
                                <div className="relative inline-block">
                                  <img src={room.toiletImage.preview} alt={room.toiletImage.name} className="w-full max-w-[220px] h-36 object-cover rounded-lg border" />
                                  <button type="button" onClick={() => removeRoomImage(index, 'toiletImage')} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {errors[`room_${index}_toiletImage`] && (
                                <div className="mt-1 text-[11px] text-red-600">{errors[`room_${index}_toiletImage`]}</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>



                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Room Amenities</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 items-center">
                          {Object.entries(room.amenities)
                            .filter(([amenity]) => amenity !== 'attachedBathroom')
                            .map(([amenity, checked]) => (
                              <label key={amenity} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => handleRoomAmenityChange(index, amenity, e.target.checked)}
                                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {amenity.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-3"> {/* Added col-span-3 */}
                        <label className="text-sm font-medium text-gray-700">Monthly Rent (₹) *</label>
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="number"
                              min="0"
                              value={room.rent}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (/^\d+$/.test(val) && parseInt(val) >= 0)) {
                                  handleRoomChange(index, 'rent', val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors[`room_${index}_rent`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              placeholder="Enter monthly rent"
                            />
                            {errors[`room_${index}_rent`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`room_${index}_rent`]}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePredictRent(index)}
                            className="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors whitespace-nowrap h-[42px]"
                            title="Get AI Rent Suggestion"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">Suggest</span>
                          </button>
                        </div>

                        {/* Prediction Result Display */}
                        {room.predictedRent && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-3 text-sm mt-2"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-indigo-700 font-semibold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-500" /> Lyvo Estimate
                              </span>
                              <span className="font-bold text-gray-800">₹{room.predictedRent.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Range: ₹{room.rentRange?.min.toLocaleString()} - ₹{room.rentRange?.max.toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => handleRoomChange(index, 'rent', room.predictedRent)}
                                className="text-indigo-600 hover:underline font-medium"
                              >
                                Apply
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Address Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Address Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Google Maps place search */}


              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors['address.street'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter street address"
                />
                {errors['address.street'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors['address.city'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter city"
                />
                {errors['address.city'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors['address.state'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter state"
                />
                {errors['address.state'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.state']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode *
                </label>
                <input
                  type="text"
                  value={formData.address.pincode}
                  onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors['address.pincode'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter pincode"
                />
                {errors['address.pincode'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.pincode']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landmark
                </label>
                <input
                  type="text"
                  value={formData.address.landmark}
                  onChange={(e) => handleInputChange('address.landmark', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Near landmark (optional)"
                />
              </div>
            </div>
          </motion.div>





          {/* Amenities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Amenities</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[
                ['parking4w', 'Parking (4 wheeler)'],
                ['parking2w', 'Parking (2 wheeler)'],
                ['kitchen', 'Kitchen'],
                ['powerBackup', 'Power Backup']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.amenities[key]}
                    onChange={() => handleAmenityChange(key)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Rules and Policies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Rules and Policies</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {Object.entries(formData.rules).map(([rule, allowed]) => (
                <label key={rule} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowed}
                    onChange={() => handleRuleChange(rule)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {rule.replace(/([A-Z])/g, ' $1').trim()} Allowed
                  </span>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Property Images */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Property Images</h2>
            </div>

            {/* Required slots */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { key: 'front', label: 'Front' },
                { key: 'back', label: 'Back' },
                { key: 'hall', label: 'Hall' },
                { key: 'kitchen', label: 'Kitchen' }
              ].filter(({ key }) => key !== 'kitchen' || formData.amenities.kitchen).map(({ key, label }) => (
                <div key={key} className="">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    {label} {key !== 'kitchen' || formData.amenities.kitchen ? '*' : ''}
                  </div>
                  {!formData.requiredImages[key] ? (
                    <label className={`flex items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer ${errors[`requiredImages.${key}`] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100`}>
                      <div className="text-xs text-gray-500 text-center px-2">Upload {label}</div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleRequiredImageUpload(key, e)} />
                    </label>
                  ) : (
                    <div className="relative group">
                      <img src={formData.requiredImages[key].preview} alt={formData.requiredImages[key].name} className="w-full h-28 object-cover rounded-lg border" />
                      <button type="button" onClick={() => removeRequiredImage(key)} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {errors[`requiredImages.${key}`] && (
                    <div className="mt-1 text-[11px] text-red-600">{errors[`requiredImages.${key}`]}</div>
                  )}
                </div>
              ))}
            </div>



            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Plus className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Toilet Outside the Room - placed under this uploader */}
              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Toilet Outside the Room
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, toiletOutside: !prev.toiletOutside }))}
                    className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors border ${formData.toiletOutside ? 'bg-blue-500 border-blue-500' : 'bg-gray-200 border-gray-300'}`}
                    aria-pressed={formData.toiletOutside}
                  >
                    <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.toiletOutside ? 'translate-x-7' : 'translate-x-0'}`}></span>
                    <span className="sr-only">Toilet outside toggle</span>
                  </button>
                  <span className={`text-xs font-semibold ${formData.toiletOutside ? 'text-blue-700' : 'text-gray-600'}`}>
                    {formData.toiletOutside ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>

              {formData.toiletOutside && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outside Toilet Image *</label>
                  {!formData.outsideToiletImage ? (
                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer ${errors['outsideToiletImage'] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100`}>
                      <Plus className="w-6 h-6 text-gray-400 mb-1" />
                      <div className="text-xs text-gray-500 text-center px-2">Click to upload or drag and drop</div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleOutsideToiletImageUpload} />
                    </label>
                  ) : (
                    <div className="relative inline-block">
                      <img src={formData.outsideToiletImage.preview} alt={formData.outsideToiletImage.name} className="w-44 h-28 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, outsideToiletImage: null }))} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {errors['outsideToiletImage'] && (
                    <div className="mt-1 text-[11px] text-red-600">{errors['outsideToiletImage']}</div>
                  )}
                </div>
              )}

              {/* Image Preview */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="mt-1 text-xs text-gray-500 truncate">{image.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Property Documents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Property Documents</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">Upload the latest Land Tax Receipt (PDF). No other property documents are accepted.</p>

            <div className="space-y-6">
              {/* Land Tax Receipt (Required) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Latest Land Tax Receipt (PDF) *</label>
                  {formData.landTaxReceipt && (
                    <button type="button" onClick={removeLandTaxReceipt} className="text-xs text-red-600 hover:underline">Remove</button>
                  )}
                </div>
                {!formData.landTaxReceipt ? (
                  <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer ${errors['landTaxReceipt'] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100`}>
                    <FileText className="w-6 h-6 text-gray-400 mb-1" />
                    <div className="text-xs text-gray-500 text-center px-2">Click to upload latest Land Tax Receipt (PDF only)</div>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleLandTaxReceiptUpload} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-red-100">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{formData.landTaxReceipt.name}</div>
                        <div className="text-xs text-gray-500">PDF Document</div>
                      </div>
                    </div>
                    <button type="button" onClick={removeLandTaxReceipt} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Change</button>
                  </div>
                )}
                {errors['landTaxReceipt'] && (
                  <div className="mt-1 text-[11px] text-red-600">{errors['landTaxReceipt']}</div>
                )}
              </div>

              {/* All other generic document upload UI removed */}
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4"
          >
            <button
              type="button"
              onClick={() => navigate('/owner-dashboard')}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding Property...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Add Property</span>
                </>
              )}
            </button>
          </motion.div>
        </form>
      </div>



      {/* Warning Modal */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl transform transition-all scale-100 p-6 relative">
            <button
              onClick={() => setWarningModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">Missing Information</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                {warningMessage}
              </p>

              <button
                onClick={() => setWarningModalOpen(false)}
                className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                autoFocus
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}


    </OwnerLayout>
  );
};

export default AddProperty;

