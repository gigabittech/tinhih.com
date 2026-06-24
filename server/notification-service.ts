import { and, desc, eq, count, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  notifications, 
  notificationPreferences, 
  type InsertNotification, 
  type NotificationType, 
  type NotificationPriority,
  type Notification
} from "@shared/notification-schema";
import { users } from "@shared/schema";
import { emailService } from "./email-service";
import { pushNotificationService } from "./push-notification-service";

export class NotificationService {
  // Create a new notification
  async createNotification(data: InsertNotification): Promise<Notification> {
    // ALWAYS use UTC time regardless of server timezone
    const utcNow = new Date();
    
    const [notification] = await db
      .insert(notifications)
      .values({
        ...data,
        createdAt: utcNow // Use Date object directly
      })
      .returning();
    
    // Emit real-time notification (WebSocket implementation would go here)
    await this.emitRealtimeNotification(notification);
    
    // Send email and push notifications based on user preferences
    await this.sendNotificationChannels(notification);
    
    return notification;
  }

  // Create notifications for multiple users
  async createBulkNotifications(
    userIds: string[], 
    notificationData: Omit<InsertNotification, 'userId'>
  ): Promise<Notification[]> {
    // ALWAYS use UTC time regardless of server timezone
    const utcNow = new Date();
    
    const notificationsToInsert = userIds.map(userId => ({
      ...notificationData,
      userId,
      createdAt: utcNow // Use Date object directly
    }));

    const createdNotifications = await db
      .insert(notifications)
      .values(notificationsToInsert)
      .returning();

    // Emit real-time notifications for all users
    for (const notification of createdNotifications) {
      await this.emitRealtimeNotification(notification);
    }

    // Send email and push notifications for all users
    await this.sendBulkNotificationChannels(createdNotifications);

    return createdNotifications;
  }

  // Send notifications through different channels based on user preferences
  private async sendNotificationChannels(notification: Notification): Promise<void> {
    try {
      const user = await this.getUserById(notification.userId);
      if (!user) {
        console.log(`User not found for notification: ${notification.userId}`);
        return;
      }

      const preferences = await this.getUserPreferences(notification.userId);
      
      // Send email notification if enabled - NON-BLOCKING for message notifications
      if (await this.shouldNotifyUser(notification.userId, notification.type, 'email')) {
        // For message notifications, only send emails for new conversations
        if (notification.type === 'message_received') {
          const isNewConversation = (notification.metadata as any)?.isNewConversation;
          if (isNewConversation) {
            // Send email notification for new conversations only - NON-BLOCKING
            emailService.sendNotificationEmail(
              user.email,
              notification,
              user.firstName
            ).catch(error => {
              console.error('Failed to send email notification (non-blocking):', error);
            });
          } else {
            console.log(`Skipping email for existing conversation message to user: ${notification.userId}`);
          }
        } else {
          // For non-message notifications, send email normally - NON-BLOCKING
          emailService.sendNotificationEmail(
            user.email,
            notification,
            user.firstName
          ).catch(error => {
            console.error('Failed to send email notification (non-blocking):', error);
          });
        }
      }

      // Send push notification if enabled - NON-BLOCKING
      if (await this.shouldNotifyUser(notification.userId, notification.type, 'browser')) {
        console.log(`NotificationService: Sending push notification to user: ${notification.userId}`);
        console.log(`NotificationService: Notification type: ${notification.type}, title: ${notification.title}`);
        pushNotificationService.sendPushNotification(notification.userId, notification).catch(error => {
          console.error('Failed to send push notification (non-blocking):', error);
        });
      } else {
        console.log(`NotificationService: Push notification disabled for user: ${notification.userId}, type: ${notification.type}`);
      }

      // SMS notifications are not implemented yet (as per user requirements)
      // if (await this.shouldNotifyUser(notification.userId, notification.type, 'sms')) {
      //   // SMS implementation will come later
      // }

    } catch (error) {
      console.error('Error sending notification channels:', error);
      // Don't throw error - notifications should not break the main functionality
    }
  }

  // Send bulk notifications through different channels
  private async sendBulkNotificationChannels(notifications: Notification[]): Promise<void> {
    try {
      const userIds = notifications.map(n => n.userId);
      const users = await this.getUsersByIds(userIds);
      const userMap = new Map(users.map(u => [u.id, u]));

      // Group notifications by channel preference
      const emailNotifications: Notification[] = [];
      const pushNotifications: Notification[] = [];

      for (const notification of notifications) {
        const user = userMap.get(notification.userId);
        if (!user) continue;

        const preferences = await this.getUserPreferences(notification.userId);

        if (await this.shouldNotifyUser(notification.userId, notification.type, 'email')) {
          emailNotifications.push(notification);
        }

        if (await this.shouldNotifyUser(notification.userId, notification.type, 'browser')) {
          pushNotifications.push(notification);
        }
      }

      // Send email notifications - NON-BLOCKING
      for (const notification of emailNotifications) {
        const user = userMap.get(notification.userId);
        if (user) {
          // For message notifications, only send emails for new conversations
          if (notification.type === 'message_received') {
            const isNewConversation = (notification.metadata as any)?.isNewConversation;
            if (isNewConversation) {
              emailService.sendNotificationEmail(
                user.email,
                notification,
                user.firstName
              ).catch(error => {
                console.error('Failed to send bulk email notification (non-blocking):', error);
              });
            } else {
              console.log(`Skipping bulk email for existing conversation message to user: ${notification.userId}`);
            }
          } else {
            emailService.sendNotificationEmail(
              user.email,
              notification,
              user.firstName
            ).catch(error => {
              console.error('Failed to send bulk email notification (non-blocking):', error);
            });
          }
        }
      }

      // Send push notifications - NON-BLOCKING
      const pushUserIds = pushNotifications.map(n => n.userId);
      if (pushUserIds.length > 0) {
        pushNotificationService.sendBulkPushNotifications(pushUserIds, pushNotifications[0]).catch(error => {
          console.error('Failed to send bulk push notifications (non-blocking):', error);
        });
      }

    } catch (error) {
      console.error('Error sending bulk notification channels:', error);
    }
  }

  // Get user by ID
  private async getUserById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    return user;
  }

  // Get multiple users by IDs
  private async getUsersByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    
    const usersList = await db
      .select()
      .from(users)
      .where(sql`${users.id} = ANY(${userIds})`);
    
    return usersList;
  }

  // Send appointment reminder notifications
  async sendAppointmentReminders(): Promise<void> {
    try {
      // Get appointments that need reminders (e.g., 24 hours before)
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + 24);

      // This would query appointments table to find upcoming appointments
      // For now, we'll create a placeholder implementation
      console.log('Appointment reminder service would run here');
      
      // Example implementation:
      // const upcomingAppointments = await db
      //   .select()
      //   .from(appointments)
      //   .where(and(
      //     eq(appointments.appointmentDate, reminderTime.split('T')[0]),
      //     eq(appointments.status, 'confirmed')
      //   ));

      // for (const appointment of upcomingAppointments) {
      //   const preferences = await this.getUserPreferences(appointment.patientId);
      //   
      //   if (preferences.emailAppointments) {
      //     await emailService.sendAppointmentReminder(
      //       appointment.patient.email,
      //       appointment,
      //       appointment.patient.firstName
      //     );
      //   }
      //   
      //   if (preferences.browserAppointments) {
      //     await this.createTemplatedNotification(
      //       appointment.patientId,
      //       'appointment_reminder',
      //       appointment
      //     );
      //   }
      // }

    } catch (error) {
      console.error('Error sending appointment reminders:', error);
    }
  }

  // Get notifications for a user
  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      excludeArchived?: boolean;
    } = {}
  ) {
    const { limit = 50, offset = 0, unreadOnly = false, excludeArchived = true } = options;

    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    if (unreadOnly) {
      query = query.where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    }

    if (excludeArchived) {
      query = query.where(and(
        eq(notifications.userId, userId),
        eq(notifications.isArchived, false)
      ));
    }

    const results = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false)
      ));

    return result.count;
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date() // Use Date object, not ISO string
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date() // Use Date object, not ISO string
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  // Archive notification
  async archiveNotification(notificationId: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isArchived: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  // Delete old notifications (cleanup)
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db
      .delete(notifications)
      .where(
        sql`${notifications.createdAt} < ${cutoffDate} AND ${notifications.isArchived} = true`
      );
  }

  // Get user notification preferences
  async getUserPreferences(userId: string) {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    // Create default preferences if none exist
    if (!preferences) {
      return await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  // Create default notification preferences for a user
  async createDefaultPreferences(userId: string) {
    const [preferences] = await db
      .insert(notificationPreferences)
      .values({ 
        userId,
        // Email notifications (defaults from schema)
        emailAppointments: true,
        emailPatientUpdates: true,
        emailClinicalNotes: false,
        emailBilling: true,
        emailMessages: true,
        emailTelehealth: true,
        emailSystem: true,
        emailSecurity: true,
        
        // Browser/Push notifications (defaults from schema)
        browserAppointments: true,
        browserPatientUpdates: false,
        browserClinicalNotes: false,
        browserBilling: true,
        browserMessages: true,
        browserTelehealth: true,
        browserSystem: false,
        browserSecurity: true,
        
        // SMS notifications (defaults from schema)
        smsAppointments: false,
        smsUrgentOnly: true,
        
        // General preferences (defaults from schema)
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00"
      })
      .returning();

    return preferences;
  }

  // Update user notification preferences
  async updateUserPreferences(userId: string, updates: Partial<typeof notificationPreferences.$inferInsert>) {
    // First check if preferences exist
    const existingPreferences = await this.getUserPreferences(userId);
    
    if (!existingPreferences) {
      // Create new preferences with the updates
      const [preferences] = await db
        .insert(notificationPreferences)
        .values({ 
          userId,
          ...updates,
          // Email notifications (defaults from schema)
          emailAppointments: updates.emailAppointments ?? true,
          emailPatientUpdates: updates.emailPatientUpdates ?? true,
          emailClinicalNotes: updates.emailClinicalNotes ?? false,
          emailBilling: updates.emailBilling ?? true,
          emailMessages: updates.emailMessages ?? true,
          emailTelehealth: updates.emailTelehealth ?? true,
          emailSystem: updates.emailSystem ?? true,
          emailSecurity: updates.emailSecurity ?? true,
          
          // Browser/Push notifications (defaults from schema)
          browserAppointments: updates.browserAppointments ?? true,
          browserPatientUpdates: updates.browserPatientUpdates ?? false,
          browserClinicalNotes: updates.browserClinicalNotes ?? false,
          browserBilling: updates.browserBilling ?? true,
          browserMessages: updates.browserMessages ?? true,
          browserTelehealth: updates.browserTelehealth ?? true,
          browserSystem: updates.browserSystem ?? false,
          browserSecurity: updates.browserSecurity ?? true,
          
          // SMS notifications (defaults from schema)
          smsAppointments: updates.smsAppointments ?? false,
          smsUrgentOnly: updates.smsUrgentOnly ?? true,
          
          // General preferences (defaults from schema)
          quietHoursEnabled: updates.quietHoursEnabled ?? false,
          quietHoursStart: updates.quietHoursStart ?? "22:00",
          quietHoursEnd: updates.quietHoursEnd ?? "08:00"
        })
        .returning();
      
      return preferences;
    } else {
      // Update existing preferences
      const [preferences] = await db
        .update(notificationPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();

      return preferences;
    }
  }

  // Check if user should be notified for a specific type and channel
  private async shouldNotifyUser(userId: string, type: NotificationType, channel: 'email' | 'browser' | 'sms'): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      if (!preferences) {
        console.log(`No preferences found for user ${userId}, using defaults`);
        return channel === 'browser'; // Default to browser notifications
      }

      // Map notification type to preference field
      const preferenceMap: Record<NotificationType, string> = {
        'appointment_created': `${channel}Appointments`,
        'appointment_updated': `${channel}Appointments`,
        'appointment_cancelled': `${channel}Appointments`,
        'appointment_reminder': `${channel}Appointments`,
        'patient_registered': `${channel}PatientUpdates`,
        'patient_updated': `${channel}PatientUpdates`,
        'clinical_note_created': `${channel}ClinicalNotes`,
        'clinical_note_updated': `${channel}ClinicalNotes`,
        'invoice_created': `${channel}Billing`,
        'invoice_paid': `${channel}Billing`,
        'invoice_overdue': `${channel}Billing`,
        'message_received': `${channel}Messages`,
        'telehealth_session_scheduled': `${channel}Telehealth`,
        'telehealth_session_started': `${channel}Telehealth`,
        'telehealth_session_ended': `${channel}Telehealth`,
        'system_update': `${channel}System`,
        'security_alert': `${channel}Security`,
        'calendar_settings_updated': `${channel}System`,
        'user_profile_updated': `${channel}System`,
        'password_changed': `${channel}Security`
      };

      const preferenceField = preferenceMap[type];
      const shouldNotify = preferences[preferenceField as keyof typeof preferences] as boolean;
      
      console.log(`Notification preference check for user ${userId}, type ${type}, channel ${channel}: ${shouldNotify}`);
      return shouldNotify;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return channel === 'browser'; // Default to browser notifications on error
    }
  }

  // Emit real-time notification (WebSocket implementation)
  private async emitRealtimeNotification(notification: Notification): Promise<void> {
    try {
      console.log(`Real-time notification emitted:`, {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      // Send the notification through the push notification service
      await pushNotificationService.sendPushNotification(notification.userId, notification);
    } catch (error) {
      console.error('Error emitting real-time notification:', error);
    }
  }

  // Predefined notification templates
  static getNotificationTemplate(type: NotificationType, data: any) {
    const templates: Record<NotificationType, (data: any) => { title: string; message: string; priority: NotificationPriority }> = {
      'appointment_created': (data) => ({
        title: 'New Appointment Scheduled',
        message: `Your appointment "${data.title}" has been scheduled for ${data.date}`,
        priority: 'medium' as NotificationPriority
      }),
      'appointment_updated': (data) => ({
        title: 'Appointment Updated',
        message: `Your appointment "${data.title}" has been updated`,
        priority: 'medium' as NotificationPriority
      }),
      'appointment_cancelled': (data) => ({
        title: 'Appointment Cancelled',
        message: `Your appointment "${data.title}" has been cancelled`,
        priority: 'high' as NotificationPriority
      }),
      'appointment_reminder': (data) => ({
        title: 'Appointment Reminder',
        message: `Your appointment "${data.title}" is scheduled for ${data.time}`,
        priority: 'high' as NotificationPriority
      }),
      'patient_registered': (data) => ({
        title: 'New Patient Registered',
        message: `${data.patientName} has been registered in the system`,
        priority: 'low' as NotificationPriority
      }),
      'patient_updated': (data) => ({
        title: 'Patient Information Updated',
        message: `Patient ${data.patientName}'s information has been updated`,
        priority: 'low' as NotificationPriority
      }),
      'clinical_note_created': (data) => ({
        title: 'New Clinical Note',
        message: `A new clinical note has been added for ${data.patientName}`,
        priority: 'medium' as NotificationPriority
      }),
      'clinical_note_updated': (data) => ({
        title: 'Clinical Note Updated',
        message: `Clinical note for ${data.patientName} has been updated`,
        priority: 'low' as NotificationPriority
      }),
      'invoice_created': (data) => ({
        title: 'New Invoice Generated',
        message: `Invoice #${data.invoiceNumber} for $${data.amount} has been created`,
        priority: 'medium' as NotificationPriority
      }),
      'invoice_paid': (data) => ({
        title: 'Payment Received',
        message: `Invoice #${data.invoiceNumber} has been paid`,
        priority: 'low' as NotificationPriority
      }),
      'invoice_overdue': (data) => ({
        title: 'Invoice Overdue',
        message: `Invoice #${data.invoiceNumber} is overdue`,
        priority: 'high' as NotificationPriority
      }),
      'message_received': (data) => ({
        title: 'New Message',
        message: `You have a new message from ${data.senderName}`,
        priority: 'medium' as NotificationPriority
      }),
      'telehealth_session_scheduled': (data) => ({
        title: 'Telehealth Session Scheduled',
        message: `A telehealth session has been scheduled with ${data.practitionerName || data.patientName} on ${data.appointmentDate ? new Date(data.appointmentDate).toLocaleDateString() : 'the scheduled date'}`,
        priority: 'high' as NotificationPriority
      }),
      'telehealth_session_started': (data) => ({
        title: 'Telehealth Session Started',
        message: `Your telehealth session with ${data.participantName} has started`,
        priority: 'high' as NotificationPriority
      }),
      'telehealth_session_ended': (data) => ({
        title: 'Telehealth Session Ended',
        message: `Your telehealth session has ended`,
        priority: 'medium' as NotificationPriority
      }),
      'system_update': (data) => ({
        title: 'System Update',
        message: data.message || 'System has been updated',
        priority: 'low' as NotificationPriority
      }),
      'security_alert': (data) => ({
        title: 'Security Alert',
        message: data.message || 'Security alert detected',
        priority: 'urgent' as NotificationPriority
      }),
      'calendar_settings_updated': (data) => ({
        title: 'Calendar Settings Updated',
        message: 'Your calendar settings have been updated successfully',
        priority: 'low' as NotificationPriority
      }),
      'user_profile_updated': (data) => ({
        title: 'Profile Updated',
        message: 'Your profile information has been updated',
        priority: 'low' as NotificationPriority
      }),
      'password_changed': (data) => ({
        title: 'Password Changed',
        message: 'Your password has been changed successfully',
        priority: 'medium' as NotificationPriority
      })
    };

    return templates[type]?.(data) || {
      title: 'Notification',
      message: 'You have a new notification',
      priority: 'medium' as NotificationPriority
    };
  }

  // Quick notification creation using templates
  async createTemplatedNotification(
    userId: string, 
    type: NotificationType, 
    data: any, 
    actionUrl?: string
  ): Promise<Notification> {
    const template = NotificationService.getNotificationTemplate(type, data);
    
    return await this.createNotification({
      userId,
      type,
      title: template.title,
      message: template.message,
      priority: template.priority,
      actionUrl,
      metadata: data
    });
  }

  // Test method to create a sample notification
  async createTestNotification(userId: string) {
    const testNotification = {
      userId,
      type: 'system_update' as NotificationType,
      priority: 'medium' as NotificationPriority,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      actionUrl: '/dashboard',
      metadata: { test: true }
    };

    return await this.createNotification(testNotification);
  }
}

export const notificationService = new NotificationService();