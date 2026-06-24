import { useEffect, useState, useCallback } from 'react';
import { multiChannelWebSocket, WebSocketMessage } from '@/lib/multi-channel-websocket';

interface UseMultiChannelWebSocketOptions {
  channelName: string;
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export function useMultiChannelWebSocket(options: UseMultiChannelWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    channelName,
    url,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      // Add channel if not already added
      multiChannelWebSocket.addChannel({
        name: channelName,
        url,
        autoReconnect,
        reconnectInterval,
        maxReconnectAttempts
      });

      // Connect to channel
      await multiChannelWebSocket.connectChannel(channelName);
      
      setIsConnecting(false);
    } catch (error) {
      console.error(`useMultiChannelWebSocket: Failed to connect to channel ${channelName}:`, error);
      setIsConnecting(false);
      onError?.(error as string);
    }
  }, [channelName, url, autoReconnect, reconnectInterval, maxReconnectAttempts, onError]);

  const disconnect = useCallback(() => {
    console.info(`useMultiChannelWebSocket: Disconnecting from channel ${channelName}`);
    multiChannelWebSocket.disconnectChannel(channelName);
  }, [channelName]);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'channel'>) => {
    multiChannelWebSocket.sendMessage(channelName, { ...message, channel: channelName });
  }, [channelName]);

  useEffect(() => {
    // Set up message handler
    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
      onMessage?.(message);
    };

    // Set up connection handler
    const handleConnectionChange = (connected: boolean) => {
      // Set connection state immediately
      setIsConnected(connected);
      if (connected) {
        onConnect?.();
      } else {
        onDisconnect?.();
      }
    };

    // Set up error handler
    const handleError = (error: string) => {
      console.error(`useMultiChannelWebSocket: Error on channel ${channelName}:`, error);
      onError?.(error);
    };

    // Add handlers
    multiChannelWebSocket.onMessage(channelName, handleMessage);
    multiChannelWebSocket.onConnectionChange(channelName, handleConnectionChange);
    multiChannelWebSocket.onError(channelName, handleError);

    // Connect
    connect();

    // Cleanup
    return () => {
      // Remove handlers first to prevent connection state changes during cleanup
      multiChannelWebSocket.removeHandlers(channelName);
      // Then disconnect
      multiChannelWebSocket.disconnectChannel(channelName);
    };
  }, [channelName, connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    isConnecting
  };
}
