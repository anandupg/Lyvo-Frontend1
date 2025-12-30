import { useState, useEffect, useCallback, useRef } from 'react';

export const useBookingStatus = () => {
  const [hasConfirmedBooking, setHasConfirmedBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasChecked = useRef(false);

  const checkBookingStatus = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (hasChecked.current && loading) {
      console.log('Booking status check already in progress, skipping...');
      return;
    }
    hasChecked.current = true;
    try {
      setLoading(true);
      setError(null);

      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || user._id || user.userId;

      if (!userId) {
        console.log('No user ID found');
        setHasConfirmedBooking(false);
        setLoading(false);
        return;
      }

      // Fetch user bookings with timeout
      const baseUrl = import.meta.env.VITE_PROPERTY_SERVICE_API_URL || 'http://localhost:3003';

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const token = localStorage.getItem('authToken');

      try {
        const response = await fetch(`${baseUrl}/user/bookings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch bookings: ${response.status}`);
        }

        const data = await response.json();
        const bookings = data.bookings || [];

        // Check if user has any confirmed bookings
        const confirmedBookings = bookings.filter(booking =>
          booking.status === 'confirmed' &&
          booking.payment?.paymentStatus === 'completed'
        );

        setHasConfirmedBooking(confirmedBookings.length > 0);

        // Only log if there are bookings (reduce console noise)
        if (bookings.length > 0) {
          console.log('Booking status check:', {
            totalBookings: bookings.length,
            confirmedBookings: confirmedBookings.length,
            hasConfirmedBooking: confirmedBookings.length > 0
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('Booking status check timed out - continuing without booking data');
        } else {
          throw fetchError;
        }
      }

    } catch (err) {
      console.error('Error checking booking status:', err);
      setError(err.message);
      setHasConfirmedBooking(false);
    } finally {
      setLoading(false);
      hasChecked.current = false; // Reset for future checks
    }
  }, []); // Empty dependency array since we're using refs and state setters

  useEffect(() => {
    checkBookingStatus();
  }, [checkBookingStatus]);

  // Function to refresh booking status (useful after booking changes)
  const refreshBookingStatus = useCallback(() => {
    hasChecked.current = false; // Reset check flag
    checkBookingStatus();
  }, [checkBookingStatus]);

  return {
    hasConfirmedBooking,
    loading,
    error,
    refreshBookingStatus
  };
};
