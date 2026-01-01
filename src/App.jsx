import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Chatbot from "./components/Chatbot";

import { Toaster } from "./components/ui/toaster";
import Home from "./pages/Home";
import { getUserFromStorage, getAuthToken, getUserRole, isPathAllowedForUser, getRedirectUrl } from "./utils/authUtils";
import { setupErrorSuppression } from "./utils/errorHandler";

import Profile from "./pages/Profile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RoomOwnerSignup from "./pages/RoomOwnerSignup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";
import DebugLogout from "./pages/DebugLogout";
import Onboarding from "./pages/Onboarding";
import Loader from "./components/Loader";
import RoleRepairProvider from "./components/RoleRepairProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import RoomOwnerDashboard from "./pages/owner/RoomOwnerDashboard";
// Import seeker pages and components
import SeekerDashboard from "./pages/seeker/SeekerDashboard";
import SeekerFavorites from "./pages/seeker/SeekerFavorites";
import SeekerBookings from "./pages/seeker/SeekerBookings";
import SeekerOnboarding from "./pages/seeker/SeekerOnboarding";
import SeekerProfile from "./pages/seeker/SeekerProfile";
import SeekerPropertyDetails from "./pages/seeker/SeekerPropertyDetails";
import SeekerDashboardDetails from "./pages/seeker/SeekerDashboardDetails";
import PostBookingDashboard from "./pages/seeker/PostBookingDashboard";
import BasicRoomDashboard from "./pages/seeker/BasicRoomDashboard";
import SeekerRoomDetails from "./pages/seeker/SeekerRoomDetails";
import RoomDebug from "./pages/seeker/RoomDebug";
import KycUpload from "./pages/seeker/KycUpload";

import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantPayments from "./pages/tenant/TenantPayments";
import TenantMaintenance from "./pages/tenant/TenantMaintenance";
import TenantAgreement from "./pages/tenant/TenantAgreement";
import TenantDetails from "./pages/tenant/TenantDetails";
import ExpenseSplit from "./pages/tenant/ExpenseSplit";
// Import owner pages and components
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerProperties from "./pages/owner/Properties";
import PropertyDetails from "./pages/owner/PropertyDetails";
import AddProperty from "./pages/owner/AddProperty";

import KycRequired from "./pages/owner/KycRequired";
// Import admin pages and components
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOwners from "./pages/admin/Owners";
import AdminSeekers from "./pages/admin/Seekers";
import AllUsers from "./pages/admin/AllUsers";
import AddAdmin from "./pages/admin/AddAdmin";
import AdminProperties from "./pages/admin/Properties";
import AdminPropertyDetails from "./pages/admin/AdminPropertyDetails";
import AdminSettings from "./pages/admin/Settings";
import AdminNotFound from "./pages/admin/NotFound";
import OwnerSettings from "./pages/owner/Settings";
import OwnerBookings from "./pages/owner/Bookings";
import BookingDetails from "./pages/owner/BookingDetails";
import Tenants from "./pages/owner/Tenants";
import EditProperty from "./pages/owner/EditProperty";
import OwnerAnalytics from "./pages/owner/OwnerAnalytics";
import OwnerMaintenance from "./pages/owner/OwnerMaintenance";
import OwnerPayments from "./pages/owner/OwnerPayments";
import OwnerTenantDetails from "./pages/owner/OwnerTenantDetails";

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Global Logout Handler
  useEffect(() => {
    const handleLogout = () => {
      console.log('Global Logout Triggered');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    };

    window.addEventListener('lyvo-logout', handleLogout);
    return () => window.removeEventListener('lyvo-logout', handleLogout);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          const userData = JSON.parse(user);
          console.log('ProtectedAdminRoute: User role check:', userData.role);

          // Check if user has admin role (role === 2)
          if (userData.role === 2) {
            setIsAuthorized(true);
          } else {
            // Redirect to login if not admin
            console.log('ProtectedAdminRoute: User is not admin, redirecting to login');
            window.location.href = '/login';
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          window.location.href = '/login';
          return;
        }
      } else {
        // Redirect to login if no token
        console.log('ProtectedAdminRoute: No token or user data, redirecting to login');
        window.location.href = '/login';
        return;
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? children : null;
};

// Protected Route Component for Owner
const ProtectedOwnerRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const user = getUserFromStorage();

      if (token && user) {
        const userRole = getUserRole(user);

        // Check if user has owner role (role === 3)
        if (userRole === 3) {
          setIsAuthorized(true);
        } else {
          // Redirect to appropriate dashboard based on role
          const redirectUrl = getRedirectUrl(user);
          window.location.href = redirectUrl;
          return;
        }
      } else {
        // Redirect to login if no token
        window.location.href = '/login';
        return;
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? children : null;
};

// Protected Route Component for Seekers (role === 1)
const ProtectedSeekerRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const user = getUserFromStorage();

      if (token && user) {
        const userRole = getUserRole(user);

        // Check if user has seeker role (role === 1)
        if (userRole === 1) {
          setIsAuthorized(true);
        } else {
          // Redirect to appropriate dashboard based on role
          const redirectUrl = getRedirectUrl(user);
          window.location.href = redirectUrl;
          return;
        }
      } else {
        // Redirect to login if no token
        window.location.href = '/login';
        return;
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? children : null;
};

// Protected Route Component for Regular Users (role === 1)
const ProtectedUserRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          const userData = JSON.parse(user);
          console.log('ProtectedUserRoute: User role check:', userData.role);

          // Check if user has regular user role (role === 1)
          if (userData.role === 1) {
            setIsAuthorized(true);
          } else if (userData.role === 2) {
            // Redirect admin to admin dashboard
            console.log('ProtectedUserRoute: Redirecting admin to admin dashboard');
            window.location.href = '/admin-dashboard';
            return;
          } else if (userData.role === 3) {
            // Redirect owner to owner dashboard
            console.log('ProtectedUserRoute: Redirecting owner to owner dashboard');
            window.location.href = '/owner-dashboard';
            return;
          } else {
            // Redirect to login if role is invalid
            console.log('ProtectedUserRoute: Invalid role, redirecting to login');
            window.location.href = '/login';
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          window.location.href = '/login';
          return;
        }
      } else {
        // Redirect to login if no token
        console.log('ProtectedUserRoute: No token or user data, redirecting to login');
        window.location.href = '/login';
        return;
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? children : null;
};

// Root-level authentication check component - Simplified to prevent loops
const RootAuthCheck = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRootAuth = () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          const userData = JSON.parse(user);
          const currentPath = window.location.pathname;

          console.log('RootAuthCheck: User logged in with role:', userData.role, 'on path:', currentPath);

          // Only redirect if user is on root path and logged in
          if (currentPath === '/') {
            if (userData.role === 2) {
              console.log('RootAuthCheck: Root path - redirecting admin to admin dashboard');
              window.location.href = '/admin-dashboard';
              return;
            } else if (userData.role === 3) {
              console.log('RootAuthCheck: Root path - redirecting owner to owner dashboard');
              window.location.href = '/owner-dashboard';
              return;
            } else if (userData.role === 1) {
              console.log('RootAuthCheck: Root path - redirecting seeker to appropriate page');
              if (userData.isNewUser && !userData.hasCompletedBehaviorQuestions) {
                window.location.href = '/seeker-onboarding';
              } else {
                window.location.href = '/seeker-dashboard';
              }
              return;
            }
          }
        } catch (error) {
          console.error('Error parsing user data in root auth check:', error);
        }
      } else {
        console.log('RootAuthCheck: No user logged in');
      }

      setIsChecking(false);
    };

    checkRootAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return children;
};

function AppRoutesWithLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Check if current route is an admin or owner route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isOwnerRoute = location.pathname.startsWith('/owner');

  return (
    <>
      {loading && <Loader />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Main site routes */}
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={
            <ProtectedSeekerRoute>
              <SeekerDashboard />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker" element={
            <ProtectedSeekerRoute>
              <SeekerDashboard />
            </ProtectedSeekerRoute>
          } />

          {/* Seeker routes - protected with role-based authentication */}
          <Route path="/seeker-dashboard" element={
            <ProtectedSeekerRoute>
              <SeekerDashboard />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker-favorites" element={
            <ProtectedSeekerRoute>
              <SeekerFavorites />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker-bookings" element={
            <ProtectedSeekerRoute>
              <SeekerBookings />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker-onboarding" element={
            <ProtectedSeekerRoute>
              <SeekerOnboarding />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker-profile" element={
            <ErrorBoundary>
              <ProtectedSeekerRoute>
                <SeekerProfile />
              </ProtectedSeekerRoute>
            </ErrorBoundary>
          } />
          <Route path="/seeker/property/:id" element={
            <ProtectedSeekerRoute>
              <SeekerPropertyDetails />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker-dashboard/:propertyId" element={
            <ProtectedSeekerRoute>
              <SeekerDashboardDetails />
            </ProtectedSeekerRoute>
          } />
          <Route path="/my-room" element={
            <ProtectedSeekerRoute>
              <BasicRoomDashboard />
            </ProtectedSeekerRoute>
          } />
          <Route path="/booking-dashboard/:bookingId" element={
            <ProtectedSeekerRoute>
              <PostBookingDashboard />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker/room/:roomId" element={
            <ProtectedSeekerRoute>
              <SeekerRoomDetails />
            </ProtectedSeekerRoute>
          } />
          <Route path="/seeker-kyc" element={
            <ProtectedSeekerRoute>
              <KycUpload />
            </ProtectedSeekerRoute>
          } />

          <Route path="/tenant-dashboard" element={
            <ProtectedSeekerRoute>
              <TenantDashboard />
            </ProtectedSeekerRoute>
          } />
          <Route path="/tenant-payments" element={
            <ProtectedSeekerRoute>
              <TenantPayments />
            </ProtectedSeekerRoute>
          } />
          <Route path="/tenant-maintenance" element={
            <ProtectedSeekerRoute>
              <TenantMaintenance />
            </ProtectedSeekerRoute>
          } />
          <Route path="/tenant-agreement" element={
            <ProtectedSeekerRoute>
              <TenantAgreement />
            </ProtectedSeekerRoute>
          } />
          <Route path="/tenant-roommates" element={
            <ProtectedSeekerRoute>
              <TenantDetails />
            </ProtectedSeekerRoute>
          } />
          <Route path="/tenant-expenses" element={
            <ProtectedSeekerRoute>
              <ExpenseSplit />
            </ProtectedSeekerRoute>
          } />
          <Route path="/debug/rooms" element={
            <ProtectedSeekerRoute>
              <RoomDebug />
            </ProtectedSeekerRoute>
          } />
          <Route path="/profile" element={
            <ProtectedUserRoute>
              <Profile />
            </ProtectedUserRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/room-owner-signup" element={<RoomOwnerSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          <Route path="/debug-logout" element={<DebugLogout />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/room-owner-dashboard" element={
            <ProtectedOwnerRoute>
              <RoomOwnerDashboard />
            </ProtectedOwnerRoute>
          } />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Owner routes - protected with role-based authentication */}
          <Route path="/owner-dashboard" element={
            <ProtectedOwnerRoute>
              <OwnerDashboard />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-properties" element={
            <ProtectedOwnerRoute>
              <OwnerProperties />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-property/:id" element={
            <ProtectedOwnerRoute>
              <PropertyDetails />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-add-property" element={
            <ProtectedOwnerRoute>
              <AddProperty />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-edit-property/:id" element={
            <ProtectedOwnerRoute>
              <EditProperty />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-kyc-required" element={
            <ProtectedOwnerRoute>
              <KycRequired />
            </ProtectedOwnerRoute>
          } />

          <Route path="/owner-bookings" element={
            <ProtectedOwnerRoute>
              <OwnerBookings />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-bookings/:bookingId" element={
            <ProtectedOwnerRoute>
              <BookingDetails />
            </ProtectedOwnerRoute>
          } />
          {/* Owner profile alias -> use settings page */}
          <Route path="/owner-profile" element={
            <ProtectedOwnerRoute>
              <OwnerSettings />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-settings" element={
            <ProtectedOwnerRoute>
              <OwnerSettings />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-tenants" element={
            <ProtectedOwnerRoute>
              <Tenants />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner/tenants/:tenantId" element={
            <ProtectedOwnerRoute>
              <OwnerTenantDetails />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-analytics" element={
            <ProtectedOwnerRoute>
              <OwnerAnalytics />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-maintenance" element={
            <ProtectedOwnerRoute>
              <OwnerMaintenance />
            </ProtectedOwnerRoute>
          } />
          <Route path="/owner-payments" element={
            <ProtectedOwnerRoute>
              <OwnerPayments />
            </ProtectedOwnerRoute>
          } />

          {/* Admin routes - protected with role-based authentication */}
          <Route path="/admin-dashboard" element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-users" element={
            <ProtectedAdminRoute>
              <AllUsers />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-add-admin" element={
            <ProtectedAdminRoute>
              <AddAdmin />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-owners" element={
            <ProtectedAdminRoute>
              <AdminOwners />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-seekers" element={
            <ProtectedAdminRoute>
              <AdminSeekers />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-properties" element={
            <ProtectedAdminRoute>
              <AdminProperties />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-property-details/:propertyId" element={
            <ProtectedAdminRoute>
              <AdminPropertyDetails />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin-settings" element={
            <ProtectedAdminRoute>
              <AdminSettings />
            </ProtectedAdminRoute>
          } />

          {/* Admin 404 - catch all admin routes that don't match */}
          <Route path="/admin/*" element={<AdminNotFound />} />

          {/* Main site 404 - catch all other routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

function AppContent() {
  const location = useLocation();

  // Check if current route is an admin, owner, or seeker route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isOwnerRoute = location.pathname.startsWith('/owner');
  const isSeekerRoute = location.pathname.startsWith('/seeker') ||
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/seeker/room/') ||
    location.pathname.startsWith('/booking-dashboard/') ||
    location.pathname.startsWith('/seeker-dashboard') ||
    location.pathname === '/my-room' ||
    location.pathname === '/tenant-dashboard' ||
    location.pathname === '/tenant-payments' ||
    location.pathname === '/tenant-maintenance' ||
    location.pathname === '/tenant-agreement' ||
    location.pathname === '/tenant-roommates' ||
    location.pathname === '/tenant-expenses';

  // Global authentication check - Simplified to prevent loops
  useEffect(() => {
    const checkGlobalAuth = () => {
      const token = getAuthToken();
      const user = getUserFromStorage();

      if (token && user) {
        const currentPath = location.pathname;
        const userRole = getUserRole(user);

        // Global auth check - only redirect seekers away from admin/owner routes

        // Only redirect if user is on a route that doesn't match their role
        if (userRole === 1 && (currentPath.startsWith('/admin') || currentPath.startsWith('/owner'))) {
          // Regular user on admin/owner route - redirect to user dashboard
          window.location.href = '/dashboard';
          return;
        }
      }
    };

    checkGlobalAuth();
  }, [location.pathname]);

  return (
    <div className="App min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Only render main Navbar and Footer for non-admin, non-owner, and non-seeker routes */}
      {!isAdminRoute && !isOwnerRoute && !isSeekerRoute && <Navbar />}

      <AppRoutesWithLoader />
      {!isAdminRoute && !isOwnerRoute && !isSeekerRoute && <Footer />}
      {/* Only render Chatbot for non-admin, non-owner, and non-seeker routes */}
      {!isAdminRoute && !isOwnerRoute && !isSeekerRoute && <Chatbot />}
      <Toaster />
    </div>
  );
}

function App() {
  // Setup error suppression for common harmless errors
  useEffect(() => {
    setupErrorSuppression();
  }, []);

  return (
    <BrowserRouter>
      <RoleRepairProvider>
        <RootAuthCheck>
          <AppContent />
        </RootAuthCheck>
      </RoleRepairProvider>
    </BrowserRouter>
  );
}

export default App; 