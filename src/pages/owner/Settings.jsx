import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
  User,
  Shield,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Loader2,
  Download,
  CameraIcon,
  RotateCcw,
  X,
  Star,
  Badge,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // OCR KYC states
  const [kycStatus, setKycStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [showVerificationFailedModal, setShowVerificationFailedModal] = useState(false);
  const [verificationFailureReason, setVerificationFailureReason] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [ocrResults, setOcrResults] = useState(null);
  const [nameMatch, setNameMatch] = useState(null);
  const [aadharApprovalStatus, setAadharApprovalStatus] = useState(null);
  const [checkingApprovalStatus, setCheckingApprovalStatus] = useState(false);

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [captureMode, setCaptureMode] = useState('front');
  const [cameraError, setCameraError] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Verification badge states
  const [showVerificationBadge, setShowVerificationBadge] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [showRawText, setShowRawText] = useState(false);

  // Focus only on Aadhar Card verification
  const selectedIdType = 'aadhar';

  const refreshUserFromApi = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const current = JSON.parse(localStorage.getItem('user') || 'null');
      if (!token || !current?._id) return;
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
      const { data } = await axios.get(`${base}/user/profile/${current._id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (data?._id) {
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      }
    } catch (e) {
      console.error('refreshUserFromApi error:', e);
    }
  };

  // Camera functionality
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraLoading(true);
      setVideoLoaded(false);
      console.log('Starting camera...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);

      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Video devices:', videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      let constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      console.log('Trying camera with constraints:', constraints);

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Camera started successfully with back camera');
      } catch (backCameraError) {
        console.log('Back camera failed, trying front camera:', backCameraError);
        constraints.video.facingMode = 'user';
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Camera started successfully with front camera');
      }

      setStream(mediaStream);
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          console.log('Setting video source...');
          videoRef.current.srcObject = mediaStream;

          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            setVideoLoaded(true);
            setCameraLoading(false);
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
              setCameraError('Failed to start video playback');
            });
          };

          videoRef.current.oncanplay = () => {
            console.log('Video can play');
            setVideoLoaded(true);
            setCameraLoading(false);
          };

          videoRef.current.onerror = (error) => {
            console.error('Video error:', error);
            setCameraError('Video playback error');
            setCameraLoading(false);
          };

          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        } else {
          console.error('Video ref is not available');
          setCameraError('Video element not ready');
          setCameraLoading(false);
        }
      }, 100);

      console.log('Camera modal opened');

    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraLoading(false);

      let errorMessage = 'Unable to access camera. ';

      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera is not supported in this browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += 'Please check your camera settings.';
      }

      setCameraError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
    setVideoLoaded(false);
    setCameraLoading(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `captured_${captureMode}_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });

        setFrontImage(file);
        setFrontPreview(URL.createObjectURL(blob));

        stopCamera();
        toast({
          title: "Photo Captured",
          description: "Aadhar card photo captured successfully",
        });
      }
    }, 'image/jpeg', 0.8);
  };

  const openCameraForCapture = () => {
    setCaptureMode('front');
    startCamera();
  };

  // Check Aadhar approval status
  const checkAadharApprovalStatus = async () => {
    try {
      setCheckingApprovalStatus(true);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch('http://localhost:4002/api/user/aadhar-status', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAadharApprovalStatus(data.aadharStatus);
        console.log('Aadhar approval status:', data.aadharStatus);
      }
    } catch (error) {
      console.error('Error checking Aadhar approval status:', error);
    } finally {
      setCheckingApprovalStatus(false);
    }
  };

  const checkKycStatus = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id || userData._id;

      if (!userId) {
        console.error('User ID not found');
        return;
      }

      const response = await fetch(`http://localhost:4002/api/user/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setKycStatus(userData.kycStatus || 'not_verified');
        setVerificationStatus(userData.kycStatus || 'not_verified');
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (file, type) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    if (type === 'front') {
      setFrontImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setFrontPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const checkNameMatch = (extractedName, userFullName) => {
    if (!extractedName || !userFullName) {
      return { match: false, confidence: 0, reason: 'Missing name data' };
    }

    const normalizedExtracted = extractedName.toUpperCase().trim();
    const normalizedUser = userFullName.toUpperCase().trim();

    const extractedParts = normalizedExtracted.split(/\s+/).filter(part => part.length > 0);
    const userParts = normalizedUser.split(/\s+/).filter(part => part.length > 0);

    if (normalizedExtracted === normalizedUser) {
      return { match: true, confidence: 1.0, reason: 'Exact match' };
    }

    let matchCount = 0;
    let totalParts = Math.max(extractedParts.length, userParts.length);

    for (const extractedPart of extractedParts) {
      for (const userPart of userParts) {
        if (extractedPart === userPart) {
          matchCount++;
          break;
        }
        if (extractedPart.length > 2 && userPart.length > 2) {
          const similarity = calculateSimilarity(extractedPart, userPart);
          if (similarity > 0.8) {
            matchCount += similarity;
            break;
          }
        }
      }
    }

    const confidence = matchCount / totalParts;

    if (confidence >= 0.8) {
      return { match: true, confidence, reason: 'High similarity match' };
    } else if (confidence >= 0.5) {
      return { match: false, confidence, reason: 'Partial match - manual review needed' };
    } else {
      return { match: false, confidence, reason: 'No significant match found' };
    }
  };

  const calculateSimilarity = (str1, str2) => {
    const normalizedStr1 = str1.toUpperCase();
    const normalizedStr2 = str2.toUpperCase();

    const longer = normalizedStr1.length > normalizedStr2.length ? normalizedStr1 : normalizedStr2;
    const shorter = normalizedStr1.length > normalizedStr2.length ? normalizedStr2 : normalizedStr1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const uploadKycDocuments = async () => {
    if (!frontImage) {
      toast({
        title: "Front image required",
        description: "Please upload the front side of your document",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setOcrResults(null);
    setNameMatch(null);
    setShowVerificationBadge(true);
    setVerificationProgress(0);

    const progressInterval = setInterval(() => {
      setVerificationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const authToken = localStorage.getItem('authToken');
      const formData = new FormData();

      formData.append('frontImage', frontImage);
      formData.append('idType', selectedIdType);
      formData.append('idNumber', '');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/user/upload-kyc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        clearInterval(progressInterval);
        setVerificationProgress(100);

        if (result.kycStatus === 'rejected') {
          setShowVerificationFailedModal(true);
          setVerificationFailureReason(result.verificationFailureReason || 'Verification failed');

          toast({
            title: "Verification Failed",
            description: result.verificationFailureReason || "Please verify again with correct image",
            variant: "destructive"
          });

          return;
        }

        setOcrResults(result.ocrResult);

        if (result.ocrResult?.extractedData?.name) {
          const nameMatchResult = checkNameMatch(
            result.ocrResult.extractedData.name,
            user?.name || ''
          );
          setNameMatch(nameMatchResult);
        }

        setVerificationStatus(result.kycStatus);
        setKycStatus(result.kycStatus);

        toast({
          title: "Document uploaded successfully",
          description: `KYC status: ${result.kycStatus}`,
          variant: result.kycStatus === 'approved' ? 'default' : 'destructive'
        });

        checkKycStatus();
        checkAadharApprovalStatus();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading KYC:', error);
      clearInterval(progressInterval);
      setVerificationProgress(0);
      toast({
        title: "Upload failed",
        description: error.message || 'Failed to upload document',
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5" />;
      case 'pending': return <AlertCircle className="w-5 h-5" />;
      case 'rejected': return <XCircle className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };


  // Check authentication and initialize OCR functionality
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

        // Check existing KYC status
        checkKycStatus();

        // Check Aadhar approval status
        checkAadharApprovalStatus();
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleRemoveProfilePicture = async () => {
    if (!user?._id) return;
    try {
      setProfileUpdating(true);
      const token = localStorage.getItem('authToken');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:4002/api'}/user/profile/${user._id}`,
        { profilePicture: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = { ...user, profilePicture: null };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);

      toast({
        title: "Success",
        description: "Profile picture removed successfully",
      });
    } catch (e) {
      console.error('Remove profile picture error:', e);
      toast({
        title: "Error",
        description: "Failed to remove picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user?._id) return;

    try {
      setProfileUpdating(true);
      const token = localStorage.getItem('authToken');

      // Get form values
      const name = document.getElementById('profile-name').value.trim();
      const phone = document.getElementById('profile-phone').value.trim();

      // Prepare update data
      const updateData = {
        name,
        phone: phone || undefined, // Only include if provided
      };

      // Call update API
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
      const { data } = await axios.put(
        `${base}/user/profile/${user._id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local storage and state
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);

        // Notify other components
        window.dispatchEvent(new Event('lyvo-user-updated'));

        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
      }
    } catch (e) {
      console.error('Profile update error:', e);
      toast({
        title: "Error",
        description: e?.response?.data?.message || 'Failed to update profile. Please try again.',
        variant: "destructive",
      });
    } finally {
      setProfileUpdating(false);
    }
  };

  // Password validation functions
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    setPasswordRequirements(requirements);

    // Calculate strength (0-100)
    const strength = Object.values(requirements).filter(Boolean).length * 20;
    setPasswordStrength(strength);

    return requirements;
  };

  const validatePasswordChange = (currentPassword, newPassword, confirmPassword) => {
    const errors = {};

    // Current password validation
    if (!currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }

    // New password validation
    if (!newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else {
      const requirements = validatePassword(newPassword);

      if (!requirements.length) {
        errors.newPassword = 'Password must be at least 8 characters long';
      } else if (!requirements.uppercase) {
        errors.newPassword = 'Password must contain at least one uppercase letter';
      } else if (!requirements.lowercase) {
        errors.newPassword = 'Password must contain at least one lowercase letter';
      } else if (!requirements.number) {
        errors.newPassword = 'Password must contain at least one number';
      } else if (!requirements.special) {
        errors.newPassword = 'Password must contain at least one special character';
      }
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Additional validations
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 60) return 'bg-orange-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 40) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!user?._id) return;

    try {
      setPasswordUpdating(true);
      const token = localStorage.getItem('authToken');

      // Get form values
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      // Enhanced validation
      if (!validatePasswordChange(currentPassword, newPassword, confirmPassword)) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors below before proceeding",
          variant: "destructive",
        });
        return;
      }

      // Call change password API
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
      await axios.post(
        `${base}/user/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset form and validation states
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
      setPasswordErrors({});
      setPasswordStrength(0);
      setPasswordRequirements({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
      });

      toast({
        title: "Success",
        description: "Password updated successfully!",
      });
    } catch (e) {
      console.error('Password change error:', e);
      toast({
        title: "Error",
        description: e?.response?.data?.message || 'Failed to update password. Please try again.',
        variant: "destructive",
      });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'kyc', name: 'Govt ID (KYC)', icon: Shield },
  ];

  useEffect(() => {
    if (window.location.hash === '#kyc') {
      setActiveTab('kyc');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'kyc') {
      refreshUserFromApi();
    }
  }, [activeTab]);

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and property preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Mobile Tab Selector */}
          <div className="lg:hidden p-4 border-b border-gray-200">
            <Select value={activeTab} onValueChange={(val) => setActiveTab(val)}>
              <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent position="popper">
                {tabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>{tab.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'kyc' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold text-gray-900">Aadhar Card Verification</h2>
                <p className="text-sm text-gray-600">Upload a clear photo of your Aadhar card for identity verification. We'll extract your information automatically.</p>

                {/* If Aadhar is already approved, show approval status */}
                {aadharApprovalStatus && aadharApprovalStatus.isApproved ? (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-green-800">
                        <CheckCircle2 className="w-6 h-6 mr-2" />
                        Verification Approved
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <Shield className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Aadhar Verification</h3>
                              <p className="text-sm text-gray-600">Status: Approved</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-green-600 font-semibold">
                              <CheckCircle2 className="w-5 h-5 mr-1" />
                              Verified
                            </div>
                            <p className="text-xs text-gray-500">
                              {aadharApprovalStatus.details?.approvalDate ?
                                new Date(aadharApprovalStatus.details.approvalDate).toLocaleDateString() :
                                'Recently approved'
                              }
                            </p>
                          </div>
                        </div>

                        {aadharApprovalStatus.details && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-lg border border-green-200">
                              <h4 className="font-semibold text-gray-900 mb-2">Verification Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Aadhar Number:</span>
                                  <span className="font-medium">{aadharApprovalStatus.details.aadharNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Name:</span>
                                  <span className="font-medium">{aadharApprovalStatus.details.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Confidence:</span>
                                  <span className="font-medium">{aadharApprovalStatus.details.overallConfidence}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-white rounded-lg border border-green-200">
                              <h4 className="font-semibold text-gray-900 mb-2">What's Next?</h4>
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                                  You can now list properties
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                                  Access all platform features
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                                  No need to verify again
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Verification Progress */}
                    {showVerificationBadge && (
                      <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-6">
                          <div className="flex items-center mb-4">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                              {verificationProgress === 100 ? (
                                <CheckCircle2 className="w-6 h-6 text-white" />
                              ) : (
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {verificationProgress === 100 ? 'Verification Complete!' : 'Verifying Your Identity'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {verificationProgress === 100
                                  ? 'Your identity has been successfully verified'
                                  : 'Please wait while we process your documents...'
                                }
                              </p>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="bg-green-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${verificationProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            {verificationProgress}% Complete
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Current KYC Status */}
                    {kycStatus && !showVerificationBadge && (
                      <Alert className={`${getStatusColor(kycStatus)} border-0`}>
                        <div className="flex items-center">
                          {getStatusIcon(kycStatus)}
                          <AlertDescription className="ml-2">
                            <strong>Current Status:</strong> {kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Upload Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-600" />
                            Upload Document
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          {/* Aadhar Card Info */}
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center mb-2">
                              <Shield className="w-6 h-6 text-blue-600 mr-3" />
                              <h3 className="font-semibold text-blue-900">Aadhar Card Verification</h3>
                            </div>
                            <p className="text-blue-700 text-sm">
                              Upload a clear photo of your Aadhar card for identity verification. We'll extract your information automatically.
                            </p>
                          </div>

                          {/* Aadhar Card Upload */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Aadhar Card Photo
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                              {frontPreview ? (
                                <div className="space-y-4">
                                  <div className="relative">
                                    <img
                                      src={frontPreview}
                                      alt="Front preview"
                                      className="mx-auto max-h-48 rounded-lg shadow-lg"
                                    />
                                    <div className="absolute top-2 right-2">
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          setFrontImage(null);
                                          setFrontPreview(null);
                                        }}
                                        className="rounded-full w-8 h-8 p-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openCameraForCapture()}
                                      className="flex items-center"
                                    >
                                      <Camera className="w-4 h-4 mr-2" />
                                      Retake
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                                    <Upload className="w-8 h-8 text-blue-600" />
                                  </div>
                                  <p className="text-gray-600 mb-4 font-medium">Upload a clear photo of your Aadhar card</p>
                                  <div className="flex gap-3 justify-center">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(e.target.files[0], 'front')}
                                      className="hidden"
                                      id="front-upload"
                                    />
                                    <label
                                      htmlFor="front-upload"
                                      className="cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold"
                                    >
                                      Choose File
                                    </label>
                                    <Button
                                      variant="outline"
                                      onClick={() => openCameraForCapture()}
                                      className="flex items-center border-blue-300 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Camera className="w-4 h-4 mr-2" />
                                      Take Photo
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Upload Button */}
                          <Button
                            onClick={uploadKycDocuments}
                            disabled={!frontImage || uploading}
                            className="w-full"
                            size="lg"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing Document...
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Verify Document
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Results Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Eye className="w-5 h-5 mr-2 text-purple-600" />
                            Verification Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          {ocrResults ? (
                            <div className="space-y-6">
                              {/* Verification Summary */}
                              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                  <CheckCircle2 className="w-6 h-6 mr-2 text-blue-600" />
                                  Verification Summary
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <div className={`text-2xl font-bold ${ocrResults.validation?.is_aadhar_card ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                      {ocrResults.validation?.is_aadhar_card ? '✓' : '✗'}
                                    </div>
                                    <div className="text-sm text-gray-600">Aadhar Card</div>
                                    <div className="text-xs text-gray-500">
                                      {ocrResults.validation?.is_aadhar_card ? 'Valid' : 'Invalid'}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className={`text-2xl font-bold ${ocrResults.confidence > 70 ? 'text-green-600' :
                                        ocrResults.confidence > 40 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                      {Math.round(ocrResults.confidence || 0)}%
                                    </div>
                                    <div className="text-sm text-gray-600">Confidence</div>
                                    <div className="text-xs text-gray-500">Overall Score</div>
                                  </div>
                                  <div className="text-center">
                                    <div className={`text-2xl font-bold ${ocrResults.verified ? 'text-green-600' : 'text-yellow-600'
                                      }`}>
                                      {ocrResults.verified ? '✓' : '⏳'}
                                    </div>
                                    <div className="text-sm text-gray-600">Status</div>
                                    <div className="text-xs text-gray-500">
                                      {ocrResults.verified ? 'Approved' : 'Pending'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Extracted Data */}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                  Extracted Information
                                </h4>
                                <div className="space-y-3">
                                  {ocrResults.extractedData?.name && (
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                      <span className="text-gray-600 font-medium">Name:</span>
                                      <span className="font-semibold text-gray-900">{ocrResults.extractedData.name}</span>
                                    </div>
                                  )}
                                  {ocrResults.extractedData?.number && (
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                      <span className="text-gray-600 font-medium">ID Number:</span>
                                      <span className="font-semibold text-gray-900">{ocrResults.extractedData.number}</span>
                                    </div>
                                  )}
                                  {ocrResults.extractedData?.dob && (
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                      <span className="text-gray-600 font-medium">Date of Birth:</span>
                                      <span className="font-semibold text-gray-900">{ocrResults.extractedData.dob}</span>
                                    </div>
                                  )}
                                  {ocrResults.extractedData?.gender && (
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                      <span className="text-gray-600 font-medium">Gender:</span>
                                      <span className="font-semibold text-gray-900">{ocrResults.extractedData.gender}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Name Matching Results */}
                              {nameMatch && (
                                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <User className="w-5 h-5 mr-2 text-green-600" />
                                    Name Verification
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 font-medium">Profile Name:</span>
                                      <span className="font-semibold">{user?.name || 'Not available'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 font-medium">Document Name:</span>
                                      <span className="font-semibold">{ocrResults.extractedData?.name || 'Not extracted'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 font-medium">Match Status:</span>
                                      <span className={`font-semibold ${nameMatch.match ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {nameMatch.match ? '✓ Match' : '✗ No Match'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 font-medium">Confidence:</span>
                                      <span className="font-semibold">{Math.round(nameMatch.confidence * 100)}%</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-2 p-2 bg-white rounded-lg">
                                      {nameMatch.reason}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                                <Shield className="w-10 h-10 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Results Yet</h3>
                              <p className="text-gray-500">
                                Upload a document to see verification results
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Profile Picture */}
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-3">Profile Picture</div>
                  <div className="flex items-center gap-4">
                    <ProfilePictureUpload
                      currentImage={user?.profilePicture || null}
                      onImageUpdate={(url) => {
                        const updated = { ...user, profilePicture: url };
                        localStorage.setItem('user', JSON.stringify(updated));
                        setUser(updated);
                      }}
                    />
                    {user?.profilePicture && (
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        disabled={profileUpdating}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {profileUpdating ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="profile-name"
                        defaultValue={user?.name || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="profile-phone"
                        defaultValue={user?.phone || user?.phoneNumber || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={profileUpdating}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {profileUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>

                {/* Check if user logged in with Google */}
                {user?.googleId ? (
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-medium text-blue-900 mb-1">Google Account</h3>
                        <p className="text-sm text-blue-700">
                          You signed in using Google. Your password is managed by Google and cannot be changed here.
                        </p>
                        <p className="text-sm text-blue-600 mt-2">
                          To change your password, please visit your{' '}
                          <a
                            href="https://myaccount.google.com/security"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium hover:text-blue-800"
                          >
                            Google Account Security Settings
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="current-password"
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${passwordErrors.currentPassword
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                            }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          id="new-password"
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${passwordErrors.newPassword
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                            }`}
                          required
                          onChange={(e) => {
                            validatePassword(e.target.value);
                            // Clear new password error when user starts typing
                            if (passwordErrors.newPassword) {
                              setPasswordErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.newPassword;
                                return newErrors;
                              });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {document.getElementById('new-password')?.value && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Password Strength:</span>
                            <span className={`text-xs font-medium ${passwordStrength < 40 ? 'text-red-600' :
                                passwordStrength < 60 ? 'text-orange-600' :
                                  passwordStrength < 80 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                              {getPasswordStrengthText(passwordStrength)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                              style={{ width: `${passwordStrength}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Password Requirements Checklist - Only show when not all requirements are met */}
                      {!Object.values(passwordRequirements).every(Boolean) && (
                        <div className="mt-3 space-y-1">
                          <div className={`flex items-center text-xs ${passwordRequirements.length ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.length ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                              {passwordRequirements.length && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            At least 8 characters
                          </div>
                          <div className={`flex items-center text-xs ${passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.uppercase ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                              {passwordRequirements.uppercase && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            One uppercase letter
                          </div>
                          <div className={`flex items-center text-xs ${passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.lowercase ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                              {passwordRequirements.lowercase && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            One lowercase letter
                          </div>
                          <div className={`flex items-center text-xs ${passwordRequirements.number ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.number ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                              {passwordRequirements.number && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            One number
                          </div>
                          <div className={`flex items-center text-xs ${passwordRequirements.special ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.special ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                              {passwordRequirements.special && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            One special character
                          </div>
                        </div>
                      )}

                      {passwordErrors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirm-password"
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${passwordErrors.confirmPassword
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                            }`}
                          required
                          onChange={(e) => {
                            const confirmPassword = e.target.value;
                            const newPassword = document.getElementById('new-password').value;

                            if (confirmPassword && newPassword && confirmPassword !== newPassword) {
                              setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                            } else if (passwordErrors.confirmPassword) {
                              setPasswordErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.confirmPassword;
                                return newErrors;
                              });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={passwordUpdating || Object.values(passwordErrors).some(error => error && error.trim()) || !Object.values(passwordRequirements).every(Boolean)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {passwordUpdating ? 'Updating...' : 'Update Password'}
                    </button>

                    {/* Help text for button state */}
                    {!passwordUpdating && (Object.values(passwordErrors).some(error => error && error.trim()) || !Object.values(passwordRequirements).every(Boolean)) && (
                      <p className="text-xs text-gray-500 mt-2">
                        Complete all password requirements above to enable the update button
                      </p>
                    )}
                  </form>
                )}
              </motion.div>
            )}

          </div>
        </div>

        {/* Enhanced Camera Modal */}
        {isCameraOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Capture Aadhar Card
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Take a clear photo of your Aadhar card
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopCamera}
                  className="text-gray-500 hover:text-gray-700 rounded-full w-10 h-10 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {cameraError ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Camera Error</h4>
                  <p className="text-red-600 mb-6">{cameraError}</p>
                  <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Camera Preview */}
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden">
                    {cameraLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                        <div className="text-center">
                          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
                          <p className="text-white text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-80 object-cover ${!videoLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                      style={{ backgroundColor: '#000' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera Overlay */}
                    {videoLoaded && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Document Frame Guide */}
                        <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg opacity-70">
                          <div className="absolute top-2 left-2 text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                            Align document within frame
                          </div>
                        </div>

                        {/* Corner Guides */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white"></div>
                      </div>
                    )}

                    {/* No Video State */}
                    {!videoLoaded && !cameraLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-center text-white">
                          <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Camera not ready</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Tips for better capture:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>Ensure good lighting</li>
                          <li>Keep the document flat and straight</li>
                          <li>Align all four corners within the frame</li>
                          <li>Avoid shadows and reflections</li>
                        </ul>
                      </div>
                    </div>
                  </div>


                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={capturePhoto}
                      disabled={!videoLoaded || cameraLoading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      {cameraLoading ? 'Starting Camera...' : videoLoaded ? 'Capture Photo' : 'Camera Not Ready'}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 font-semibold rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Failed Modal */}
        <Dialog open={showVerificationFailedModal} onOpenChange={setShowVerificationFailedModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Verification Failed
              </DialogTitle>
              <DialogDescription>
                Your KYC verification could not be completed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-2">Reason:</p>
                <p className="text-sm text-red-700">{verificationFailureReason}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Please ensure:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Upload a clear, valid Aadhar card image</li>
                  <li>• The name on the document matches your profile name</li>
                  <li>• The image is not blurry or rotated</li>
                  <li>• All text is clearly visible</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowVerificationFailedModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowVerificationFailedModal(false);
                  // Reset form for retry
                  setFrontImage(null);
                  setFrontPreview(null);
                  setOcrResults(null);
                  setNameMatch(null);
                  setVerificationProgress(0);
                }}
              >
                Try Again
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OwnerLayout>
  );
};

export default Settings; 