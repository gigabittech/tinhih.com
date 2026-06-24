export interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
  from?: string;
  to?: string;
  sessionId?: string;
}

export interface ChannelConfig {
  name: string;
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class MultiChannelWebSocket {
  private channels: Map<string, WebSocket> = new Map();
  private configs: Map<string, ChannelConfig> = new Map();
  private messageHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private connectionHandlers: Map<string, ((connected: boolean) => void)[]> = new Map();
  private errorHandlers: Map<string, ((error: string) => void)[]> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  constructor() {
  }

  // Add a new channel
  addChannel(config: ChannelConfig): void {
    
    // Check if channel already exists
    if (this.configs.has(config.name)) {
      this.configs.set(config.name, config);
      return; // Don't reset handlers
    }
    
    // New channel - initialize everything
    this.configs.set(config.name, config);
    this.messageHandlers.set(config.name, []);
    this.connectionHandlers.set(config.name, []);
    this.errorHandlers.set(config.name, []);
    this.reconnectAttempts.set(config.name, 0);
  }

  // Connect to a specific channel
  async connectChannel(channelName: string): Promise<void> {
    const config = this.configs.get(channelName);
    if (!config) {
      throw new Error(`Channel ${channelName} not found`);
    }

    // Don't connect if already connected
    const existingWs = this.channels.get(channelName);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(config.url);
        
        ws.onopen = () => {
          this.channels.set(channelName, ws);
          this.reconnectAttempts.set(channelName, 0);
          this.notifyConnectionHandlers(channelName, true);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.notifyMessageHandlers(channelName, message);
          } catch (error) {
            console.error(`MultiChannelWebSocket: Error parsing message from channel ${channelName}:`, error);
          }
        };

        ws.onclose = (event) => {
          this.channels.delete(channelName);
          this.notifyConnectionHandlers(channelName, false);

          // Auto-reconnect if enabled
          if (config.autoReconnect && this.reconnectAttempts.get(channelName)! < (config.maxReconnectAttempts || 5)) {
            this.reconnectAttempts.set(channelName, this.reconnectAttempts.get(channelName)! + 1);
            const delay = config.reconnectInterval || 3000;
            
            this.reconnectTimeouts.set(channelName, setTimeout(() => {
              this.connectChannel(channelName).catch(console.error);
            }, delay));
          }
        };

        ws.onerror = (error) => {
          console.error(`MultiChannelWebSocket: Channel ${channelName} error:`, error);
          this.notifyErrorHandlers(channelName, 'WebSocket connection error');
          reject(error);
        };

      } catch (error) {
        console.error(`MultiChannelWebSocket: Error creating WebSocket for channel ${channelName}:`, error);
        reject(error);
      }
    });
  }

  // Disconnect from a specific channel
  disconnectChannel(channelName: string): void {
    
    // Clear reconnect timeout
    const timeout = this.reconnectTimeouts.get(channelName);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(channelName);
    }

    // Close WebSocket
    const ws = this.channels.get(channelName);
    if (ws) {
      ws.close();
      this.channels.delete(channelName);
    }

    // Reset reconnect attempts
    this.reconnectAttempts.set(channelName, 0);
  }

  // Send message to a specific channel
  sendMessage(channelName: string, message: WebSocketMessage): void {
    const ws = this.channels.get(channelName);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const messageWithChannel = { ...message, channel: channelName };
      ws.send(JSON.stringify(messageWithChannel));
    } else {
      console.warn(`MultiChannelWebSocket: Cannot send message to channel ${channelName} - not connected`);
    }
  }

  // Check if a channel is connected
  isChannelConnected(channelName: string): boolean {
    const ws = this.channels.get(channelName);
    return ws ? ws.readyState === WebSocket.OPEN : false;
  }

  // Check if a channel exists
  hasChannel(channelName: string): boolean {
    return this.configs.has(channelName);
  }

  // Get connection state of a channel
  getChannelState(channelName: string): number {
    const ws = this.channels.get(channelName);
    return ws ? ws.readyState : WebSocket.CLOSED;
  }

  // Add message handler for a channel
  onMessage(channelName: string, handler: (message: WebSocketMessage) => void): void {
    const handlers = this.messageHandlers.get(channelName) || [];
    handlers.push(handler);
    this.messageHandlers.set(channelName, handlers);
  }

  // Add connection handler for a channel
  onConnectionChange(channelName: string, handler: (connected: boolean) => void): void {
    const handlers = this.connectionHandlers.get(channelName) || [];
    handlers.push(handler);
    this.connectionHandlers.set(channelName, handlers);
  }

  // Add error handler for a channel
  onError(channelName: string, handler: (error: string) => void): void {
    const handlers = this.errorHandlers.get(channelName) || [];
    handlers.push(handler);
    this.errorHandlers.set(channelName, handlers);
  }

  // Remove handlers for a channel
  removeHandlers(channelName: string): void {
    this.messageHandlers.delete(channelName);
    this.connectionHandlers.delete(channelName);
    this.errorHandlers.delete(channelName);
  }

  // Close all channels
  closeAll(): void {
    for (const [channelName] of Array.from(this.channels)) {
      this.disconnectChannel(channelName);
    }
  }

  // Private methods
  private notifyMessageHandlers(channelName: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(channelName) || [];
    handlers.forEach((handler, index) => {
      try {
        handler(message);
      } catch (error) {
        console.error(`MultiChannelWebSocket: Error in message handler for channel ${channelName}:`, error);
      }
    });
  }

  private notifyConnectionHandlers(channelName: string, connected: boolean): void {
    const handlers = this.connectionHandlers.get(channelName) || [];
    handlers.forEach((handler, index) => {
      try {
        handler(connected);
      } catch (error) {
        console.error(`MultiChannelWebSocket: Error in connection handler for channel ${channelName}:`, error);
      }
    });
  }

  private notifyErrorHandlers(channelName: string, error: string): void {
    const handlers = this.errorHandlers.get(channelName) || [];
    handlers.forEach(handler => {
      try {
        handler(error);
      } catch (error) {
        console.error(`MultiChannelWebSocket: Error in error handler for channel ${channelName}:`, error);
      }
    });
  }
}

// Create and export a singleton instance
export const multiChannelWebSocket = new MultiChannelWebSocket();
