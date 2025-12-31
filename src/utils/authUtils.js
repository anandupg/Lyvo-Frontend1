// Authentication utility functions
import { autoRepairUserRole } from './roleRepair';

/**
 * Get user role as a number, handling both string and number types
 * @param {Object} user - User object from localStorage
 * @returns {number} - User role as number (1=seeker, 2=admin, 3=owner)
 */
export const getUserRole = (user) => {
  if (!user) return null;

  const role = user.role;

  // Handle undefined/null role
  if (role === undefined || role === null) {
    console.warn('User role is undefined/null, attempting to determine from email or other data');

    // Try to determine role from email or other indicators
    if (user.email && user.email.includes('admin')) {
      return 2; // Admin
    } else if (user.email && (user.email.includes('owner') || user.email.includes('property'))) {
      return 3; // Owner
    } else {
      // Default to seeker if we can't determine
      console.warn('Could not determine user role, defaulting to seeker (1)');
      return 1; // Seeker
    }
  }

  if (typeof role === 'string') {
    return parseInt(role, 10);
  }
  return role;
};

/**
 * Check if user has a specific role
 * @param {Object} user - User object from localStorage
 * @param {number} expectedRole - Expected role number
 * @returns {boolean} - True if user has the expected role
 */
export const hasRole = (user, expectedRole) => {
  const userRole = getUserRole(user);
  return userRole === expectedRole;
};

/**
 * Check if user is admin (role === 2)
 * @param {Object} user - User object from localStorage
 * @returns {boolean}
 */
export const isAdmin = (user) => hasRole(user, 2);

/**
 * Check if user is owner (role === 3)
 * @param {Object} user - User object from localStorage
 * @returns {boolean}
 */
export const isOwner = (user) => hasRole(user, 3);

/**
 * Check if user is seeker (role === 1)
 * @param {Object} user - User object from localStorage
 * @returns {boolean}
 */
export const isSeeker = (user) => hasRole(user, 1);

/**
 * Get user data from localStorage with error handling (synchronous)
 * @returns {Object|null} - User object or null if not found/invalid
 */
export const getUserFromStorage = () => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;

    const userData = JSON.parse(user);

    // Validate user data structure
    if (!userData || typeof userData !== 'object') {
      console.error('Invalid user data in localStorage');
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
};

/**
 * Get user data from localStorage with error handling and auto role repair (async)
 * @returns {Promise<Object|null>} - User object or null if not found/invalid
 */
export const getUserFromStorageWithRepair = async () => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;

    const userData = JSON.parse(user);

    // Validate user data structure
    if (!userData || typeof userData !== 'object') {
      console.error('Invalid user data in localStorage');
      return null;
    }

    // Auto-repair role if needed
    const repairedUser = await autoRepairUserRole(userData);
    return repairedUser;
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
};

/**
 * Get auth token from localStorage
 * @returns {string|null} - Auth token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user has valid token and user data
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  const user = getUserFromStorage();
  return !!(token && user);
};

/**
 * Get redirect URL based on user role
 * @param {Object} user - User object
 * @returns {string} - Redirect URL
 */
export const getRedirectUrl = (user) => {
  const userRole = getUserRole(user);

  console.log('getRedirectUrl: Processing user:', {
    userRole: userRole,
    userRoleType: typeof userRole,
    isNewUser: user?.isNewUser,
    hasCompletedBehaviorQuestions: user?.hasCompletedBehaviorQuestions,
    userEmail: user?.email,
    rawUser: user
  });

  switch (userRole) {
    case 2: // Admin
      console.log('getRedirectUrl: Redirecting admin to /admin-dashboard');
      return '/admin-dashboard';
    case 3: // Owner
      console.log('getRedirectUrl: Redirecting owner to /owner-dashboard');
      return '/owner-dashboard';
    case 1: // Seeker
      // If user is pending behavioral questions, send to onboarding
      if (user.isNewUser && !user.hasCompletedBehaviorQuestions) {
        console.log('getRedirectUrl: Redirecting new seeker to /seeker-onboarding');
        return '/seeker-onboarding';
      }

      // If user is a tenant with active booking, send to tenant dashboard
      if (user.isTenant) {
        console.log('getRedirectUrl: User is an active tenant, redirecting to /tenant-dashboard');
        return '/tenant-dashboard';
      }

      console.log('getRedirectUrl: Redirecting seeker to /seeker-dashboard');
      return '/seeker-dashboard';
    default:
      console.log('getRedirectUrl: Unknown role, redirecting to /login');
      return '/login';
  }
};

/**
 * Check if current path matches user role
 * @param {string} pathname - Current pathname
 * @param {Object} user - User object
 * @returns {boolean} - True if path matches user role
 */
export const isPathAllowedForUser = (pathname, user) => {
  const userRole = getUserRole(user);

  switch (userRole) {
    case 2: // Admin
      return pathname.startsWith('/admin');
    case 3: // Owner
      return pathname.startsWith('/owner');
    case 1: // Seeker
      return pathname.startsWith('/seeker') ||
        pathname === '/dashboard' ||
        pathname.startsWith('/seeker/room/') ||
        pathname.startsWith('/booking-dashboard/') ||
        pathname.startsWith('/seeker-dashboard') ||
        pathname === '/my-room';
    default:
      return false;
  }
};

/**
 * Debug user data for troubleshooting
 * @param {Object} user - User object
 * @returns {Object} - Debug information
 */
export const debugUserData = (user) => {
  return {
    hasUser: !!user,
    userRole: user?.role,
    userRoleType: typeof user?.role,
    userRoleAsNumber: getUserRole(user),
    userEmail: user?.email,
    userName: user?.name,
    isAdmin: isAdmin(user),
    isOwner: isOwner(user),
    isSeeker: isSeeker(user),
    rawUserData: user
  };
};
