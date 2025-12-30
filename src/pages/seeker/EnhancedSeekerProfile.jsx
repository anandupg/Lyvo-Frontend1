import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Edit, Save, X, User, Mail, Phone, MapPin, Calendar, Shield,
  Lock, Eye, EyeOff, AlertCircle, Camera, Award, TrendingUp,
  Home, Heart, CheckCircle, Clock, Star, Activity, DollarSign,
  FileText, Bell, Globe, Briefcase, GraduationCap
} from "lucide-react";
import ScrollReveal from "../../components/ScrollReveal";
import ProfilePictureUpload from "../../components/ProfilePictureUpload";
import SeekerLayout from "../../components/seeker/SeekerLayout";
import apiClient from "../../utils/apiClient";

const EnhancedSeekerProfile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'preferences', 'activity', 'security'
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    bookings: 0,
    favorites: 0,
    reviews: 0,
    trustScore: 95
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [saveStatus, setSaveStatus] = useState({ type: "", message: "" });

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    joinDate: "",
    bio: "",
    isVerified: false,
    trustScore: 0,
    profilePicture: "",
    // Extended fields
    dateOfBirth: "",
    gender: "",
    occupation: "",
    education: "",
    emergencyContact: "",
    emergencyPhone: "",
    preferences: {
      roomType: "",
      budget: "",
      moveInDate: "",
      duration: "",
      lifestyle: "",
      foodPreference: ""
    }
  });

  const propertyServiceUrl = import.meta.env.VITE_PROPERTY_SERVICE_API_URL || 'http://localhost:3003';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const userData = localStorage.getItem("user");

        if (!token || !userData) {
          setUser(null);
          setLoading(false);
          navigate("/login");
          return;
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(userData);
        } catch (parseError) {
          console.error('EnhancedSeekerProfile: Error parsing user data:', parseError);
          setError('Failed to load user data. Please log in again.');
          setLoading(false);
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        if (parsedUser.role !== 1) {
          console.warn('EnhancedSeekerProfile: User role mismatch, redirecting');
          navigate("/login");
          return;
        }

        setUser(parsedUser);
        setProfileData(prev => ({
          ...prev,
          name: parsedUser.name || "",
          email: parsedUser.email || "",
          profilePicture: parsedUser.profilePicture || "",
          phone: parsedUser.phone || "",
          location: parsedUser.location || "",
          bio: parsedUser.bio || "",
          isVerified: parsedUser.isVerified || false,
          trustScore: 95,
          joinDate: parsedUser.createdAt
            ? new Date(parsedUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "Recently",
          dateOfBirth: parsedUser.dateOfBirth || "",
          gender: parsedUser.gender || "",
          occupation: parsedUser.occupation || "",
          education: parsedUser.education || "",
          emergencyContact: parsedUser.emergencyContact || "",
          emergencyPhone: parsedUser.emergencyPhone || "",
          preferences: {
            roomType: parsedUser.preferences?.roomType || "",
            budget: parsedUser.preferences?.budget || "",
            moveInDate: parsedUser.preferences?.moveInDate || "",
            duration: parsedUser.preferences?.duration || "",
            lifestyle: parsedUser.preferences?.lifestyle || "",
            foodPreference: parsedUser.preferences?.foodPreference || ""
          }
        }));

        // Fetch user stats
        await fetchUserStats(parsedUser._id, token);
      } catch (error) {
        console.error('EnhancedSeekerProfile: Error in fetchUserData:', error);
        setError(`An error occurred: ${error.message}`);
        setUser(null);
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const fetchUserStats = async () => {
    try {
      // Fetch bookings and favorites using apiClient
      // The bookings endpoint '/property/user/bookings' returns the user's bookings
      const bookingsRes = await apiClient.get('/property/user/bookings');

      if (bookingsRes.status === 200) {
        const bookingsData = bookingsRes.data;
        // SeekerBookings response structure: { success: true, bookings: [...] }
        setStats(prev => ({
          ...prev,
          bookings: bookingsData.bookings?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    try {
      setSaveStatus({ type: "loading", message: "Saving changes..." });

      const response = await apiClient.put(`/user/profile/${user._id}`, {
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
        bio: profileData.bio,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        occupation: profileData.occupation,
        education: profileData.education,
        emergencyContact: profileData.emergencyContact,
        emergencyPhone: profileData.emergencyPhone,
        preferences: profileData.preferences
      });

      if (response.status !== 200) {
        throw new Error(response.data?.message || "Failed to update profile");
      }

      const result = response.data;
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...currentUser, ...result.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setSaveStatus({ type: "success", message: "Profile updated successfully!" });
      window.dispatchEvent(new Event("lyvo-profile-update"));
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message || "Failed to update profile" });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    }
  };

  const handleProfilePictureUpdate = (newImageUrl) => {
    setProfileData(prev => ({ ...prev, profilePicture: newImageUrl }));
    setSaveStatus({ type: "success", message: "Profile picture updated successfully!" });
    setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
  };

  const handlePasswordUpdate = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setSaveStatus({ type: "error", message: "New passwords do not match" });
        return;
      }
      if (passwordData.newPassword.length < 6) {
        setSaveStatus({ type: "error", message: "Password must be at least 6 characters long" });
        return;
      }

      setSaveStatus({ type: "loading", message: "Updating password..." });
      const response = await apiClient.post('/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.status !== 200) {
        throw new Error(response.data?.message || "Failed to update password");
      }

      setSaveStatus({ type: "success", message: "Password updated successfully!" });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message || "Failed to update password" });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Heart },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <SeekerLayout>
      {loading ? (
        <div className="pt-4 min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !user ? (
        <div className="pt-4 min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access your profile.</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pt-4 min-h-screen bg-gradient-to-br from-gray-50 to-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="relative h-48 bg-gradient-to-r from-red-500 via-red-600 to-red-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
                  <div className="absolute bottom-6 left-8 flex items-end space-x-6">
                    <div className="relative group">
                      <ProfilePictureUpload
                        currentImage={profileData.profilePicture}
                        onImageUpdate={handleProfilePictureUpdate}
                        className="w-28 h-28 border-4 border-white"
                      />
                      {profileData.isVerified && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-white pb-2">
                      <h1 className="text-3xl font-bold mb-1 drop-shadow-lg">{profileData.name || 'User'}</h1>
                      <p className="text-white/90 flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {profileData.joinDate || 'Recently'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-6 right-8">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-white/95 backdrop-blur-sm text-gray-700 px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 shadow-lg hover:bg-white transition-all duration-300"
                    >
                      {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                      <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
                    </motion.button>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.bookings}</p>
                    <p className="text-sm text-gray-600">Bookings</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-pink-100 rounded-full mx-auto mb-2">
                      <Heart className="w-6 h-6 text-pink-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.favorites}</p>
                    <p className="text-sm text-gray-600">Favorites</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2">
                      <Star className="w-6 h-6 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.reviews}</p>
                    <p className="text-sm text-gray-600">Reviews</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.trustScore}</p>
                    <p className="text-sm text-gray-600">Trust Score</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6">
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Tab Content */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {/* Personal Info Tab */}
                {activeTab === 'personal' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <User className="w-6 h-6 mr-2 text-red-600" />
                        Personal Information
                      </h2>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileData.name}
                              onChange={(e) => handleInputChange("name", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium">{profileData.name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                          <p className="text-gray-900 py-3 font-medium flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {profileData.email}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              value={profileData.phone}
                              onChange={(e) => handleInputChange("phone", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {profileData.phone || "Not provided"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileData.location}
                              onChange={(e) => handleInputChange("location", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                              placeholder="Enter your location"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              {profileData.location || "Not provided"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={profileData.dateOfBirth}
                              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {profileData.dateOfBirth || "Not provided"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                          {isEditing ? (
                            <select
                              value={profileData.gender}
                              onChange={(e) => handleInputChange("gender", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <p className="text-gray-900 py-3 font-medium capitalize">{profileData.gender || "Not provided"}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileData.occupation}
                              onChange={(e) => handleInputChange("occupation", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                              placeholder="Your occupation"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium flex items-center">
                              <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                              {profileData.occupation || "Not provided"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Education</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileData.education}
                              onChange={(e) => handleInputChange("education", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                              placeholder="Your education"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium flex items-center">
                              <GraduationCap className="w-4 h-4 mr-2 text-gray-400" />
                              {profileData.education || "Not provided"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                        {isEditing ? (
                          <textarea
                            value={profileData.bio}
                            onChange={(e) => handleInputChange("bio", e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 resize-none"
                            placeholder="Tell us about yourself..."
                          />
                        ) : (
                          <p className="text-gray-600 leading-relaxed">
                            {profileData.bio || "No bio provided"}
                          </p>
                        )}
                      </div>

                      {/* Emergency Contact */}
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={profileData.emergencyContact}
                                onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                                placeholder="Emergency contact name"
                              />
                            ) : (
                              <p className="text-gray-900 py-3 font-medium">{profileData.emergencyContact || "Not provided"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Phone</label>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={profileData.emergencyPhone}
                                onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                                placeholder="Emergency phone number"
                              />
                            ) : (
                              <p className="text-gray-900 py-3 font-medium">{profileData.emergencyPhone || "Not provided"}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <Heart className="w-6 h-6 mr-2 text-red-600" />
                        Room Preferences
                      </h2>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Room Type</label>
                          {isEditing ? (
                            <select
                              value={profileData.preferences.roomType}
                              onChange={(e) => handleInputChange("preferences.roomType", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            >
                              <option value="">Select type</option>
                              <option value="single">Single</option>
                              <option value="double">Double</option>
                              <option value="triple">Triple</option>
                              <option value="any">Any</option>
                            </select>
                          ) : (
                            <p className="text-gray-900 py-3 font-medium capitalize">
                              {profileData.preferences.roomType || "Not specified"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Range</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileData.preferences.budget}
                              onChange={(e) => handleInputChange("preferences.budget", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                              placeholder="e.g., ₹5000-₹10000"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium">
                              {profileData.preferences.budget || "Not specified"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Move-in Date</label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={profileData.preferences.moveInDate}
                              onChange={(e) => handleInputChange("preferences.moveInDate", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            />
                          ) : (
                            <p className="text-gray-900 py-3 font-medium">
                              {profileData.preferences.moveInDate || "Flexible"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                          {isEditing ? (
                            <select
                              value={profileData.preferences.duration}
                              onChange={(e) => handleInputChange("preferences.duration", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            >
                              <option value="">Select duration</option>
                              <option value="1-3months">1-3 months</option>
                              <option value="3-6months">3-6 months</option>
                              <option value="6-12months">6-12 months</option>
                              <option value="1year+">1 year+</option>
                            </select>
                          ) : (
                            <p className="text-gray-900 py-3 font-medium">
                              {profileData.preferences.duration || "Not specified"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Lifestyle</label>
                          {isEditing ? (
                            <select
                              value={profileData.preferences.lifestyle}
                              onChange={(e) => handleInputChange("preferences.lifestyle", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            >
                              <option value="">Select lifestyle</option>
                              <option value="quiet">Quiet & Studious</option>
                              <option value="social">Social & Active</option>
                              <option value="balanced">Balanced</option>
                            </select>
                          ) : (
                            <p className="text-gray-900 py-3 font-medium">
                              {profileData.preferences.lifestyle || "Not specified"}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Food Preference</label>
                          {isEditing ? (
                            <select
                              value={profileData.preferences.foodPreference}
                              onChange={(e) => handleInputChange("preferences.foodPreference", e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                            >
                              <option value="">Select preference</option>
                              <option value="vegetarian">Vegetarian</option>
                              <option value="non-vegetarian">Non-Vegetarian</option>
                              <option value="vegan">Vegan</option>
                              <option value="any">Any</option>
                            </select>
                          ) : (
                            <p className="text-gray-900 py-3 font-medium capitalize">
                              {profileData.preferences.foodPreference || "Not specified"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <Activity className="w-6 h-6 mr-2 text-red-600" />
                        Recent Activity
                      </h2>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">New booking created</p>
                            <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Heart className="w-5 h-5 text-pink-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Added property to favorites</p>
                            <p className="text-xs text-gray-500 mt-1">5 days ago</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Profile verified</p>
                            <p className="text-xs text-gray-500 mt-1">1 week ago</p>
                          </div>
                        </div>

                        {stats.bookings === 0 && stats.favorites === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No recent activity</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <Shield className="w-6 h-6 mr-2 text-red-600" />
                        Security Settings
                      </h2>

                      <div className="space-y-6">
                        <div className="p-6 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Password</h3>
                              <p className="text-sm text-gray-600 mt-1">Last changed 30 days ago</p>
                            </div>
                            <button
                              onClick={() => setShowPasswordModal(true)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Change Password
                            </button>
                          </div>
                        </div>

                        <div className="p-6 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Email Verification</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {profileData.isVerified ? 'Your email is verified' : 'Please verify your email'}
                              </p>
                            </div>
                            <div className={`px-4 py-2 rounded-lg ${profileData.isVerified
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                              }`}>
                              {profileData.isVerified ? 'Verified' : 'Pending'}
                            </div>
                          </div>
                        </div>

                        <div className="p-6 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
                              <p className="text-sm text-gray-600 mt-1">Add an extra layer of security</p>
                            </div>
                            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                              Enable
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Trust Score</h3>
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="#10b981"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 40 * (stats.trustScore / 100)} ${2 * Math.PI * 40}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-2xl font-bold text-gray-900">{stats.trustScore}</span>
                      </div>
                      <p className="text-sm font-medium text-green-600">Excellent Profile</p>
                      <p className="text-xs text-gray-500 mt-1">Keep up the great work!</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Completion</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Basic Info</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Contact Details</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Preferences</span>
                        {profileData.preferences.roomType ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Verification</span>
                        {profileData.isVerified ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">85% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="text-center mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saveStatus.type === 'loading'}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saveStatus.type === 'loading' ? 'Saving...' : 'Save All Changes'}</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Status Messages */}
            {saveStatus.message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-xl shadow-lg ${saveStatus.type === 'success'
                  ? 'bg-green-100 border border-green-300 text-green-800'
                  : saveStatus.type === 'error'
                    ? 'bg-red-100 border border-red-300 text-red-800'
                    : 'bg-blue-100 border border-blue-300 text-blue-800'
                  }`}
              >
                {saveStatus.message}
              </motion.div>
            )}

            {/* Password Modal */}
            {showPasswordModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl p-8 max-w-md w-full"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Change Password</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                          className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                          placeholder="Enter current password"
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('current')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                          className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                          placeholder="Enter new password"
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('new')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                          className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
                          placeholder="Confirm new password"
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('confirm')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300">Cancel</button>
                      <button onClick={handlePasswordUpdate} disabled={saveStatus.type === 'loading'} className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50">
                        {saveStatus.type === 'loading' ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </SeekerLayout>
  );
};

export default EnhancedSeekerProfile;

