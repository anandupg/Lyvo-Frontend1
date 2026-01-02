import React, { useEffect } from 'react';
import chatService from '../services/chatService';
import { getAuthToken } from '../utils/authUtils';

import { useToast } from '../hooks/use-toast';

/**
 * Global component to listen for socket notifications
 * and dispatch window events for Navbar/Toasts
 */
const NotificationListener = () => {
    const { toast } = useToast();

    useEffect(() => {
        const checkAndConnect = () => {
            const token = getAuthToken();
            if (token) {
                console.log('🔄 NotificationListener: Token found, checking connection...');
                if (!chatService.isConnected) {
                    console.log('🔌 NotificationListener: Connecting chatService...');
                    chatService.connect(token);
                }

                // Handler for new notifications
                const handleNotification = (data) => {
                    console.log('🔔 New notification received via socket:', data);

                    // Show toast notification for better UX
                    toast({
                        title: data.title || 'New Notification',
                        description: data.message || 'You have a new message',
                        duration: 5000,
                    });

                    // Dispatch window event for Navbars to pick up
                    window.dispatchEvent(createNotificationEvent(data));
                };

                // Subscribe to socket event
                chatService.on('new_notification', handleNotification);

                return () => {
                    chatService.off('new_notification', handleNotification);
                };
            }
        };

        const createNotificationEvent = (data) => new CustomEvent('new-notification', { detail: data });

        // Initial check
        const cleanup = checkAndConnect();

        // Listen for login/logout to re-eval
        const handleAuthChange = () => {
            console.log('🔐 Auth change detected in NotificationListener');
            checkAndConnect();
        };

        window.addEventListener('lyvo-login', handleAuthChange);
        window.addEventListener('lyvo-logout', () => {
            console.log('🚪 Logout detected, disconnecting chatService');
            chatService.disconnect();
        });

        return () => {
            if (cleanup) cleanup();
            window.removeEventListener('lyvo-login', handleAuthChange);
            window.removeEventListener('lyvo-logout', handleAuthChange);
        };
    }, []);

    return null; // Renderless component
};

export default NotificationListener;
