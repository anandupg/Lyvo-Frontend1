import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OwnerLayout from '../../components/owner/OwnerLayout';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import {
  ArrowLeft,
  MapPin,
  Users,
  DollarSign,
  Star,
  Calendar,
  Building,
  Home,
  Car,
  Wifi,
  Coffee,
  Dumbbell,
  Shield,
  Camera,
  Edit,
  Trash2,
  Share2,
  FileText,
  Download,
  Eye,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ExternalLink,
  Power,
  PowerOff,
  Plus
} from 'lucide-react';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [roomStatusLoading, setRoomStatusLoading] = useState({});
  const [roomEditLoading, setRoomEditLoading] = useState(false);

  const [editRoomData, setEditRoomData] = useState({});
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [addRoomLoading, setAddRoomLoading] = useState(false);
  const [addRoomData, setAddRoomData] = useState({
    room_number: '',
    room_type: 'Single',
    rent: '',
    description: '',
    occupancy: 1,
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
    room_image: null,
    room_image_file: null,
    toilet_image: null,
    toilet_image_file: null
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyEditLoading, setPropertyEditLoading] = useState(false);
  const [editPropertyData, setEditPropertyData] = useState({});
  const [ownerEmail, setOwnerEmail] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const openRoomDetails = (room) => {
    console.log('Opening room details for room:', room);
    console.log('Room ID:', room._id);
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

  const openEditRoom = (room) => {
    console.log('Opening edit room for:', room);
    setEditRoomData({
      _id: room._id,
      room_number: room.room_number,
      room_type: room.room_type,
      room_size: room.room_size,
      bed_type: room.bed_type,
      occupancy: room.occupancy,
      rent: room.rent,
      description: room.description || '',
      amenities: {
        ac: false,
        wifi: false,
        tv: false,
        fridge: false,
        wardrobe: false,
        studyTable: false,
        balcony: false,
        attachedBathroom: false,
        ...room.amenities
      },
      room_image: room.room_image,
      toilet_image: room.toilet_image
    });
    setIsEditRoomModalOpen(true);
  };

  const openAddRoom = () => {
    // Calculate next room number
    let nextRoomNumber = '101';
    if (property && property.rooms && property.rooms.length > 0) {
      const roomNumbers = property.rooms.map(r => parseInt(r.room_number)).filter(n => !isNaN(n));
      if (roomNumbers.length > 0) {
        nextRoomNumber = (Math.max(...roomNumbers) + 1).toString();
      }
    }

    setAddRoomData({
      room_number: nextRoomNumber,
      room_type: 'Single',
      room_size: '',
      bed_type: 'Single Bed',
      rent: '',
      description: '',
      occupancy: 1,
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
      room_image: null,
      room_image_file: null,
      toilet_image: null,
      toilet_image_file: null
    });
    setIsAddRoomModalOpen(true);
  };

  // Add Room Handlers
  const handleAddRoomChange = (field, value) => {
    setAddRoomData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'room_type') {
        const occupancyMap = {
          'Single': 1, 'Double': 2, 'Triple': 3, 'Quad': 4, 'Master': 2, 'Studio': 1
        };
        updated.occupancy = occupancyMap[value] || 1;
      }
      return updated;
    });
  };

  const handleAddRoomAmenityChange = (amenity, value) => {
    setAddRoomData(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [amenity]: value }
    }));
  };

  const handleAddRoomImageUpload = (event, field) => {
    const file = event.target.files[0];
    if (file) {
      setAddRoomData(prev => ({
        ...prev,
        [field]: URL.createObjectURL(file), // Preview URL
        [`${field}_file`]: file
      }));
    }
  };

  const removeAddRoomImage = (field) => {
    setAddRoomData(prev => ({
      ...prev,
      [field]: null,
      [`${field}_file`]: null
    }));
  };

  const validateAddRoom = () => {
    const errors = [];
    if (!addRoomData.room_number) errors.push("Room Number is required");
    // Check if room number already exists
    if (property && property.rooms && property.rooms.some(r => r.room_number.toString() === addRoomData.room_number.toString())) {
      errors.push("Room Number already exists");
    }
    if (!addRoomData.rent || Number(addRoomData.rent) <= 0) errors.push("Valid Rent is required");
    if (!addRoomData.room_size || Number(addRoomData.room_size) <= 0) errors.push("Valid Room Size is required");
    if (!addRoomData.room_image_file) errors.push("Room Image is required");
    if (addRoomData.amenities.attachedBathroom && !addRoomData.toilet_image_file) {
      errors.push("Toilet Image is required for attached bathroom");
    }
    return errors;
  };

  const submitAddRoom = async () => {
    try {
      const validationErrors = validateAddRoom();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      setAddRoomLoading(true);
      const authToken = localStorage.getItem('authToken');

      const formData = new FormData();
      const roomPayload = { ...addRoomData };
      delete roomPayload.room_image;
      delete roomPayload.room_image_file;
      delete roomPayload.toilet_image;
      delete roomPayload.toilet_image_file;

      formData.append('roomData', JSON.stringify(roomPayload));

      if (addRoomData.room_image_file) {
        formData.append('room_image', addRoomData.room_image_file);
      }
      if (addRoomData.toilet_image_file) {
        formData.append('toilet_image', addRoomData.toilet_image_file);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await refreshPropertyData();
        setIsAddRoomModalOpen(false);
        setSuccessMessage('Room added successfully!');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      } else {
        throw new Error(result.message || 'Failed to add room');
      }
    } catch (error) {
      console.error('Error adding room:', error);
      setSuccessMessage(`Error: ${error.message}`);
      setShowSuccessModal(true);
    } finally {
      setAddRoomLoading(false);
    }
  };

  const openEditProperty = () => {
    console.log('Opening edit property with data:', property);
    console.log('Property address:', property.address);
    console.log('Property amenities:', property.amenities);
    console.log('Owner email state:', ownerEmail);
    console.log('Property contact_email:', property.contact_email);

    // Ensure owner email is loaded before opening modal
    if (!ownerEmail) {
      fetchOwnerEmail();
    }

    setEditPropertyData({
      _id: property._id,
      property_name: property.property_name || '',
      address: property.address?.street || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      pincode: property.address?.pincode || '',
      landmark: property.address?.landmark || '',
      latitude: property.latitude || '',
      longitude: property.longitude || '',
      description: property.description || '',
      amenities: property.amenities || {
        parking4w: false,
        parking2w: false,
        kitchen: false,
        powerBackup: false
      },
      rules: property.rules || {
        petsAllowed: false,
        smokingAllowed: false,
        visitorsAllowed: true,
        cookingAllowed: true
      },
      contact_number: property.contact_number || '',
      contact_email: ownerEmail || property.contact_email || '',
      security_deposit: property.security_deposit || 0,
      maintenance_fee: property.maintenance_fee || 0,
      images: property.images || [],
      requiredImages: {
        front: property.required_images?.front || null,
        back: property.required_images?.back || null,
        hall: property.required_images?.hall || null,
        kitchen: property.required_images?.kitchen || null
      },
      landTaxReceipt: property.land_tax_receipt || null
    });

    setIsEditPropertyModalOpen(true);
  };

  const handleEditRoomChange = (field, value) => {
    setEditRoomData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-set occupancy when room type changes
      if (field === 'room_type') {
        const occupancyMap = {
          'Single': 1,
          'Double': 2,
          'Triple': 3,
          'Quad': 4,
          'Master': 2,
          'Studio': 1
        };
        updated.occupancy = occupancyMap[value] || 1;
      }

      return updated;
    });
  };

  const handleAmenityChange = (amenity, value) => {
    setEditRoomData(prev => {
      const updated = {
        ...prev,
        amenities: {
          ...prev.amenities,
          [amenity]: value
        }
      };

      // If attached bathroom is disabled, clear toilet image
      if (amenity === 'attachedBathroom' && !value) {
        updated.toilet_image = null;
        updated.toilet_image_file = null;
      }

      return updated;
    });
  };

  const handlePropertyEditChange = (field, value) => {
    setEditPropertyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePropertyAmenityChange = (amenity, value) => {
    setEditPropertyData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [amenity]: value
      }
    }));
  };

  const handlePropertyRuleChange = (rule, value) => {
    setEditPropertyData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [rule]: value
      }
    }));
  };

  // Update property status
  const updatePropertyStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}/status`, {
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
          setProperty(prev => ({
            ...prev,
            status: newStatus,
            updated_at: new Date().toISOString()
          }));
          console.log('Property status updated successfully');
        }
      } else {
        console.error('Failed to update property status');
      }
    } catch (error) {
      console.error('Error updating property status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRoomImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setEditRoomData(prev => ({
        ...prev,
        room_image: imageUrl,
        room_image_file: file
      }));
    }
  };

  const handleToiletImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setEditRoomData(prev => ({
        ...prev,
        toilet_image: imageUrl,
        toilet_image_file: file
      }));
    }
  };

  const removeRoomImage = () => {
    setEditRoomData(prev => ({
      ...prev,
      room_image: null,
      room_image_file: null
    }));
  };

  const removeToiletImage = () => {
    setEditRoomData(prev => ({
      ...prev,
      toilet_image: null,
      toilet_image_file: null
    }));
  };

  const refreshPropertyData = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-user-id': (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })()
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProperty(result.data);
          console.log('Property data refreshed');
        }
      }
    } catch (error) {
      console.error('Error refreshing property data:', error);
    }
  };

  const fetchOwnerEmail = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const userId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })();

      console.log('Fetching owner email for userId:', userId);
      console.log('User service URL:', `${import.meta.env.VITE_USER_SERVICE_API_URL || 'http://localhost:4002'}/api/users/${userId}`);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/user/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-user-id': userId
        }
      });

      console.log('Owner email response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Owner email response data:', result);
        if (result.success && result.data) {
          setOwnerEmail(result.data.email || '');
          console.log('Owner email fetched and set:', result.data.email);
        }
      } else {
        console.error('Failed to fetch owner email:', response.status);
      }
    } catch (error) {
      console.error('Error fetching owner email:', error);
    }
  };

  const updateRoom = async () => {
    try {
      setRoomEditLoading(true);

      const authToken = localStorage.getItem('authToken');
      const userId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })();

      // Prepare form data
      const formData = new FormData();

      // Add room data (excluding file objects)
      const roomDataToSend = { ...editRoomData };
      delete roomDataToSend.room_image_file;
      delete roomDataToSend.toilet_image_file;
      delete roomDataToSend.room_image;
      delete roomDataToSend.toilet_image;

      formData.append('roomData', JSON.stringify(roomDataToSend));

      // Add images if they exist
      if (editRoomData.room_image_file) {
        formData.append('room_image', editRoomData.room_image_file);
      }
      if (editRoomData.toilet_image_file) {
        formData.append('toilet_image', editRoomData.toilet_image_file);
      }

      console.log('Updating room:', editRoomData._id);
      console.log('Room data:', roomDataToSend);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/rooms/${editRoomData._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-user-id': userId
        },
        body: formData
      });

      const responseData = await response.json();
      console.log('Update response:', responseData);

      if (response.ok) {
        // Refresh the entire property data to get updated images
        await refreshPropertyData();

        // Update selectedRoom if it's the same room being edited
        if (selectedRoom && selectedRoom._id === editRoomData._id) {
          // Fetch updated property data
          try {
            const authToken = localStorage.getItem('authToken');
            const userId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })();

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': userId
              }
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                const updatedRoom = result.data.rooms.find(room => room._id === editRoomData._id);
                if (updatedRoom) {
                  setSelectedRoom(updatedRoom);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching updated room data:', error);
          }
        }

        setIsEditRoomModalOpen(false);
        setSuccessMessage('Room updated successfully!');
        setShowSuccessModal(true);

        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        console.error('Failed to update room:', response.status, responseData);
        setSuccessMessage(`Failed to update room: ${responseData.message || 'Unknown error'}`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error updating room:', error);
      setSuccessMessage(`Error updating room: ${error.message}`);
      setShowSuccessModal(true);
    } finally {
      setRoomEditLoading(false);
    }
  };

  const updateProperty = async () => {
    try {
      setPropertyEditLoading(true);

      const authToken = localStorage.getItem('authToken');
      const userId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })();

      // Structure the data properly for the backend
      const updateData = {
        property_name: editPropertyData.property_name,
        description: editPropertyData.description,
        amenities: editPropertyData.amenities,
        rules: editPropertyData.rules,
        contact_number: editPropertyData.contact_number,
        security_deposit: editPropertyData.security_deposit,
        maintenance_fee: editPropertyData.maintenance_fee,
        latitude: editPropertyData.latitude,
        longitude: editPropertyData.longitude,
        address: {
          street: editPropertyData.address,
          city: editPropertyData.city,
          state: editPropertyData.state,
          pincode: editPropertyData.pincode,
          landmark: editPropertyData.landmark
        }
      };

      console.log('Updating property:', editPropertyData._id);
      console.log('Property data:', updateData);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${editPropertyData._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(updateData)
      });

      const responseData = await response.json();
      console.log('Update response:', responseData);

      if (response.ok) {
        // Refresh the entire property data
        await refreshPropertyData();

        setIsEditPropertyModalOpen(false);
        setSuccessMessage('Property updated successfully!');
        setShowSuccessModal(true);

        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        console.error('Failed to update property:', response.status, responseData);
        setSuccessMessage(`Failed to update property: ${responseData.message || 'Unknown error'}`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error updating property:', error);
      setSuccessMessage(`Error updating property: ${error.message}`);
      setShowSuccessModal(true);
    } finally {
      setPropertyEditLoading(false);
    }
  };

  const updateRoomStatus = async (roomId, newStatus) => {
    try {
      console.log('Updating room status:', { roomId, newStatus });
      setRoomStatusLoading(prev => ({ ...prev, [roomId]: true }));

      const authToken = localStorage.getItem('authToken');
      const userId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })();

      console.log('API call details:', {
        url: `${import.meta.env.VITE_PROPERTY_SERVICE_API_URL || 'http://localhost:3002'}/api/rooms/${roomId}/status`,
        authToken: authToken ? 'Present' : 'Missing',
        userId: userId || 'Missing'
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/rooms/${roomId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ is_available: newStatus === 'active' })
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        // Update the room status in the local state
        setProperty(prev => ({
          ...prev,
          rooms: prev.rooms.map(room =>
            room._id === roomId ? { ...room, status: newStatus } : room
          )
        }));

        // Update selected room if it's the same
        if (selectedRoom && selectedRoom._id === roomId) {
          setSelectedRoom(prev => ({ ...prev, status: newStatus }));
        }

        console.log('Room status updated successfully');
        setSuccessMessage('Room status updated successfully!');
        setShowSuccessModal(true);

        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        console.error('Failed to update room status:', response.status, responseData);
        setSuccessMessage(`Failed to update room status: ${responseData.message || 'Unknown error'}`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error updating room status:', error);
      setSuccessMessage(`Error updating room status: ${error.message}`);
      setShowSuccessModal(true);
    } finally {
      setRoomStatusLoading(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'inactive': return XCircle;
      case 'maintenance': return Clock;
      default: return XCircle;
    }
  };

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
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch property details
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        console.log('PropertyDetails - Fetching property with ID:', id);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/property/owner/properties/${id}`;
        console.log('PropertyDetails - Fetching from URL:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-user-id': (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id || ''; } catch { return ''; } })()
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('Property details fetched:', result.data);
            console.log('Property toilet_outside:', result.data.toilet_outside);
            console.log('Property outside_toilet_image:', result.data.outside_toilet_image);
            console.log('Property documents:', result.data.documents);
            console.log('Property rooms:', result.data.rooms);
            if (result.data.rooms) {
              result.data.rooms.forEach((room, index) => {
                console.log(`Room ${index}:`, room);
                console.log(`Room ${index} ID:`, room._id);
              });
            }
            setProperty(result.data);
          }
        } else {
          console.error('Failed to fetch property:', response.status);
        }
      } catch (error) {
        console.error('Error fetching property details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPropertyDetails();
    }
  }, [id]);

  // Fetch owner email
  useEffect(() => {
    if (id) {
      fetchOwnerEmail();
    }
  }, [id]);

  // Update editPropertyData when ownerEmail changes
  useEffect(() => {
    if (ownerEmail && isEditPropertyModalOpen) {
      setEditPropertyData(prev => ({
        ...prev,
        contact_email: ownerEmail
      }));
    }
  }, [ownerEmail, isEditPropertyModalOpen]);

  // Process property images to create the expected array format
  const processPropertyImages = (imagesData) => {
    if (!imagesData) return [];

    const imageArray = [];

    // Handle property images (front, back, hall, kitchen)
    const propertyImageMappings = [
      { key: 'front', label: 'Front View' },
      { key: 'back', label: 'Back View' },
      { key: 'hall', label: 'Hall' },
      { key: 'kitchen', label: 'Kitchen' }
    ];

    // Add property images
    propertyImageMappings.forEach(({ key, label }) => {
      if (imagesData[key] && imagesData[key] !== null) {
        imageArray.push({
          url: imagesData[key],
          label: label,
          type: 'property'
        });
      }
    });

    // Add gallery images if they exist
    if (imagesData.gallery && Array.isArray(imagesData.gallery)) {
      imagesData.gallery.forEach((url, index) => {
        if (url && url !== null) {
          imageArray.push({
            url: url,
            label: `Gallery Image ${index + 1}`,
            type: 'gallery'
          });
        }
      });
    }

    return imageArray;
  };

  // Process room images
  const processRoomImages = (rooms) => {
    if (!rooms || !Array.isArray(rooms)) return [];

    const roomImages = [];

    rooms.forEach((room, roomIndex) => {
      if (room.room_image) {
        roomImages.push({
          url: room.room_image,
          label: `Room ${room.room_number || roomIndex + 1} - Room Image`,
          type: 'room',
          roomNumber: room.room_number || roomIndex + 1
        });
      }
      if (room.toilet_image && room.amenities?.attachedBathroom) {
        roomImages.push({
          url: room.toilet_image,
          label: `Room ${room.room_number || roomIndex + 1} - Toilet Image`,
          type: 'toilet',
          roomNumber: room.room_number || roomIndex + 1
        });
      }
    });

    return roomImages;
  };


  const goToNextImage = () => {
    if (allImages && allImages.length > 1) {
      setCurrentImageIndex(prev => (prev + 1) % allImages.length);
    }
  };

  const goToPrevImage = () => {
    if (allImages && allImages.length > 1) {
      setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  const getAmenityIcon = (amenity) => {
    const iconMap = {
      'wifi': Wifi,
      'parking': Car,
      'kitchen': Coffee,
      'gym': Dumbbell,
      'security': Shield,
      'camera': Camera,
      'ac': Coffee,
      'waterSupply': Coffee,
      'powerBackup': Coffee,
      'garden': Coffee,
      'swimmingPool': Coffee
    };
    return iconMap[amenity.toLowerCase()] || Home;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading property details...</p>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  if (!property) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Property Not Found</h2>
            <p className="text-gray-600 mb-4">The property you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/owner-properties')}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Properties
            </button>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  // Process all images
  const propertyImages = processPropertyImages(property.images);
  const roomImages = processRoomImages(property.rooms);

  // Add outside toilet image if it exists
  const outsideToiletImage = property.outside_toilet_image ? [{
    url: property.outside_toilet_image,
    label: 'Outside Toilet',
    type: 'property'
  }] : [];

  console.log('Outside toilet image processing:', {
    toilet_outside: property.toilet_outside,
    outside_toilet_image: property.outside_toilet_image,
    outsideToiletImage: outsideToiletImage
  });

  const allImages = [...propertyImages, ...roomImages, ...outsideToiletImage];

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/owner-properties')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{property.property_name}</h1>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{property.address?.city}, {property.address?.state}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Building className="w-4 h-4" />
                      <span className="capitalize">{property.property_mode || 'Room'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>
                        {property.rooms?.length || 0} Rooms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => navigate(`/owner-edit-property/${property._id || property.id}`)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              {allImages.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="relative">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                      <img
                        src={allImages[currentImageIndex]?.url}
                        alt={allImages[currentImageIndex]?.label}
                        className="w-full h-96 object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=800&h=600&fit=crop&crop=center';
                        }}
                      />
                    </div>

                    {/* Navigation arrows */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={goToPrevImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={goToNextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* Image counter and label */}
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <span className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {allImages.length}
                      </span>
                      <span className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                        {allImages[currentImageIndex]?.label}
                      </span>
                    </div>

                    {/* Fullscreen button */}
                    <button
                      onClick={() => setIsImageModalOpen(true)}
                      className="absolute bottom-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Thumbnail strip */}
                  {allImages.length > 1 && (
                    <div className="p-4 bg-gray-50">
                      <div className="flex space-x-2 overflow-x-auto">
                        {allImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <img
                              src={image.url}
                              alt={image.label}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Available</h3>
                  <p className="text-gray-500 mb-4">This property doesn't have any images uploaded yet.</p>
                  <button
                    onClick={() => navigate(`/owner-edit-property/${property._id || property.id}`)}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Add Images
                  </button>
                </div>
              )}

              {/* Property Description */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>

              {/* Room Details */}
              {property.property_mode === 'room' && property.rooms && property.rooms.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Room Details</h2>
                    <button
                      onClick={openAddRoom}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Room
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {property.rooms.map((room, index) => {
                      const StatusIcon = getStatusIcon(room.status || 'active');
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer group" onClick={() => openRoomDetails(room)}>
                          {/* Room Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 font-bold text-lg">{room.room_number || index + 1}</span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">Room {room.room_number || index + 1}</h3>
                                <p className="text-sm text-gray-500">{room.room_type} â€¢ {room.room_size} sq ft</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">{formatPrice(room.rent)}</p>
                              <p className="text-sm text-gray-500">per month</p>
                            </div>
                          </div>

                          {/* Room Status */}
                          <div className="flex items-center justify-between mb-4">
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(room.status || 'active')}`}>
                              <StatusIcon className="w-4 h-4" />
                              <span className="capitalize">{room.status || 'Active'}</span>
                            </div>
                            <div className="text-sm text-gray-500 group-hover:text-gray-700">
                              Click to view details â†’
                            </div>
                          </div>

                          {/* Room Images */}
                          <div className={`grid gap-4 mb-4 ${room.room_image && room.toilet_image && room.amenities?.attachedBathroom ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {room.room_image && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Room Image</p>
                                <img
                                  src={room.room_image}
                                  alt={`Room ${room.room_number || index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/300x200?text=Room+Image';
                                  }}
                                />
                              </div>
                            )}
                            {room.toilet_image && room.amenities?.attachedBathroom && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Toilet Image</p>
                                <img
                                  src={room.toilet_image}
                                  alt={`Room ${room.room_number || index + 1} Toilet`}
                                  className="w-full h-32 object-cover rounded-lg border"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/300x200?text=Toilet+Image';
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Room Details */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Bed Type:</span>
                                <span className="ml-2 font-medium">{room.bed_type}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Occupancy:</span>
                                <span className="ml-2 font-medium">{room.occupancy} people</span>
                              </div>
                            </div>

                            {room.description && (
                              <div>
                                <span className="text-gray-500 text-sm">Description:</span>
                                <p className="text-sm text-gray-700 mt-1">{room.description}</p>
                              </div>
                            )}

                            {/* Room Amenities */}
                            {room.amenities && Object.keys(room.amenities).length > 0 && (
                              <div>
                                <span className="text-gray-500 text-sm">Amenities:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(room.amenities).map(([amenity, available]) => {
                                    if (available) {
                                      const IconComponent = getAmenityIcon(amenity);
                                      return (
                                        <div key={amenity} className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                                          <IconComponent className="w-3 h-3" />
                                          <span className="capitalize">{amenity.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Pricing Details */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {property.security_deposit && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">Security Deposit</p>
                      <p className="text-2xl font-bold text-blue-600">{formatPrice(property.security_deposit)}</p>
                    </div>
                  )}

                  {property.property_mode === 'room' && property.rooms && property.rooms.length > 0 && (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">Starting from</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatPrice(Math.min(...property.rooms.map(room => room.rent)))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">per room/month</p>
                    </div>
                  )}

                </div>
              </div>

              {/* Amenities */}
              {property.amenities && Object.keys(property.amenities).length > 0 && (() => {
                const availableAmenities = Object.entries(property.amenities).filter(([amenity, available]) => available === true);
                return availableAmenities.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {availableAmenities.map(([amenity, available]) => {
                        const IconComponent = getAmenityIcon(amenity);
                        return (
                          <div key={amenity} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <IconComponent className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800 capitalize">{amenity.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Outside Toilet Information */}
              {property.toilet_outside && property.outside_toilet_image && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Outside Toilet</h2>
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Outside Toilet Available</p>
                      <p className="text-xs text-blue-600">Shared toilet facility for all residents</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <img
                      src={property.outside_toilet_image}
                      alt="Outside Toilet"
                      className="w-full max-w-md h-64 object-cover rounded-lg border"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=Outside+Toilet+Image';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* House Rules */}
              {property.rules && Object.keys(property.rules).length > 0 && (() => {
                const activeRules = Object.entries(property.rules).filter(([rule, value]) => value === true);
                return activeRules.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">House Rules</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeRules.map(([rule, value]) => (
                        <div key={rule} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-gray-700 capitalize">{rule.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Property Documents */}
              {(property.land_tax_receipt || (property.documents && property.documents.length > 0)) && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Documents</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Land Tax Receipt */}
                    {property.land_tax_receipt && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Land Tax Receipt</p>
                            <p className="text-xs text-gray-500">PDF Document</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDocumentPreview(property.land_tax_receipt, 'Land Tax Receipt.pdf')}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={property.land_tax_receipt}
                            download="Land Tax Receipt.pdf"
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Other Documents */}
                    {property.documents && property.documents.map((docUrl, index) => {
                      const fileName = docUrl.split('/').pop() || `Document ${index + 1}`;
                      const isPdf = fileName.toLowerCase().endsWith('.pdf');
                      return (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{fileName}</p>
                              <p className="text-xs text-gray-500">{isPdf ? 'PDF Document' : 'Image Document'}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openDocumentPreview(docUrl, fileName)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={docUrl}
                              download={fileName}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Property Status */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Status</h3>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${property.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {property.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updatePropertyStatus(property.status === 'active' ? 'inactive' : 'active')}
                      disabled={updatingStatus}
                      className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${property.status === 'active'
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                        } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {updatingStatus ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : property.status === 'active' ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </button>
                    <button className="text-sm text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Property Mode</p>
                      <p className="font-medium capitalize">{property.property_mode || 'Room'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Number of Rooms</p>
                      <p className="font-medium">{property.rooms?.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Listed On</p>
                      <p className="font-medium">{new Date(property.createdAt || property.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Street</p>
                      <p className="font-medium">{property.address?.street || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">City, State</p>
                      <p className="font-medium">{property.address?.city}, {property.address?.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Pincode</p>
                      <p className="font-medium">{property.address?.pincode || 'Not provided'}</p>
                    </div>
                  </div>
                  {property.address?.landmark && (
                    <div className="flex items-center space-x-3">
                      <Star className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Landmark</p>
                        <p className="font-medium">{property.address.landmark}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {property.latitude && property.longitude && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Coordinates</p>
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded">{property.latitude}, {property.longitude}</p>
                    </div>
                    <div className="h-64 w-full rounded-lg overflow-hidden relative" style={{ minHeight: '256px', zIndex: 1 }}>
                      <MapContainer
                        center={[parseFloat(property.latitude), parseFloat(property.longitude)]}
                        zoom={15}
                        style={{ height: '100%', width: '100%', zIndex: 1 }}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[parseFloat(property.latitude), parseFloat(property.longitude)]}>
                          <Popup>
                            <div className="text-center">
                              <h3 className="font-semibold text-gray-900">{property?.property_name || 'Property Location'}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {property?.address?.street && `${property.address.street}, `}
                                {property?.address?.city && `${property.address.city}, `}
                                {property?.address?.state && `${property.address.state}`}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user?.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{user?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {isImageModalOpen && allImages.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <img
                src={allImages[currentImageIndex]?.url}
                alt={allImages[currentImageIndex]?.label}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={goToPrevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

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
                  Close
                </button>
              </div>
              <div className="p-4 max-h-[80vh] overflow-auto">
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
                      onError={(e) => {
                        console.error('PDF iframe error:', e);
                        // Show fallback message
                        e.target.style.display = 'none';
                        const fallback = e.target.parentElement;
                        fallback.innerHTML = `
                          <div class="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
                            <div class="text-center">
                              <FileText class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <h3 class="text-lg font-medium text-gray-900 mb-2">PDF Preview Not Available</h3>
                              <p class="text-gray-600 mb-4">This PDF cannot be previewed in the browser.</p>
                              <div class="flex flex-col sm:flex-row gap-3 justify-center">
                                <a href="${previewDoc.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                  <ExternalLink class="w-4 h-4 mr-2" />
                                  Open in New Tab
                                </a>
                                <a href="${previewDoc.url}" download="${previewDoc.name}" class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                  <Download class="w-4 h-4 mr-2" />
                                  Download PDF
                                </a>
                              </div>
                            </div>
                          </div>
                        `;
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="w-full max-h-[70vh] object-contain border border-gray-200 rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                    }}
                  />
                )}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-xs text-gray-500">
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

        {/* Room Detail Modal */}
        {isRoomModalOpen && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg">{selectedRoom.room_number}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Room {selectedRoom.room_number}</h2>
                    <p className="text-sm text-gray-500">{selectedRoom.room_type} â€¢ {selectedRoom.room_size} sq ft</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRoom.status || 'active')}`}>
                    {(() => {
                      const StatusIcon = getStatusIcon(selectedRoom.status || 'active');
                      return <StatusIcon className="w-4 h-4" />;
                    })()}
                    <span className="capitalize">{selectedRoom.status || 'Active'}</span>
                  </div>
                  <button
                    onClick={() => openEditRoom(selectedRoom)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit Room"
                  >
                    <Edit className="w-5 h-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => setIsRoomModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Room Images */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Room Images</h3>

                    {selectedRoom.room_image && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Room Image</p>
                        <img
                          src={selectedRoom.room_image}
                          alt={`Room ${selectedRoom.room_number}`}
                          className="w-full h-64 object-cover rounded-lg border"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300?text=Room+Image';
                          }}
                        />
                      </div>
                    )}

                    {selectedRoom.toilet_image && selectedRoom.amenities?.attachedBathroom && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Toilet Image</p>
                        <img
                          src={selectedRoom.toilet_image}
                          alt={`Room ${selectedRoom.room_number} Toilet`}
                          className="w-full h-64 object-cover rounded-lg border"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300?text=Toilet+Image';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Room Details */}
                  <div className="space-y-6">
                    {/* Pricing */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h4>
                      <div className="text-3xl font-bold text-green-600">{formatPrice(selectedRoom.rent)}</div>
                      <p className="text-sm text-gray-500">per month</p>
                    </div>

                    {/* Room Specifications */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Room Type:</span>
                          <span className="ml-2 font-medium">{selectedRoom.room_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Room Size:</span>
                          <span className="ml-2 font-medium">{selectedRoom.room_size} sq ft</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bed Type:</span>
                          <span className="ml-2 font-medium">{selectedRoom.bed_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Occupancy:</span>
                          <span className="ml-2 font-medium">{selectedRoom.occupancy} people</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedRoom.description && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{selectedRoom.description}</p>
                      </div>
                    )}

                    {/* Amenities */}
                    {selectedRoom.amenities && Object.keys(selectedRoom.amenities).length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedRoom.amenities).map(([amenity, available]) => {
                            if (available) {
                              const IconComponent = getAmenityIcon(amenity);
                              return (
                                <div key={amenity} className="flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                                  <IconComponent className="w-4 h-4" />
                                  <span className="capitalize">{amenity.replace(/([A-Z])/g, ' $1').trim()}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Room Status Management */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Room Status Management</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateRoomStatus(selectedRoom._id, 'active')}
                          disabled={roomStatusLoading[selectedRoom._id] || selectedRoom.status === 'active'}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRoom.status === 'active'
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                        >
                          {roomStatusLoading[selectedRoom._id] ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>Active</span>
                        </button>

                        <button
                          onClick={() => updateRoomStatus(selectedRoom._id, 'inactive')}
                          disabled={roomStatusLoading[selectedRoom._id] || selectedRoom.status === 'inactive'}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRoom.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {roomStatusLoading[selectedRoom._id] ? (
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <span>Inactive</span>
                        </button>

                        <button
                          onClick={() => updateRoomStatus(selectedRoom._id, 'maintenance')}
                          disabled={roomStatusLoading[selectedRoom._id] || selectedRoom.status === 'maintenance'}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRoom.status === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                            : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            }`}
                        >
                          {roomStatusLoading[selectedRoom._id] ? (
                            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                          <span>Maintenance</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Room Modal */}
        {isEditRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Edit Room {editRoomData.room_number}</h2>
                <button
                  onClick={() => setIsEditRoomModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Room Images */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Room Images</h3>

                    {/* Room Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room Image</label>
                      {editRoomData.room_image ? (
                        <div className="relative">
                          <img
                            src={editRoomData.room_image}
                            alt="Room"
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <button
                            onClick={removeRoomImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleRoomImageUpload}
                            className="hidden"
                            id="room-image-upload"
                          />
                          <label
                            htmlFor="room-image-upload"
                            className="cursor-pointer text-gray-500 hover:text-gray-700"
                          >
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <p>Click to upload room image</p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Toilet Image */}
                    {editRoomData.amenities?.attachedBathroom && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Toilet Image</label>
                        {editRoomData.toilet_image ? (
                          <div className="relative">
                            <img
                              src={editRoomData.toilet_image}
                              alt="Toilet"
                              className="w-full h-48 object-cover rounded-lg border"
                            />
                            <button
                              onClick={removeToiletImage}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleToiletImageUpload}
                              className="hidden"
                              id="toilet-image-upload"
                            />
                            <label
                              htmlFor="toilet-image-upload"
                              className="cursor-pointer text-gray-500 hover:text-gray-700"
                            >
                              <Camera className="w-8 h-8 mx-auto mb-2" />
                              <p>Click to upload toilet image</p>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Room Details Form */}
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                          <select
                            value={editRoomData.room_type}
                            onChange={(e) => handleEditRoomChange('room_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="Single">Single</option>
                            <option value="Double">Double</option>
                            <option value="Triple">Triple</option>
                            <option value="Quad">Quad</option>
                            <option value="Master">Master</option>
                            <option value="Studio">Studio</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Room Size (sq ft)</label>
                          <input
                            type="number"
                            value={editRoomData.room_size}
                            onChange={(e) => handleEditRoomChange('room_size', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
                          <select
                            value={editRoomData.bed_type}
                            onChange={(e) => handleEditRoomChange('bed_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="Single Bed">Single Bed</option>
                            <option value="Double Bed">Double Bed</option>
                            <option value="Queen Bed">Queen Bed</option>
                            <option value="King Bed">King Bed</option>
                            <option value="Bunk Bed">Bunk Bed</option>
                            <option value="No Bed">No Bed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Occupancy</label>
                          <input
                            type="number"
                            value={editRoomData.occupancy}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">Auto-set based on room type</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (â‚¹)</label>
                          <input
                            type="number"
                            value={editRoomData.rent}
                            onChange={(e) => handleEditRoomChange('rent', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Attached Bathroom</label>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Has attached bathroom?</span>
                            <div className="flex items-center space-x-3">
                              <span className={`text-sm font-medium ${!editRoomData.amenities?.attachedBathroom ? 'text-gray-900' : 'text-gray-500'}`}>
                                NO
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAmenityChange('attachedBathroom', !editRoomData.amenities?.attachedBathroom)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${editRoomData.amenities?.attachedBathroom ? 'bg-red-600' : 'bg-gray-200'
                                  }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editRoomData.amenities?.attachedBathroom ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                              </button>
                              <span className={`text-sm font-medium ${editRoomData.amenities?.attachedBathroom ? 'text-gray-900' : 'text-gray-500'}`}>
                                YES
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={editRoomData.description}
                        onChange={(e) => handleEditRoomChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Describe this room's features..."
                      />
                    </div>

                    {/* Amenities */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Amenities</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(editRoomData.amenities || {}).map(([amenity, value]) => (
                          <div key={amenity} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <label className="text-sm text-gray-700 capitalize">
                              {amenity.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setIsEditRoomModalOpen(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateRoom}
                        disabled={roomEditLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {roomEditLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Updating...</span>
                          </div>
                        ) : (
                          'Update Room'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {successMessage.includes('successfully') ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {successMessage.includes('successfully') ? 'Success!' : 'Error'}
                </h3>
                <p className="text-gray-600 mb-6">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${successMessage.includes('successfully')
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Property Modal */}
        {isEditPropertyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Property</h2>
                  <button
                    onClick={() => setIsEditPropertyModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Name</label>
                      <input
                        type="text"
                        value={editPropertyData.property_name || ''}
                        onChange={(e) => handlePropertyEditChange('property_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter property name"
                      />
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        value={editPropertyData.address || ''}
                        onChange={(e) => handlePropertyEditChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows="3"
                        placeholder="Enter full address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={editPropertyData.city || ''}
                        onChange={(e) => handlePropertyEditChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter city"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={editPropertyData.state || ''}
                        onChange={(e) => handlePropertyEditChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                      <input
                        type="text"
                        value={editPropertyData.pincode || ''}
                        onChange={(e) => handlePropertyEditChange('pincode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter pincode"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Landmark</label>
                      <input
                        type="text"
                        value={editPropertyData.landmark || ''}
                        onChange={(e) => handlePropertyEditChange('landmark', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter landmark"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                      <input
                        type="tel"
                        value={editPropertyData.contact_number || ''}
                        onChange={(e) => handlePropertyEditChange('contact_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter contact number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Owner Email</label>
                      <input
                        type="email"
                        value={editPropertyData.contact_email || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="Owner email will be loaded automatically"
                      />
                      <p className="text-xs text-gray-500 mt-1">This is your registered email address</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit</label>
                      <input
                        type="number"
                        value={editPropertyData.security_deposit || ''}
                        onChange={(e) => handlePropertyEditChange('security_deposit', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter security deposit"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Fee</label>
                      <input
                        type="number"
                        value={editPropertyData.maintenance_fee || ''}
                        onChange={(e) => handlePropertyEditChange('maintenance_fee', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter maintenance fee"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editPropertyData.description || ''}
                      onChange={(e) => handlePropertyEditChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows="4"
                      placeholder="Enter property description"
                    />
                  </div>

                  {/* Rules */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Rules and Policies</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(editPropertyData.rules || {}).map(([rule, allowed]) => (
                        <div key={rule} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={allowed}
                            onChange={(e) => handlePropertyRuleChange(rule, e.target.checked)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <label className="text-sm text-gray-700 capitalize">
                            {rule.replace(/([A-Z])/g, ' $1').trim()} Allowed
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Property Amenities */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Property Amenities</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(editPropertyData.amenities || {}).map(([amenity, value]) => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handlePropertyAmenityChange(amenity, e.target.checked)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <label className="text-sm text-gray-700 capitalize">
                            {amenity.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setIsEditPropertyModalOpen(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateProperty}
                      disabled={propertyEditLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {propertyEditLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          <span>Update Property</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Room Modal */}
        {isAddRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Add New Room</h3>
                  <button onClick={() => setIsAddRoomModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                      <input
                        type="text"
                        value={addRoomData.room_number}
                        onChange={(e) => handleAddRoomChange('room_number', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. 101"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rent (â‚¹)</label>
                      <input
                        type="number"
                        value={addRoomData.rent}
                        onChange={(e) => handleAddRoomChange('rent', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                      <select
                        value={addRoomData.room_type}
                        onChange={(e) => handleAddRoomChange('room_type', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Triple">Triple</option>
                        <option value="Quad">Quad</option>
                        <option value="Master">Master</option>
                        <option value="Studio">Studio</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Size (sq.ft)</label>
                      <input
                        type="number"
                        value={addRoomData.room_size || ''}
                        onChange={(e) => handleAddRoomChange('room_size', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. 150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
                      <select
                        value={addRoomData.bed_type}
                        onChange={(e) => handleAddRoomChange('bed_type', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Single Bed">Single Bed</option>
                        <option value="Double Bed">Double Bed</option>
                        <option value="Queen Bed">Queen Bed</option>
                        <option value="King Bed">King Bed</option>
                        <option value="Bunk Bed">Bunk Bed</option>
                        <option value="No Bed">No Bed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Occupancy</label>
                      <input
                        type="number"
                        value={addRoomData.occupancy}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={addRoomData.description}
                      onChange={(e) => handleAddRoomChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                      placeholder="Room description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(addRoomData.amenities).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleAddRoomAmenityChange(key, e.target.checked)}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room Image</label>
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                        {addRoomData.room_image ? (
                          <div className="relative">
                            <img src={addRoomData.room_image} alt="Room Preview" className="h-32 w-full object-cover rounded-md" />
                            <button
                              onClick={() => removeAddRoomImage('room_image')}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <span className="text-sm text-gray-500">Click to upload</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAddRoomImageUpload(e, 'room_image')} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Toilet Image</label>
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                        {addRoomData.toilet_image ? (
                          <div className="relative">
                            <img src={addRoomData.toilet_image} alt="Toilet Preview" className="h-32 w-full object-cover rounded-md" />
                            <button
                              onClick={() => removeAddRoomImage('toilet_image')}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <span className="text-sm text-gray-500">Click to upload</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAddRoomImageUpload(e, 'toilet_image')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => setIsAddRoomModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitAddRoom}
                      disabled={addRoomLoading}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {addRoomLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                      <span>{addRoomLoading ? 'Adding...' : 'Add Room'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </OwnerLayout>
  );
};

export default PropertyDetails;
