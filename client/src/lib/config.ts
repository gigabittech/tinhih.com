// Configuration for the TiNHiH Portal application
export const config = {
  // WebSocket configuration
  websocket: {
    url: import.meta.env.VITE_SOCKET_URL, // WebSocket server port
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  },
  
  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_SOCKET_URL,
  },
  
  // Feature flags
  features: {
    telehealth: true,
    notifications: true,
    messaging: true,
    publicBooking: true,
  }
};

// Helper function to get WebSocket URL with parameters
export const getWebSocketUrl = (params: Record<string, string> = {}): string => {
  const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.MODE === 'development'
    ? 'ws://localhost:8080/ws'
    : 'wss://dev.tinhih.com/ws');

  // Create a URL object from the base WebSocket URL
  const url = new URL(SOCKET_URL);
  
  // Add parameters to the URL
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  
  return url.toString();
};
