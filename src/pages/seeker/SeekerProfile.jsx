```javascript
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Edit, Save, X, User, MapPin, Phone, Mail, Calendar, Shield, AlertCircle, Camera, Lock, Eye, EyeOff } from "lucide-react";
import apiClient from "../../utils/apiClient";
import ProfilePictureUpload from "../../components/ProfilePictureUpload";
import SeekerLayout from "../../components/seeker/SeekerLayout";

const SeekerProfile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    age: "",
    occupation: "",
    gender: "",
    joinDate: "",
    bio: "",
    isVerified: false,
    trustScore: 0,
    profilePicture: ""
  });

  const isProfileComplete = (p) => {
    if (!p) return false;
    const hasPhone = Boolean(p.phone);
    const hasAge = !(p.age === undefined || p.age === null || p.age === "") && Number(p.age) > 0;
    const hasOccupation = Boolean(p.occupation);
    const hasGender = Boolean(p.gender);
    return hasPhone && hasAge && hasOccupation && hasGender;
  };

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
          console.error('SeekerProfile: Error parsing user data:', parseError);
          setError('Failed to load user data. Please log in again.');
          setLoading(false);
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        // Only seekers are allowed here; others are redirected by wrapper routes as well
        if (parsedUser.role !== 1) {
          console.warn('SeekerProfile: User role mismatch, redirecting');
          navigate("/login");
          return;
        }

        setUser(parsedUser);

        // Debug logging
        console.log('SeekerProfile: Loading user data from localStorage:', {
          id: parsedUser._id,
          name: parsedUser.name,
          age: parsedUser.age,
          gender: parsedUser.gender,
          phone: parsedUser.phone,
          occupation: parsedUser.occupation
        });

        // Check if we need to fetch fresh data from API
        const shouldFetchFreshData = !parsedUser.age || !parsedUser.gender || !parsedUser.phone || !parsedUser.occupation;
        console.log('SeekerProfile: Should fetch fresh data from API:', shouldFetchFreshData);
        console.log('SeekerProfile: Missing fields:', {
          age: !parsedUser.age,
          gender: !parsedUser.gender,
          phone: !parsedUser.phone,
          occupation: !parsedUser.occupation
        });

        // If localStorage data is incomplete, fetch fresh data from API
        if (shouldFetchFreshData) {
          try {
            console.log('SeekerProfile: Fetching fresh user data from API...');
            // Replace fetch with apiClient.get
            const response = await apiClient.get(`/ user / profile / ${ parsedUser._id } `);
            const freshData = response.data; // Assuming apiClient returns data directly or in a 'data' field

            if (freshData) { // Check if freshData is valid
              console.log('SeekerProfile: Fresh data from API:', freshData);

              // Update localStorage with fresh data
              const updatedUser = { ...parsedUser, ...freshData };
              localStorage.setItem("user", JSON.stringify(updatedUser));
              setUser(updatedUser);

              // Use fresh data for profileData
              setProfileData(prev => ({
                ...prev,
                name: freshData.name || "",
                email: freshData.email || "",
                profilePicture: freshData.profilePicture || "",
                phone: freshData.phone || "",
                location: freshData.location || "",
                age: freshData.age || "",
                occupation: freshData.occupation || "",
                gender: freshData.gender || "",
                bio: freshData.bio || "",
                isVerified: freshData.isVerified || false,
                trustScore: 95,
                joinDate: freshData.createdAt
                  ? new Date(freshData.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "Recently"
              }));

              // Check profile completion with fresh data
              const needsCompletion = [
                !freshData.phone,
                (freshData.age === undefined || freshData.age === null || freshData.age === ""),
                !freshData.occupation,
                !freshData.gender,
              ].some(Boolean);

              console.log('SeekerProfile: Profile completion check with fresh data:', {
                phone: freshData.phone,
                age: freshData.age,
                occupation: freshData.occupation,
                gender: freshData.gender,
                needsCompletion
              });

              if (needsCompletion) {
                setIsEditing(true);
                setShowCompletionModal(true);
              }
            } else {
              console.error('SeekerProfile: Failed to fetch fresh data from API');
              // Fall back to localStorage data
              setProfileData(prev => ({
                ...prev,
                name: parsedUser.name || "",
                email: parsedUser.email || "",
                profilePicture: parsedUser.profilePicture || "",
                phone: parsedUser.phone || "",
                location: parsedUser.location || "",
                age: parsedUser.age || "",
                occupation: parsedUser.occupation || "",
                gender: parsedUser.gender || "",
                bio: parsedUser.bio || "",
                isVerified: parsedUser.isVerified || false,
                trustScore: 95,
                joinDate: parsedUser.createdAt
                  ? new Date(parsedUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "Recently"
              }));

              // Check profile completion with localStorage data
              const needsCompletion = [
                !parsedUser.phone,
                (parsedUser.age === undefined || parsedUser.age === null || parsedUser.age === ""),
                !parsedUser.occupation,
                !parsedUser.gender,
              ].some(Boolean);

              if (needsCompletion) {
                setIsEditing(true);
                setShowCompletionModal(true);
              }
            }
          } catch (error) {
            console.error('SeekerProfile: Error fetching fresh data:', error);
            // Fall back to localStorage data
            setProfileData(prev => ({
              ...prev,
              name: parsedUser.name || "",
              email: parsedUser.email || "",
              profilePicture: parsedUser.profilePicture || "",
              phone: parsedUser.phone || "",
              location: parsedUser.location || "",
              age: parsedUser.age || "",
              occupation: parsedUser.occupation || "",
              gender: parsedUser.gender || "",
              bio: parsedUser.bio || "",
              isVerified: parsedUser.isVerified || false,
              trustScore: 95,
              joinDate: parsedUser.createdAt
                ? new Date(parsedUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "Recently"
            }));

            // Check profile completion with localStorage data
            const needsCompletion = [
              !parsedUser.phone,
              (parsedUser.age === undefined || parsedUser.age === null || parsedUser.age === ""),
              !parsedUser.occupation,
              !parsedUser.gender,
            ].some(Boolean);

            if (needsCompletion) {
              setIsEditing(true);
              setShowCompletionModal(true);
            }
          }
        } else {
          // Use localStorage data directly
          setProfileData(prev => ({
            ...prev,
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            profilePicture: parsedUser.profilePicture || "",
            phone: parsedUser.phone || "",
            location: parsedUser.location || "",
            age: parsedUser.age || "",
            occupation: parsedUser.occupation || "",
            gender: parsedUser.gender || "",
            bio: parsedUser.bio || "",
            isVerified: parsedUser.isVerified || false,
            trustScore: 95,
            joinDate: parsedUser.createdAt
              ? new Date(parsedUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : "Recently"
          }));

          // Check profile completion with localStorage data
          const needsCompletion = [
            !parsedUser.phone,
            (parsedUser.age === undefined || parsedUser.age === null || parsedUser.age === ""),
            !parsedUser.occupation,
            !parsedUser.gender,
          ].some(Boolean);

          console.log('SeekerProfile: Profile completion check with localStorage data:', {
            phone: parsedUser.phone,
            age: parsedUser.age,
            occupation: parsedUser.occupation,
            gender: parsedUser.gender,
            needsCompletion
          });

          if (needsCompletion) {
            setIsEditing(true);
            setShowCompletionModal(true);
          }
        }

        // Note: Profile completion check will be done after fresh data fetch if needed
      } catch (error) {
        console.error('SeekerProfile: Error in fetchUserData:', error);
        setError(`An error occurred: ${ error.message } `);
        setUser(null);
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
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

      // Validate mandatory fields
      const errors = {};
      const phoneRegex = /^\+?[0-9]{7,14}$/;
      if (!profileData.phone || !phoneRegex.test(String(profileData.phone).trim())) {
        errors.phone = 'Enter a valid phone number (7-14 digits).';
      }
      const ageNum = Number(profileData.age);
      if (!profileData.age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        errors.age = 'Age must be a number between 1 and 120.';
      }
      if (!profileData.occupation || String(profileData.occupation).trim().length < 2) {
        errors.occupation = 'Occupation is required.';
      }
      if (!profileData.gender || !['male', 'female', 'other'].includes(String(profileData.gender))) {
        errors.gender = 'Select a gender option.';
      }

      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setSaveStatus({ type: "error", message: "Please fix the highlighted fields." });
        return;
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const updatePayload = {
        name: profileData.name,
        phone: profileData.phone,
        // location removed from mandatory updates
        age: profileData.age ? Number(profileData.age) : null,
        occupation: profileData.occupation,
        gender: profileData.gender || null,
        bio: profileData.bio
      };

      console.log('SeekerProfile: Sending update payload:', updatePayload);
      console.log('SeekerProfile: User ID being used:', user._id);
      
      const response = await apiClient.put(`/ user / profile / ${ user._id } `, updatePayload);
      const result = response.data;
      console.log('SeekerProfile: API response:', result);

      const currentUser = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...currentUser, ...result.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Update profileData state with the new values
      setProfileData(prev => ({
        ...prev,
        name: result.user.name || "",
        email: result.user.email || "",
        profilePicture: result.user.profilePicture || "",
        phone: result.user.phone || "",
        location: result.user.location || "",
        age: result.user.age || "",
        occupation: result.user.occupation || "",
        gender: result.user.gender || "",
        bio: result.user.bio || "",
        isVerified: result.user.isVerified || false
      }));

      console.log('SeekerProfile: Updated profileData:', {
        age: result.user.age,
        gender: result.user.gender,
        phone: result.user.phone,
        occupation: result.user.occupation
      });

      setIsEditing(false);
      setSaveStatus({ type: "success", message: "Profile updated successfully!" });
      window.dispatchEvent(new Event("lyvo-profile-update"));
      if (isProfileComplete({
        phone: result.user.phone,
        age: result.user.age,
        occupation: result.user.occupation,
        gender: result.user.gender,
      })) {
        setShowCompletionModal(false);
      }
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

      await apiClient.post(`/ user / change - password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSaveStatus({ type: "success", message: "Password updated successfully!" });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message || "Failed to update password" });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    }
  };

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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="relative h-48 bg-gradient-to-r from-red-500/10 via-red-600/10 to-red-700/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
                  <div className="absolute bottom-6 left-8 flex items-end space-x-6">
                    <div className="relative group">
                      <ProfilePictureUpload
                        currentImage={profileData.profilePicture}
                        onImageUpdate={handleProfilePictureUpdate}
                        className="w-24 h-24"
                      />
                      {profileData.isVerified && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-gray-900 pb-2">
                      <h1 className="text-3xl font-bold mb-1">{profileData.name || 'User'}</h1>
                      <p className="text-gray-600 flex items-center space-x-2">
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
                      className="bg-white/90 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-xl font-medium flex items-center space-x-2 shadow-lg hover:bg-white transition-all duration-300"
                    >
                      {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                      <span>{isEditing ? "Cancel" : "Edit"}</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                          <Shield className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      </div>
                    </div>

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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                        {isEditing ? (
                          <select
                            value={profileData.gender}
                            onChange={(e) => handleInputChange("gender", e.target.value)}
                            className={`w - full px - 4 py - 3 border rounded - xl focus: outline - none focus: ring - 2 transition - all duration - 300 ${ fieldErrors.gender ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500' } `}
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <p className="text-gray-900 py-3 font-medium">{profileData.gender ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1) : "Not provided"}</p>
                        )}
                        {isEditing && fieldErrors.gender && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.gender}</p>
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
                            className={`w - full px - 4 py - 3 border rounded - xl focus: outline - none focus: ring - 2 transition - all duration - 300 ${ fieldErrors.phone ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500' } `}
                          />
                        ) : (
                          <p className="text-gray-900 py-3 font-medium flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {profileData.phone || "Not provided"}
                          </p>
                        )}
                        {isEditing && fieldErrors.phone && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                        )}
                      </div>

                      {/* Location field removed per requirement */}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={profileData.age}
                            onChange={(e) => handleInputChange("age", e.target.value)}
                            className={`w - full px - 4 py - 3 border rounded - xl focus: outline - none focus: ring - 2 transition - all duration - 300 ${ fieldErrors.age ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500' } `}
                            placeholder="Your age"
                          />
                        ) : (
                          <p className="text-gray-900 py-3 font-medium">{profileData.age || "Not provided"}</p>
                        )}
                        {isEditing && fieldErrors.age && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.age}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.occupation}
                            onChange={(e) => handleInputChange("occupation", e.target.value)}
                            className={`w - full px - 4 py - 3 border rounded - xl focus: outline - none focus: ring - 2 transition - all duration - 300 ${ fieldErrors.occupation ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500' } `}
                            placeholder="e.g., Student, Software Engineer"
                          />
                        ) : (
                          <p className="text-gray-900 py-3 font-medium">{profileData.occupation || "Not provided"}</p>
                        )}
                        {isEditing && fieldErrors.occupation && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.occupation}</p>
                        )}
                      </div>
                    </div>

                    {/* Bio field removed per requirement */}
                  </div>
                </motion.div>

              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Trust Score</h3>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-white">{profileData.trustScore}</span>
                      </div>
                      <p className="text-sm text-gray-600">Excellent Profile</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Change Password</span>
                      </button>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>

            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="text-center mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saveStatus.type === 'loading'}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saveStatus.type === 'loading' ? 'Saving...' : 'Save Changes'}</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {saveStatus.message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`fixed top - 20 right - 4 z - 50 px - 6 py - 3 rounded - xl shadow - lg ${
  saveStatus.type === 'success'
    ? 'bg-green-100 border border-green-300 text-green-800'
    : saveStatus.type === 'error'
      ? 'bg-red-100 border border-red-300 text-red-800'
      : 'bg-blue-100 border border-blue-300 text-blue-800'
} `}
              >
                {saveStatus.message}
              </motion.div>
            )}

            {showCompletionModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl p-6 max-w-md w-full border border-blue-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Complete your profile to continue</h3>
                      <p className="text-sm text-gray-600 mt-1">Phone, Age, Occupation, and Gender are required.</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                      {!profileData.phone && (<li>Phone Number is missing</li>)}
                      {(profileData.age === undefined || profileData.age === null || profileData.age === "") && (<li>Age is missing</li>)}
                      {!profileData.occupation && (<li>Occupation is missing</li>)}
                      {!profileData.gender && (<li>Gender is missing</li>)}
                    </ul>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => { setIsEditing(true); setShowCompletionModal(false); }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Edit Now
                    </button>
                    <button
                      disabled={!isProfileComplete(profileData)}
                      onClick={() => setShowCompletionModal(false)}
                      className={`flex - 1 px - 4 py - 2 rounded - lg ${ isProfileComplete(profileData) ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed' } `}
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

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

export default SeekerProfile;


