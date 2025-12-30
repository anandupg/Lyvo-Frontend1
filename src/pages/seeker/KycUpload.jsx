import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  User,
  CreditCard,
  Camera,
  Loader2,
  Eye,
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
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';

const KycUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State management
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(false);
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
  const [captureMode, setCaptureMode] = useState('front'); // Only front side needed
  const [cameraError, setCameraError] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Verification badge states
  const [showVerificationBadge, setShowVerificationBadge] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [showRawText, setShowRawText] = useState(false);

  // Focus only on Aadhar Card verification
  const selectedIdType = 'aadhar';

  useEffect(() => {
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    // Check existing KYC status
    checkKycStatus();

    // Check Aadhar approval status
    checkAadharApprovalStatus();

    // Check camera permissions and devices on mount
    const checkCameraAvailability = async () => {
      try {
        console.log('Checking camera availability...');

        if (!navigator.mediaDevices) {
          console.error('navigator.mediaDevices is not available');
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices on mount:', devices);

        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Video devices on mount:', videoDevices);

        if (videoDevices.length === 0) {
          console.warn('No video devices found');
        } else {
          console.log('Camera devices found:', videoDevices.length);
        }

        // Check permissions
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            console.log('Camera permission status:', permission.state);
          } catch (permError) {
            console.log('Could not check camera permissions:', permError);
          }
        }
      } catch (error) {
        console.error('Error checking camera availability:', error);
      }
    };

    checkCameraAvailability();
  }, []);

  // Camera functionality
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraLoading(true);
      setVideoLoaded(false);
      console.log('Starting camera...');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Check available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);

      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Video devices:', videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Try different camera configurations
      let constraints = {
        video: {
          facingMode: 'environment', // Try back camera first
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
        // Fallback to front camera
        constraints.video.facingMode = 'user';
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Camera started successfully with front camera');
      }

      setStream(mediaStream);
      setIsCameraOpen(true);

      // Wait for the video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          console.log('Setting video source...');
          videoRef.current.srcObject = mediaStream;

          // Add event listeners
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

          // Force play
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

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/aadhar-status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[FRONTEND DEBUG] Aadhar approval status response:', data);
        setAadharApprovalStatus(data.aadharStatus);
        console.log('[FRONTEND DEBUG] Set aadharApprovalStatus to:', data.aadharStatus);
        console.log('[FRONTEND DEBUG] isApproved:', data.aadharStatus?.isApproved);
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/profile/${userId}`, {
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Set image and create preview
    if (type === 'front') {
      setFrontImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setFrontPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setBackImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setBackPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const checkNameMatch = (extractedName, userFullName) => {
    if (!extractedName || !userFullName) {
      return { match: false, confidence: 0, reason: 'Missing name data' };
    }

    // Normalize names to uppercase for case-insensitive comparison
    const normalizedExtracted = extractedName.toUpperCase().trim();
    const normalizedUser = userFullName.toUpperCase().trim();

    const extractedParts = normalizedExtracted.split(/\s+/).filter(part => part.length > 0);
    const userParts = normalizedUser.split(/\s+/).filter(part => part.length > 0);

    // Check for exact match (case-insensitive)
    if (normalizedExtracted === normalizedUser) {
      return { match: true, confidence: 1.0, reason: 'Exact match' };
    }

    let matchCount = 0;
    let totalParts = Math.max(extractedParts.length, userParts.length);

    for (const extractedPart of extractedParts) {
      for (const userPart of userParts) {
        // Case-insensitive exact match
        if (extractedPart === userPart) {
          matchCount++;
          break;
        }
        // Case-insensitive similarity check
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
    // Normalize to uppercase for case-insensitive comparison
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

    // Simulate verification progress
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
      formData.append('idNumber', ''); // Will be extracted by OCR

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

        // Check if verification failed
        if (result.kycStatus === 'rejected') {
          // Show verification failed modal
          setShowVerificationFailedModal(true);
          setVerificationFailureReason(result.verificationFailureReason || 'Verification failed');

          toast({
            title: "Verification Failed",
            description: result.verificationFailureReason || "Please verify again with correct image",
            variant: "destructive"
          });

          return; // Don't proceed with success flow
        }

        // Success flow - verification passed
        setOcrResults(result.ocrResult);

        // Check name match
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

        // Refresh KYC status
        checkKycStatus();

        // Refresh Aadhar approval status
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

  if (loading || checkingApprovalStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{checkingApprovalStatus ? 'Checking verification status...' : 'Loading KYC status...'}</p>
        </div>
      </div>
    );
  }

  // If Aadhar is already approved, show approval status instead of upload form
  if (aadharApprovalStatus && aadharApprovalStatus.isApproved) {
    return (
      <SeekerLayout>
        <div className="min-h-screen bg-gray-50 py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/seeker-dashboard')}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Identity Verification</h1>
                    <p className="text-gray-600">Your Aadhar verification is complete</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Approval Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
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
                      <>
                        <div className="mb-4 bg-gray-50 p-4 rounded-lg flex justify-center border border-gray-100">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500 mb-2">Verified Document</p>
                            <img
                              src={aadharApprovalStatus.details.frontImageUrl}
                              alt="Verified Aadhar"
                              className="max-h-64 rounded-lg shadow-md border-2 border-green-200 object-contain"
                            />
                          </div>
                        </div>

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
                              <div className="flex justify-between">
                                <span className="text-gray-600">Method:</span>
                                <span className="font-medium capitalize">{aadharApprovalStatus.details.verificationMethod}</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-lg border border-green-200">
                            <h4 className="font-semibold text-gray-900 mb-2">What's Next?</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                                You can now book rooms
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
                      </>
                    )}

                    <div className="flex gap-4 pt-4">
                      <Button
                        onClick={() => navigate('/seeker-dashboard')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        Go to Dashboard
                      </Button>
                      <Button
                        onClick={() => navigate('/seeker-bookings')}
                        variant="outline"
                        className="flex-1"
                      >
                        View Bookings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/seeker-dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Aadhar Card Verification
                  </h1>
                  <p className="text-gray-600">
                    Verify your identity to unlock premium features
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Verification Progress */}
          {showVerificationBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
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

                  {/* Progress Bar */}
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
            </motion.div>
          )}

          {/* Current KYC Status */}
          {kycStatus && !showVerificationBadge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6"
            >
              <Alert className={`${getStatusColor(kycStatus)} border-0`}>
                <div className="flex items-center">
                  {getStatusIcon(kycStatus)}
                  <AlertDescription className="ml-2">
                    <strong>Current Status:</strong> {kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}
                  </AlertDescription>
                </div>
              </Alert>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
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
                      <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
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
            </motion.div>

            {/* Results Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
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
                          {ocrResults.extractedData?.mobile && (
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                              <span className="text-gray-600 font-medium">Mobile:</span>
                              <span className="font-semibold text-gray-900">{ocrResults.extractedData.mobile}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification Status */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <Badge className="w-5 h-5 mr-2 text-green-600" />
                          Verification Status
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Overall Confidence:</span>
                            <span className={`font-semibold ${ocrResults.confidence > 70 ? 'text-green-600' :
                              ocrResults.confidence > 40 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {Math.round(ocrResults.confidence || 0)}%
                            </span>
                          </div>

                          {/* Aadhar Card Validation */}
                          {ocrResults.validation && (
                            <>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 font-medium">Aadhar Card Valid:</span>
                                <span className={`font-semibold ${ocrResults.validation.is_aadhar_card ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                  {ocrResults.validation.is_aadhar_card ? '✓ Valid Aadhar Card' : '✗ Not Valid'}
                                </span>
                              </div>

                              <div className="p-3 bg-blue-50 rounded-lg">
                                <h5 className="font-medium text-gray-900 mb-2">Validation Details:</h5>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Has Aadhar Keywords:</span>
                                    <span className={ocrResults.validation.has_aadhar_keywords ? 'text-green-600' : 'text-red-600'}>
                                      {ocrResults.validation.has_aadhar_keywords ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Has Aadhar Number:</span>
                                    <span className={ocrResults.validation.has_aadhar_number ? 'text-green-600' : 'text-red-600'}>
                                      {ocrResults.validation.has_aadhar_number ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Has Name:</span>
                                    <span className={ocrResults.validation.has_name ? 'text-green-600' : 'text-red-600'}>
                                      {ocrResults.validation.has_name ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Has Date of Birth:</span>
                                    <span className={ocrResults.validation.has_dob ? 'text-green-600' : 'text-red-600'}>
                                      {ocrResults.validation.has_dob ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Has Gender:</span>
                                    <span className={ocrResults.validation.has_gender ? 'text-green-600' : 'text-red-600'}>
                                      {ocrResults.validation.has_gender ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Validation Score:</span>
                                    <span className={`font-semibold ${ocrResults.validation.confidence_score > 70 ? 'text-green-600' :
                                      ocrResults.validation.confidence_score > 40 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                      {Math.round(ocrResults.validation.confidence_score || 0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Final Status:</span>
                            <span className={`font-semibold ${ocrResults.verified ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                              {ocrResults.verified ? '✓ Verified & Approved' : '⏳ Under Review'}
                            </span>
                          </div>
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

                      {/* Extracted Raw Text */}
                      {ocrResults.rawText && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setShowRawText(!showRawText)}
                          >
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              <FileText className="w-5 h-5 mr-2 text-gray-600" />
                              Extracted Text
                            </h4>
                            <div className="flex items-center text-sm text-gray-500">
                              <span className="mr-2">{ocrResults.rawText.length} characters</span>
                              <span className={`transform transition-transform ${showRawText ? 'rotate-180' : ''}`}>
                                ▼
                              </span>
                            </div>
                          </div>

                          {showRawText && (
                            <div className="mt-4 bg-white rounded-lg p-4 border">
                              <div className="text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                                {ocrResults.rawText}
                              </div>
                              <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                                <span>Raw OCR output from Tesseract</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(ocrResults.rawText)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  Copy Text
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* OCR Details */}
                      {ocrResults.ocrDetails && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Eye className="w-5 h-5 mr-2 text-blue-600" />
                            OCR Processing Details
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Text Confidence:</span>
                              <span className="font-semibold">{Math.round(ocrResults.ocrDetails.text_confidence || 0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Field Extraction:</span>
                              <span className="font-semibold">{Math.round(ocrResults.ocrDetails.field_extraction_confidence || 0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Validation Score:</span>
                              <span className="font-semibold">{Math.round(ocrResults.ocrDetails.validation_confidence || 0)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Missing Fields Warning */}
                      {ocrResults.verificationDetails?.missing_fields?.length > 0 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            <strong>Missing Information:</strong> The following fields could not be extracted: {ocrResults.verificationDetails.missing_fields.join(', ')}
                          </AlertDescription>
                        </Alert>
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
            </motion.div>
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

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex justify-center space-x-4"
          >
            <Button
              variant="outline"
              onClick={() => navigate('/seeker-dashboard')}
            >
              Back to Dashboard
            </Button>
            {kycStatus === 'approved' && (
              <Button
                onClick={() => navigate('/seeker-dashboard')}
                className="bg-green-600 hover:bg-green-700"
              >
                Continue to Booking
              </Button>
            )}
          </motion.div>
        </div>
      </div>
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
    </SeekerLayout>
  );
};

export default KycUpload;