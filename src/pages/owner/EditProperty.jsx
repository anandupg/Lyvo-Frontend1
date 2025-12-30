import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
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
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  ExternalLink
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

const EditProperty = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default to Bangalore
  const [mapZoom, setMapZoom] = useState(13);
  const [imageLoading, setImageLoading] = useState({});
  const [imagePreview, setImagePreview] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRefs = useRef({});

  const [formData, setFormData] = useState({
    // Basic Information
    property_name: '',
    description: '',
    property_mode: 'room',

    // Address Information
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      landmark: ''
    },
    latitude: '',
    longitude: '',

    // Pricing
    security_deposit: '',

    // Amenities
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

    // Property Images
    images: {
      front: '',
      back: '',
      hall: '',
      kitchen: '',
      gallery: []
    },
    requiredImages: {
      front: null,
      back: null,
      hall: null,
      kitchen: null
    },

    // Outside Toilet
    toilet_outside: false,
    outside_toilet_image: '',

    // Documents
    land_tax_receipt: '',

    // Status
    status: 'active'
  });

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const propertyData = result.data;
            setProperty(propertyData);

            // Populate form data
            setFormData({
              property_name: propertyData.property_name || '',
              description: propertyData.description || '',
              property_mode: propertyData.property_mode || 'room',
              address: {
                street: propertyData.address?.street || '',
                city: propertyData.address?.city || '',
                state: propertyData.address?.state || '',
                pincode: propertyData.address?.pincode || '',
                landmark: propertyData.address?.landmark || ''
              },
              latitude: propertyData.latitude || '',
              longitude: propertyData.longitude || '',
              security_deposit: propertyData.security_deposit || '',
              amenities: {
                parking4w: propertyData.amenities?.parking4w || false,
                parking2w: propertyData.amenities?.parking2w || false,
                kitchen: propertyData.amenities?.kitchen || false,
                powerBackup: propertyData.amenities?.powerBackup || false
              },
              rules: {
                petsAllowed: propertyData.rules?.petsAllowed || false,
                smokingAllowed: propertyData.rules?.smokingAllowed || false,
                visitorsAllowed: propertyData.rules?.visitorsAllowed !== false,
                cookingAllowed: propertyData.rules?.cookingAllowed !== false
              },
              images: {
                front: propertyData.images?.front || '',
                back: propertyData.images?.back || '',
                hall: propertyData.images?.hall || '',
                kitchen: propertyData.images?.kitchen || '',
                gallery: propertyData.images?.gallery || []
              },
              requiredImages: {
                front: propertyData.images?.front ? {
                  file: null,
                  preview: propertyData.images.front,
                  name: 'Front View'
                } : null,
                back: propertyData.images?.back ? {
                  file: null,
                  preview: propertyData.images.back,
                  name: 'Back View'
                } : null,
                hall: propertyData.images?.hall ? {
                  file: null,
                  preview: propertyData.images.hall,
                  name: 'Hall View'
                } : null,
                kitchen: propertyData.images?.kitchen ? {
                  file: null,
                  preview: propertyData.images.kitchen,
                  name: 'Kitchen View'
                } : null
              },
              toilet_outside: propertyData.toilet_outside || false,
              outside_toilet_image: propertyData.outside_toilet_image || '',
              land_tax_receipt: propertyData.land_tax_receipt || '',
              status: propertyData.status || 'active'
            });

            // Set map center if coordinates exist
            if (propertyData.latitude && propertyData.longitude) {
              setMapCenter([propertyData.latitude, propertyData.longitude]);
            }
          } else {
            setError('Property not found');
          }
        } else {
          setError('Failed to fetch property details');
        }
      } catch (error) {
        console.error('Error fetching property:', error);
        setError('Error loading property details');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, navigate]);

  // Get user data
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

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

  const handleLocationSelect = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    setMapCenter([lat, lng]);
  };

  // Open document preview
  const openDocumentPreview = (docUrl, fileName) => {
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    console.log('Opening document preview:', { docUrl, fileName, isPdf });

    // Test if the URL is accessible
    fetch(docUrl, { method: 'HEAD' })
      .then(response => {
        console.log('Document URL response:', response.status, response.statusText);
        if (!response.ok) {
          console.error('Document URL not accessible:', response.status);
        }
      })
      .catch(error => {
        console.error('Error checking document URL:', error);
      });

    setPreviewDoc({
      url: docUrl,
      name: fileName,
      type: isPdf ? 'pdf' : 'image'
    });
  };

  // Handle required image upload
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
  };

  // Remove required image
  const removeRequiredImage = (type) => {
    setFormData(prev => ({
      ...prev,
      requiredImages: {
        ...prev.requiredImages,
        [type]: null
      }
    }));
  };

  const handleImageUpload = (field, file) => {
    if (!file) return;

    if (field === 'gallery') {
      const imageData = {
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      };

      setFormData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: [...prev.images.gallery, imageData]
        }
      }));
    } else {
      const imageData = {
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      };

      setFormData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          [field]: imageData
        }
      }));
    }
  };

  const removeImage = (field, index = null) => {
    if (field === 'gallery' && index !== null) {
      setFormData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: prev.images.gallery.filter((_, i) => i !== index)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          [field]: null
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        navigate('/login');
        return;
      }

      const propertyServiceUrl = import.meta.env.VITE_PROPERTY_SERVICE_API_URL || 'http://localhost:3002';

      // Prepare form data for API (like AddProperty)
      const formDataToSend = new FormData();

      // Clone data and strip file objects
      const payload = { ...formData };

      // Structure the data for the backend
      const updateData = {
        ...payload,
        pricing: {
          security_deposit: formData.security_deposit
        }
      };

      // Remove the flat pricing fields from the root level
      delete updateData.security_deposit;

      // Add property data as JSON string
      formDataToSend.append('propertyData', JSON.stringify(updateData));

      // Add required property images (only if they have files)
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

      // Add gallery images
      if (formData.images.gallery && Array.isArray(formData.images.gallery)) {
        formData.images.gallery.forEach((imageData, index) => {
          if (imageData.file) {
            formDataToSend.append('galleryImages', imageData.file);
          }
        });
      }

      // Add outside toilet image if exists
      if (formData.outside_toilet_image && formData.outside_toilet_image.file) {
        formDataToSend.append('outsideToiletImage', formData.outside_toilet_image.file);
      }

      // Add documents
      if (formData.land_tax_receipt?.file) {
        formDataToSend.append('landTaxReceipt', formData.land_tax_receipt.file);
      }

      // Handle additional documents if they exist
      if (formData.documents && Array.isArray(formData.documents)) {
        formData.documents.forEach((documentData, index) => {
          if (documentData.file) {
            formDataToSend.append('documents', documentData.file);
          }
        });
      }

      console.log('FormData entries for update:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Property updated successfully!');
          setTimeout(() => {
            navigate('/owner-properties');
          }, 2000);
        } else {
          setError(result.message || 'Failed to update property');
        }
      } else {
        setError('Failed to update property');
      }
    } catch (error) {
      console.error('Error updating property:', error);
      setError('Error updating property');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building },
    { id: 'location', label: 'Location & Map', icon: MapPin },
    { id: 'amenities', label: 'Amenities & Rules', icon: Home },
    { id: 'media', label: 'Images & Documents', icon: Camera }
  ];

  if (loading) {
    return (
      <OwnerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading property details...</p>
            <p className="text-sm text-gray-500 mt-2">Property ID: {id}</p>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  if (error && !property) {
    return (
      <OwnerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Property</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500 mb-4">Property ID: {id}</p>
            <button
              onClick={() => navigate('/owner-properties')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Properties
            </button>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => navigate('/owner-properties')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Edit Property</h1>
                  <p className="text-sm sm:text-base text-gray-600">Update your property information</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center space-x-2"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 sm:space-x-3 py-3 px-3 sm:px-4 border-b-2 font-medium text-sm whitespace-nowrap min-w-0 ${activeTab === tab.id
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Basic Information & Pricing</h3>

                {/* Basic Info Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-800 mb-4">Property Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Name *
                      </label>
                      <input
                        type="text"
                        value={formData.property_name}
                        onChange={(e) => handleInputChange('property_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter property name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Mode
                      </label>
                      <Select
                        value={formData.property_mode}
                        onValueChange={(value) => handleInputChange('property_mode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room">Room</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Describe your property..."
                      required
                    />
                  </div>
                </div>

                {/* Pricing Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-4">Pricing Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Security Deposit (₹) *
                      </label>
                      <input
                        type="number"
                        value={formData.security_deposit}
                        onChange={(e) => handleInputChange('security_deposit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter security deposit amount"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Location & Map</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Address Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => handleInputChange('address.street', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter street address"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => handleInputChange('address.city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="City"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          value={formData.address.state}
                          onChange={(e) => handleInputChange('address.state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="State"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pincode *
                        </label>
                        <input
                          type="text"
                          value={formData.address.pincode}
                          onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Pincode"
                          required
                        />
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
                          placeholder="Nearby landmark"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => handleInputChange('latitude', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Latitude"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => handleInputChange('longitude', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Longitude"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Map */}
                  <div className="h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden border border-gray-300">
                    <MapContainer
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapClickHandler onLocationSelect={handleLocationSelect} />
                      <MapUpdater center={mapCenter} />
                      {(formData.latitude && formData.longitude) && (
                        <Marker position={[formData.latitude, formData.longitude]} />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Amenities Tab */}
            {activeTab === 'amenities' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Amenities & Rules</h3>

                {/* Amenities Section */}
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-gray-800 mb-4">Property Amenities</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { key: 'parking4w', label: '4-Wheeler Parking', icon: Car },
                      { key: 'parking2w', label: '2-Wheeler Parking', icon: Car },
                      { key: 'kitchen', label: 'Kitchen', icon: Utensils },
                      { key: 'powerBackup', label: 'Power Backup', icon: Snowflake }
                    ].map((amenity) => {
                      const Icon = amenity.icon;
                      return (
                        <label
                          key={amenity.key}
                          className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${formData.amenities[amenity.key]
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.amenities[amenity.key]}
                            onChange={() => handleAmenityChange(amenity.key)}
                            className="sr-only"
                          />
                          <Icon className="w-6 h-6 mb-2" />
                          <span className="text-sm font-medium text-center">{amenity.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Rules Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-4">Rules & Policies</h4>
                  <div className="space-y-3 sm:space-y-4">
                    {[
                      { key: 'petsAllowed', label: 'Pets Allowed', description: 'Allow tenants to keep pets' },
                      { key: 'smokingAllowed', label: 'Smoking Allowed', description: 'Allow smoking on the property' },
                      { key: 'visitorsAllowed', label: 'Visitors Allowed', description: 'Allow tenants to have visitors' },
                      { key: 'cookingAllowed', label: 'Cooking Allowed', description: 'Allow cooking in the property' }
                    ].map((rule) => (
                      <label
                        key={rule.key}
                        className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.rules[rule.key]}
                          onChange={() => handleRuleChange(rule.key)}
                          className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rule.label}</div>
                          <div className="text-sm text-gray-500">{rule.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Images & Documents</h3>
                <div className="space-y-6 sm:space-y-8">
                  {/* Property Images Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      <h4 className="text-sm sm:text-lg font-semibold text-gray-900">Property Images</h4>
                    </div>
                    {/* Required slots */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {[
                        { key: 'front', label: 'Front' },
                        { key: 'back', label: 'Back' },
                        { key: 'hall', label: 'Hall' },
                        { key: 'kitchen', label: 'Kitchen' }
                      ].filter(({ key }) => key !== 'kitchen' || formData.amenities.kitchen).map(({ key, label }) => {
                        const hasImage = formData.requiredImages[key] || formData.images[key];
                        const imageSrc = formData.requiredImages[key]?.preview || formData.images[key];

                        return (
                          <div key={key} className="">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              {label} {key !== 'kitchen' || formData.amenities.kitchen ? '*' : ''}
                            </div>
                            {!hasImage ? (
                              <label className={`flex items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer ${imageLoading[key] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100`}>
                                <div className="text-xs text-gray-500 text-center px-2">
                                  {imageLoading[key] ? 'Uploading...' : `Upload ${label}`}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleRequiredImageUpload(key, e)}
                                />
                              </label>
                            ) : (
                              <div className="relative group">
                                <img
                                  src={imageSrc}
                                  alt={`${label} View`}
                                  className="w-full h-28 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeRequiredImage(key)}
                                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional Images Upload */}
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
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              files.forEach(file => {
                                if (file) {
                                  handleImageUpload('gallery', file);
                                }
                              });
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Gallery Images */}
                      {formData.images.gallery && formData.images.gallery.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {formData.images.gallery.map((imageData, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={typeof imageData === 'string' ? imageData : imageData.preview}
                                alt={`Gallery ${index + 1}`}
                                className="w-full h-28 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage('gallery', index)}
                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Outside Toilet */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.toilet_outside}
                          onChange={(e) => handleInputChange('toilet_outside', e.target.checked)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900">Outside Toilet Available</span>
                      </div>

                      {formData.toilet_outside && (
                        <div className="flex items-center space-x-4">
                          <div className="w-24 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                            {formData.outside_toilet_image ? (
                              <img
                                src={typeof formData.outside_toilet_image === 'string' ? formData.outside_toilet_image : formData.outside_toilet_image.preview}
                                alt="Outside Toilet"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Camera className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <input
                              ref={(el) => (fileInputRefs.current.outside_toilet_image = el)}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload('outside_toilet_image', e.target.files[0])}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current.outside_toilet_image?.click()}
                              disabled={imageLoading.outside_toilet_image}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Upload Image
                            </button>
                            {formData.outside_toilet_image && (
                              <button
                                type="button"
                                onClick={() => removeImage('outside_toilet_image')}
                                className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-4">Property Documents</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Land Tax Receipt</h5>
                        <div className="flex items-center space-x-4">
                          <div className="w-24 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
                            {formData.land_tax_receipt ? (
                              <img
                                src={typeof formData.land_tax_receipt === 'string' ? formData.land_tax_receipt : formData.land_tax_receipt.preview}
                                alt="Land Tax Receipt"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <>
                                <FileText className="w-6 h-6 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500 text-center">Land Tax Receipt</span>
                              </>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <input
                              ref={(el) => (fileInputRefs.current.land_tax_receipt = el)}
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleImageUpload('land_tax_receipt', e.target.files[0])}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current.land_tax_receipt?.click()}
                              disabled={imageLoading.land_tax_receipt}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Upload Document
                            </button>
                            {formData.land_tax_receipt && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openDocumentPreview(formData.land_tax_receipt, 'Land Tax Receipt.pdf')}
                                  className="w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                                  title="Preview Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={typeof formData.land_tax_receipt === 'string' ? formData.land_tax_receipt : formData.land_tax_receipt.preview}
                                  download="Land Tax Receipt.pdf"
                                  className="w-10 h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                                  title="Download Document"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </form>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="text-sm font-semibold text-gray-900">Document Preview - {previewDoc.name}</div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {previewDoc.type === 'pdf' ? (
                <div className="w-full h-[70vh] border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    title="PDF Preview"
                    src={`${previewDoc.url}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full border-0"
                    style={{ minHeight: '600px' }}
                    onLoad={() => {
                      console.log('PDF iframe loaded successfully');
                    }}
                    onError={() => {
                      console.error('PDF iframe failed to load');
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-[70vh] border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="w-full max-h-[70vh] object-contain border border-gray-200 rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {previewDoc.type === 'pdf' ? 'PDF Document' : 'Image Document'}
              </div>
              <div className="flex gap-2">
                {previewDoc.type === 'pdf' && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in New Tab
                  </a>
                )}
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

export default EditProperty;
