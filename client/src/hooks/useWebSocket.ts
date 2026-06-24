import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getWebSocketUrl } from '@/lib/config';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const connect = useCallback(() => {
    console.log('WebSocket: Attempting to connect...');
    const token = localStorage.getItem("token");
    console.log('WebSocket: User token available:', !!token);
    
    if (!token) {
      console.log('No user token available for WebSocket connection');
      return;
    }

    // Don't reconnect if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected, skipping reconnection');
      return;
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        console.log('WebSocket: Closing existing connection');
        wsRef.current.close();
      }

      // Check if we're on a telehealth session page and get session info
      let wsUrl = getWebSocketUrl({ token });
      
      // Check if we're on a telehealth session page
      const currentPath = window.location.pathname;
      const telehealthMatch = currentPath.match(/\/telehealth-session\/([^\/]+)/);
      
      if (telehealthMatch) {
        const sessionId = telehealthMatch[1];
        console.log('WebSocket: Detected telehealth session, adding session parameters');
        console.log('WebSocket: Session ID from URL:', sessionId);
        
        // Get user info from localStorage or context
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            console.log('WebSocket: User info from localStorage:', user);
            
            // Determine role based on session data (this is a simplified approach)
            // In a real app, you'd get this from the session API
            const role = user.role === 'patient' ? 'patient' : 'practitioner';
            
            wsUrl = getWebSocketUrl({ 
              token, 
              sessionId, 
              userId: user.id, 
              role 
            });
            console.log('WebSocket: Updated URL with session parameters:', wsUrl);
          } catch (error) {
            console.error('WebSocket: Error parsing user data:', error);
          }
        }
      }
      
      console.log('WebSocket: Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket: Connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket: Received message:', message);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket: Disconnected - Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);
        onDisconnect?.();

        // Auto-reconnect logic
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`WebSocket: Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.log('WebSocket: Max reconnection attempts reached or auto-reconnect disabled');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket: Connection error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, []); // Empty dependency array to prevent recreation

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []); // Empty dependency array to prevent recreation

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }, []); // Empty dependency array

  const ping = useCallback(() => {
    sendMessage({ type: 'ping', data: {} });
  }, [sendMessage]);

  // Connect on mount and when user token changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []); // Remove dependencies to prevent reconnection loops

  // Remove the localStorage event listener that was causing loops
  // useEffect(() => {
  //   const handleStorageChange = (e: StorageEvent) => {
  //     if (e.key === 'token') {
  //       console.log('WebSocket: Token changed, reconnecting...');
  //       if (e.newValue) {
  //         connect();
  //       } else {
  //         disconnect();
  //       }
  //     }
  //   };

  //   window.addEventListener('storage', handleStorageChange);
  //   return () => window.removeEventListener('storage', handleStorageChange);
  // }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array

  return {
    isConnected,
    lastMessage,
    sendMessage,
    ping,
    connect,
    disconnect
  };
}
