import { Router } from "express";
import { z } from "zod";
import { notificationService } from "./notification-service";
import { updateNotificationSchema } from "@shared/notification-schema";
import { pushNotificationService } from "./push-notification-service";

// Extend Express Request to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

const router = Router();

// Get user notifications
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';
    const excludeArchived = req.query.excludeArchived !== 'false';

    const notifications = await notificationService.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      excludeArchived
    });

    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Failed to get notifications" });
  }
});

// Get unread notification count
router.get("/unread-count", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await notificationService.markAsRead(notificationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.patch("/mark-all-read", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

// Archive notification
router.patch("/:id/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await notificationService.archiveNotification(notificationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Archive notification error:", error);
    res.status(500).json({ message: "Failed to archive notification" });
  }
});

// Get user notification preferences
router.get("/preferences", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`Getting notification preferences for user: ${userId}`);
    const preferences = await notificationService.getUserPreferences(userId);
    console.log(`Retrieved preferences:`, preferences);
    res.json(preferences);
  } catch (error) {
    console.error("Get notification preferences error:", error);
    res.status(500).json({ message: "Failed to get notification preferences" });
  }
});

// Update user notification preferences
router.patch("/preferences", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`Updating notification preferences for user: ${userId}`);
    console.log(`Update data:`, req.body);
    const preferences = await notificationService.updateUserPreferences(userId, req.body);
    console.log(`Updated preferences:`, preferences);
    res.json(preferences);
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({ message: "Failed to update notification preferences" });
  }
});

// Test endpoint to create a test notification
router.post("/test", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('Creating test notification for user:', userId);
    const notification = await notificationService.createTestNotification(userId);
    console.log('Test notification created:', notification);
    
    res.json({ 
      success: true, 
      message: "Test notification created successfully",
      notification 
    });
  } catch (error) {
    console.error("Create test notification error:", error);
    res.status(500).json({ message: "Failed to create test notification" });
  }
});

// Test endpoint to create a test message notification
router.post("/test-message", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('Creating test message notification for user:', userId);
    const notification = await notificationService.createTemplatedNotification(
      userId,
      'message_received',
      {
        senderName: 'Test User',
        messageId: 'test-message-id',
        senderId: 'test-sender-id'
      },
      '/messages' // This will navigate to messages page when clicked
    );
    console.log('Test message notification created:', notification);
    
    res.json({ 
      success: true, 
      message: "Test message notification created successfully",
      notification 
    });
  } catch (error) {
    console.error("Create test message notification error:", error);
    res.status(500).json({ message: "Failed to create test message notification" });
  }
});

// Debug endpoint to check connected clients
router.get("/debug-clients", async (req: AuthenticatedRequest, res) => {
  try {
    const connectedClients = pushNotificationService.getConnectedUsers();
    const connectedCount = pushNotificationService.getConnectedClientsCount();
    
    res.json({
      connectedClients,
      connectedCount,
      currentUser: req.user?.id,
      isCurrentUserConnected: connectedClients.includes(req.user?.id || '')
    });
  } catch (error) {
    console.error('Error getting debug client info:', error);
    res.status(500).json({ error: 'Failed to get debug client info' });
  }
});

export default router;