import { Notification } from "@shared/notification-schema";

// In-memory store for connected clients (in production, use Redis or similar)
interface ConnectedClient {
  userId: string;
  socket: any; // WebSocket connection
  lastSeen: Date;
  channel?: string;
}

class PushNotificationService {
  private connectedClients: Map<string, ConnectedClient[]> = new Map();
  private recentlySentNotifications: Map<string, number> = new Map(); // Track recently sent notifications

  // Register a client connection
  registerClient(userId: string, socket: any, channel?: string): void {
    const existingClients = this.connectedClients.get(userId) || [];
    const newClient: ConnectedClient = {
      userId,
      socket,
      lastSeen: new Date(),
      channel
    };
    
    // Remove any existing client with the same channel
    const filteredClients = existingClients.filter(client => client.channel !== channel);
    filteredClients.push(newClient);
    
    this.connectedClients.set(userId, filteredClients);
    
    console.log(`Client registered for user: ${userId} on channel: ${channel || 'default'}`);
  }

  // Unregister a client connection
  unregisterClient(userId: string, channel?: string): void {
    if (channel) {
      // Remove specific channel connection
      const existingClients = this.connectedClients.get(userId) || [];
      const filteredClients = existingClients.filter(client => client.channel !== channel);
      
      if (filteredClients.length === 0) {
        this.connectedClients.delete(userId);
      } else {
        this.connectedClients.set(userId, filteredClients);
      }
      
      console.log(`Client unregistered for user: ${userId} on channel: ${channel}`);
    } else {
      // Remove all connections for user
      this.connectedClients.delete(userId);
      console.log(`All clients unregistered for user: ${userId}`);
    }
  }

  // Send push notification to a specific user
  async sendPushNotification(userId: string, notification: Notification): Promise<boolean> {
    console.log(`PushNotificationService: Attempting to send notification to user: ${userId}`);
    console.log(`PushNotificationService: Notification type: ${notification.type}, title: ${notification.title}`);
    console.log(`PushNotificationService: Notification ID: ${notification.id}`);
    
    const clients = this.connectedClients.get(userId);
    console.log(`PushNotificationService: Total connected clients for user: ${clients?.length || 0}`);
    
    if (!clients || clients.length === 0) {
      console.log(`PushNotificationService: No connected clients found for user: ${userId}`);
      return false;
    }

    // Log all client channels for debugging
    clients.forEach((client, index) => {
      console.log(`PushNotificationService: Client ${index + 1} - Channel: ${client.channel}, Connected: ${client.socket.readyState === 1}, Socket ID: ${client.socket.url}`);
    });

    // Find clients connected to the notifications channel
    const notificationClients = clients.filter(client => client.channel === 'notifications');
    console.log(`PushNotificationService: Notification channel clients found: ${notificationClients.length}`);
    
    if (notificationClients.length === 0) {
      console.log(`PushNotificationService: No notification channel clients found for user: ${userId}`);
      console.log(`PushNotificationService: Available channels: ${clients.map(c => c.channel).join(', ')}`);
      return false;
    }

    // Check if we've already sent this notification to this user recently (prevent duplicates)
    const notificationKey = `${userId}-${notification.id}`;
    const now = Date.now();
    const lastSent = this.recentlySentNotifications.get(notificationKey);
    
    if (lastSent && (now - lastSent) < 3000) { // 5 second window
      console.log(`PushNotificationService: Notification ${notification.id} already sent to user ${userId} recently, skipping`);
      return true; // Return true since we "successfully" handled it
    }
    
    // Mark this notification as recently sent
    this.recentlySentNotifications.set(notificationKey, now);

    let successCount = 0;
    const pushData = {
      type: 'notification',
      data: {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
        timestamp: new Date()
      }
    };

    for (const client of notificationClients) {
      try {
        // Check if socket is still connected
        if (client.socket.readyState === 1) { // WebSocket.OPEN
          client.socket.send(JSON.stringify(pushData));
          client.lastSeen = new Date();
          successCount++;
        } else {
          console.log(`Socket not connected for user: ${userId} on channel: ${client.channel}`);
          this.unregisterClient(userId, client.channel);
        }
      } catch (error) {
        console.error(`Failed to send push notification to user ${userId} on channel ${client.channel}:`, error);
        this.unregisterClient(userId, client.channel);
      }
    }
    
    console.log(`Push notification sent to user: ${userId} on ${successCount} notification channels`);
    console.log(`PushNotificationService: Notification sent at: ${new Date()}`);
    return successCount > 0;
  }

  // Send push notification to multiple users
  async sendBulkPushNotifications(userIds: string[], notification: Notification): Promise<number> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendPushNotification(userId, notification))
    );

    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    console.log(`Bulk push notifications sent: ${successCount}/${userIds.length} successful`);
    return successCount;
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get connected users
  getConnectedUsers(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  // Clean up stale connections
  cleanupStaleConnections(maxAgeMinutes: number = 30): void {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const staleConnections: { userId: string; channel?: string }[] = [];

    for (const [userId, clients] of Array.from(this.connectedClients.entries())) {
      for (const client of clients) {
        if (client.lastSeen < cutoffTime) {
          staleConnections.push({ userId, channel: client.channel });
        }
      }
    }

    staleConnections.forEach(({ userId, channel }) => {
      this.unregisterClient(userId, channel);
    });

    if (staleConnections.length > 0) {
      console.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  // Send system-wide notification (for admin broadcasts)
  async sendSystemNotification(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Promise<number> {
    const systemNotification: Notification = {
      id: `system-${Date.now()}`,
      userId: 'system',
      type: 'system_update',
      priority,
      title: 'System Notification',
      message,
      actionUrl: null,
      metadata: { system: true },
      isRead: false,
      isArchived: false,
      createdAt: new Date(),
      readAt: null
    };

    const userIds = this.getConnectedUsers();
    return await this.sendBulkPushNotifications(userIds, systemNotification);
  }
}

export const pushNotificationService = new PushNotificationService();

// Cleanup stale connections every 5 minutes
setInterval(() => {
  pushNotificationService.cleanupStaleConnections();
}, 5 * 60 * 1000);
