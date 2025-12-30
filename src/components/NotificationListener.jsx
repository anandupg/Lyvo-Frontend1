import React, { useEffect } from 'react';
import chatService from '../services/chatService';
import { getAuthToken } from '../utils/authUtils';

/**
 * Global component to listen for socket notifications
 * and dispatch window events for Navbar/Toasts
 */
const NotificationListener = () => {
    useEffect(() => {
        const token = getAuthToken();

        if (token) {
            // Ensure socket is connected
            if (!chatService.isConnected) {
                chatService.connect(token);
            }

            // Handler for new notifications
            const handleNotification = (data) => {
                console.log('🔔 New notification received via socket:', data);
                // Dispatch window event for Navbars to pick up
                window.dispatchEvent(new CustomEvent('new-notification', { detail: data }));
            };

            // Subscribe to socket event
            chatService.on('new_notification', handleNotification);

            // Cleanup
            return () => {
                chatService.off('new_notification', handleNotification);
                // We don't disconnect here because chatService might be used by other components
                // check_notifications.js showed persistence works, so this closes the loop.
            };
        }
    }, []);

    return null; // Renderless component
};

export default NotificationListener;
