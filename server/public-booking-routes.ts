import { Router } from "express";
import { db } from "./db";
import { 
  publicBookings, 
  publicBookingUsers, 
  practitioners,
  users
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NotificationService } from "./notification-service";

const router = Router();
const notificationService = new NotificationService();

// Create a public booking
router.post("/", async (req, res) => {
  try {
    const {
      bookingLink,
      practitionerId,
      firstName,
      lastName,
      email,
      phone,
      message,
      service,
      appointmentDate,
      appointmentTime,
      notes
    } = req.body;

    // First, find the practitionerC
    const [practitioner] = await db
      .select()
      .from(practitioners)
      .where(eq(practitioners.id, practitionerId))
      .limit(1);

    if (!practitioner) {
      return res.status(404).json({
        success: false,
        message: "Practitioner not found"
      });
    }

    // Create or find the public booking user (guest)
    let publicBookingUser;
    const existingUser = await db
      .select()
      .from(publicBookingUsers)
      .where(eq(publicBookingUsers.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      publicBookingUser = existingUser[0];
    } else {
      // Create new guest user
      const [newUser] = await db
        .insert(publicBookingUsers)
        .values({
          firstName,
          lastName,
          email,
          phone,
          message,
          isGuest: true
        })
        .returning();
      
      publicBookingUser = newUser;
    }

    // Parse date and time - keep them separate
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const [timeHours, timeMinutes] = appointmentTime.split(':').map(Number);
    
    // Create date and time objects separately
    const appointmentDateObj = new Date(year, month - 1, day);
    const appointmentTimeObj = new Date();
    appointmentTimeObj.setHours(timeHours, timeMinutes, 0, 0);
    
    console.log('Creating public booking with:', {
      appointmentDate,
      appointmentTime,
      parsedDate: appointmentDateObj,
      parsedTime: appointmentTimeObj,
      dateString: appointmentDateObj.toISOString().split('T')[0],
      timeString: appointmentTimeObj.toTimeString().split(' ')[0],
      timeFormat: 'HH:mm (no seconds)'
    });

    // Create the public booking record in the separate public_bookings table
    const [publicBooking] = await db
      .insert(publicBookings)
      .values({
        bookingLink,
        practitionerId: practitioner.id,
        publicBookingUserId: publicBookingUser.id,
        service,
        appointmentDate: appointmentDate, // Store as date only
        appointmentTime: appointmentTime, // Store as time only
        status: "pending",
        notes
      })
      .returning();

    // Send notification to practitioner about the new public booking
    try {
      // Get practitioner's user information
      const [practitionerUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, practitioner.userId))
        .limit(1);

      if (practitionerUser) {
        // Create notification for the practitioner
        await notificationService.createNotification({
          userId: practitionerUser.id,
          type: 'appointment_created', // Use existing notification type until enum is updated
          priority: 'medium',
          title: 'New Public Booking Request',
          message: `${publicBookingUser.firstName} ${publicBookingUser.lastName} has requested an appointment for ${appointmentDate} at ${appointmentTime}`,
          actionUrl: `/practitioner/public-bookings`,
          metadata: {
            bookingId: publicBooking.id,
            patientName: `${publicBookingUser.firstName} ${publicBookingUser.lastName}`,
            patientEmail: publicBookingUser.email,
            appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            service: service,
            bookingType: 'public_booking'
          }
        });

        console.log(`Notification sent to practitioner ${practitionerUser.id} for new public booking ${publicBooking.id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification to practitioner:', notificationError);
      // Don't fail the booking creation if notification fails
    }

    res.status(201).json({
      success: true,
      data: {
        publicBookingUser,
        publicBooking
      }
    });

  } catch (error) {
    console.error("Error creating public booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking"
    });
  }
});

// Get public bookings by practitioner
router.get("/practitioner/:practitionerId", async (req, res) => {
  try {
    const { practitionerId } = req.params;

    const bookings = await db
      .select({
        booking: publicBookings,
        user: publicBookingUsers
      })
      .from(publicBookings)
      .leftJoin(publicBookingUsers, eq(publicBookings.publicBookingUserId, publicBookingUsers.id))
      .where(eq(publicBookings.practitionerId, practitionerId))
      .orderBy(desc(publicBookings.createdAt));

    res.json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error("Error fetching public bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings"
    });
  }
});

// Get all public bookings (for admin/staff)
router.get("/", async (req, res) => {
  try {
    const { status, practitionerId, page = 1, limit = 20 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = undefined;
    
    if (status) {
      whereClause = eq(publicBookings.status, status as string);
    }
    
    if (practitionerId) {
      whereClause = whereClause 
        ? and(whereClause, eq(publicBookings.practitionerId, practitionerId as string))
        : eq(publicBookings.practitionerId, practitionerId as string);
    }

    const bookings = await db
      .select({
        booking: publicBookings,
        user: publicBookingUsers,
        practitioner: practitioners
      })
      .from(publicBookings)
      .leftJoin(publicBookingUsers, eq(publicBookings.publicBookingUserId, publicBookingUsers.id))
      .leftJoin(practitioners, eq(publicBookings.practitionerId, practitioners.id))
      .where(whereClause)
      .orderBy(desc(publicBookings.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(publicBookings)
      .where(whereClause);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / Number(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching all public bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings"
    });
  }
});

// Update public booking status (Accept/Reject)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ["pending", "accepted", "rejected", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: pending, accepted, rejected, cancelled"
      });
    }

    const [updatedBooking] = await db
      .update(publicBookings)
      .set({ 
        status, 
        notes: notes || undefined,
        updatedAt: new Date() 
      })
      .where(eq(publicBookings.id, id))
      .returning();

    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        message: "Public booking not found"
      });
    }

    // Get user details for notification
    const [bookingWithUser] = await db
      .select({
        booking: publicBookings,
        user: publicBookingUsers
      })
      .from(publicBookings)
      .leftJoin(publicBookingUsers, eq(publicBookings.publicBookingUserId, publicBookingUsers.id))
      .where(eq(publicBookings.id, id))
      .limit(1);

    // Send notification to the patient about the booking status update
    if (bookingWithUser && (status === 'accepted' || status === 'rejected')) {
      try {
        const notificationType = status === 'accepted' ? 'appointment_updated' : 'appointment_cancelled';
        const notificationTitle = status === 'accepted' ? 'Appointment Confirmed' : 'Appointment Request Declined';
        const notificationMessage = status === 'accepted' 
          ? `Your appointment request for ${updatedBooking.appointmentDate} at ${updatedBooking.appointmentTime} has been confirmed.`
          : `Your appointment request for ${updatedBooking.appointmentDate} at ${updatedBooking.appointmentTime} has been declined.`;

        // Note: Since this is a public booking user (guest), we can't send in-app notifications
        // But we could send email notifications if we have their email
        if (bookingWithUser.user && bookingWithUser.user.email) {
          // For now, we'll just log that we would send an email
          console.log(`Would send ${status} notification email to: ${bookingWithUser.user.email}`);
          console.log(`Email content: ${notificationMessage}`);
          
          // TODO: Implement email notification for public booking users
          // This would require setting up a separate email notification system for guests
        }
      } catch (notificationError) {
        console.error('Error handling patient notification:', notificationError);
        // Don't fail the status update if notification fails
      }
    }

    res.json({
      success: true,
      data: bookingWithUser,
      message: `Booking ${status} successfully`
    });

  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking status"
    });
  }
});

// Get public booking by ID with user details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [booking] = await db
      .select({
        booking: publicBookings,
        user: publicBookingUsers
      })
      .from(publicBookings)
      .leftJoin(publicBookingUsers, eq(publicBookings.publicBookingUserId, publicBookingUsers.id))
      .where(eq(publicBookings.id, id))
      .limit(1);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Public booking not found"
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error("Error fetching public booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking"
    });
  }
});

// Delete public booking
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [booking] = await db
      .delete(publicBookings)
      .where(eq(publicBookings.id, id))
      .returning();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Public booking not found"
      });
    }

    res.json({
      success: true,
      message: "Public booking deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting public booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete booking"
    });
  }
});

export default router;
