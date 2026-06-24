import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { multiChannelWebSocket } from '@/lib/multi-channel-websocket';
import { notificationService } from '@/lib/notification-service';
import { queryClient } from '@/lib/queryClient';
import { getWebSocketUrl } from '@/lib/config';

export const useNotificationWebSocket = () => {
    const { user } = useAuth();
    const channelName = 'notifications';

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        // Add the notifications channel to the multi-channel WebSocket
        multiChannelWebSocket.addChannel({
            name: channelName,
            url: getWebSocketUrl({
                token,
                channel: 'notifications'
            }),
            autoReconnect: true,
            reconnectInterval: 3000,
            maxReconnectAttempts: 5
        });

        // Add message handler for notifications
        const handleMessage = async (message: any) => {
            console.log('Notification WebSocket received message:', message);
            
            if (message.type === 'notification') {
                const notificationData = message.data;
                const title = notificationData.title;
                const notificationMessage = notificationData.message;
                const type = notificationData.type;
                const priority = notificationData.priority || 'medium';
                const notificationId = notificationData.id;
                
                // Show browser notification
                const notificationOptions = {
                    body: notificationMessage || 'You have a new notification',
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: type,
                    requireInteraction: priority === 'high' || priority === 'urgent',
                    silent: false
                };
                
                notificationService.showNotification(title, notificationOptions);

                // Refresh the notification list to show the new notification in the UI
                await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });

                console.log('Real-time notification received and notification list refreshed:', { title, message: notificationMessage, type, notificationId });
            }
        };

        // Add connection handler
        const handleConnectionChange = (connected: boolean) => {
            console.log(`Notification WebSocket ${connected ? 'connected' : 'disconnected'}`);
        };

        // Add error handler
        const handleError = (error: string) => {
            console.error('Notification WebSocket error:', error);
        };

        // Register handlers
        multiChannelWebSocket.onMessage(channelName, handleMessage);
        multiChannelWebSocket.onConnectionChange(channelName, handleConnectionChange);
        multiChannelWebSocket.onError(channelName, handleError);

        // Connect to the channel
        multiChannelWebSocket.connectChannel(channelName).catch(error => {
            console.error('Failed to connect to notification channel:', error);
        });

        // Cleanup function
        return () => {
            multiChannelWebSocket.removeHandlers(channelName);
            multiChannelWebSocket.disconnectChannel(channelName);
        };
    }, [user]);

    return null;
};
