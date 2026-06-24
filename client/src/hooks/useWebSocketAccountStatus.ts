import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation } from 'wouter';
import { multiChannelWebSocket } from '@/lib/multi-channel-websocket';
import { getWebSocketUrl } from '@/lib/config';

export const useWebSocketAccountStatus = () => {
    const { logout } = useAuth();
    const [, setLocation] = useLocation();
    const channelName = 'account-status';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Add the account status channel to the multi-channel WebSocket
        multiChannelWebSocket.addChannel({
            name: channelName,
            url: getWebSocketUrl({
                token,
                channel: 'account-status'
            }),
            autoReconnect: true,
            reconnectInterval: 3000,
            maxReconnectAttempts: 5
        });

        // Add message handler for account deactivation
        const handleMessage = (message: any) => {
            if (message.type === 'account_deactivated') {
                console.log('Account deactivation detected via WebSocket');
                
                // Show alert
                window.alert('Your account has been deactivated. You will be signed out.');
                
                // Logout and redirect
                logout();
                setLocation('/login');
            }
        };

        // Add connection handler
        const handleConnectionChange = (connected: boolean) => {
        
        };

        // Add error handler
        const handleError = (error: string) => {
        };

        // Register handlers
        multiChannelWebSocket.onMessage(channelName, handleMessage);
        multiChannelWebSocket.onConnectionChange(channelName, handleConnectionChange);
        multiChannelWebSocket.onError(channelName, handleError);

        // Connect to the channel
        multiChannelWebSocket.connectChannel(channelName).catch(error => {
            console.error('Failed to connect to account status channel:', error);
        });

        // Cleanup function
        return () => {
            multiChannelWebSocket.removeHandlers(channelName);
            multiChannelWebSocket.disconnectChannel(channelName);
        };
    }, [logout, setLocation, channelName]);

    return null;
};
