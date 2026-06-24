import { db } from './db';
import { activities, type InsertActivity } from '../shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export class ActivityService {
  /**
   * Log a new activity
   */
  static async logActivity(data: Omit<InsertActivity, 'createdAt'>) {
    try {
      const [activity] = await db
        .insert(activities)
        .values(data)
        .returning();
      
      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Log user registration
   */
  static async logUserRegistration(userId: string, userEmail: string, ipAddress?: string, userAgent?: string) {
    return this.logActivity({
      userId,
      type: 'user_registered',
      title: 'New User Registration',
      description: `User ${userEmail} registered`,
      metadata: { email: userEmail },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log user login
   */
  static async logUserLogin(userId: string, userEmail: string, ipAddress?: string, userAgent?: string) {
    return this.logActivity({
      userId,
      type: 'user_login',
      title: 'User Login',
      description: `User ${userEmail} logged in`,
      metadata: { email: userEmail },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log appointment creation
   */
  static async logAppointmentCreated(appointmentId: string, patientId: string, practitionerId: string, title: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'appointment_created',
      title: 'Appointment Created',
      description: `Appointment "${title}" was created`,
      metadata: { appointmentId, patientId, practitionerId, title }
    });
  }

  /**
   * Log appointment update
   */
  static async logAppointmentUpdated(appointmentId: string, title: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'appointment_updated',
      title: 'Appointment Updated',
      description: `Appointment "${title}" was updated`,
      metadata: { appointmentId, title }
    });
  }

  /**
   * Log appointment cancellation
   */
  static async logAppointmentCancelled(appointmentId: string, title: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      description: `Appointment "${title}" was cancelled`,
      metadata: { appointmentId, title }
    });
  }

  /**
   * Log appointment completion
   */
  static async logAppointmentCompleted(appointmentId: string, title: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'appointment_completed',
      title: 'Appointment Completed',
      description: `Appointment "${title}" was completed`,
      metadata: { appointmentId, title }
    });
  }

  /**
   * Log telehealth session started
   */
  static async logTelehealthSessionStarted(sessionId: string, patientName: string, practitionerName: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'telehealth_session_started',
      title: 'Telehealth Session Started',
      description: `Telehealth session started between ${patientName} and ${practitionerName}`,
      metadata: { sessionId, patientName, practitionerName }
    });
  }

  /**
   * Log telehealth session ended
   */
  static async logTelehealthSessionEnded(sessionId: string, patientName: string, practitionerName: string, duration: number, userId?: string) {
    return this.logActivity({
      userId,
      type: 'telehealth_session_ended',
      title: 'Telehealth Session Ended',
      description: `Telehealth session ended between ${patientName} and ${practitionerName} (Duration: ${duration} minutes)`,
      metadata: { sessionId, patientName, practitionerName, duration }
    });
  }

  /**
   * Log invoice created
   */
  static async logInvoiceCreated(invoiceId: string, patientName: string, amount: number, userId?: string) {
    return this.logActivity({
      userId,
      type: 'invoice_created',
      title: 'Invoice Created',
      description: `Invoice created for ${patientName} - $${amount.toFixed(2)}`,
      metadata: { invoiceId, patientName, amount }
    });
  }

  /**
   * Log invoice paid
   */
  static async logInvoicePaid(invoiceId: string, patientName: string, amount: number, paymentMethod: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'invoice_paid',
      title: 'Invoice Paid',
      description: `Invoice paid for ${patientName} - $${amount.toFixed(2)} via ${paymentMethod}`,
      metadata: { invoiceId, patientName, amount, paymentMethod }
    });
  }

  /**
   * Log payment processed
   */
  static async logPaymentProcessed(paymentId: string, amount: number, paymentMethod: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'payment_processed',
      title: 'Payment Processed',
      description: `Payment of $${amount.toFixed(2)} processed via ${paymentMethod}`,
      metadata: { paymentId, amount, paymentMethod }
    });
  }

  /**
   * Log donation received
   */
  static async logDonationReceived(donationId: string, donorName: string, amount: number, userId?: string) {
    return this.logActivity({
      userId,
      type: 'donation_received',
      title: 'Donation Received',
      description: `Donation received from ${donorName} - $${amount.toFixed(2)}`,
      metadata: { donationId, donorName, amount }
    });
  }

  /**
   * Log patient onboarding completed
   */
  static async logPatientOnboardingCompleted(patientId: string, patientName: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'patient_onboarding_completed',
      title: 'Patient Onboarding Completed',
      description: `Patient onboarding completed for ${patientName}`,
      metadata: { patientId, patientName }
    });
  }

  /**
   * Log admin onboarding completed
   */
  static async logAdminOnboardingCompleted(adminId: string, adminName: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'admin_onboarding_completed',
      title: 'Admin Onboarding Completed',
      description: `Admin onboarding completed for ${adminName}`,
      metadata: { adminId, adminName }
    });
  }

  /**
   * Log profile updated
   */
  static async logProfileUpdated(userId: string, userName: string, fieldsUpdated: string[]) {
    return this.logActivity({
      userId,
      type: 'profile_updated',
      title: 'Profile Updated',
      description: `Profile updated for ${userName} - Fields: ${fieldsUpdated.join(', ')}`,
      metadata: { userName, fieldsUpdated }
    });
  }

  /**
   * Log password changed
   */
  static async logPasswordChanged(userId: string, userName: string) {
    return this.logActivity({
      userId,
      type: 'password_changed',
      title: 'Password Changed',
      description: `Password changed for ${userName}`,
      metadata: { userName }
    });
  }

  /**
   * Log admin action
   */
  static async logAdminAction(adminId: string, adminName: string, action: string, details: string, metadata?: any) {
    return this.logActivity({
      userId: adminId,
      type: 'admin_action',
      title: 'Admin Action',
      description: `${action}: ${details}`,
      metadata: { adminName, action, details, ...metadata }
    });
  }

  /**
   * Log system event
   */
  static async logSystemEvent(event: string, description: string, metadata?: any) {
    return this.logActivity({
      type: 'system_event',
      title: 'System Event',
      description: `${event}: ${description}`,
      metadata: { event, description, ...metadata }
    });
  }

  /**
   * Log donation
   */
  static async logDonation(donationId: string, amount: number, email: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'donation_made',
      title: 'Donation Received',
      description: `Donation of $${amount} received from ${email}`,
      metadata: { donationId, amount, email }
    });
  }



  /**
   * Log message sent
   */
  static async logMessageSent(messageId: string, senderId: string, recipientId: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'message_sent',
      title: 'Message Sent',
      description: 'A new message was sent',
      metadata: { messageId, senderId, recipientId }
    });
  }

  /**
   * Log clinical note creation
   */
  static async logClinicalNoteCreated(noteId: string, patientId: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'clinical_note_created',
      title: 'Clinical Note Created',
      description: 'A new clinical note was created',
      metadata: { noteId, patientId }
    });
  }

  /**
   * Log document upload
   */
  static async logDocumentUploaded(documentId: string, fileName: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'document_uploaded',
      title: 'Document Uploaded',
      description: `Document "${fileName}" was uploaded`,
      metadata: { documentId, fileName }
    });
  }



  /**
   * Log quote creation
   */
  static async logQuoteCreated(quoteId: string, title: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'quote_created',
      title: 'Quote Created',
      description: `Quote "${title}" was created`,
      metadata: { quoteId, title }
    });
  }

  /**
   * Log quote update
   */
  static async logQuoteUpdated(quoteId: string, title: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'quote_updated',
      title: 'Quote Updated',
      description: `Quote "${title}" was updated`,
      metadata: { quoteId, title }
    });
  }

  /**
   * Log store order placement
   */
  static async logStoreOrderPlaced(orderId: string, orderNumber: string, amount: number, userId?: string) {
    return this.logActivity({
      userId,
      type: 'store_order_placed',
      title: 'Store Order Placed',
      description: `Order ${orderNumber} placed for $${amount}`,
      metadata: { orderId, orderNumber, amount }
    });
  }

  /**
   * Log store order update
   */
  static async logStoreOrderUpdated(orderId: string, orderNumber: string, status: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'store_order_updated',
      title: 'Store Order Updated',
      description: `Order ${orderNumber} status updated to ${status}`,
      metadata: { orderId, orderNumber, status }
    });
  }

  /**
   * Log member onboarding completion
   */
  static async logMemberOnboardingCompleted(onboardingId: string, email: string, userId?: string) {
    return this.logActivity({
      userId,
      type: 'member_onboarding_completed',
      title: 'Member Onboarding Completed',
      description: `Member onboarding completed for ${email}`,
      metadata: { onboardingId, email }
    });
  }

  /**
   * Log system notification
   */
  static async logSystemNotification(title: string, description: string, metadata?: any) {
    return this.logActivity({
      userId: null,
      type: 'system_notification',
      title,
      description,
      metadata
    });
  }

  /**
   * Get recent activities for a user
   */
  static async getUserActivities(userId: string, limit: number = 20) {
    try {
      const userActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.userId, userId))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
      
      return userActivities;
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  }

  /**
   * Get recent activities for admin dashboard
   */
  static async getRecentActivities(limit: number = 20, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const recentActivities = await db
        .select()
        .from(activities)
        .where(gte(activities.createdAt, startDate))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
      
      return recentActivities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  /**
   * Get activities by type
   */
  static async getActivitiesByType(type: string, limit: number = 20) {
    try {
      const typeActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.type, type as any))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
      
      return typeActivities;
    } catch (error) {
      console.error('Error fetching activities by type:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total activities in date range
      const [totalActivities] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(gte(activities.createdAt, startDate));

      // Get activities by type
      const activitiesByType = await db
        .select({
          type: activities.type,
          count: sql<number>`count(*)`
        })
        .from(activities)
        .where(gte(activities.createdAt, startDate))
        .groupBy(activities.type);

      return {
        totalActivities: totalActivities.count,
        activitiesByType
      };
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
}
