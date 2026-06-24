import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { db } from "./db";
import { integrationService } from "./integration-service";
import { notificationService } from "./notification-service";
import { emailService } from "./email-service";
import { cacheService } from "./cache-service";
import { wsServer } from "./websocket-server";
import notificationRoutes from "./notification-routes";
import publicBookingRoutes from "./public-booking-routes";
import versionRoutes from "./routes/version-routes";
import { ActivityService } from "./activity-service";
import { eq, and, gte, lte, ilike, or, lt, desc, asc, count, sum, sql, isNull } from "drizzle-orm";
import { users, patients, practitioners, appointments, clinicalNotes, invoices, messages, telehealthSessions, systemSettings, userPreferences, calendarSettings, bookingSettings, oauthIntegrations, telehealthAuditLogs, quotes, donations, memberOnboarding, storeOrders, activities, events } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertPatientSchema, insertAppointmentSchema, insertClinicalNoteSchema, insertInvoiceSchema, insertMessageSchema, insertTelehealthSessionSchema, insertSystemSettingsSchema, insertUserPreferencesSchema, insertCalendarSettingsSchema, insertMemberOnboardingSchema } from "@shared/schema";
import { format } from "date-fns";
import { isSameDay } from "date-fns";
import { toZonedTime, format as formatTz } from "date-fns-tz";
import { DateTime } from "luxon";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { google } from 'googleapis';
import PrintfulService from './printful-service';

// Initialize Google Calendar API
const calendar = google.calendar('v3');

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper function to map message priorities to notification priorities
function mapMessagePriorityToNotificationPriority(messagePriority: string): 'low' | 'medium' | 'high' | 'urgent' {
  switch (messagePriority) {
    case 'low':
      return 'low';
    case 'normal':
      return 'low';
    case 'high':
      return 'high';
    case 'urgent':
      return 'high'; // Map urgent to high since notifications don't have urgent
    default:
      return 'medium';
  }
}

// Timezone conversion utility functions
const convertUTCToLocal = (utcTime: string | Date, timezone: string): string => {
  try {
    const utcDate = typeof utcTime === 'string' ? new Date(utcTime) : utcTime;
    const localDate = toZonedTime(utcDate, timezone);
    const localTime = formatTz(localDate, 'MMM d, yyyy h:mm a', { timeZone: timezone });
    
    console.log(`convertUTCToLocal: ${utcDate.toISOString()} → ${localTime} (${timezone})`);
    return localTime;
  } catch (error) {
    console.error(`Error converting UTC to local time for timezone ${timezone}:`, error);
    // Fallback to UTC formatting if conversion fails
    const utcDate = typeof utcTime === 'string' ? new Date(utcTime) : utcTime;
    return format(utcDate, 'MMM d, yyyy h:mm a') + ' UTC';
  }
};

const convertLocalToUTC = (localTime: string, timezone: string, date: Date = new Date()): string => {
  try {
    // Parse the time string (e.g., "09:00") and create a date in the specified timezone
    const [hours, minutes] = localTime.split(':').map(Number);
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);
    
    const utcDate = toZonedTime(localDate, timezone);
    
    console.log(`convertLocalToUTC: ${localTime} (${timezone}) → ${utcDate.toISOString()}`);
    return utcDate.toISOString();
  } catch (error) {
    console.error(`Error converting local time to UTC for timezone ${timezone}:`, error);
    throw error;
  }
};

// Helper function to get user's timezone preference
const getUserTimezone = async (userId: string): Promise<string> => {
  try {
    const preferences = await storage.getUserPreferences(userId);
    return preferences?.timezone || 'UTC';
  } catch (error) {
    console.error(`Error getting timezone for user ${userId}:`, error);
    return 'UTC';
  }
};

// Helper function to create Google Calendar event
const createGoogleCalendarEvent = async (eventData: any) => {
  try {
    // Get the practitioner's Google OAuth credentials
    const practitionerId = eventData.attendees[1]?.email; // Practitioner is second attendee
    const practitioner = await storage.getPractitionerByEmail(practitionerId);
    
    if (!practitioner) {
      throw new Error('Practitioner not found');
    }
    
    // Get Google OAuth integration for the practitioner
    const googleIntegration = await storage.getOAuthIntegrationByProviderAndUserId('google', practitioner.userId);
    
    if (!googleIntegration || !googleIntegration.accessToken) {
      throw new Error('Google OAuth integration not found or access token expired');
    }
    
    // Set up Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: googleIntegration.accessToken,
      refresh_token: googleIntegration.refreshToken
    });
    
    // Create calendar event
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: 'primary',
      requestBody: eventData,
      conferenceDataVersion: 1
    });
    
    console.log('Google Calendar event created successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
};

// Lazy initialize Stripe only when needed
let stripe: Stripe | null = null;

const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe secret key not configured. Payment features will be disabled.');
      return null;
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-07-30.basil",
    });
  }
  return stripe;
};

// Welcome Email Function
async function sendWelcomeEmail(user: any) {
  try {
    // Only send email if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`Welcome email skipped - SMTP not configured. User: ${user.email}`);
      return;
    }



    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Get role-specific content
    const roleContent = getRoleSpecificWelcomeContent(user.role);

    // Create welcome email body content
    const bodyContent = `
      <h2>Hello ${user.firstName}!</h2>
      
      <p>
        Thank you for joining TiNHiH Portal! We're excited to have you as part of our healthcare community. 
        Your account has been successfully created and you can now access all the features designed specifically for ${roleContent.roleDisplayName.toLowerCase()}s.
      </p>

      <h3>What you can do as a ${roleContent.roleDisplayName}:</h3>
      <ul>
        ${roleContent.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>

      <h3>Quick Start Guide:</h3>
      <ol>
        ${roleContent.quickStart.map(step => `<li>${step}</li>`).join('')}
        </ol>

      <h3>Your Account Details:</h3>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${roleContent.roleDisplayName}</p>
      <p><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</p>
    `;

    // Generate email using unified template
    const emailTemplate = createEmailTemplate({
      subject: `Welcome to TiNHiH Portal, ${user.firstName}!`,
      preheader: `Your healthcare management journey starts here. Welcome to TiNHiH Portal!`,
      title: `Welcome to TiNHiH Portal!`,
      body: bodyContent,
      ctaButton: {
        text: 'Access Your Dashboard',
        url: `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/login`
      }
    });

    // Email options
    const mailOptions = {
      from: `"TiNHiH Portal" <${process.env.FROM_EMAIL || 'noreply@tinhih.com'}>`,
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to ${user.email} (${user.role})`);

  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${user.email}:`, error);
    // Don't throw error - registration should still succeed even if email fails
  }
}

// Get role-specific welcome content
function getRoleSpecificWelcomeContent(role: string) {
  switch (role) {
    case 'patient':
      return {
        roleDisplayName: 'Patient',
        features: [
          '📅 Schedule and manage your appointments online',
          '📋 Access your medical records and test results',
          '💬 Communicate securely with your healthcare providers',
          '💳 View and pay your medical bills online',
          '🎥 Participate in telehealth consultations',
          '📱 Receive appointment reminders and health updates'
        ],
        quickStart: [
          'Complete your patient profile with medical history and insurance information',
          'Browse available healthcare providers and their specialties',
          'Schedule your first appointment at a convenient time',
          'Set up your communication preferences for reminders'
        ]
      };
    
    case 'practitioner':
      return {
        roleDisplayName: 'Healthcare Practitioner',
        features: [
          '👥 Manage your patient roster and medical records',
          '📅 Control your schedule and appointment availability',
          '📝 Create and manage Recovery Notes and treatment plans',
          '💰 Handle billing and invoice management',
          '🎥 Conduct secure telehealth consultations',
          '📊 Access comprehensive patient analytics and reports'
        ],
        quickStart: [
          'Complete your practitioner profile with credentials and specializations',
          'Set up your calendar availability and appointment preferences',
          'Review the clinical documentation tools and templates',
          'Configure your billing rates and payment methods'
        ]
      };
    
    case 'staff':
      return {
        roleDisplayName: 'Staff Member',
        features: [
          '📞 Manage patient appointments and scheduling',
          '💳 Process billing and handle payment inquiries',
          '📋 Assist with patient registration and data management',
          '📊 Generate reports and manage administrative tasks',
          '💬 Handle patient communications and support requests',
          '🔧 Access administrative tools and system settings'
        ],
        quickStart: [
          'Familiarize yourself with the administrative dashboard',
          'Learn the appointment scheduling and management system',
          'Review billing processes and payment handling procedures',
          'Set up your communication preferences and notifications'
        ]
      };
    
    case 'admin':
      return {
        roleDisplayName: 'Administrator',
        features: [
          '🏥 Manage entire healthcare facility operations',
          '👥 Oversee all users, practitioners, and staff members',
          '📊 Access comprehensive analytics and system reports',
          '⚙️ Configure system settings and organizational preferences',
          '🔐 Manage security settings and user permissions',
          '📈 Monitor system performance and usage statistics'
        ],
        quickStart: [
          'Review the administrative dashboard and system overview',
          'Configure organizational settings and preferences',
          'Set up user roles and permission structures',
          'Review security settings and backup procedures'
        ]
      };
    
    default:
      return {
        roleDisplayName: 'User',
        features: [
          '🏥 Access healthcare management tools',
          '📱 Manage your health information securely',
          '💬 Communicate with healthcare providers',
          '📊 Track your healthcare journey'
        ],
        quickStart: [
          'Complete your user profile',
          'Explore the available features',
          'Set up your preferences',
          'Contact support if you need assistance'
        ]
      };
  }
}

// Unified Email Template System
function createEmailTemplate(content: {
  subject: string;
  preheader?: string;
  title: string;
  body: string;
  ctaButton?: {
    text: string;
    url: string;
  };
}) {
  return {
    subject: content.subject,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.subject}</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
        
        <h1>${content.title}</h1>
        
            ${content.body}
            
            ${content.ctaButton ? `
        <p style="margin: 30px 0;">
              <a href="${content.ctaButton.url}" 
                 style="background: #ffdd00; 
                    color: #000; padding: 12px 24px; text-decoration: none; 
                    border-radius: 4px; display: inline-block; font-weight: bold;">
                ${content.ctaButton.text}
              </a>
              </p>
            ` : ''}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;">
        
        <p style="color: #666; font-size: 12px;">
          TiNHiH Portal - Mental Health & Wellness Platform<br>
          Questions? Contact us at support@tinhih.com
        </p>
        
      </body>
      </html>
    `
  };
}

// Middleware to verify JWT token
const verifyToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create patient, practitioner, or member profile based on role
      if (user.role === "patient") {
        try {
          await storage.createPatient({
            userId: user.id,
            dateOfBirth: null, // Required field, set to null for now
          });
        } catch (patientError) {
          console.error("Patient creation error:", patientError);
          // Delete the user if patient creation fails
          await storage.updateUser(user.id, { isActive: false });
          return res.status(400).json({ message: "Failed to create patient profile" });
        }
      } else if (user.role === "practitioner") {
        try {
          await storage.createPractitioner({
            userId: user.id,
          });
        } catch (practitionerError) {
          console.error("Practitioner creation error:", practitionerError);
          // Delete the user if practitioner creation fails
          await storage.updateUser(user.id, { isActive: false });
          return res.status(400).json({ message: "Failed to create practitioner profile" });
        }
      } else if (user.role === "member") {
        // For members, we don't create additional profiles - they just get access to the member portal
        // The member onboarding form will collect additional information later
        console.log("Member registered successfully:", user.email);
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // Log user registration activity
      try {
        await ActivityService.logUserRegistration(
          user.id, 
          user.email, 
          req.ip, 
          req.get('User-Agent')
        );
      } catch (activityError) {
        console.error("Failed to log user registration activity:", activityError);
        // Don't fail registration if activity logging fails
      }

      // Send welcome email
      await sendWelcomeEmail(user);

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Registration failed" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated. Please contact support for assistance." });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Log user login activity
      try {
        await ActivityService.logUserLogin(
          user.id, 
          user.email, 
          req.ip, 
          req.get('User-Agent')
        );
      } catch (activityError) {
        console.error("Failed to log user login activity:", activityError);
        // Don't fail login if activity logging fails
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      let profile = null;

      if (user.role === "patient") {
        profile = await storage.getPatientByUserId(user.id);
      } else if (user.role === "practitioner") {
        profile = await storage.getPractitionerByUserId(user.id);
      } else if (user.role === "member") {
        // For members, we don't have a separate profile table, so just return the user data
        profile = null;
      }

      res.json({
        success: true,
        user: { ...user, password: undefined },
        profile,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to get user data" 
      });
    }
  });

  // Test email functionality (development only)
  app.post("/api/auth/test-email", async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log('🧪 Testing email configuration...');
      
      // Create email transporter
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(400).json({ 
          message: "SMTP credentials not configured",
          debug: {
            SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
            SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
            SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
            SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
            FROM_EMAIL: process.env.FROM_EMAIL || 'NOT SET'
          }
        });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Test connection first
      try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
      } catch (verifyError: any) {
        console.error('❌ SMTP connection failed:', verifyError);
        return res.status(500).json({ 
          message: "SMTP connection failed",
          error: verifyError.message,
          code: verifyError.code
        });
      }

      // Create test email using unified template
      const testBodyContent = `
        <h2>Email Configuration Test</h2>
        
        <p>
          Congratulations! Your email configuration is working correctly. This test email confirms that 
          TiNHiH Portal can successfully send emails for password resets, welcome messages, and other important notifications.
        </p>

        <h3>Test Results</h3>
        <ul>
          <li>SMTP Connection: <strong>Successful</strong></li>
          <li>Email Delivery: <strong>Working</strong></li>
          <li>Template Rendering: <strong>Perfect</strong></li>
          <li>Authentication: <strong>Verified</strong></li>
          </ul>

        <h3>Configuration Details</h3>
        <ul>
          <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
          <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
          <li><strong>From Email:</strong> ${process.env.FROM_EMAIL}</li>
          <li><strong>Test Time:</strong> ${new Date()}</li>
          <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
            </ul>

        <h3>Next Steps</h3>
        <p>
            Your email system is ready! You can now test the forgot password functionality and other email features 
            with confidence knowing that emails will be delivered successfully.
          </p>
      `;

      const testEmailTemplate = createEmailTemplate({
        subject: 'TiNHiH Portal - Email Configuration Test',
        preheader: 'Email configuration test successful - your system is ready!',
        title: 'Email Test Successful',
        body: testBodyContent
      });

      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL || 'noreply@tinhih.com'}>`,
        to: email,
        subject: testEmailTemplate.subject,
        html: testEmailTemplate.html,
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response: ${info.response}`);

      res.json({ 
        message: "Test email sent successfully!",
        messageId: info.messageId,
        response: info.response,
        debug: {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject
        }
      });

    } catch (error: any) {
      console.error("❌ Test email failed:", error);
      res.status(500).json({ 
        message: "Test email failed",
        error: error.message,
        code: error.code
      });
    }
  });

  // Forgot password functionality
  app.post("/api/auth/forgot-password", async (req, res) => {
    // Add request timeout to prevent 504 Gateway Timeout
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error("⏰ Forgot password request timeout after 60 seconds");
        res.status(504).json({ 
          message: "Request timeout. Please try again later.",
          error: "REQUEST_TIMEOUT"
        });
      }
    }, 60000); // 60 seconds timeout

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Better UX: Let user know the email is not found
        return res.status(404).json({ 
          message: "No account found with this email address. Please check your email or create a new account.",
          code: "USER_NOT_FOUND"
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(400).json({ 
          message: "This account is currently inactive. Please contact support for assistance.",
          code: "ACCOUNT_INACTIVE"
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in user record (you might want to add these fields to your schema)
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Create email transporter (only if email is configured)
      let transporter = null;
      console.log(process.env.SMTP_USER, process.env.SMTP_PASS, process.env.SMTP_HOST, process.env.SMTP_PORT);
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const isSecure = smtpPort === 465;
        
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
          port: smtpPort,
          secure: isSecure, // true for 465, false for 587
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          // Add timeout configurations to prevent hanging
          connectionTimeout: 10000, // 10 seconds
          greetingTimeout: 10000,   // 10 seconds
          socketTimeout: 15000,     // 15 seconds
          // Retry configuration
          maxConnections: 1,
          maxMessages: 3,
          rateLimit: 3, // max 3 messages per second
          // Fix SSL/TLS issues for port 587
          ...(smtpPort === 587 && {
            tls: {
              rejectUnauthorized: false,
              ciphers: 'SSLv3'
            },
            requireTLS: true,
            ignoreTLS: false
          })
        });
      }

      // Create reset URL
      const resetUrl = `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      console.log(resetUrl);
      
      // Create password reset email body content
      const bodyContent = `
        <h2>Hello ${user.firstName},</h2>
        
        <p>
          We received a request to reset your password for your TiNHiH Portal account. 
          If you didn't make this request, you can safely ignore this email and your password will remain unchanged.
        </p>

        <h3>Security Notice</h3>
        <p>
            For your security, this password reset link will expire in <strong>1 hour</strong>. 
            If you need a new link after it expires, please request another password reset.
          </p>

        <h3>Next Steps:</h3>
        <ol>
          <li>Click the "Reset Password" button below</li>
          <li>Create a new secure password</li>
          <li>Sign in with your new password</li>
          </ol>

        <p>
            <strong>Button not working?</strong> Copy and paste this link into your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
              </p>
      `;

      // Generate email using unified template
      const emailTemplate = createEmailTemplate({
        subject: 'Password Reset Request - TiNHiH Portal',
        preheader: `Reset your TiNHiH Portal password securely. Link expires in 1 hour.`,
        title: 'Password Reset Request',
        body: bodyContent,
        ctaButton: {
          text: 'Reset Password',
          url: resetUrl
        }
      });

      // Email options
      const mailOptions = {
        from: `"TiNHiH Portal" <${process.env.FROM_EMAIL || 'noreply@tinhih.com'}>`,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      };

      // Debug SMTP configuration
      console.log('🔧 SMTP Configuration Debug:');
      console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
      console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
      console.log(`   SMTP_USER: ${process.env.SMTP_USER ? 'SET' : 'NOT SET'}`);
      console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? 'SET (hidden)' : 'NOT SET'}`);
      console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}`);
      console.log(`   CLIENT_BASE_URL: ${process.env.CLIENT_BASE_URL || 'NOT SET'}`);

      // Send email (only if email is configured)
      if (transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          console.log(`📧 Attempting to send password reset email to: ${email}`);
          console.log(`   From: ${mailOptions.from}`);
          console.log(`   Subject: ${mailOptions.subject}`);
          
          // Add timeout wrapper to prevent hanging
          const emailPromise = transporter.sendMail(mailOptions);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000);
          });
          
          const info = await Promise.race([emailPromise, timeoutPromise]) as any;
          console.log(`✅ Password reset email sent successfully!`);
          console.log(`   Message ID: ${info.messageId}`);
          console.log(`   Response: ${info.response}`);
          
          // Test transporter connection with timeout
          const verifyPromise = transporter.verify();
          const verifyTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SMTP verification timeout after 10 seconds')), 10000);
          });
          
          await Promise.race([verifyPromise, verifyTimeoutPromise]);
          console.log('✅ SMTP connection verified successfully');
          
        } catch (emailError: any) {
          console.error("❌ Email sending failed:", emailError);
          console.error("   Error code:", emailError.code);
          console.error("   Error message:", emailError.message);
          
          // Check if it's a timeout error
          if (emailError.message.includes('timeout')) {
            console.error("   ⏰ Timeout detected - email service may be slow or unavailable");
          }
          
          // In development, we can still proceed without email but show the link
          if (process.env.NODE_ENV === 'development') {
            console.log(`\n🔗 DEVELOPMENT MODE - Password Reset Link (email failed):`);
            console.log(`   ${resetUrl}`);
            console.log(`   Token: ${resetToken}`);
            console.log(`   Expires: ${resetTokenExpiry}\n`);
          }
          
          // Return error to user in production
          if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({ 
              message: "Failed to send password reset email. Please try again later or contact support.",
              error: "EMAIL_SEND_FAILED",
              details: emailError.message.includes('timeout') ? "Email service timeout - please try again" : "Email service error"
            });
          }
        }
      } else {
        console.log(`⚠️ Email not configured properly. Missing SMTP credentials.`);
        console.log(`   SMTP_USER: ${process.env.SMTP_USER ? 'SET' : 'MISSING'}`);
        console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? 'SET' : 'MISSING'}`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`\n🔗 DEVELOPMENT MODE - Password Reset Link (no email config):`);
          console.log(`   ${resetUrl}`);
          console.log(`   Token: ${resetToken}`);
          console.log(`   Expires: ${resetTokenExpiry}\n`);
        } else {
          // In production, return error if email is not configured
          return res.status(500).json({ 
            message: "Email service is not configured. Please contact support.",
            error: "EMAIL_NOT_CONFIGURED"
          });
        }
      }

      // Clear the request timeout since we're about to send a response
      clearTimeout(requestTimeout);
      
      res.json({ 
        message: "Password reset email sent successfully!", 
        details: "Please check your email inbox (and spam folder) for instructions. The reset link will expire in 1 hour.",
        email: email 
      });
    } catch (error) {
      // Clear the request timeout since we're about to send an error response
      clearTimeout(requestTimeout);
      
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Find user by reset token
      const [user] = await db.select().from(users).where(eq(users.resetToken, token));
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (user.resetTokenExpiry && new Date() > new Date(user.resetTokenExpiry)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user with new password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User Settings Routes
  app.put("/api/auth/profile", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      const { firstName, lastName, phone } = req.body;

      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      // Update user profile (email cannot be changed for security)
      const updatedUser = await storage.updateUser(user.id, {
        firstName,
        lastName,
        phone,
        updatedAt: new Date(),
      });

      res.json({ 
        success: true,
        message: "Profile updated successfully",
        user: { ...updatedUser, password: undefined }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/auth/change-password", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(user.id, {
        password: hashedPassword,
        updatedAt: new Date(),
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.post("/api/auth/upload-profile-image", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      // For now, we'll accept a base64 image and store it
      // In a production environment, you'd want to use proper file upload middleware like multer
      const { imageData, fileName } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }

      // Validate that it's a base64 image
      if (!imageData.startsWith('data:image/')) {
        return res.status(400).json({ message: "Invalid image format" });
      }

      // Validate base64 data size (max 8MB for base64 encoded data)
      const base64Data = imageData.split(',')[1]; // Remove data:image/...;base64, prefix
      if (!base64Data) {
        return res.status(400).json({ message: "Invalid base64 data" });
      }

      // Calculate approximate file size (base64 is ~33% larger than original)
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
      const maxSizeInBytes = 8 * 1024 * 1024; // 8MB

      if (sizeInBytes > maxSizeInBytes) {
        return res.status(400).json({ 
          message: "Image file too large. Maximum size is 8MB.",
          size: Math.round(sizeInBytes / 1024 / 1024 * 100) / 100 + "MB"
        });
      }

      // For now, we'll store the base64 data directly in the user record
      // In production, you'd want to save to a file system or cloud storage
      await storage.updateUser(user.id, {
        profileImage: imageData,
        updatedAt: new Date(),
      });

      res.json({ 
        success: true,
        message: "Profile image uploaded successfully",
        profileImage: imageData
      });
    } catch (error) {
      console.error("Upload profile image error:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });

  app.put("/api/auth/two-factor", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      const { enabled } = req.body;

      // For now, just store the preference in user record
      // In a real implementation, you'd integrate with TOTP library
      await storage.updateUser(user.id, {
        twoFactorEnabled: enabled,
        updatedAt: new Date(),
      });

      res.json({ 
        enabled,
        message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
        note: "Full 2FA implementation would require TOTP integration"
      });
    } catch (error) {
      console.error("Toggle 2FA error:", error);
      res.status(500).json({ message: "Failed to update two-factor authentication settings" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      let practitionerId = null;

      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        practitionerId = practitioner?.id;
      }

      // Get date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let totalPatientsQuery = db.select({ count: count() }).from(patients);
      let todayAppointmentsQuery = db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, today),
            lt(appointments.appointmentDate, tomorrow)
          )
        );

      // Filter by role
      if (user.role === "patient") {
        // Patients see only their own data
        const [totalPatientsResult] = await db.select({ count: sql<number>`1` }).from(patients).where(eq(patients.userId, user.id));
        const [todayAppointmentsResult] = await db
          .select({ count: count() })
          .from(appointments)
          .where(
            and(
              eq(appointments.patientId, user.id),
              gte(appointments.appointmentDate, today),
              lt(appointments.appointmentDate, tomorrow)
            )
          );
        
        return res.json({
          totalPatients: totalPatientsResult?.count || 0,
          todayAppointments: todayAppointmentsResult?.count || 0,
          totalRevenue: 0,
          paidRevenue: 0,
          outstandingRevenue: 0,
        });
      } else if (user.role === "practitioner" && practitionerId) {
        // Practitioners see only their own patients and appointments
        const [totalPatientsResult] = await db
          .select({ count: count() })
          .from(patients)
          .where(eq(patients.userId, user.id));
        
        const [todayAppointmentsResult] = await db
          .select({ count: count() })
          .from(appointments)
          .where(
            and(
              eq(appointments.practitionerId, practitionerId),
              gte(appointments.appointmentDate, today),
              lt(appointments.appointmentDate, tomorrow)
            )
          );

        // Get practitioner's revenue
        const [totalRevenueResult] = await db
          .select({ 
            total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
          })
          .from(invoices)
          .where(eq(invoices.practitionerId, practitionerId));

        const [paidRevenueResult] = await db
          .select({ 
            total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.practitionerId, practitionerId),
              eq(invoices.status, "paid")
            )
          );

        const totalRevenue = Number(totalRevenueResult.total || 0);
        const paidRevenue = Number(paidRevenueResult.total || 0);
        const outstandingRevenue = totalRevenue - paidRevenue;

        return res.json({
          totalPatients: totalPatientsResult?.count || 0,
          todayAppointments: todayAppointmentsResult?.count || 0,
          totalRevenue: totalRevenue,
          paidRevenue: paidRevenue,
          outstandingRevenue: outstandingRevenue,
        });
      }

      // Admin and staff see all data
      const [totalPatientsResult] = await db.select({ count: count() }).from(patients);
      const [todayAppointmentsResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, today),
            lt(appointments.appointmentDate, tomorrow)
          )
        );

      // Revenue calculations (only for admin, staff, and practitioners)
      let totalRevenue = 0;
      let paidRevenue = 0;
      let outstandingRevenue = 0;

      if (user.role !== "patient") {
        let revenueQuery = db
          .select({ 
            total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
          })
          .from(invoices);

        let paidRevenueQuery = db
          .select({ 
            total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
          })
          .from(invoices)
          .where(eq(invoices.status, "paid"));

        if (user.role === "practitioner" && practitionerId) {
          // Practitioners see only their own revenue
          revenueQuery = revenueQuery.where(eq(invoices.practitionerId, practitionerId));
          paidRevenueQuery = paidRevenueQuery.where(eq(invoices.practitionerId, practitionerId));
        }
        // Admin and staff see all revenue

        const [totalRevenueResult] = await revenueQuery;
        const [paidRevenueResult] = await paidRevenueQuery;

        totalRevenue = Number(totalRevenueResult.total || 0);
        paidRevenue = Number(paidRevenueResult.total || 0);
        outstandingRevenue = totalRevenue - paidRevenue;
      }

      res.json({
        totalPatients: totalPatientsResult?.count || 0,
        todayAppointments: todayAppointmentsResult?.count || 0,
        totalRevenue: totalRevenue,
        paidRevenue: paidRevenue,
        outstandingRevenue: outstandingRevenue,
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Dashboard insights endpoint
  app.get("/api/dashboard/insights", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      let practitionerId = null;

      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        practitionerId = practitioner?.id;
      }

      // Calculate insights with growth percentages
      const currentDate = new Date();
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      let currentPatientsQuery = db.select({ count: count() }).from(patients)
        .where(gte(patients.createdAt, currentMonth));
      
      let previousPatientsQuery = db.select({ count: count() }).from(patients)
        .where(and(
          gte(patients.createdAt, previousMonth),
          lte(patients.createdAt, previousMonthEnd)
        ));

      let currentAppointmentsQuery = db.select({ count: count() }).from(appointments)
        .where(gte(appointments.createdAt, currentMonth));
      
      let previousAppointmentsQuery = db.select({ count: count() }).from(appointments)
        .where(and(
          gte(appointments.createdAt, previousMonth),
          lte(appointments.createdAt, previousMonthEnd)
        ));

      let currentRevenueQuery = db.select({ 
        total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
      }).from(invoices)
        .where(and(
          gte(invoices.createdAt, currentMonth),
          eq(invoices.status, "paid")
        ));
      
      let previousRevenueQuery = db.select({ 
        total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
      }).from(invoices)
        .where(and(
          gte(invoices.createdAt, previousMonth),
          lte(invoices.createdAt, previousMonthEnd),
          eq(invoices.status, "paid")
        ));

      // Filter by practitioner if not admin
      if (user.role !== "admin" && practitionerId) {
        currentAppointmentsQuery = currentAppointmentsQuery.where(eq(appointments.practitionerId, practitionerId)) as any;
        previousAppointmentsQuery = previousAppointmentsQuery.where(eq(appointments.practitionerId, practitionerId)) as any;
        currentRevenueQuery = currentRevenueQuery.where(eq(invoices.practitionerId, practitionerId)) as any;
        previousRevenueQuery = previousRevenueQuery.where(eq(invoices.practitionerId, practitionerId)) as any;
      }

      const [currentPatients, previousPatients, currentAppointments, previousAppointments, currentRevenue, previousRevenue] = await Promise.all([
        currentPatientsQuery,
        previousPatientsQuery,
        currentAppointmentsQuery,
        previousAppointmentsQuery,
        currentRevenueQuery,
        previousRevenueQuery
      ]);

      const currentPatientsCount = currentPatients[0]?.count || 0;
      const previousPatientsCount = previousPatients[0]?.count || 0;
      const currentAppointmentsCount = currentAppointments[0]?.count || 0;
      const previousAppointmentsCount = previousAppointments[0]?.count || 0;
      const currentRevenueAmount = Number(currentRevenue[0]?.total || 0);
      const previousRevenueAmount = Number(previousRevenue[0]?.total || 0);

      // Calculate growth percentages
      const patientsGrowth = previousPatientsCount > 0 ? 
        ((currentPatientsCount - previousPatientsCount) / previousPatientsCount) * 100 : 0;
      
      const appointmentsGrowth = previousAppointmentsCount > 0 ? 
        ((currentAppointmentsCount - previousAppointmentsCount) / previousAppointmentsCount) * 100 : 0;
      
      const revenueGrowth = previousRevenueAmount > 0 ? 
        ((currentRevenueAmount - previousRevenueAmount) / previousRevenueAmount) * 100 : 0;

      res.json({
        patientsGrowth,
        appointmentsGrowth,
        revenueGrowth,
        currentMonth: {
          totalPatients: currentPatientsCount,
          totalAppointments: currentAppointmentsCount,
          totalRevenue: currentRevenueAmount,
        },
        previousMonth: {
          totalPatients: previousPatientsCount,
          totalAppointments: previousAppointmentsCount,
          totalRevenue: previousRevenueAmount,
        }
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/dashboard/today-appointments", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      let practitionerId = null;

      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        practitionerId = practitioner?.id;
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let appointmentsQuery = db
        .select({
          id: appointments.id,
          title: appointments.title,
          appointmentDate: appointments.appointmentDate,
          duration: appointments.duration,
          status: appointments.status,
          type: appointments.type,
          notes: appointments.notes,
          patientId: appointments.patientId,
          practitionerId: appointments.practitionerId,
        })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, today),
            lt(appointments.appointmentDate, tomorrow)
          )
        )
        .orderBy(appointments.appointmentDate);

      // Filter by role
      if (user.role === "patient") {
        // Patients see only their own appointments
        appointmentsQuery = appointmentsQuery.where(eq(appointments.patientId, user.id));
      } else if (user.role === "practitioner" && practitionerId) {
        // Practitioners see only their own appointments
        appointmentsQuery = appointmentsQuery.where(eq(appointments.practitionerId, practitionerId));
      }
      // Admin and staff see all appointments

      const appointmentsData = await appointmentsQuery;

                // Get patient and practitioner details with user info
          const appointmentsWithDetails = await Promise.all(
            appointmentsData.map(async (appointment) => {
              const [patientData] = await db
                .select({
                  id: patients.id,
                  userId: patients.userId,
                })
                .from(patients)
                .where(eq(patients.id, appointment.patientId));

              const [practitionerData] = await db
                .select({
                  id: practitioners.id,
                  userId: practitioners.userId,
                })
                .from(practitioners)
                .where(eq(practitioners.id, appointment.practitionerId));

              // Get user details for patient
              const [patientUser] = patientData ? await db
                .select({
                  id: users.id,
                  firstName: users.firstName,
                  lastName: users.lastName,
                  email: users.email,
                  phone: users.phone,
                })
                .from(users)
                .where(eq(users.id, patientData.userId)) : [null];

              // Get user details for practitioner
              const [practitionerUser] = practitionerData ? await db
                .select({
                  id: users.id,
                  firstName: users.firstName,
                  lastName: users.lastName,
                })
                .from(users)
                .where(eq(users.id, practitionerData.userId)) : [null];

              return {
                ...appointment,
                patient: patientUser ? {
                  id: patientData.id,
                  firstName: patientUser.firstName,
                  lastName: patientUser.lastName,
                  email: patientUser.email,
                  phone: patientUser.phone,
                  avatar: null, // No avatar field in users table
                } : null,
                practitioner: practitionerUser ? {
                  id: practitionerData.id,
                  firstName: practitionerUser.firstName,
                  lastName: practitionerUser.lastName,
                } : null,
              };
            })
          );

      res.json(appointmentsWithDetails);
    } catch (error) {
      console.error("Get today appointments error:", error);
      res.status(500).json({ message: "Failed to get today's appointments" });
    }
  });

  // Appointment statistics endpoint
  app.get("/api/appointments/stats", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      let practitionerId = null;

      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        practitionerId = practitioner?.id;
      }

      // Get date ranges
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Base query
      let baseQuery = db.select({ count: count() }).from(appointments);
      
      if (practitionerId && user.role !== "admin") {
        baseQuery = baseQuery.where(eq(appointments.practitionerId, practitionerId));
      }

      // Get total appointments
      const [totalResult] = await baseQuery;

      // Get completed appointments
      const [completedResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          practitionerId && user.role !== "admin" 
            ? and(eq(appointments.practitionerId, practitionerId), eq(appointments.status, "completed"))
            : eq(appointments.status, "completed")
        );

      // Get pending appointments
      const [pendingResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          practitionerId && user.role !== "admin"
            ? and(eq(appointments.practitionerId, practitionerId), eq(appointments.status, "scheduled"))
            : eq(appointments.status, "scheduled")
        );

      // Get cancelled appointments
      const [cancelledResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          practitionerId && user.role !== "admin"
            ? and(eq(appointments.practitionerId, practitionerId), eq(appointments.status, "cancelled"))
            : eq(appointments.status, "cancelled")
        );

      // Get today's appointments
      const [todayResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          practitionerId && user.role !== "admin"
            ? and(
                eq(appointments.practitionerId, practitionerId),
                gte(appointments.appointmentDate, startOfDay),
                lt(appointments.appointmentDate, new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000))
              )
            : and(
                gte(appointments.appointmentDate, startOfDay),
                lt(appointments.appointmentDate, new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000))
              )
        );

      // Get this week's appointments
      const [thisWeekResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          practitionerId && user.role !== "admin"
            ? and(
                eq(appointments.practitionerId, practitionerId),
                gte(appointments.appointmentDate, startOfWeek)
              )
            : gte(appointments.appointmentDate, startOfWeek)
        );

      // Get this month's appointments
      const [thisMonthResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          practitionerId && user.role !== "admin"
            ? and(
                eq(appointments.practitionerId, practitionerId),
                gte(appointments.appointmentDate, startOfMonth)
              )
            : gte(appointments.appointmentDate, startOfMonth)
        );

      res.json({
        total: totalResult.count,
        completed: completedResult.count,
        pending: pendingResult.count,
        cancelled: cancelledResult.count,
        today: todayResult.count,
        thisWeek: thisWeekResult.count,
        thisMonth: thisMonthResult.count,
      });
    } catch (error) {
      console.error("Get appointment stats error:", error);
      res.status(500).json({ message: "Failed to get appointment statistics" });
    }
  });

  // Dashboard activities endpoint - filtered by practitioner
  app.get("/api/dashboard/activities", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      let practitionerId = null;

      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        practitionerId = practitioner?.id;
      }

      // If no practitioner ID (admin, staff, etc.), return empty array
      if (!practitionerId) {
        return res.json([]);
      }

      // Get practitioner-specific activities
      const activities = await storage.getPractitionerActivities(practitionerId);
      res.json(activities);
    } catch (error) {
      console.error("Get practitioner activities error:", error);
      res.status(500).json({ message: "Failed to get activities" });
    }
  });

  // Patient routes
  app.get("/api/patients", verifyToken, async (req: any, res) => {
    try {
      const { limit = 50, offset = 0, search } = req.query;
      const user = req.user;
      
      // Role-based patient access
      if (user.role === "practitioner") {
        // Practitioners see only patients who have appointments with them
        console.log(`🔍 Practitioner ${user.id} (${user.firstName} ${user.lastName}) requesting patients`);
        const practitioner = await storage.getPractitionerByUserId(user.id);
        if (!practitioner) {
          console.log(`❌ Practitioner profile not found for user ${user.id}`);
          return res.status(403).json({ message: "Practitioner profile not found" });
        }
        console.log(`✅ Found practitioner ${practitioner.id} for user ${user.id}`);
        const patients = await storage.getPatientsByPractitioner(practitioner.id, search, parseInt(limit), parseInt(offset));
        console.log(`📋 Returning ${patients.length} patients for practitioner ${practitioner.id}`);
        res.json(patients);
      } else if (user.role === "admin" || user.role === "staff") {
        // Admin/Staff see all patients
        const patients = await storage.getPatients(search, parseInt(limit), parseInt(offset));
        res.json(patients);
      } else if (user.role === "patient") {
        // Patients see only their own profile
        const patient = await storage.getPatientByUserId(user.id);
        res.json(patient ? [patient] : []);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Get patients error:", error);
      res.status(500).json({ message: "Failed to get patients" });
    }
  });

  app.get("/api/patients/:id", verifyToken, async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Get patient error:", error);
      res.status(500).json({ message: "Failed to get patient" });
    }
  });

  app.post("/api/patients", verifyToken, async (req, res) => {
    try {
      // Only admin and staff can create patients (TiNHiH policy)
      const currentUser = req.user;
      if (currentUser.role !== 'admin' && currentUser.role !== 'staff') {
        return res.status(403).json({ message: "Access denied. Only admin and staff can create patients." });
      }

      // Generate a secure temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Prepare user data with generated password
      const userDataWithPassword = {
        ...req.body.user,
        password: tempPassword
      };
      
      const userData = insertUserSchema.parse(userDataWithPassword);
      
      // Prepare patient data without userId first, and handle date conversion
      const patientDataRaw = {
        ...req.body.patient,
        medications: Array.isArray(req.body.patient?.medications) ? req.body.patient.medications as string[] : [],
        allergies: Array.isArray(req.body.patient?.allergies) ? req.body.patient.allergies as string[] : [],
        medicalHistory: Array.isArray(req.body.patient?.medicalHistory) ? req.body.patient.medicalHistory as string[] : [],
        // Convert dateOfBirth string to Date object if provided
        dateOfBirth: req.body.patient?.dateOfBirth ? new Date(req.body.patient.dateOfBirth) : null,
      };

      // Hash the generated password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user first
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: "patient",
      });

      // Now parse patient data with userId included
      const patientData = insertPatientSchema.parse({
        ...patientDataRaw,
        userId: user.id,
      });

      // Create patient profile
      const patient = await storage.createPatient(patientData);

      // Send welcome email with login credentials
      try {
        await emailService.sendPatientWelcomeEmail({
          to: user.email,
          recipientName: `${user.firstName} ${user.lastName}`,
          tempPassword,
          portalUrl: process.env.CLIENT_URL || "http://localhost:3000"
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail patient creation if email fails, but log it
      }

      // Log patient creation activity
      try {
        await ActivityService.logPatientOnboardingCompleted(
          user.id,
          `${user.firstName} ${user.lastName}`,
          req.user.id
        );
      } catch (activityError) {
        console.error("Failed to log patient creation activity:", activityError);
        // Don't fail patient creation if activity logging fails
      }

      res.status(201).json({ 
        user: { ...user, password: undefined }, 
        patient,
        tempPassword // Return temp password for admin reference
      });
    } catch (error) {
      console.error("Create patient error:", error);
      res.status(400).json({ message: "Failed to create patient" });
    }
  });

  // Patient Onboarding API Route
  app.post("/api/patient/onboarding", verifyToken, async (req, res) => {
    try {
      const currentUser = req.user;
      
      // Only patients can complete their own onboarding
      if (currentUser.role !== 'patient') {
        return res.status(403).json({ message: "Access denied. Only patients can complete onboarding." });
      }

      const onboardingData = req.body;
      console.log("📋 Patient onboarding data received:", { userId: currentUser.id, data: onboardingData });

      // Check if patient already exists and has completed onboarding
      let existingPatient = await db.query.patients.findFirst({
        where: eq(patients.userId, currentUser.id),
      });

      // If patient exists and has comprehensive onboarding data, prevent re-onboarding
      if (existingPatient && existingPatient.onboardingData && Object.keys(existingPatient.onboardingData).length > 0) {
        // Check if they have actual onboarding data (not just empty object)
        const hasOnboardingData = existingPatient.onboardingData && 
          (existingPatient.onboardingData.personalInfo || 
           existingPatient.onboardingData.recoveryHistory || 
           existingPatient.onboardingData.medicalHistory || 
           existingPatient.onboardingData.emergencyContacts || 
           existingPatient.onboardingData.insurance);
        
        if (hasOnboardingData) {
          return res.status(400).json({ message: "Patient profile already exists. Onboarding already completed." });
        }
      }

      // Update user information with onboarding data
      const userUpdates: any = {};
      if (onboardingData.firstName) userUpdates.firstName = onboardingData.firstName;
      if (onboardingData.lastName) userUpdates.lastName = onboardingData.lastName;
      if (onboardingData.preferredName) userUpdates.preferredName = onboardingData.preferredName;
      if (onboardingData.email) userUpdates.email = onboardingData.email;
      if (onboardingData.phone) userUpdates.phone = onboardingData.phone;

      // Update user if there are changes
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(currentUser.id, userUpdates);
      }

      // Prepare patient data
      const patientData = {
        userId: currentUser.id,
        dateOfBirth: onboardingData.dateOfBirth ? new Date(onboardingData.dateOfBirth) : null,
        gender: onboardingData.gender,
        address: onboardingData.address,
        city: onboardingData.city,
        state: onboardingData.state,
        zipCode: onboardingData.zipCode,
        emergencyContact: onboardingData.primaryContactName,
        emergencyPhone: onboardingData.primaryContactPhone,
        insuranceProvider: onboardingData.insuranceProvider,
        insuranceNumber: onboardingData.insuranceNumber,
        // Store additional onboarding data as JSON
        medicalHistory: onboardingData.chronicConditions || [],
        allergies: onboardingData.allergies || [],
        medications: onboardingData.currentMedications || [],
        // Store comprehensive onboarding data
        onboardingData: onboardingData
      };

      // Create or update patient profile
      let newPatient;
      if (existingPatient) {
        // Update existing patient with onboarding data
        newPatient = await storage.updatePatient(existingPatient.id, patientData);
      } else {
        // Create new patient profile
        newPatient = await storage.createPatient(patientData);
      }

      // Mark user as no longer first login
      await storage.updateUser(currentUser.id, { firstLogin: false });

      // Send welcome email for completed onboarding
      try {
        await sendWelcomeEmail({
          ...currentUser,
          ...userUpdates,
          firstName: userUpdates.firstName || currentUser.firstName,
          lastName: userUpdates.lastName || currentUser.lastName,
          email: userUpdates.email || currentUser.email,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the onboarding if email fails
      }

      // Send notification to admin/staff about new patient onboarding
      try {
        const adminUsers = await db.query.users.findMany({
          where: or(eq(users.role, 'admin'), eq(users.role, 'staff')),
        });

        for (const adminUser of adminUsers) {
          await notificationService.createNotification({
            userId: adminUser.id,
            title: "New Patient Onboarding Completed",
            message: `${userUpdates.firstName || currentUser.firstName} ${userUpdates.lastName || currentUser.lastName} has completed their onboarding process.`,
            type: "patient_onboarding",
            data: {
              patientId: newPatient.id,
              patientName: `${userUpdates.firstName || currentUser.firstName} ${userUpdates.lastName || currentUser.lastName}`,
              completedAt: new Date(),
            }
          });
        }
      } catch (notificationError) {
        console.error("Failed to send admin notifications:", notificationError);
        // Don't fail the onboarding if notifications fail
      }

      console.log("✅ Patient onboarding completed successfully:", { patientId: newPatient.id, userId: currentUser.id });
      
      res.status(201).json({ 
        message: "Onboarding completed successfully!",
        patient: newPatient,
        nextSteps: [
          "Your information has been submitted for review",
          "Our intake team will contact you within 24-48 hours",
          "You'll receive a welcome email with next steps",
          "You can now access your patient portal"
        ]
      });

    } catch (error) {
      console.error("Patient onboarding error:", error);
      res.status(400).json({ message: "Failed to complete onboarding", error: error.message });
    }
  });

  // Patient Onboarding Data Update API Route
  app.put("/api/patient/onboarding", verifyToken, async (req, res) => {
    try {
      const currentUser = req.user;
      
      // Only patients can update their own onboarding data
      if (currentUser.role !== 'patient') {
        return res.status(403).json({ message: "Access denied. Only patients can update their onboarding data." });
      }

      const onboardingData = req.body;
      console.log("📝 Patient updating onboarding data:", { userId: currentUser.id, data: onboardingData });

      // Get existing patient
      const existingPatient = await db.query.patients.findFirst({
        where: eq(patients.userId, currentUser.id),
      });

      if (!existingPatient) {
        return res.status(404).json({ message: "Patient profile not found. Please complete onboarding first." });
      }

      // Update user information if provided
      const userUpdates: any = {};
      if (onboardingData.firstName) userUpdates.firstName = onboardingData.firstName;
      if (onboardingData.lastName) userUpdates.lastName = onboardingData.lastName;
      if (onboardingData.preferredName) userUpdates.preferredName = onboardingData.preferredName;
      if (onboardingData.email) userUpdates.email = onboardingData.email;
      if (onboardingData.phone) userUpdates.phone = onboardingData.phone;

      // Update user if there are changes
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(currentUser.id, userUpdates);
      }

      // Prepare updated patient data
      const patientUpdates: any = {
        dateOfBirth: onboardingData.dateOfBirth ? new Date(onboardingData.dateOfBirth) : existingPatient.dateOfBirth,
        gender: onboardingData.gender || existingPatient.gender,
        address: onboardingData.address || existingPatient.address,
        city: onboardingData.city || existingPatient.city,
        state: onboardingData.state || existingPatient.state,
        zipCode: onboardingData.zipCode || existingPatient.zipCode,
        emergencyContact: onboardingData.primaryContactName || existingPatient.emergencyContact,
        emergencyPhone: onboardingData.primaryContactPhone || existingPatient.emergencyPhone,
        insuranceProvider: onboardingData.insuranceProvider || existingPatient.insuranceProvider,
        insuranceNumber: onboardingData.insuranceNumber || existingPatient.insuranceNumber,
        medicalHistory: onboardingData.chronicConditions || existingPatient.medicalHistory,
        allergies: onboardingData.allergies || existingPatient.allergies,
        medications: onboardingData.currentMedications || existingPatient.medications,
        // Update comprehensive onboarding data
        onboardingData: {
          // Personal Information
          preferredName: onboardingData.preferredName,
          city: onboardingData.city,
          state: onboardingData.state,
          zipCode: onboardingData.zipCode,
          
          // Recovery History
          substanceUseHistory: onboardingData.substanceUseHistory,
          lastUseDate: onboardingData.lastUseDate,
          previousTreatment: onboardingData.previousTreatment,
          mentalHealthConditions: onboardingData.mentalHealthConditions,
          supportGroups: onboardingData.supportGroups,
          
          // Medical History
          height: onboardingData.height,
          weight: onboardingData.weight,
          bloodType: onboardingData.bloodType,
          chronicConditions: onboardingData.chronicConditions,
          
          // Emergency Contacts
          primaryContactName: onboardingData.primaryContactName,
          primaryContactPhone: onboardingData.primaryContactPhone,
          primaryContactRelationship: onboardingData.primaryContactRelationship,
          secondaryContactName: onboardingData.secondaryContactName,
          secondaryContactPhone: onboardingData.secondaryContactPhone,
          secondaryContactRelationship: onboardingData.secondaryContactRelationship,
          
          // Insurance & Financial
          hasInsurance: onboardingData.hasInsurance,
          insuranceProvider: onboardingData.insuranceProvider,
          insuranceNumber: onboardingData.insuranceNumber,
          groupNumber: onboardingData.groupNumber,
          secondaryInsurance: onboardingData.secondaryInsurance,
          secondaryInsuranceProvider: onboardingData.secondaryInsuranceProvider,
          secondaryInsuranceNumber: onboardingData.secondaryInsuranceNumber,
          secondaryGroupNumber: onboardingData.secondaryGroupNumber,
          financialStatus: onboardingData.financialStatus,
          needsFinancialAssistance: onboardingData.needsFinancialAssistance,
          householdIncome: onboardingData.householdIncome,
          householdSize: onboardingData.householdSize,
          employmentStatus: onboardingData.employmentStatus,
          
          // Consents & Agreements
          hipaaConsent: onboardingData.hipaaConsent,
          privacyPolicyConsent: onboardingData.privacyPolicyConsent,
          treatmentConsent: onboardingData.treatmentConsent,
          financialConsent: onboardingData.financialConsent,
          noShowPolicyConsent: onboardingData.noShowPolicyConsent,
          cancellationPolicyConsent: onboardingData.cancellationPolicyConsent,
          emailConsent: onboardingData.emailConsent,
          smsConsent: onboardingData.smsConsent,
          phoneConsent: onboardingData.phoneConsent,
          mailConsent: onboardingData.mailConsent,
          researchConsent: onboardingData.researchConsent,
          qualityImprovementConsent: onboardingData.qualityImprovementConsent,
          
          // Additional Information
          additionalNotes: onboardingData.additionalNotes,
          howDidYouHear: onboardingData.howDidYouHear,
          preferredContactMethod: onboardingData.preferredContactMethod,
          preferredAppointmentTime: onboardingData.preferredAppointmentTime,
          transportationNeeds: onboardingData.transportationNeeds,
          interpreterNeeds: onboardingData.interpreterNeeds,
          lastUpdatedAt: new Date(),
          completedAt: existingPatient.onboardingData?.completedAt || new Date(),
        }
      };

      // Update patient profile
      const updatedPatient = await storage.updatePatient(existingPatient.id, patientUpdates);

      console.log("✅ Patient onboarding data updated successfully:", { patientId: existingPatient.id, userId: currentUser.id });
      
      res.json({ 
        message: "Onboarding data updated successfully!",
        patient: updatedPatient
      });

    } catch (error) {
      console.error("Patient onboarding update error:", error);
      res.status(400).json({ message: "Failed to update onboarding data", error: error.message });
    }
  });

  app.put("/api/patients/:id", verifyToken, async (req, res) => {
    try {
      // Only admin and staff can edit patients (TiNHiH policy)
      const currentUser = req.user;
      if (currentUser.role !== 'admin' && currentUser.role !== 'staff') {
        return res.status(403).json({ message: "Access denied. Only admin and staff can edit patients." });
      }

      // Get current patient to access userId
      const currentPatient = await storage.getPatient(req.params.id);
      if (!currentPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Update user information if provided
      if (req.body.user) {
        const userUpdateData = insertUserSchema.partial().parse(req.body.user);
        
        // Remove password if empty (optional update)
        if (userUpdateData.password === "") {
          delete userUpdateData.password;
        } else if (userUpdateData.password) {
          // Hash password if provided
          userUpdateData.password = await bcrypt.hash(userUpdateData.password, 10);
        }

        await storage.updateUser(currentPatient.userId, userUpdateData);
      }

      // Update patient information if provided
      if (req.body.patient) {
        const patientDataRaw = {
          ...req.body.patient,
          medications: Array.isArray(req.body.patient?.medications) ? req.body.patient.medications as string[] : [],
          allergies: Array.isArray(req.body.patient?.allergies) ? req.body.patient.allergies as string[] : [],
          medicalHistory: Array.isArray(req.body.patient?.medicalHistory) ? req.body.patient.medicalHistory as string[] : [],
          // Convert dateOfBirth string to Date object if provided
          dateOfBirth: req.body.patient?.dateOfBirth ? new Date(req.body.patient.dateOfBirth) : null,
        };

        const patientData = insertPatientSchema.partial().parse(patientDataRaw);
        await storage.updatePatient(req.params.id, patientData);
      }

      // Return updated patient with user info
      const updatedPatient = await storage.getPatient(req.params.id);
      res.json(updatedPatient);
    } catch (error) {
      console.error("Update patient error:", error);
      res.status(400).json({ message: "Failed to update patient" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", verifyToken, async (req: any, res) => {
    try {
      const { practitionerId, patientId, practitionerIds } = req.query;
      const user = req.user;
      
      console.log("Fetching appointments with filters:", { 
        practitionerId, 
        patientId, 
        practitionerIds, 
        userRole: user.role,
        userId: user.id 
      });
      
      let appointments;
      
      if (user.role === "practitioner") {
        // Practitioners only see their own appointments
        const practitioner = await storage.getPractitionerByUserId(user.id);
        if (practitioner) {
          appointments = await storage.getAppointments(practitioner.id, patientId);
          console.log(`Practitioner ${practitioner.id}: Fetching own appointments`);
        } else {
          appointments = [];
          console.log("Practitioner not found in database");
        }
      } else if (user.role === "patient") {
        // Patients only see their own appointments
        const patient = await storage.getPatientByUserId(user.id);
        if (patient) {
          appointments = await storage.getAppointmentsByPatientId(patient.id);
          console.log(`Patient ${patient.id}: Fetching own appointments`);
        } else {
          appointments = [];
          console.log("Patient not found in database");
        }
      } else if (user.role === "admin" || user.role === "staff") {
        if (practitionerIds) {
          // Specific practitioners selected - filter by their IDs
          const practitionerIdArray = practitionerIds.split(',');
          appointments = await storage.getAppointmentsByPractitionerIds(practitionerIdArray, patientId);
          console.log(`Admin/Staff: Fetching appointments for specific practitioners: ${practitionerIdArray}`);
        } else if (practitionerId) {
          // Single practitioner filter
          appointments = await storage.getAppointments(practitionerId, patientId);
          console.log(`Admin/Staff: Fetching appointments for single practitioner: ${practitionerId}`);
        } else {
          // No practitioner filter - "All Team Members" selected
          appointments = await storage.getAllAppointments(patientId);
          console.log("Admin/Staff: Fetching all appointments (All Team Members selected)");
        }
      } else {
        appointments = [];
        console.log(`User role ${user.role}: No appointments access`);
      }
      
      // Also fetch events from events table
      const activeEvents = await db.select()
        .from(events)
        .orderBy(asc(events.startDate));
      
      // Convert events to include appointmentDate in ISO format using Luxon
      const eventsWithAppointmentDate = activeEvents.map(event => {
        // Get user's timezone preference
        const userTimezone = user.preferences?.timezone || 'UTC';
        
        // Create a proper ISO datetime string - use user's timezone
        // Example: startDate: "2025-08-31", startTime: "15:00:00" → "2025-08-31T15:00:00+00:00Z"
        const dateTimeStr = `${event.startDate}T${event.startTime}`;
        const dt = DateTime.fromISO(dateTimeStr, { zone: userTimezone });
        const isoString = dt.toISO();
        
        return {
          ...event,
          appointmentDate: isoString
        };
      });
      
      console.log("Retrieved appointments:", appointments.length, "appointments for role:", user.role);
      console.log("Retrieved events:", eventsWithAppointmentDate.length, "events");
      
      // Return both appointments and events
      res.json({
        appointments: appointments,
        events: eventsWithAppointmentDate
      });
    } catch (error) {
      console.error("Get appointments error:", error);
      res.json({ appointments: [], events: [] });
    }
  });

  app.get("/api/appointments/available-slots", verifyToken, async (req: any, res) => {
    try {
      const { date, practitionerId } = req.query;
      
      if (!date || !practitionerId) {
        return res.status(400).json({ 
          message: "Date and practitionerId are required" 
        });
      }
      
      const selectedDate = new Date(date);
      const existingAppointments = await storage.getAppointments(practitionerId);
      
      // Get calendar settings for this practitioner
      const calendarSettings = await storage.getCalendarSettings(practitionerId);
      const settings = calendarSettings || {
        timeInterval: 60,
        defaultStartTime: "09:00",
        defaultEndTime: "17:00",
        bufferTime: 0
      };
      
      // Generate time slots
      const [startHour, startMin] = settings.defaultStartTime.split(':').map(Number);
      const [endHour, endMin] = settings.defaultEndTime.split(':').map(Number);
      
      let currentMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const availableSlots = [];
      
      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const min = currentMinutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        // Check if this time slot is available
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(hour, min, 0, 0);
        
        // Skip if slot is in the past
        if (slotDateTime < new Date()) {
          currentMinutes += settings.timeInterval;
          continue;
        }
        
        const slotEndTime = new Date(slotDateTime.getTime() + 60 * 60000); // Default 1 hour
        const bufferStartTime = new Date(slotDateTime.getTime() - settings.bufferTime * 60000);
        const bufferEndTime = new Date(slotEndTime.getTime() + settings.bufferTime * 60000);
        
        const hasConflict = existingAppointments.some((apt: any) => {
          if (!isSameDay(new Date(apt.appointmentDate), selectedDate)) return false;
          
          const existingDateTime = new Date(apt.appointmentDate);
          const existingEndTime = new Date(existingDateTime.getTime() + (apt.duration || 60) * 60000);
          
          return (
            (slotDateTime < existingEndTime && slotEndTime > existingDateTime) ||
            (existingDateTime < bufferEndTime && existingEndTime > bufferStartTime)
          );
        });
        
        if (!hasConflict) {
          availableSlots.push({
            time: timeString,
            label: format(slotDateTime, 'h:mm a'),
            isAvailable: true
          });
        }
        
        currentMinutes += settings.timeInterval;
      }
      
      res.json(availableSlots);
    } catch (error) {
      console.error("Get available slots error:", error);
      res.status(500).json({ message: "Failed to get available slots" });
    }
  });

  app.get("/api/appointments/:id", verifyToken, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Get appointment error:", error);
      res.status(500).json({ message: "Failed to get appointment" });
    }
  });

  app.post("/api/appointments", verifyToken, async (req, res) => {
    try {
      console.log("Creating appointment with data:", req.body);
      
      
      // Role-based appointment creation restrictions
      const userRole = req.user.role;
      console.log("User role for appointment creation:", userRole);
      
      // Staff cannot create appointments on behalf of others
      if (userRole === 'staff') {
        return res.status(403).json({ 
          message: "Staff members cannot create appointments on behalf of others. Only administrators and practitioners can create appointments." 
        });
      }
      
      // Only admin, practitioner, and patient roles can create appointments
      if (!['admin', 'practitioner', 'patient'].includes(userRole)) {
        return res.status(403).json({ 
          message: "You do not have permission to create appointments" 
        });
      }
      
      // Convert appointmentDate string to Date if needed
      if (req.body.appointmentDate && typeof req.body.appointmentDate === 'string') {
        req.body.appointmentDate = new Date(req.body.appointmentDate);
      }
      
      const appointmentData = insertAppointmentSchema.parse(req.body);
      appointmentData.locationType = req.body.locationType.toLowerCase();
      // Ensure appointments created through admin/practitioner interface are marked as not public booking
      appointmentData.isPublicBooking = false;
      console.log("Parsed appointment data:", appointmentData);
      
      // Validate appointment is not in the past
      const appointmentDateTime = new Date(appointmentData.appointmentDate);
      const now = new Date();
      
      if (appointmentDateTime < now) {
        return res.status(400).json({ 
          message: "Cannot create appointments in the past" 
        });
      }
      
      // Check for scheduling conflicts
      const existingAppointments = await storage.getAppointments(appointmentData.practitionerId);
      const appointmentEndTime = new Date(appointmentDateTime.getTime() + (appointmentData.duration || 60) * 60000);
      
      // Get calendar settings for buffer time
      const practitioner = await storage.getPractitionerByUserId(req.user.id);
      const calendarSettings = await storage.getCalendarSettings(practitioner?.id);
      const bufferTime = calendarSettings?.bufferTime || 0;
      
      const hasConflict = existingAppointments.some((apt: any) => {
        const existingDateTime = new Date(apt.appointmentDate);
        const existingEndTime = new Date(existingDateTime.getTime() + (apt.duration || 60) * 60000);
        
        // Check if appointments overlap (including buffer time)
        const bufferStartTime = new Date(appointmentDateTime.getTime() - bufferTime * 60000);
        const bufferEndTime = new Date(appointmentEndTime.getTime() + bufferTime * 60000);
        
        return (
          (appointmentDateTime < existingEndTime && appointmentEndTime > existingDateTime) ||
          (existingDateTime < bufferEndTime && existingEndTime > bufferStartTime)
        );
      });
      
      if (hasConflict) {
        return res.status(409).json({ 
          message: "There is already an appointment scheduled at this time for this practitioner" 
        });
      }
      
      const appointment = await storage.createAppointment(appointmentData);
      console.log("Created appointment:", appointment);
      
      // Log appointment creation activity
      try {
        await ActivityService.logAppointmentCreated(
          appointment.id,
          appointmentData.patientId,
          appointmentData.practitionerId,
          appointmentData.title,
          req.user.id
        );
      } catch (activityError) {
        console.error("Failed to log appointment creation activity:", activityError);
        // Don't fail appointment creation if activity logging fails
      }
      
      // Send notifications to patient and practitioner based on their preferences
      try {
        // Get patient and practitioner details
        const patient = await storage.getPatient(appointmentData.patientId);
        const practitioner = await storage.getPractitionerByIdWithUser(appointmentData.practitionerId);
        
        if (patient && practitioner) {
          console.log("Sending appointment notifications to patient and practitioner");
          
          // Get timezone preferences for both patient and practitioner
          const patientTimezone = await getUserTimezone(patient.userId);
          const practitionerTimezone = await getUserTimezone(practitioner.userId);
          
          // Convert UTC appointment time to local times for each user
          const patientLocalTime = convertUTCToLocal(appointmentDateTime, patientTimezone);
          const practitionerLocalTime = convertUTCToLocal(appointmentDateTime, practitionerTimezone);
          
          console.log(`Appointment time conversions:
            UTC: ${appointmentDateTime.toISOString()}
            Patient (${patientTimezone}): ${patientLocalTime}
            Practitioner (${practitionerTimezone}): ${practitionerLocalTime}`);
          
          // Create notification data for appointment creation
          const notificationData = {
            title: "New Appointment Created",
            message: `Appointment scheduled for ${format(appointmentDateTime, 'MMM d, yyyy h:mm a')} with ${patient.user?.firstName} ${patient.user?.lastName}`,
            type: "appointment_created" as const,
            priority: "medium" as const,
            metadata: {
              appointmentId: appointment.id,
              appointmentDate: appointmentDateTime,
              duration: appointmentData.duration,
              type: appointmentData.type,
              locationType: appointmentData.locationType,
              telehealthPlatform: appointmentData.telehealthPlatform
            }
          };
          
          // Send notification to patient with patient's local time
          if (patient.userId) {
            await notificationService.createNotification({
              ...notificationData,
              userId: patient.userId,
              title: "Appointment Confirmed",
              message: `Your appointment with Dr. ${practitioner.user?.firstName} ${practitioner.user?.lastName} has been scheduled for ${patientLocalTime}`
            });
          }
          
          // Send notification to practitioner with practitioner's local time
          if (practitioner.userId) {
            await notificationService.createNotification({
              ...notificationData,
              userId: practitioner.userId,
              title: "New Appointment Scheduled",
              message: `New appointment with ${patient.user?.firstName} ${patient.user?.lastName} scheduled for ${practitionerLocalTime}`
            });
          }
          
          
          // Send email confirmations if requested
          if (appointmentData.sendEmailConfirmation  ) {
            console.log("Sending email confirmations for appointment");
            
            // Send email to patient with patient's local time
            if (patient.user?.email) {
              try {
                await emailService.sendAppointmentConfirmationEmail(
                  patient.user.email,
                  {
                    patientName: `${patient.user.firstName} ${patient.user.lastName}`,
                    practitionerName: `Dr. ${practitioner.user?.firstName} ${practitioner.user?.lastName}`,
                    appointmentDate: patientLocalTime,
                    appointmentType: appointmentData.type,
                    duration: appointmentData.duration,
                    locationType: appointmentData.locationType,
                    address: appointmentData.address,
                    city: appointmentData.city,
                    state: appointmentData.state,
                    zipCode: appointmentData.zipCode,
                    telehealthPlatform: appointmentData.telehealthPlatform
                  }
                );
                console.log("Email confirmation sent to patient");
              } catch (emailError) {
                console.error("Failed to send email to patient:", emailError);
              }
            }
            
            // Send email to practitioner with practitioner's local time
            if (practitioner.user?.email) {
              try {
                await emailService.sendAppointmentConfirmationEmail(
                  practitioner.user.email,
                  {
                    patientName: `${patient.user?.firstName} ${patient.user?.lastName}`,
                    practitionerName: `Dr. ${practitioner.user.firstName} ${practitioner.user.lastName}`,
                    appointmentDate: practitionerLocalTime,
                    appointmentType: appointmentData.type,
                    duration: appointmentData.duration,
                    locationType: appointmentData.locationType,
                    address: appointmentData.address,
                    city: appointmentData.city,
                    state: appointmentData.state,
                    zipCode: appointmentData.zipCode,
                    telehealthPlatform: appointmentData.telehealthPlatform
                  }
                );
                console.log("Email confirmation sent to practitioner");
              } catch (emailError) {
                console.error("Failed to send email to practitioner:", emailError);
              }
            }
          }
          
          console.log("Appointment notifications sent successfully");
        }
      } catch (notificationError) {
        console.error("Error sending appointment notifications:", notificationError);
        // Don't fail the appointment creation if notifications fail
      }
      
      console.log("appointmentData: =======================\n",appointmentData);
      console.log("\n=======================");
      // Create telehealth session if appointment is telehealth with inapp platform
      if (appointmentData.locationType === "telehealth" && appointmentData.telehealthPlatform === "inapp") {
        try {
          console.log("Creating telehealth session for inapp appointment");
          
          // For in-app sessions, we'll use webrtc as the platform but mark it as in-app in metadata
          const telehealthSessionData = {
            appointmentId: appointment.id,
            patientId: appointmentData.patientId,
            practitionerId: appointmentData.practitionerId,
            platform: "webrtc" as const, // Use webrtc as the platform for database compatibility
            status: "scheduled" as const,
            meetingUrl: `/telehealth-session/${appointment.id}`, // In-app URL
            meetingId: appointment.id, // Use appointment ID as meeting ID for inapp
            passcode: undefined,
            hostKey: undefined,
            patientJoinedAt: undefined,
            practitionerJoinedAt: undefined,
            sessionStartedAt: undefined,
            sessionEndedAt: undefined,
            recordingUrl: undefined,
            sessionNotes: undefined,
            technicalIssues: undefined,
            metadata: {
              isInApp: true,
              appointmentType: appointmentData.type,
              duration: appointmentData.duration,
              originalPlatform: "inapp" // Store the original platform
            }
          };
          
          const telehealthSession = await storage.createTelehealthSession(telehealthSessionData);
          console.log("Created telehealth session for in-app appointment:", telehealthSession);
          
        } catch (telehealthError) {
          console.error("Error creating telehealth session:", telehealthError);
          // Don't fail the appointment creation if telehealth session creation fails
        }
      }

      // Create Google Calendar event if appointment is telehealth with Google Meet platform
      if (appointmentData.locationType === "telehealth" && appointmentData.telehealthPlatform === "google_meet") {
        try {
          console.log("Creating Google Calendar event for Google Meet appointment");
          
          // Get patient and practitioner user details for calendar event
          const patient = await storage.getPatient(appointmentData.patientId);
          const practitioner = await storage.getPractitionerByIdWithUser(appointmentData.practitionerId);
          
          if (patient && practitioner && patient.user && practitioner.user) {
            // Prepare calendar event data
            const appointmentDateTime = new Date(appointment.appointmentDate);
            const endDateTime = new Date(appointmentDateTime.getTime() + (appointmentData.duration * 60 * 1000));
            
            const calendarEventData = {
              summary: `TiNHiH Portal: ${appointmentData.title}`,
              description: `Telehealth appointment via Google Meet\n\nType: ${appointmentData.type}\nNotes: ${appointmentData.notes || 'No additional notes'}\n\nJoin via Google Meet link that will be sent separately.`,
              start: {
                dateTime: appointmentDateTime.toISOString(),
                timeZone: 'UTC'
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'UTC'
              },
              attendees: [
                { email: patient.user.email },
                { email: practitioner.user.email }
              ],
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 24 * 60 }, // 24 hours before
                  { method: 'popup', minutes: 15 } // 15 minutes before
                ]
              },
              conferenceData: {
                createRequest: {
                  requestId: `tinhih-${appointment.id}`,
                  conferenceSolutionKey: {
                    type: 'hangoutsMeet'
                  }
                }
              }
            };

            // Create Google Calendar event
            const calendarEvent = await createGoogleCalendarEvent(calendarEventData);
            console.log("Created Google Calendar event:", calendarEvent);
            
            // Store the calendar event ID and hangout link in the appointment metadata
            await storage.updateAppointment(appointment.id, {
              metadata: {
                ...appointment.metadata,
                googleCalendarEventId: calendarEvent.id,
                googleMeetLink: calendarEvent.hangoutLink
              }
            });
            
            console.log("Google Meet hangout link:", calendarEvent.hangoutLink);
            
          } else {
            console.warn("Could not create Google Calendar event: missing patient or practitioner user data");
          }
          
        } catch (googleCalendarError) {
          console.error("Error creating Google Calendar event:", googleCalendarError);
          // Don't fail the appointment creation if Google Calendar event creation fails
        }
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Create appointment error:", error);
      res.status(400).json({ message: "Failed to create appointment" });
    }
  });

  app.put("/api/appointments/:id", verifyToken, async (req, res) => {
    try {
      // Role-based appointment update restrictions
      const userRole = req.user.role;
      console.log("User role for appointment update:", userRole);
      
      // Check if user is a patient - patients cannot edit appointments
      if (userRole === 'patient') {
        return res.status(403).json({ message: "Patients cannot edit appointments" });
      }
      
      // Staff cannot edit appointments on behalf of others
      if (userRole === 'staff') {
        return res.status(403).json({ 
          message: "Staff members cannot edit appointments on behalf of others. Only administrators and practitioners can edit appointments." 
        });
      }
      
      // Only admin and practitioner roles can edit appointments
      if (!['admin', 'practitioner'].includes(userRole)) {
        return res.status(403).json({ 
          message: "You do not have permission to edit appointments" 
        });
      }

      // Convert appointmentDate string to Date if needed
      if (req.body.appointmentDate && typeof req.body.appointmentDate === 'string') {
        req.body.appointmentDate = new Date(req.body.appointmentDate);
      }
      
      const appointmentData = insertAppointmentSchema.partial().parse(req.body);
      const updatedAppointment = await storage.updateAppointment(req.params.id, appointmentData);
      
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Send notifications for appointment update
      try {
        const patient = await storage.getPatient(updatedAppointment.patientId);
        const practitioner = await storage.getPractitionerByIdWithUser(updatedAppointment.practitionerId);
        
        if (patient && practitioner) {
          console.log("Sending appointment update notifications");
          
          const appointmentDateTime = new Date(updatedAppointment.appointmentDate);
          
          // Get timezone preferences for both patient and practitioner
          const patientTimezone = await getUserTimezone(patient.userId);
          const practitionerTimezone = await getUserTimezone(practitioner.userId);
          
          // Convert UTC appointment time to local times for each user
          const patientLocalTime = convertUTCToLocal(appointmentDateTime, patientTimezone);
          const practitionerLocalTime = convertUTCToLocal(appointmentDateTime, practitionerTimezone);
          
          console.log(`Appointment update time conversions:
            UTC: ${appointmentDateTime.toISOString()}
            Patient (${patientTimezone}): ${patientLocalTime}
            Practitioner (${practitionerTimezone}): ${practitionerLocalTime}`);
          
          const notificationData = {
            title: "Appointment Updated",
            message: `Appointment updated for ${format(appointmentDateTime, 'MMM d, yyyy h:mm a')}`,
            type: "appointment_updated" as const,
            priority: "medium" as const,
            metadata: {
              appointmentId: updatedAppointment.id,
              appointmentDate: appointmentDateTime,
              updatedFields: Object.keys(appointmentData)
            }
          };
          
          // Send notification to patient with patient's local time
          if (patient.userId) {
            await notificationService.createNotification({
              ...notificationData,
              userId: patient.userId,
              title: "Appointment Updated",
              message: `Your appointment with Dr. ${practitioner.user?.firstName} ${practitioner.user?.lastName} has been updated for ${patientLocalTime}`
            });
          }
          
          // Send notification to practitioner with practitioner's local time
          if (practitioner.userId) {
            await notificationService.createNotification({
              ...notificationData,
              userId: practitioner.userId,
              title: "Appointment Updated",
              message: `Appointment with ${patient.user?.firstName} ${patient.user?.lastName} has been updated for ${practitionerLocalTime}`
            });
          }
          
          console.log("Appointment update notifications sent successfully");
        }
      } catch (notificationError) {
        console.error("Error sending appointment update notifications:", notificationError);
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Update appointment error:", error);
      res.status(400).json({ message: "Failed to update appointment" });
    }
  });



  app.delete("/api/appointments/:id", verifyToken, async (req, res) => {
    try {
      // Role-based appointment deletion restrictions
      const userRole = req.user.role;
      console.log("User role for appointment deletion:", userRole);
      
      // Get the appointment to check ownership
      const appointment = await storage.getAppointment(req.params.id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Staff cannot delete appointments on behalf of others
      if (userRole === 'staff') {
        return res.status(403).json({ 
          message: "Staff members cannot delete appointments on behalf of others. Only administrators and practitioners can delete appointments." 
        });
      }
      
      // If user is a patient, check if they own this appointment
      if (userRole === 'patient') {
        const patient = await storage.getPatientByUserId(req.user.id);
        if (!patient || appointment.patientId !== patient.id) {
          return res.status(403).json({ message: "You can only delete your own appointments" });
        }
      }
      
      // Only admin, practitioner, and patient roles can delete appointments
      if (!['admin', 'practitioner', 'patient'].includes(userRole)) {
        return res.status(403).json({ 
          message: "You do not have permission to delete appointments" 
        });
      }

      // Send notifications for appointment cancellation before deleting
      try {
        const patient = await storage.getPatient(appointment.patientId);
        const practitioner = await storage.getPractitionerByIdWithUser(appointment.practitionerId);
        
        if (patient && practitioner) {
          console.log("Sending appointment cancellation notifications");
          
          const appointmentDateTime = new Date(appointment.appointmentDate);
          
          // Get timezone preferences for both patient and practitioner
          const patientTimezone = await getUserTimezone(patient.userId);
          const practitionerTimezone = await getUserTimezone(practitioner.userId);
          
          // Convert UTC appointment time to local times for each user
          const patientLocalTime = convertUTCToLocal(appointmentDateTime, patientTimezone);
          const practitionerLocalTime = convertUTCToLocal(appointmentDateTime, practitionerTimezone);
          
          console.log(`Appointment cancellation time conversions:
            UTC: ${appointmentDateTime.toISOString()}
            Patient (${patientTimezone}): ${patientLocalTime}
            Practitioner (${practitionerTimezone}): ${practitionerLocalTime}`);
          
          const notificationData = {
            title: "Appointment Cancelled",
            message: `Appointment cancelled for ${format(appointmentDateTime, 'MMM d, yyyy h:mm a')}`,
            type: "appointment_cancelled" as const,
            priority: "high" as const,
            metadata: {
              appointmentId: appointment.id,
              appointmentDate: appointmentDateTime,
              cancelledBy: req.user.role
            }
          };
          
          // Send notification to patient with patient's local time
          if (patient.userId) {
            await notificationService.createNotification({
              ...notificationData,
              userId: patient.userId,
              title: "Appointment Cancelled",
              message: `Your appointment with Dr. ${practitioner.user?.firstName} ${practitioner.user?.lastName} scheduled for ${patientLocalTime} has been cancelled`
            });
          }
          
          // Send notification to practitioner with practitioner's local time
          if (practitioner.userId) {
            await notificationService.createNotification({
              ...notificationData,
              userId: practitioner.userId,
              title: "Appointment Cancelled",
              message: `Appointment with ${patient.user?.firstName} ${patient.user?.lastName} scheduled for ${practitionerLocalTime} has been cancelled`
            });
          }
          
          console.log("Appointment cancellation notifications sent successfully");
        }
      } catch (notificationError) {
        console.error("Error sending appointment cancellation notifications:", notificationError);
      }
      
      const deleted = await storage.deleteAppointment(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete appointment error:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Recovery notes routes
  app.get("/api/clinical-notes", verifyToken, async (req: any, res) => {
    try {
      const { patientId, practitionerId, limit = 50, offset = 0 } = req.query;
      
      let notes;
      
      // Role-based access control
      if (req.user.role === "admin" || req.user.role === "staff") {
        // Admin/Staff can see all notes
        notes = await storage.getClinicalNotes(patientId, practitionerId);
      } else if (req.user.role === "practitioner") {
        // Practitioner can only see notes they created
        const practitioner = await storage.getPractitionerByUserId(req.user.id);
        if (!practitioner) {
          return res.status(404).json({ message: "Practitioner profile not found" });
        }
        notes = await storage.getClinicalNotes(patientId, practitioner.id);
      } else if (req.user.role === "patient") {
        // Patient can only see their own notes
        const patient = await storage.getPatientByUserId(req.user.id);
        if (!patient) {
          return res.status(404).json({ message: "Patient profile not found" });
        }
        notes = await storage.getClinicalNotes(patient.id);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(notes);
    } catch (error) {
      console.error("Get recovery notes error:", error);
      res.status(500).json({ message: "Failed to get recovery notes" });
    }
  });

  app.get("/api/clinical-notes/:id", verifyToken, async (req, res) => {
    try {
      const note = await storage.getClinicalNote(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Recovery note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Get recovery note error:", error);
      res.status(500).json({ message: "Failed to get recovery note" });
    }
  });

  app.post("/api/clinical-notes", verifyToken, async (req, res) => {
    try {
      // Prevent patients from creating Recovery Notes
      if (req.user.role === "patient") {
        return res.status(403).json({ message: "Patients cannot create Recovery Notes" });
      }
      
      const noteData = insertClinicalNoteSchema.parse(req.body);
      const note = await storage.createClinicalNote(noteData);
      
      // Send notification to the patient about the new recovery note
      try {
        const patient = await storage.getPatient(noteData.patientId);
        if (patient && patient.userId) {
          await notificationService.createNotification({
            userId: patient.userId,
            title: "New Recovery Note Created",
            message: `A new recovery note has been created for your session.`,
            type: "clinical_note_created",
            priority: "medium",
            actionUrl: `/clinical-notes/${note.id}`,
            metadata: {
              noteId: note.id,
              practitionerId: noteData.practitionerId,
              patientId: noteData.patientId,
              noteTitle: noteData.title
            }
          });
        }
        
        // Send notification to admin/staff about the new recovery note
        const adminStaffUsers = await storage.getAllUsers();
        const adminStaffIds = adminStaffUsers
          .filter((user: any) => user.role === 'admin' || user.role === 'staff')
          .map((user: any) => user.id);
        
        if (adminStaffIds.length > 0) {
          await notificationService.createBulkNotifications(
            adminStaffIds,
            {
              title: "New Recovery Note Created",
              message: `A new recovery note has been created by ${req.user.firstName} ${req.user.lastName}.`,
              type: "clinical_note_created",
              priority: "low",
              actionUrl: `/clinical-notes/${note.id}`,
              metadata: {
                noteId: note.id,
                practitionerId: noteData.practitionerId,
                patientId: noteData.patientId,
                noteTitle: noteData.title,
                createdBy: req.user.id
              }
            }
          );
        }
      } catch (notificationError) {
        console.error("Failed to send recovery note notification:", notificationError);
        // Don't fail the main request if notification fails
      }
      
      res.status(201).json(note);
    } catch (error) {
      console.error("Create recovery note error:", error);
      res.status(400).json({ message: "Failed to create recovery note" });
    }
  });

  app.put("/api/clinical-notes/:id", verifyToken, async (req, res) => {
    try {
      const noteData = insertClinicalNoteSchema.partial().parse(req.body);
      const note = await storage.updateClinicalNote(req.params.id, noteData);
      
      if (!note) {
        return res.status(404).json({ message: "Recovery note not found" });
      }
      
      // Send notification to the patient about the updated recovery note
      try {
        const patient = await storage.getPatient(note.patientId);
        if (patient && patient.userId) {
          await notificationService.createNotification({
            userId: patient.userId,
            title: "Recovery Note Updated",
            message: `Your recovery note has been updated.`,
            type: "clinical_note_updated",
            priority: "medium",
            actionUrl: `/clinical-notes/${note.id}`,
            metadata: {
              noteId: note.id,
              practitionerId: note.practitionerId,
              patientId: note.patientId,
              noteTitle: note.title
            }
          });
        }
      } catch (notificationError) {
        console.error("Failed to send recovery note update notification:", notificationError);
        // Don't fail the main request if notification fails
      }
      
      res.json(note);
    } catch (error) {
      console.error("Update recovery note error:", error);
      res.status(400).json({ message: "Failed to update recovery note" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", verifyToken, async (req: any, res) => {
    try {
      const { search, status, limit = 50, offset = 0 } = req.query;
      const user = req.user;
      
      console.log("Invoice API params:", { search, status, limit, userRole: user.role, userId: user.id });
      
      // If user is a patient, only show their invoices
      if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        if (!patient) {
          return res.json([]);
        }
        const invoices = await storage.getInvoicesByPatientId(patient.id, search, status, parseInt(limit), parseInt(offset));
        return res.json(invoices || []);
      }

      // If user is a practitioner, only show their invoices
      if (user.role === "practitioner") {
        console.log("User is practitioner, fetching practitioner-specific invoices");
        const practitioner = await storage.getPractitionerByUserId(user.id);
        if (!practitioner) {
          console.log("No practitioner found for user, returning empty array");
          return res.json([]);
        }
        console.log("Found practitioner:", practitioner.id);
        const invoices = await storage.getInvoicesByPractitionerId(practitioner.id, search, status, parseInt(limit), parseInt(offset));
        console.log("Practitioner invoices count:", invoices?.length || 0);
        return res.json(invoices || []);
      }

      // For admin/staff, show all invoices with search and filtering
      console.log("User is admin/staff, fetching all invoices");
      const invoices = await storage.getInvoicesWithSearch(search, status, parseInt(limit), parseInt(offset));
      console.log("Retrieved invoices for admin:", invoices?.length || 0);
      res.json(invoices || []);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Failed to get invoices" });
    }
  });

  app.get("/api/invoices/:id", verifyToken, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ message: "Failed to get invoice" });
    }
  });

  app.post("/api/invoices", verifyToken, async (req, res) => {
    try {
      // Generate invoice number before validation
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Handle date conversion
      const processedData = {
        ...req.body,
        invoiceNumber,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        appointmentId: req.body.appointmentId || null,
      };
      
      const invoiceData = insertInvoiceSchema.parse(processedData);
      const invoice = await storage.createInvoice(invoiceData);
      
      // Log invoice creation activity
      try {
        const patient = await storage.getPatient(invoiceData.patientId);
        const patientName = patient?.user ? `${patient.user.firstName} ${patient.user.lastName}` : 'Unknown Patient';
        
        await ActivityService.logInvoiceCreated(
          invoice.id,
          patientName,
          invoiceData.amount,
          req.user.id
        );
      } catch (activityError) {
        console.error("Failed to log invoice creation activity:", activityError);
        // Don't fail invoice creation if activity logging fails
      }
      
      // Send notifications to practitioner and patient
      try {
        // Get practitioner details
        const practitioner = await storage.getPractitionerById(invoice.practitionerId);
        let practitionerUser = null;
        if (practitioner) {
          practitionerUser = await storage.getUser(practitioner.userId);
          if (practitionerUser) {
            // Notify practitioner
            await notificationService.createNotification({
              userId: practitioner.userId,
              title: "New Service Bill Created",
              message: `Service bill ${invoiceNumber} has been created for ${invoiceData.description}`,
              type: "invoice_created",
              priority: "medium",
              actionUrl: `/billing`,
              data: {
                invoiceId: invoice.id,
                invoiceNumber: invoiceNumber,
                amount: invoiceData.amount,
                patientId: invoiceData.patientId
              }
            });
          }
        }

        // Get patient details
        const patient = await storage.getPatient(invoice.patientId);
        if (patient) {
          const patientUser = await storage.getUser(patient.userId);
          if (patientUser) {
            // Notify patient
            await notificationService.createNotification({
              userId: patient.userId,
              title: "New Service Bill Available",
              message: `A new service bill ${invoiceNumber} is available for review and payment`,
              type: "invoice_created",
              priority: "high",
              actionUrl: `/billing`,
              data: {
                invoiceId: invoice.id,
                invoiceNumber: invoiceNumber,
                amount: invoiceData.amount,
                practitionerId: invoiceData.practitionerId
              }
            });

            // Send email notification to patient
            const portalUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/billing`;
            try {
              await emailService.sendInvoiceEmail({
                to: patientUser.email,
                recipientName: `${patientUser.firstName} ${patientUser.lastName}`,
                invoice: {
                  ...invoice,
                  patient: { user: patientUser },
                  practitioner: practitionerUser ? { user: practitionerUser } : null
                },
                customMessage: "A new service bill has been created for your recovery services.",
                portalUrl
              });
            } catch (emailError) {
              console.error("Failed to send invoice email to patient:", emailError);
              // Don't fail the invoice creation if email fails
            }
          }
        }
      } catch (notificationError) {
        console.error("Failed to send invoice notifications:", notificationError);
        // Don't fail the invoice creation if notifications fail
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id", verifyToken, async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const oldInvoice = await storage.getInvoice(req.params.id);
      const invoice = await storage.updateInvoice(req.params.id, invoiceData);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Send notifications for status changes
      if (invoiceData.status && oldInvoice && oldInvoice.status !== invoiceData.status) {
        try {
          // Get practitioner details
          const practitioner = await storage.getPractitionerById(invoice.practitionerId);
          let practitionerUser = null;
          if (practitioner) {
            practitionerUser = await storage.getUser(practitioner.userId);
            if (practitionerUser) {
              // Notify practitioner of status change
              await notificationService.createNotification({
                userId: practitioner.userId,
                title: `Service Bill ${invoice.invoiceNumber} Status Updated`,
                message: `Service bill status changed to ${invoiceData.status.toUpperCase()}`,
                type: invoiceData.status === "paid" ? "invoice_paid" : "invoice_created",
                priority: invoiceData.status === "paid" ? "high" : "medium",
                actionUrl: `/billing`,
                data: {
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  oldStatus: oldInvoice.status,
                  newStatus: invoiceData.status,
                  patientId: invoice.patientId
                }
              });
            }
          }

          // Get patient details
          const patient = await storage.getPatient(invoice.patientId);
          if (patient) {
            const patientUser = await storage.getUser(patient.userId);
            if (patientUser) {
              // Notify patient of status change
              await notificationService.createNotification({
                userId: patient.userId,
                title: `Service Bill ${invoice.invoiceNumber} Status Updated`,
                message: `Your service bill status has been updated to ${invoiceData.status.toUpperCase()}`,
                type: invoiceData.status === "paid" ? "invoice_paid" : "invoice_created",
                priority: invoiceData.status === "paid" ? "high" : "medium",
                actionUrl: `/billing`,
                data: {
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  oldStatus: oldInvoice.status,
                  newStatus: invoiceData.status,
                  practitionerId: invoice.practitionerId
                }
              });

              // Send email for important status changes
              if (invoiceData.status === "paid") {
                const portalUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/billing`;
                
                // Send payment confirmation email to patient
                try {
                  await emailService.sendInvoiceEmail({
                    to: patientUser.email,
                    recipientName: `${patientUser.firstName} ${patientUser.lastName}`,
                    invoice: {
                      ...invoice,
                      patient: { user: patientUser },
                      practitioner: practitionerUser ? { user: practitionerUser } : null
                    },
                    customMessage: "Your service bill payment has been received. Thank you for your payment!",
                    portalUrl
                  });
                } catch (emailError) {
                  console.error("Failed to send payment confirmation email to patient:", emailError);
                  // Don't fail the invoice update if email fails
                }

                // Send payment notification email to practitioner
                if (practitionerUser) {
                  try {
                    await emailService.sendInvoiceEmail({
                      to: practitionerUser.email,
                      recipientName: `${practitionerUser.firstName} ${practitionerUser.lastName}`,
                      invoice: {
                        ...invoice,
                        patient: { user: patientUser },
                        practitioner: { user: practitionerUser }
                      },
                      customMessage: "A payment has been received for your service bill. The client has successfully paid for your recovery services.",
                      portalUrl
                    });
                  } catch (emailError) {
                    console.error("Failed to send payment notification email to practitioner:", emailError);
                    // Don't fail the invoice update if email fails
                  }
                }

                // Notify all admin/staff users about the payment
                try {
                  const allUsers = await storage.getUsers();
                  const adminStaffUsers = allUsers.filter(user => 
                    user.role === 'admin' || user.role === 'staff'
                  );

                  for (const adminStaff of adminStaffUsers) {
                    await notificationService.createNotification({
                      userId: adminStaff.id,
                      title: `Payment Received - Invoice ${invoice.invoiceNumber}`,
                      message: `Payment of $${invoice.total} received for service bill from ${patientUser.firstName} ${patientUser.lastName}`,
                      type: "invoice_paid",
                      priority: "medium",
                      actionUrl: `/billing`,
                      data: {
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.total,
                        patientId: invoice.patientId,
                        practitionerId: invoice.practitionerId,
                        paymentReceived: true
                      }
                    });
                  }
                } catch (adminNotificationError) {
                  console.error("Failed to notify admin/staff of payment:", adminNotificationError);
                }
              }
            }
          }
        } catch (notificationError) {
          console.error("Failed to send invoice status update notifications:", notificationError);
          // Don't fail the invoice update if notifications fail
        }
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  // Send invoice via email
  app.post("/api/invoices/:id/send-email", verifyToken, async (req, res) => {
    try {
      const { emailAddress, customMessage } = req.body;
      const user = req.user;
      
      // Get the invoice with full details
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check permissions - only admin, staff, and the practitioner who created the invoice can send it
      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        if (!practitioner || invoice.practitionerId !== practitioner.id) {
          return res.status(403).json({ message: "You can only send invoices you created" });
        }
      } else if (user.role === "patient") {
        return res.status(403).json({ message: "Patients cannot send invoices" });
      }

      // Get patient details for the email
      const patient = await storage.getPatient(invoice.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const patientUser = await storage.getUser(patient.userId);
      if (!patientUser) {
        return res.status(404).json({ message: "Patient user not found" });
      }

      // Use provided email address or patient's email
      const recipientEmail = emailAddress || patientUser.email;
      const recipientName = `${patientUser.firstName} ${patientUser.lastName}`;

      // Generate portal URL for the invoice
      const portalUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/billing`;

      // Send the email
      let emailSent = false;
      try {
        emailSent = await emailService.sendInvoiceEmail({
          to: recipientEmail,
          recipientName,
          invoice,
          customMessage,
          portalUrl
        });
      } catch (emailError) {
        console.error("Failed to send invoice email:", emailError);
        // Don't fail the request if email fails
      }

      if (emailSent) {
        res.json({ 
          message: "Service bill sent via email successfully",
          recipientEmail,
          recipientName
        });
      } else {
        res.status(500).json({ message: "Failed to send service bill via email" });
      }
    } catch (error) {
      console.error("Send invoice email error:", error);
      res.status(500).json({ message: "Failed to send service bill via email" });
    }
  });

  // Admin routes
  app.get("/api/admin/dashboard", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      // Get dashboard statistics
      const allUsers = await storage.getAllUsers();
      const staffCount = allUsers.filter((user: any) => user.role === 'staff');
      const practitionerCount = allUsers.filter((user: any) => user.role === 'practitioner');
      const allInvoices = await storage.getInvoicesWithSearch();
      const allQuotes = await db.query.quotes.findMany();
      const allEvents = []; // TODO: Implement events functionality

      // Calculate monthly revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = allInvoices
        .filter((invoice: any) => {
          const invoiceDate = new Date(invoice.createdAt);
          return invoiceDate.getMonth() === currentMonth && 
                 invoiceDate.getFullYear() === currentYear &&
                 invoice.status === 'paid';
        })
        .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.total || 0), 0);

      // Get recent activity
      const recentActivity = [
        // This would be populated with actual activity data
        {
          type: 'payment',
          title: 'Payment Received',
          description: 'New payment processed',
          timestamp: new Date()
        }
      ];

      res.json({
        staffCount: staffCount.length,
        practitionerCount: practitionerCount.length,
        transactionCount: allInvoices.length,
        quoteCount: allQuotes.length,
        eventCount: allEvents.length,
        monthlyRevenue: monthlyRevenue.toFixed(2),
        activeEventCount: allEvents.filter((event: any) => new Date(event.date) > new Date()).length,
        recentActivity
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({ message: "Failed to get admin dashboard data" });
    }
  });

  // Staff Management API endpoints
  app.get("/api/admin/staff", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const allUsers = await storage.getAllUsers();
      console.log("All users from getAllUsers:", allUsers.length);
      console.log("Sample user fields:", Object.keys(allUsers[0] || {}));
      
      const staffUsers = allUsers.filter((user: any) => user.role === 'staff');
      console.log("Staff users found:", staffUsers.length);
      console.log("Sample staff user:", staffUsers[0]);
      
      // Get staff details with additional info
      const staffWithDetails = staffUsers.map((staffUser: any) => ({
        id: staffUser.id,
        user: {
          id: staffUser.id,
          firstName: staffUser.firstName,
          lastName: staffUser.lastName,
          email: staffUser.email,
          phone: staffUser.phone,
          role: staffUser.role,
          isActive: staffUser.isActive,
          lastLoginAt: staffUser.lastLoginAt,
          createdAt: staffUser.createdAt
        },
        department: staffUser.department || null,
        position: staffUser.position || null,
        permissions: staffUser.permissions || []
      }));
      res.json(staffWithDetails);
    } catch (error) {
      console.error("Staff fetch error:", error);
      res.status(500).json({ message: "Failed to fetch staff members" });
    }
  });

  app.post("/api/admin/staff", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { firstName, lastName, email, phone, department, position, hireDate, isActive, permissions } = req.body;

      // Generate a secure temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Create user with staff role
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        password: tempPassword, // Temporary password that must be changed
        phone: phone || null,
        role: "staff",
        isActive: isActive !== false,
        department: department || null,
        position: position || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        permissions: permissions || []
      });

      // Send welcome email with login credentials
      try {
        await emailService.sendStaffWelcomeEmail({
          to: email,
          recipientName: `${firstName} ${lastName}`,
          tempPassword,
          department: department || "Not assigned",
          position: position || "Not assigned",
          portalUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000"
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request if email fails, but log it
      }

      res.status(201).json({
        ...newUser,
        tempPassword // Return temp password for admin reference
      });
    } catch (error) {
      console.error("Staff creation error:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put("/api/admin/staff/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { firstName, lastName, email, phone, department, position, hireDate, isActive, permissions } = req.body;
      const staffId = req.params.id;

      const updatedUser = await storage.updateUser(staffId, {
        firstName,
        lastName,
        email,
        phone: phone || null,
        isActive: isActive !== false,
        department: department || null,
        position: position || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        permissions: permissions || []
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Staff update error:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete("/api/admin/staff/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const staffId = req.params.id;
      
      // Soft delete by deactivating the account
      const updatedUser = await storage.updateUser(staffId, {
        isActive: false
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      res.json({ message: "Staff member deactivated successfully" });
    } catch (error) {
      console.error("Staff deletion error:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  app.post("/api/admin/staff/:id/send-welcome-email", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const staffId = req.params.id;
      
      // Get staff member details
      const staffMember = await storage.getUser(staffId);
      
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      if (staffMember.role !== 'staff') {
        return res.status(400).json({ message: "User is not a staff member" });
      }

      // Generate a new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Update the user's password to the new temporary password
      await storage.updateUser(staffId, {
        password: tempPassword,
        firstLogin: true
      });

      // Send welcome email with new credentials
      try {
        await emailService.sendStaffWelcomeEmail({
          to: staffMember.email,
          recipientName: `${staffMember.firstName} ${staffMember.lastName}`,
          tempPassword,
          department: staffMember.department || "Not assigned",
          position: staffMember.position || "Not assigned",
          portalUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000"
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        return res.status(500).json({ message: "Failed to send welcome email" });
      }

      res.json({ 
        message: "Welcome email sent successfully",
        tempPassword // Return temp password for admin reference
      });
    } catch (error) {
      console.error("Send welcome email error:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  });

  // Practitioner Management API endpoints
  app.get("/api/admin/practitioners", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const allUsers = await storage.getAllUsers();
      const practitionerUsers = allUsers.filter((user: any) => user.role === 'practitioner');
      
      // Get practitioner details with additional info
      const practitionersWithDetails = practitionerUsers.map((practitionerUser: any) => ({
        id: practitionerUser.id,
        user: {
          id: practitionerUser.id,
          firstName: practitionerUser.firstName,
          lastName: practitionerUser.lastName,
          email: practitionerUser.email,
          phone: practitionerUser.phone,
          role: practitionerUser.role,
          isActive: practitionerUser.isActive,
          lastLoginAt: practitionerUser.lastLoginAt,
          createdAt: practitionerUser.createdAt
        },
        licenseNumber: practitionerUser.licenseNumber || null,
        specialty: practitionerUser.specialty || null,
        qualifications: practitionerUser.qualifications || [],
        bio: practitionerUser.bio || null,
        consultationFee: practitionerUser.consultationFee || null,
        bookingLink: practitionerUser.bookingLink || null
      }));

      res.json(practitionersWithDetails);
    } catch (error) {
      console.error("Practitioner fetch error:", error);
      res.status(500).json({ message: "Failed to fetch practitioners" });
    }
  });

  app.post("/api/admin/practitioners", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { firstName, lastName, email, phone, licenseNumber, specialty, qualifications, bio, consultationFee, isActive } = req.body;

      // Generate a secure temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Create user with practitioner role
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        password: tempPassword, // Temporary password that must be changed
        phone: phone || null,
        role: "practitioner",
        isActive: isActive !== false,
      });

      // Create practitioner profile
      const newPractitioner = await storage.createPractitioner({
        userId: newUser.id,
        licenseNumber: licenseNumber || null,
        specialty: specialty || null,
        qualifications: qualifications || [],
        bio: bio || null,
        consultationFee: consultationFee || null
      });

      // Send welcome email with login credentials
      try {
        await emailService.sendPractitionerWelcomeEmail({
          to: email,
          recipientName: `${firstName} ${lastName}`,
          tempPassword,
          specialty: specialty || "Not assigned",
          portalUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000"
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request if email fails, but log it
      }

      res.status(201).json({
        ...newUser,
        practitioner: newPractitioner,
        tempPassword // Return temp password for admin reference
      });
    } catch (error) {
      console.error("Create practitioner error:", error);
      res.status(500).json({ message: "Failed to create practitioner" });
    }
  });

  // Patient Management API endpoints
  app.get("/api/admin/patients", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const allUsers = await storage.getAllUsers();
      const patientUsers = allUsers.filter((user: any) => user.role === 'patient');
      
      // Get patient details with additional info
      const patientsWithDetails = await Promise.all(patientUsers.map(async (patientUser: any) => {
        const patient = await storage.getPatient(patientUser.id);
        return {
          id: patientUser.id,
          user: {
            id: patientUser.id,
            firstName: patientUser.firstName,
            lastName: patientUser.lastName,
            email: patientUser.email,
            phone: patientUser.phone,
            role: patientUser.role,
            isActive: patientUser.isActive,
            lastLoginAt: patientUser.lastLoginAt,
            createdAt: patientUser.createdAt
          },
          dateOfBirth: patient?.dateOfBirth || null,
          gender: patient?.gender || null,
          address: patient?.address || null,
          city: patient?.city || null,
          state: patient?.state || null,
          zipCode: patient?.zipCode || null,
          emergencyContact: patient?.emergencyContact || null,
          emergencyPhone: patient?.emergencyPhone || null,
          insuranceProvider: patient?.insuranceProvider || null,
          insuranceNumber: patient?.insuranceNumber || null,
          medicalHistory: patient?.medicalHistory || [],
          allergies: patient?.allergies || [],
          medications: patient?.medications || [],
          onboardingData: patient?.onboardingData || null
        };
      }));

      res.json(patientsWithDetails);
    } catch (error) {
      console.error("Patient fetch error:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.put("/api/admin/patients/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Update user information
      const userUpdateData: any = {};
      if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      if (updateData.email) userUpdateData.email = updateData.email;
      if (updateData.phone !== undefined) userUpdateData.phone = updateData.phone;
      if (updateData.isActive !== undefined) userUpdateData.isActive = updateData.isActive;

      if (Object.keys(userUpdateData).length > 0) {
        await storage.updateUser(id, userUpdateData);
      }

      // Update patient information
      const patientUpdateData: any = {};
      if (updateData.dateOfBirth !== undefined) {
        // Convert date string to Date object for database storage
        patientUpdateData.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined;
      }
      if (updateData.gender !== undefined) patientUpdateData.gender = updateData.gender;
      if (updateData.address !== undefined) patientUpdateData.address = updateData.address;
      if (updateData.city !== undefined) patientUpdateData.city = updateData.city;
      if (updateData.state !== undefined) patientUpdateData.state = updateData.state;
      if (updateData.zipCode !== undefined) patientUpdateData.zipCode = updateData.zipCode;
      if (updateData.emergencyContact !== undefined) patientUpdateData.emergencyContact = updateData.emergencyContact;
      if (updateData.emergencyPhone !== undefined) patientUpdateData.emergencyPhone = updateData.emergencyPhone;
      if (updateData.insuranceProvider !== undefined) patientUpdateData.insuranceProvider = updateData.insuranceProvider;
      if (updateData.insuranceNumber !== undefined) patientUpdateData.insuranceNumber = updateData.insuranceNumber;
      if (updateData.medicalHistory !== undefined) patientUpdateData.medicalHistory = updateData.medicalHistory;
      if (updateData.allergies !== undefined) patientUpdateData.allergies = updateData.allergies;
      if (updateData.medications !== undefined) patientUpdateData.medications = updateData.medications;

      if (Object.keys(patientUpdateData).length > 0) {
        await storage.updatePatient(id, patientUpdateData);
      }

      res.json({ message: "Patient updated successfully" });
    } catch (error) {
      console.error("Update patient error:", error);
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete("/api/admin/patients/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;

      // Deactivate the user instead of deleting
      await storage.updateUser(id, { isActive: false });

      // Broadcast account deactivation notification via WebSocket
      wsServer.broadcastAccountDeactivation(id);

      res.json({ message: "Patient deactivated successfully" });
    } catch (error) {
      console.error("Deactivate patient error:", error);
      res.status(500).json({ message: "Failed to deactivate patient" });
    }
  });

  // Community Member Management API endpoints
  app.post("/api/admin/members", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { firstName, lastName, email, phone, password } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "First name, last name, email, and password are required" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }

      // Create new member user
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        phone: phone || null,
        password,
        role: 'member',
        isActive: true
      });

      res.status(201).json({ 
        message: "Community member created successfully",
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      console.error("Create member error:", error);
      res.status(500).json({ message: "Failed to create community member" });
    }
  });

  app.get("/api/admin/members", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const allUsers = await storage.getAllUsers();
      const memberUsers = allUsers.filter((user: any) => user.role === 'member');
      
      // Get member details with additional info
      const membersWithDetails = memberUsers.map((memberUser: any) => {
        return {
          id: memberUser.id,
          user: {
            id: memberUser.id,
            firstName: memberUser.firstName,
            lastName: memberUser.lastName,
            email: memberUser.email,
            phone: memberUser.phone,
            role: memberUser.role,
            isActive: memberUser.isActive,
            lastLoginAt: memberUser.lastLoginAt,
            createdAt: memberUser.createdAt
          },
          onboardingData: null // Will be added later when we implement the function
        };
      });

      res.json(membersWithDetails);
    } catch (error) {
      console.error("Member fetch error:", error);
      res.status(500).json({ message: "Failed to fetch community members" });
    }
  });

  app.put("/api/admin/members/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Update user information
      const userUpdateData: any = {};
      if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      if (updateData.email) userUpdateData.email = updateData.email;
      if (updateData.phone !== undefined) userUpdateData.phone = updateData.phone;
      if (updateData.isActive !== undefined) userUpdateData.isActive = updateData.isActive;

      if (Object.keys(userUpdateData).length > 0) {
        await storage.updateUser(id, userUpdateData);
      }

      res.json({ message: "Community member updated successfully" });
    } catch (error) {
      console.error("Update member error:", error);
      res.status(500).json({ message: "Failed to update community member" });
    }
  });

  app.delete("/api/admin/members/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;

      // Deactivate the user instead of deleting
      await storage.updateUser(id, { isActive: false });

      // Broadcast account deactivation notification via WebSocket
      wsServer.broadcastAccountDeactivation(id);

      res.json({ message: "Community member deactivated successfully" });
    } catch (error) {
      console.error("Deactivate member error:", error);
      res.status(500).json({ message: "Failed to deactivate community member" });
    }
  });

  app.put("/api/admin/practitioners/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { firstName, lastName, email, phone, licenseNumber, specialty, qualifications, bio, consultationFee, isActive } = req.body;
      const practitionerId = req.params.id;

      const updatedUser = await storage.updateUser(practitionerId, {
        firstName,
        lastName,
        email,
        phone: phone || null,
        isActive: isActive !== false,
      });

      // Get the practitioner profile
      const practitioner = await storage.getPractitionerByUserId(practitionerId);
      
      if (practitioner) {
        // Update practitioner profile
        await storage.updatePractitioner(practitioner.id, {
          licenseNumber: licenseNumber || null,
          specialty: specialty || null,
          qualifications: qualifications || [],
          bio: bio || null,
          consultationFee: consultationFee || null
        });
      }

      if (!updatedUser) {
        return res.status(404).json({ message: "Practitioner not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Practitioner update error:", error);
      res.status(500).json({ message: "Failed to update practitioner" });
    }
  });

  app.delete("/api/admin/practitioners/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const practitionerId = req.params.id;
      
      // Soft delete by deactivating the account
      const updatedUser = await storage.updateUser(practitionerId, {
        isActive: false
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "Practitioner not found" });
      }

      // Broadcast account deactivation notification via WebSocket
      wsServer.broadcastAccountDeactivation(practitionerId);

      res.json({ message: "Practitioner deactivated successfully" });
    } catch (error) {
      console.error("Practitioner deletion error:", error);
      res.status(500).json({ message: "Failed to delete practitioner" });
    }
  });

  app.post("/api/admin/practitioners/:id/send-welcome-email", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const practitionerId = req.params.id;
      
      // Get practitioner details
      const practitioner = await storage.getUser(practitionerId);
      
      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner not found" });
      }

      if (practitioner.role !== 'practitioner') {
        return res.status(400).json({ message: "User is not a practitioner" });
      }

      // Generate a new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Update the user's password to the new temporary password
      await storage.updateUser(practitionerId, {
        password: tempPassword,
        firstLogin: true
      });

      // Send welcome email with new credentials
      try {
        await emailService.sendPractitionerWelcomeEmail({
          to: practitioner.email,
          recipientName: `${practitioner.firstName} ${practitioner.lastName}`,
          tempPassword,
          specialty: practitioner.specialty || "Not assigned",
          portalUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000"
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        return res.status(500).json({ message: "Failed to send welcome email" });
      }

      res.json({ 
        message: "Welcome email sent successfully",
        tempPassword // Return temp password for admin reference
      });
    } catch (error) {
      console.error("Send welcome email error:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  });

  app.get("/api/admin/transactions", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { search, status, date } = req.query;
      
      // Get all invoices with patient and practitioner details
      let transactions = await storage.getInvoicesWithSearch();
      
      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        transactions = transactions.filter((t: any) => 
          t.patient?.user?.firstName?.toLowerCase().includes(searchLower) ||
          t.patient?.user?.lastName?.toLowerCase().includes(searchLower) ||
          t.practitioner?.user?.firstName?.toLowerCase().includes(searchLower) ||
          t.practitioner?.user?.lastName?.toLowerCase().includes(searchLower) ||
          t.invoiceNumber?.toLowerCase().includes(searchLower) ||
          t.stripePaymentIntentId?.toLowerCase().includes(searchLower)
        );
      }

      if (status && status !== 'all') {
        transactions = transactions.filter((t: any) => t.status === status);
      }

      if (date && date !== 'all') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        let filterDate: Date;
        switch (date) {
          case 'today':
            filterDate = startOfDay;
            break;
          case 'week':
            filterDate = startOfWeek;
            break;
          case 'month':
            filterDate = startOfMonth;
            break;
          case 'year':
            filterDate = startOfYear;
            break;
          default:
            filterDate = new Date(0);
        }

        transactions = transactions.filter((t: any) => new Date(t.createdAt) >= filterDate);
      }

      // Transform transactions to include payment method information
      const transformedTransactions = transactions.map((t: any) => ({
        ...t,
        paymentMethod: t.stripePaymentIntentId ? 'Stripe' : 'Manual',
        // Map invoice status to transaction status for better display
        status: t.status === 'paid' ? 'succeeded' : 
                t.status === 'sent' ? 'pending' : 
                t.status === 'overdue' ? 'failed' : 
                t.status === 'draft' ? 'draft' : 
                t.status === 'cancelled' ? 'cancelled' : t.status
      }));

      res.json(transformedTransactions);
    } catch (error) {
      console.error("Admin transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  // Message routes
  app.get("/api/messages", verifyToken, async (req: any, res) => {
    try {
      const { limit = 50, offset = 0, messageType, appointmentId, status } = req.query;
      const messages = await storage.getMessages(req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        messageType,
        appointmentId,
        status
      });
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.get("/api/messages/conversation/:userId", verifyToken, async (req: any, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const messages = await storage.getConversation(req.user.id, req.params.userId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      res.json(messages);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  app.get("/api/messages/appointment/:appointmentId", verifyToken, async (req: any, res) => {
    try {
      const messages = await storage.getMessagesByAppointment(req.params.appointmentId);
      res.json(messages);
    } catch (error) {
      console.error("Get appointment messages error:", error);
      res.status(500).json({ message: "Failed to get appointment messages" });
    }
  });

  app.get("/api/messages/unread-count", verifyToken, async (req: any, res) => {
    try {
      const count = await storage.getUnreadMessagesCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Get unread messages count error:", error);
      res.status(500).json({ message: "Failed to get unread messages count" });
    }
  });

  // Get online users
  app.get("/api/websocket/online-users", verifyToken, async (req: any, res) => {
    try {
      const onlineUserIds: string[] = [];
      
      // Get all connected WebSocket clients
      wsServer.wss.clients.forEach((client: any) => {
        if (client.readyState === 1 && client.userId) { // WebSocket.OPEN = 1
          onlineUserIds.push(client.userId);
        }
      });

      res.json(onlineUserIds);
    } catch (error) {
      console.error("Error getting online users:", error);
      res.status(500).json({ error: "Failed to get online users" });
    }
  });

  // Get allowed recipients for messaging based on user role
  app.get("/api/messages/allowed-recipients", verifyToken, async (req: any, res) => {
    try {
      const { search } = req.query;
      const userRole = req.user.role;
      let allowedRecipients = [];

      if (userRole === 'admin' || userRole === 'staff') {
        // Admin/Staff can message anyone
        const allUsers = await storage.getAllUsers();
        allowedRecipients = allUsers
          .filter((user: any) => user.id !== req.user.id) // Exclude self
          .map((user: any) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            displayName: `${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`
          }));
      } else if (userRole === 'practitioner') {
        // Practitioners can message their patients, staff, and admins
        const practitioner = await storage.getPractitionerByUserId(req.user.id);
        if (!practitioner) {
          return res.status(404).json({ message: "Practitioner profile not found" });
        }

        // Get patients with appointments
        const patientAppointments = await storage.getAppointmentsByPractitionerIds([practitioner.id]);
        const patientIds = [...new Set(patientAppointments.map((apt: any) => apt.patientId))];
        
        // Get patient users
        const patientUsers = await Promise.all(
          patientIds.map(async (patientId: string) => {
            const patient = await storage.getPatient(patientId);
            if (patient?.user) {
              return {
                id: patient.user.id,
                firstName: patient.user.firstName,
                lastName: patient.user.lastName,
                email: patient.user.email,
                role: 'patient',
                displayName: `${patient.user.firstName} ${patient.user.lastName} (${patient.user.email}) - Patient`
              };
            }
            return null;
          })
        );

        // Get staff and admin users
        const allUsers = await storage.getAllUsers();
        const staffAndAdminUsers = allUsers
          .filter((user: any) => (user.role === 'staff' || user.role === 'admin') && user.id !== req.user.id)
          .map((user: any) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            displayName: `${user.firstName} ${user.lastName} (${user.email}) - ${user.role === 'admin' ? 'Administrator' : 'Staff'}`
          }));

        allowedRecipients = [...patientUsers.filter(Boolean), ...staffAndAdminUsers];
      } else if (userRole === 'patient') {
        // Patients can message their practitioners, staff, and admins
        const patient = await storage.getPatientByUserId(req.user.id);
        if (!patient) {
          return res.status(404).json({ message: "Patient profile not found" });
        }

        // Get practitioners with appointments
        const patientAppointments = await storage.getAppointmentsByPatientId(patient.id);
        const practitionerIds = [...new Set(patientAppointments.map((apt: any) => apt.practitionerId))];
        
        // Get practitioner users
        const practitionerUsers = await Promise.all(
          practitionerIds.map(async (practitionerId: string) => {
            const practitioner = await storage.getPractitionerByIdWithUser(practitionerId);
            if (practitioner?.user) {
              return {
                id: practitioner.user.id,
                firstName: practitioner.user.firstName,
                lastName: practitioner.user.lastName,
                email: practitioner.user.email,
                role: 'practitioner',
                displayName: `Dr. ${practitioner.user.firstName} ${practitioner.user.lastName} (${practitioner.user.email}) - Practitioner`
              };
            }
            return null;
          })
        );

        // Get staff and admin users
        const allUsers = await storage.getAllUsers();
        const staffAndAdminUsers = allUsers
          .filter((user: any) => user.role === 'staff' || user.role === 'admin')
          .map((user: any) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            displayName: `${user.firstName} ${user.lastName} (${user.email}) - ${user.role === 'admin' ? 'Administrator' : 'Staff'}`
          }));

        allowedRecipients = [...practitionerUsers.filter(Boolean), ...staffAndAdminUsers];
      }

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        allowedRecipients = allowedRecipients.filter((recipient: any) =>
          recipient.displayName.toLowerCase().includes(searchLower) ||
          recipient.email.toLowerCase().includes(searchLower)
        );
      }

      res.json(allowedRecipients);
    } catch (error) {
      console.error("Get allowed recipients error:", error);
      res.status(500).json({ message: "Failed to get allowed recipients" });
    }
  });

  app.post("/api/messages", verifyToken, async (req: any, res) => {
    try {
      // Role-based messaging restrictions
      const { recipientId } = req.body;
      const senderRole = req.user.role;
      
      console.log('Message sending attempt:', {
        senderId: req.user.id,
        senderRole: req.user.role,
        recipientId,
        body: req.body
      });
      
      // Get recipient user details
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      // Validate messaging permissions based on roles
      if (senderRole === 'patient') {
        // Patients can message their practitioners, staff, and admins
        if (recipient.role !== 'practitioner' && recipient.role !== 'staff' && recipient.role !== 'admin') {
          return res.status(403).json({ 
            message: "Patients can only message their practitioners, staff members, and administrators" 
          });
        }
        
        // For practitioners, check if they have appointments with the patient
        if (recipient.role === 'practitioner') {
          const patient = await storage.getPatientByUserId(req.user.id);
          if (!patient) {
            return res.status(403).json({ 
              message: "Patient profile not found" 
            });
          }
          
          // Get the practitioner profile for the recipient
          const practitioner = await storage.getPractitionerByUserId(recipient.id);
          if (!practitioner) {
            console.log('Practitioner profile not found for user:', recipient.id);
            return res.status(403).json({ 
              message: "Practitioner profile not found" 
            });
          }
          
          console.log('Checking appointments between practitioner:', practitioner.id, 'and patient:', patient.id);
          const hasAppointments = await storage.getAppointmentsByPractitionerIds([practitioner.id], patient.id);
          console.log('Found appointments:', hasAppointments.length);
          
          if (hasAppointments.length === 0) {
            return res.status(403).json({ 
              message: "You can only message practitioners you have appointments with" 
            });
          }
        }
      } else if (senderRole === 'practitioner') {
        // Practitioners can message their patients, staff, and admins
        if (recipient.role !== 'patient' && recipient.role !== 'staff' && recipient.role !== 'admin') {
          return res.status(403).json({ 
            message: "Practitioners can only message their patients, staff members, and administrators" 
          });
        }
        
        // For patients, check if they have appointments with the practitioner
        if (recipient.role === 'patient') {
          const practitioner = await storage.getPractitionerByUserId(req.user.id);
          if (!practitioner) {
            return res.status(403).json({ 
              message: "Practitioner profile not found" 
            });
          }
          
          // Get the patient profile for the recipient
          const patient = await storage.getPatientByUserId(recipient.id);
          if (!patient) {
            console.log('Patient profile not found for user:', recipient.id);
            return res.status(403).json({ 
              message: "Patient profile not found" 
            });
          }
          
          console.log('Checking appointments between practitioner:', practitioner.id, 'and patient:', patient.id);
          const hasAppointments = await storage.getAppointmentsByPractitionerIds([practitioner.id], patient.id);
          console.log('Found appointments:', hasAppointments.length);
          
          if (hasAppointments.length === 0) {
            return res.status(403).json({ 
              message: "You can only message patients you have appointments with" 
            });
          }
        }
      }
      // Admin/Staff can message anyone (no restrictions)
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id,
        deliveryStatus: "sent", // Set initial delivery status
      });
      
      const message = await storage.createMessage(messageData);
      
      // Send real-time notification via WebSocket if available
      if (wsServer) {
        // Check if recipient is online
        const isRecipientOnline = wsServer.isUserOnline(message.recipientId);
        
        // Send message to recipient
        wsServer.sendMessageToUser(message.recipientId, {
          type: 'new_message',
          data: {
            messageId: message.id,
            from: message.senderId,
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            content: message.content,
            subject: message.subject,
            appointmentId: message.appointmentId,
            messageType: message.messageType,
            timestamp: new Date()
          }
        });

        // If recipient is online, mark message as delivered immediately
        if (isRecipientOnline) {
          try {
            await storage.markMessageAsDelivered(message.id);
            console.log(`Message ${message.id} marked as delivered to online user ${message.recipientId}`);
          } catch (error) {
            console.error('Failed to mark message as delivered:', error);
          }
        }
      }

      // Check if this is a new conversation
      let isNewConversation = false;
      
      if (message.appointmentId) {
        // If message is about an appointment, check if there are existing messages for this appointment
        const existingAppointmentMessages = await storage.getMessagesByAppointment(message.appointmentId);
        isNewConversation = existingAppointmentMessages.length === 0;
      } else {
        // If no appointment, check if there are any messages between these users
        const existingMessages = await storage.getConversation(message.senderId, message.recipientId, { limit: 1 });
        isNewConversation = existingMessages.length === 0;
      }

      // Send notification via notification channel
      try {
        await notificationService.createNotification({
          userId: message.recipientId,
          title: isNewConversation 
            ? `New Conversation from ${req.user.firstName} ${req.user.lastName}`
            : `New Message from ${req.user.firstName} ${req.user.lastName}`,
          message: message.subject,
          type: 'message_received',
          priority: mapMessagePriorityToNotificationPriority(message.priority),
          actionUrl: '/messages', // Navigate to messages page when clicked
          metadata: {
            messageId: message.id,
            senderId: message.senderId,
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            senderRole: req.user.role,
            messageType: message.messageType,
            appointmentId: message.appointmentId,
            isNewConversation
          }
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      // Send email notification for urgent messages OR new conversations
      // Email notifications disabled for messages - only in-app notifications are used
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  // Mark message as read
  app.patch("/api/messages/:id/read", verifyToken, async (req: any, res) => {
    try {
      const messageId = req.params.id;
      const userId = req.user.id;
      
      // Get the message to verify ownership
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only the recipient can mark a message as read
      if (message.recipientId !== userId) {
        return res.status(403).json({ message: "You can only mark messages sent to you as read" });
      }
      
      // Mark message as read
      const success = await storage.markMessageAsRead(messageId);
      
      if (success) {
        // Notify sender via WebSocket that message was read
        if (wsServer) {
          wsServer.sendMessageToUser(message.senderId, {
            type: 'message_read',
            data: {
              messageId: messageId,
              readBy: userId,
              timestamp: new Date()
            }
          });
        }
        
        res.json({ success: true, message: "Message marked as read" });
      } else {
        res.status(400).json({ message: "Failed to mark message as read" });
      }
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Mark message as delivered
  app.patch("/api/messages/:id/delivered", verifyToken, async (req: any, res) => {
    try {
      const messageId = req.params.id;
      const userId = req.user.id;
      
      // Get the message to verify ownership
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only the recipient can mark a message as delivered
      if (message.recipientId !== userId) {
        return res.status(403).json({ message: "You can only mark messages sent to you as delivered" });
      }
      
      // Mark message as delivered
      const success = await storage.markMessageAsDelivered(messageId);
      
      if (success) {
        res.json({ success: true, message: "Message marked as delivered" });
      } else {
        res.status(400).json({ message: "Failed to mark message as delivered" });
      }
    } catch (error) {
      console.error("Mark message as delivered error:", error);
      res.status(500).json({ message: "Failed to mark message as delivered" });
    }
  });

  // Bulk mark messages as read
  app.post("/api/messages/bulk-mark-read", verifyToken, async (req: any, res) => {
    try {
      const { senderId, appointmentId } = req.body;
      const userId = req.user.id;
      
      if (!senderId) {
        return res.status(400).json({ message: "Sender ID is required" });
      }
      
      // Mark all unread messages from this sender as read
      const success = await storage.bulkMarkMessagesAsRead(userId, senderId, appointmentId);
      
      if (success) {
        // Notify sender via WebSocket that messages were read
        if (wsServer) {
          wsServer.sendMessageToUser(senderId, {
            type: 'messages_read',
            data: {
              readBy: userId,
              timestamp: new Date(),
              appointmentId
            }
          });
        }
        
        res.json({ success: true, message: "Messages marked as read" });
      } else {
        res.status(400).json({ message: "Failed to mark messages as read" });
      }
    } catch (error) {
      console.error("Bulk mark messages as read error:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  app.post("/api/messages/system", verifyToken, async (req: any, res) => {
    try {
      const { recipientId, subject, content, messageType, appointmentId, priority, metadata } = req.body;
      
      const message = await storage.createSystemMessage({
        recipientId,
        subject,
        content,
        messageType,
        appointmentId,
        priority,
        metadata
      });
      
      // Send real-time notification via WebSocket if available
      if (wsServer) {
        wsServer.sendToUser(recipientId, {
          type: 'new_message',
          data: {
            messageId: message.id,
            from: 'system',
            content: message.content,
            subject: message.subject,
            appointmentId: message.appointmentId,
            messageType: message.messageType,
            timestamp: new Date()
          }
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Create system message error:", error);
      res.status(400).json({ message: "Failed to create system message" });
    }
  });

  app.put("/api/messages/:id/read", verifyToken, async (req, res) => {
    try {
      const success = await storage.markMessageAsRead(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.put("/api/messages/:id/delivered", verifyToken, async (req, res) => {
    try {
      const success = await storage.markMessageAsDelivered(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Mark message as delivered error:", error);
      res.status(500).json({ message: "Failed to mark message as delivered" });
    }
  });

  // Telehealth session routes
  app.get("/api/telehealth-sessions", verifyToken, async (req: any, res) => {
    try {
      const { practitionerId, patientId } = req.query;
      const user = req.user;
      
      let filterPractitionerId = practitionerId;
      let filterPatientId = patientId;
      
      console.log("Telehealth sessions request:", {
        userRole: user.role,
        userId: user.id,
        queryPractitionerId: practitionerId,
        queryPatientId: patientId
      });
      
      // Role-based filtering
      if (user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(user.id);
        filterPractitionerId = practitioner?.id;
        console.log("Practitioner filter:", { practitionerId: filterPractitionerId });
      } else if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        filterPatientId = patient?.id;
        console.log("Patient filter:", { patientId: filterPatientId });
      } else {
        // For admin or other roles, show all sessions (no filtering)
        console.log("No role-based filtering applied - showing all sessions");
      }
      
      const sessions = await storage.getTelehealthSessions(filterPractitionerId, filterPatientId);
      console.log("Found sessions:", sessions.length);
      
      // Also get all sessions without filtering for debugging
      const allSessions = await storage.getTelehealthSessions();
      console.log("Total sessions in database:", allSessions.length);
      
      res.json(sessions);
    } catch (error) {
      console.error("Get telehealth sessions error:", error);
      res.status(500).json({ message: "Failed to get telehealth sessions" });
    }
  });

  app.get("/api/telehealth-sessions/:id", verifyToken, async (req, res) => {
    try {
      const session = await storage.getTelehealthSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }
      // Cache the user's active telehealth session for WebSocket attachment
      try {
        const userId = (req as any).user.id as string;
        // Infer role for this user in this session
        let role: 'patient' | 'practitioner' | undefined;
        if (session.patient?.userId === userId) role = 'patient';
        if (session.practitioner?.userId === userId) role = 'practitioner';
        // Admin/staff default to practitioner
        if (!role) {
          const userRole = (req as any).user.role as string;
          if (userRole === 'admin' || userRole === 'staff' || userRole === 'practitioner') {
            role = 'practitioner';
          } else if (userRole === 'patient') {
            role = 'patient';
          }
        }
        if (role) {
          // Lazy import to avoid circular import issues
          const { wsServer } = await import('./websocket-server');
          wsServer.activeSessionByUser.set(userId, { sessionId: session.id, role });
          console.log('Cached active telehealth session for user', userId, { sessionId: session.id, role });
        }
      } catch (cacheErr) {
        console.log('Warning: failed to cache active telehealth session for websocket attach', cacheErr);
      }
      res.json(session);
    } catch (error) {
      console.error("Get telehealth session error:", error);
      res.status(500).json({ message: "Failed to get telehealth session" });
    }
  });

  app.post("/api/telehealth-sessions", verifyToken, async (req: any, res) => {
    try {
      const sessionData = insertTelehealthSessionSchema.parse(req.body);
      
      // Generate meeting URL based on platform
      const meetingUrl = generateMeetingUrl(sessionData.platform, sessionData.appointmentId);
      const meetingId = generateMeetingId();
      const passcode = generatePasscode();
      
      const sessionWithMeeting = {
        ...sessionData,
        meetingUrl,
        meetingId,
        passcode,
        hostKey: generateHostKey()
      };
      
      // Use integration service to create session with notifications
      const session = await integrationService.createTelehealthSessionWithNotifications(sessionWithMeeting, req.user.id);
      console.log("Session created successfully with notifications:", session);
      
      // Update the meeting URL with the actual session ID
      const updatedMeetingUrl = generateMeetingUrl(sessionData.platform, session.id);
      await storage.updateTelehealthSession(session.id, { meetingUrl: updatedMeetingUrl });
      
      // Broadcast session creation to all connected clients
      try {
        const { wsServer } = await import('./websocket-server');
        wsServer.broadcast({
          type: 'telehealth_session_created',
          data: {
            sessionId: session.id,
            createdBy: req.user.id,
            timestamp: new Date().toISOString()
          }
        });
        console.log('📡 Broadcasted telehealth session creation');
      } catch (error) {
        console.error('Failed to broadcast session creation:', error);
      }
      
      res.status(201).json({ ...session, meetingUrl: updatedMeetingUrl });
    } catch (error) {
      console.error("Create telehealth session error:", error);
      res.status(400).json({ message: "Failed to create telehealth session" });
    }
  });

  app.put("/api/telehealth-sessions/:id", verifyToken, async (req, res) => {
    try {
      const sessionData = insertTelehealthSessionSchema.partial().parse(req.body);
      const session = await storage.updateTelehealthSession(req.params.id, sessionData);
      
      if (!session) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }
      
      // Broadcast session update to all connected clients
      try {
        const { wsServer } = await import('./websocket-server');
        wsServer.broadcast({
          type: 'telehealth_session_updated',
          data: {
            sessionId: session.id,
            updatedBy: req.user.id,
            timestamp: new Date().toISOString()
          }
        });
        console.log('📡 Broadcasted telehealth session update');
      } catch (error) {
        console.error('Failed to broadcast session update:', error);
      }
      
      res.json(session);
    } catch (error) {
      console.error("Update telehealth session error:", error);
      res.status(400).json({ message: "Failed to update telehealth session" });
    }
  });

  app.post("/api/telehealth-sessions/:id/start", verifyToken, async (req: any, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.user.id;
      
      const success = await storage.startTelehealthSession(sessionId);
      if (!success) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }
      
      // Broadcast meeting started to all participants in the session
      wsServer.broadcastMeetingStarted(sessionId, userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Start telehealth session error:", error);
      res.status(500).json({ message: "Failed to start telehealth session" });
    }
  });

  app.post("/api/telehealth-sessions/:id/join", verifyToken, async (req: any, res) => {
    try {
      const { isPatient } = req.body;
      const success = await storage.joinTelehealthSession(req.params.id, isPatient || false);
      if (!success) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }

      // Cache the session for WebSocket connection
      try {
        const userId = req.user.id;
        const session = await storage.getTelehealthSession(req.params.id);
        if (session) {
          let role: 'patient' | 'practitioner' = 'practitioner';
          if (session.patient?.userId === userId) role = 'patient';
          if (session.practitioner?.userId === userId) role = 'practitioner';
          // Admin/staff default to practitioner
          if (!role) {
            const userRole = req.user.role as string;
            if (userRole === 'admin' || userRole === 'staff' || userRole === 'practitioner') {
              role = 'practitioner';
            } else if (userRole === 'patient') {
              role = 'patient';
            }
          }
          if (role) {
            // Lazy import to avoid circular import issues
            const { wsServer } = await import('./websocket-server');
            wsServer.activeSessionByUser.set(userId, { sessionId: session.id, role });
            console.log('Cached active telehealth session for user', userId, { sessionId: session.id, role });
          }
        }
      } catch (cacheErr) {
        console.log('Warning: failed to cache active telehealth session for websocket attach', cacheErr);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Join telehealth session error:", error);
      res.status(500).json({ message: "Failed to join telehealth session" });
    }
  });

  app.post("/api/telehealth-sessions/:id/end", verifyToken, async (req, res) => {
    try {
      const success = await storage.endTelehealthSession(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }
      
      // Broadcast session end to all connected clients
      try {
        const { wsServer } = await import('./websocket-server');
        wsServer.broadcast({
          type: 'telehealth_session_updated',
          data: {
            sessionId: req.params.id,
            updatedBy: req.user.id,
            action: 'ended',
            timestamp: new Date().toISOString()
          }
        });
        console.log('📡 Broadcasted telehealth session end');
      } catch (error) {
        console.error('Failed to broadcast session end:', error);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("End telehealth session error:", error);
      res.status(500).json({ message: "Failed to end telehealth session" });
    }
  });

  // Update session notes
  app.put("/api/telehealth-sessions/:id/notes", verifyToken, async (req, res) => {
    try {
      const { sessionNotes } = req.body;
      const session = await storage.updateTelehealthSession(req.params.id, { sessionNotes });
      if (!session) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }
      res.json({ message: "Session notes updated successfully", session });
    } catch (error) {
      console.error("Update session notes error:", error);
      res.status(500).json({ message: "Failed to update session notes" });
    }
  });

  // Update recording URL
  app.put("/api/telehealth-sessions/:id/recording", verifyToken, async (req, res) => {
    try {
      const { recordingUrl } = req.body;
      const session = await storage.updateTelehealthSession(req.params.id, { recordingUrl });
      if (!session) {
        return res.status(404).json({ message: "Telehealth session not found" });
      }
      res.json({ message: "Recording URL updated successfully", session });
    } catch (error) {
      console.error("Update recording URL error:", error);
      res.status(500).json({ message: "Failed to update recording URL" });
    }
  });

  // Report technical issues
  app.post("/api/telehealth-sessions/:id/technical-issues", verifyToken, async (req, res) => {
    try {
      const { technicalIssues } = req.body;
      const session = await storage.updateTelehealthSession(req.params.id, { 
        technicalIssues,
        status: "technical_issues"
      });
      if (!session) {
        return res.status(500).json({ message: "Telehealth session not found" });
      }
      res.json({ message: "Technical issues reported successfully", session });
    } catch (error) {
      console.error("Report technical issues error:", error);
      res.status(500).json({ message: "Failed to report technical issues" });
    }
  });

  // System Settings routes
  app.get("/api/system-settings", verifyToken, async (req: any, res) => {
    try {
      // Only admin users can access system settings
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      let settings = await storage.getSystemSettings();
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.createSystemSettings({});
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ message: "Failed to get system settings" });
    }
  });

  app.put("/api/system-settings", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      const settingsData = insertSystemSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSystemSettings(settingsData);
      
      if (!settings) {
        return res.status(404).json({ message: "System settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Update system settings error:", error);
      res.status(400).json({ message: "Failed to update system settings" });
    }
  });

  // User Preferences routes
  app.get("/api/user-preferences", verifyToken, async (req: any, res) => {
    try {
      let preferences = await storage.getUserPreferences(req.user.id);
      
      // Create default preferences if none exist
      if (!preferences) {
        preferences = await storage.createUserPreferences({
          userId: req.user.id,
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Get user preferences error:", error);
      // Return default preferences instead of error to prevent logout
      const defaultPreferences = {
        userId: req.user.id,
        theme: 'light',
        compactMode: false,
        showPatientPhotos: true,
        highContrast: false,
        reduceMotion: false,
        screenReaderOptimized: false,
        fontSizeScale: 'medium',
        calendarView: 'week',
        showWeekends: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      res.json(defaultPreferences);
    }
  });

  app.put("/api/user-preferences", verifyToken, async (req: any, res) => {
    try {
      const preferencesData = insertUserPreferencesSchema.partial().parse(req.body);
      let preferences = await storage.updateUserPreferences(req.user.id, preferencesData);
      
      // Create preferences if they don't exist
      if (!preferences) {
        preferences = await storage.createUserPreferences({
          userId: req.user.id,
          ...preferencesData,
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Update user preferences error:", error);
      // Return current preferences instead of error to prevent logout
      const currentPreferences = await storage.getUserPreferences(req.user.id);
      if (currentPreferences) {
        res.json(currentPreferences);
      } else {
        res.json({
          userId: req.user.id,
          theme: 'light',
          compactMode: false,
          showPatientPhotos: true,
          highContrast: false,
          reduceMotion: false,
          screenReaderOptimized: false,
          fontSizeScale: 'medium',
          calendarView: 'week',
          showWeekends: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  });

  // Integration API endpoints for cross-module workflows
  
  // Integrated appointment creation with cross-module workflows
  app.post("/api/integration/appointments", verifyToken, async (req: any, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      // Ensure appointments created through integration API are marked as not public booking
      appointmentData.isPublicBooking = false;
      const appointment = await integrationService.createIntegratedAppointment(appointmentData, req.user.id);
      res.json(appointment);
    } catch (error) {
      console.error("Create integrated appointment error:", error);
      res.status(400).json({ message: "Failed to create integrated appointment" });
    }
  });

  // Complete appointment workflow
  app.post("/api/integration/appointments/:id/complete", verifyToken, async (req: any, res) => {
    try {
      const { clinicalNoteId, invoiceId } = req.body;
      const appointment = await integrationService.completeAppointmentWorkflow(req.params.id, clinicalNoteId, invoiceId);
      res.json(appointment);
    } catch (error) {
      console.error("Complete appointment workflow error:", error);
      res.status(400).json({ message: "Failed to complete appointment workflow" });
    }
  });

  // Patient timeline - comprehensive view of all patient interactions
  app.get("/api/integration/patient-timeline/:patientId", verifyToken, async (req: any, res) => {
    try {
      const timeline = await integrationService.getPatientTimeline(req.params.patientId);
      res.json(timeline);
    } catch (error) {
      console.error("Get patient timeline error:", error);
      res.status(500).json({ message: "Failed to get patient timeline" });
    }
  });

  // Practitioner dashboard with cross-module insights
  app.get("/api/integration/practitioner-dashboard/:practitionerId", verifyToken, async (req: any, res) => {
    try {
      const dashboard = await integrationService.getPractitionerDashboard(req.params.practitionerId);
      res.json(dashboard);
    } catch (error) {
      console.error("Get practitioner dashboard error:", error);
      res.status(500).json({ message: "Failed to get practitioner dashboard" });
    }
  });

  // Cross-module search
  app.get("/api/integration/search", verifyToken, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json({ patients: [], appointments: [], notes: [], invoices: [] });
      }

      const [patients, appointments, notes, invoices] = await Promise.all([
        storage.getPatients(query, 10, 0),
        storage.getAppointments(undefined, undefined, query),
        storage.getClinicalNotes(),
        storage.getInvoices()
      ]);

      res.json({
        patients: patients.slice(0, 5),
        appointments: appointments.filter(a => 
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.description?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5),
        notes: notes.filter(n => 
          n.subjective?.toLowerCase().includes(query.toLowerCase()) ||
          n.assessment?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5),
        invoices: invoices.filter(i => 
          i.description?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5)
      });
    } catch (error) {
      console.error("Cross-module search error:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Contextual data for entity relationships
  app.get("/api/integration/contextual/:entityType/:entityId", verifyToken, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      if (entityType === 'patient') {
        const [patient, recentAppointments, activeInvoices, clinicalNotes] = await Promise.all([
          storage.getPatient(entityId),
          storage.getAppointments(entityId),
          storage.getInvoices(entityId),
          storage.getClinicalNotes(entityId)
        ]);

        res.json({
          patient,
          recentAppointments: recentAppointments.slice(0, 5),
          activeInvoices: activeInvoices.filter(i => i.status !== 'paid').slice(0, 3),
          clinicalSummary: {
            totalNotes: clinicalNotes.length,
            lastNote: clinicalNotes[0]?.createdAt,
          }
        });
      } else {
        res.json({});
      }
    } catch (error) {
      console.error("Get contextual data error:", error);
      res.status(500).json({ message: "Failed to get contextual data" });
    }
  });

  // Get practitioners for appointment scheduling
  app.get("/api/practitioners", verifyToken, async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const practitioners = await storage.getPractitioners();
      res.json(practitioners);
    } catch (error) {
      console.error("Get practitioners error:", error);
      // Return empty array instead of error to prevent logout
      res.json([]);
    }
  });

  // Get specific practitioner by ID
  app.get("/api/practitioners/:id", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const practitioner = await storage.getPractitionerById(id);
      
      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner not found" });
      }
      
      res.json(practitioner);
    } catch (error) {
      console.error("Get practitioner by ID error:", error);
      res.status(500).json({ message: "Failed to get practitioner" });
    }
  });

  // Mount notification routes
  app.use("/api/notifications", verifyToken, notificationRoutes);

  // Mount public booking routes (no authentication required)
  app.use("/api/public-bookings", publicBookingRoutes);

  // Mount version routes (no authentication required)
  app.use("/api/version", versionRoutes);

  // Patient Portal API endpoints
  app.get("/api/patient/dashboard", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      res.json({ patient });
    } catch (error) {
      console.error("Get patient dashboard error:", error);
      res.status(500).json({ message: "Failed to get patient dashboard" });
    }
  });

  app.get("/api/patient/appointments", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const appointments = await storage.getAppointments(undefined, patient.id);
      res.json(appointments);
    } catch (error) {
      console.error("Get patient appointments error:", error);
      res.status(500).json({ message: "Failed to get appointments" });
    }
  });

  app.get("/api/patient/appointments/upcoming", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const appointments = await storage.getAppointments(undefined, patient.id);
      const upcoming = appointments.filter(apt => 
        new Date(apt.appointmentDate) >= new Date() && apt.status !== 'cancelled'
      );
      res.json(upcoming);
    } catch (error) {
      console.error("Get upcoming appointments error:", error);
      res.status(500).json({ message: "Failed to get upcoming appointments" });
    }
  });

  app.post("/api/patient/appointments", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const appointmentData = {
        ...req.body,
        patientId: patient.id,
        status: 'scheduled' as const
      };

      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Create patient appointment error:", error);
      res.status(400).json({ message: "Failed to create appointment" });
    }
  });

  app.get("/api/patient/medical-records", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      // For now, return empty array - this would connect to a document management system
      res.json([]);
    } catch (error) {
      console.error("Get medical records error:", error);
      res.status(500).json({ message: "Failed to get medical records" });
    }
  });

  app.get("/api/patient/test-results", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      // For now, return empty array - this would connect to lab systems
      res.json([]);
    } catch (error) {
      console.error("Get test results error:", error);
      res.status(500).json({ message: "Failed to get test results" });
    }
  });

  app.get("/api/patient/test-results/recent", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      // For now, return empty array - this would connect to lab systems
      res.json([]);
    } catch (error) {
      console.error("Get recent test results error:", error);
      res.status(500).json({ message: "Failed to get recent test results" });
    }
  });

  app.get("/api/patient/clinical-notes", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const notes = await storage.getClinicalNotes(patient.id);
      res.json(notes);
    } catch (error) {
      console.error("Get patient Recovery Notes error:", error);
      res.status(500).json({ message: "Failed to get Recovery Notes" });
    }
  });

  app.get("/api/patient/messages", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error("Get patient messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.get("/api/patient/messages/unread", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getMessages(req.user.id);
      const unread = messages.filter(msg => msg.status === 'unread');
      res.json(unread);
    } catch (error) {
      console.error("Get unread messages error:", error);
      res.status(500).json({ message: "Failed to get unread messages" });
    }
  });

  app.get("/api/patient/invoices", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const invoices = await storage.getInvoices(patient.id);
      res.json(invoices);
    } catch (error) {
      console.error("Get patient invoices error:", error);
      res.status(500).json({ message: "Failed to get invoices" });
    }
  });

  app.get("/api/patient/invoices/unpaid", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      const invoices = await storage.getInvoices(patient.id);
      const unpaid = invoices.filter(inv => inv.status !== 'paid');
      res.json(unpaid);
    } catch (error) {
      console.error("Get unpaid invoices error:", error);
      res.status(500).json({ message: "Failed to get unpaid invoices" });
    }
  });

  app.get("/api/patient/payment-history", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      // Get paid invoices for this patient
      const paidInvoices = await storage.getInvoicesByPatientId(patient.id);
      const paymentHistory = paidInvoices
        .filter((invoice: any) => invoice.status === 'paid' && invoice.paidAt)
        .map((invoice: any) => ({
          id: invoice.id,
          amount: invoice.total,
          status: 'succeeded', // Map 'paid' to 'succeeded' for payment history
          payment_method: invoice.stripePaymentIntentId ? 'stripe' : 'manual',
          created_at: invoice.paidAt,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            description: invoice.description
          },
          stripe_payment_intent_id: invoice.stripePaymentIntentId
        }))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(paymentHistory);
    } catch (error) {
      console.error("Get payment history error:", error);
      res.status(500).json({ message: "Failed to get payment history" });
    }
  });

  app.patch("/api/patient/profile", verifyToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(req.user.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      // Update user info
      await storage.updateUser(req.user.id, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
      });

      // Update patient info
      await storage.updatePatient(patient.id, {
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        address: req.body.address,
        emergencyContact: req.body.emergencyContact,
        emergencyPhone: req.body.emergencyPhone,
        insuranceProvider: req.body.insuranceProvider,
        insuranceNumber: req.body.insuranceNumber,
      });

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update patient profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });



  // Calendar Settings routes
  app.get("/api/calendar-settings", verifyToken, async (req: any, res) => {
    try {
      let practitionerId;
      
      // Check if a specific practitionerId is requested (for patients/admins)
      if (req.query.practitionerId) {
        practitionerId = req.query.practitionerId;
      } else if (req.user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(req.user.id);
        practitionerId = practitioner?.id;
      }
      
      const settings = await storage.getCalendarSettings(practitionerId);
      
      // If no settings found, return default settings
      if (!settings) {
        const defaultSettings = {
          timeInterval: 60,
          bufferTime: 0,
          defaultStartTime: "09:00",
          defaultEndTime: "17:00",
          workingDays: [1, 2, 3, 4, 5],
          customWorkingHours: {},
          isGlobal: false,
          timezone: "UTC"
        };
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Get calendar settings error:", error);
      // Return default settings instead of error to prevent logout
      const defaultSettings = {
        timeInterval: 60,
        bufferTime: 0,
        defaultStartTime: "09:00",
        defaultEndTime: "17:00",
        workingDays: [1, 2, 3, 4, 5],
        customWorkingHours: {},
        isGlobal: false,
        timezone: "UTC"
      };
      res.json(defaultSettings);
    }
  });

  app.post("/api/calendar-settings", verifyToken, async (req: any, res) => {
    try {
      let practitionerId;
      if (req.user.role === "practitioner") {
        const practitioner = await storage.getPractitionerByUserId(req.user.id);
        practitionerId = practitioner?.id;
      }
      
      const settingsData = insertCalendarSettingsSchema.parse({
        ...req.body,
        practitionerId,
        isGlobal: req.user.role === "admin" && req.body.isGlobal
      });
      
      const settings = await storage.createCalendarSettings(settingsData);
      res.status(201).json(settings);
    } catch (error) {
      console.error("Create calendar settings error:", error);
      res.status(400).json({ message: "Failed to create calendar settings" });
    }
  });

  app.put("/api/calendar-settings/:id", verifyToken, async (req: any, res) => {
    try {
      const settingsData = insertCalendarSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateCalendarSettings(req.params.id, settingsData);
      
      if (!settings) {
        return res.status(404).json({ message: "Calendar settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Update calendar settings error:", error);
      res.status(400).json({ message: "Failed to update calendar settings" });
    }
  });

  // Payment Processing Routes
  app.post("/api/payments/create-intent", verifyToken, async (req, res) => {
    try {
      const { invoiceId, amount, currency = 'usd' } = req.body;

      console.log('Creating payment intent:', { invoiceId, amount, currency });

      // Verify invoice exists and user has permission
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        return res.status(404).json({ message: "Invoice not found" });
      }

      console.log('Invoice found:', invoice.id, invoice.invoiceNumber, invoice.total);

      // Check if invoice is already paid
      if (invoice.status === 'paid') {
        console.error('Invoice already paid:', invoice.id);
        return res.status(400).json({ message: "Invoice is already paid" });
      }

      // Check if user is the patient or has admin/practitioner access
      const user = req.user;
      if (user.role === 'patient') {
        const patient = await storage.getPatientByUserId(user.id);
        if (!patient || invoice.patientId !== patient.id) {
          console.error('Access denied for patient:', user.id, 'Invoice patient:', invoice.patientId);
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Validate amount
      if (!amount || amount <= 0) {
        console.error('Invalid amount:', amount);
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Create payment intent with automatic payment methods
      // Note: Using automatic_payment_methods instead of confirmation_method to avoid conflicts
      const paymentIntentData = {
        amount: Math.round(amount), // Amount in cents
        currency,
        metadata: {
          invoiceId,
          patientId: invoice.patientId,
          practitionerId: invoice.practitionerId,
          invoiceNumber: invoice.invoiceNumber,
        },
        automatic_payment_methods: {
          enabled: true, // Automatically handle payment method selection and confirmation
        },
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        receipt_email: invoice.patient?.user?.email, // Send receipt to patient
        capture_method: 'automatic', // Automatically capture the payment
      };

      console.log('Creating Stripe payment intent with data:', paymentIntentData);

      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ message: "Payment system not configured" });
      }
      const paymentIntent = await stripeInstance.paymentIntents.create(paymentIntentData);

      console.log('Payment intent created successfully:', paymentIntent.id, paymentIntent.status);
      console.log('Payment intent creation details:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        client_secret: paymentIntent.client_secret ? 'present' : 'missing'
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('automatic_payment_methods') && error.message.includes('confirmation_method')) {
        errorMessage = 'Payment configuration error. Please contact support.';
      } else if (error.message.includes('amount')) {
        errorMessage = 'Invalid payment amount. Please check the invoice total.';
      } else if (error.message.includes('currency')) {
        errorMessage = 'Invalid currency. Please contact support.';
      }
      
      res.status(500).json({ 
        message: "Error creating payment intent",
        error: errorMessage 
      });
    }
  });



  // Step 1: Process the payment (initial processing)
  app.post("/api/payments/process", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId, invoiceId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ success: false, error: "Payment intent ID is required" });
      }

      console.log('Processing payment intent:', paymentIntentId);
      
      // Retrieve the payment intent from Stripe
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ success: false, error: "Payment system not configured" });
      }
      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
      console.log('Payment intent retrieved for processing:', paymentIntent.id, 'Status:', paymentIntent.status);

      // Validate the payment intent
      if (!paymentIntent) {
        return res.status(400).json({ success: false, error: "Payment intent not found" });
      }

      // Check if payment is in a valid state for processing
      // Allow all statuses for processing - we'll handle them appropriately in confirm step
      console.log('Payment intent status for processing:', paymentIntent.status);
      console.log('Payment intent amount:', paymentIntent.amount);
      console.log('Payment intent currency:', paymentIntent.currency);
      
      // Log the full payment intent for debugging
      console.log('Full payment intent object:', JSON.stringify(paymentIntent, null, 2));

      res.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      });
    } catch (error: any) {
      console.error('Payment processing error:', error);
      res.status(500).json({ success: false, error: error.message || "Payment processing failed" });
    }
  });

  // Step 2: Confirm the payment (complete the payment)
  app.post("/api/payments/confirm", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId, invoiceId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing payment intent ID" 
        });
      }

      // Retrieve the payment intent from Stripe
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ success: false, error: "Payment system not configured" });
      }
      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
      console.log('Payment intent retrieved for confirmation:', paymentIntent.id, 'Status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_confirmation') {
        // For requires_confirmation, confirm the payment first
        if (paymentIntent.status === 'requires_confirmation') {
          console.log('Confirming payment intent:', paymentIntent.id);
          const confirmedPaymentIntent = await stripeInstance.paymentIntents.confirm(paymentIntent.id);
          console.log('Payment intent confirmed, new status:', confirmedPaymentIntent.status);
          
          if (confirmedPaymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
              success: false, 
              error: `Payment confirmation failed. Status: ${confirmedPaymentIntent.status}` 
            });
          }
        }
        
        // Payment confirmed successfully - don't update invoice here
        // Invoice will be updated in the final step after verification
        res.json({ 
          success: true, 
          amount: paymentIntent.amount / 100,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        });
      } else {
        console.log('Payment intent not ready for confirmation:', paymentIntent.status);
        res.status(400).json({ 
          success: false, 
          error: `Payment not ready for confirmation. Status: ${paymentIntent.status}` 
        });
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Payment confirmation failed" 
      });
    }
  });

  // Handle payment success webhook
  app.post("/api/payments/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ error: "Payment system not configured" });
      }
      event = stripeInstance.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Received webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Handle donation payments
        if (paymentIntent.metadata.type === 'donation') {
          try {
            // Update donation status to completed
            await db
              .update(donations)
              .set({
                status: 'completed',
                receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null,
              })
              .where(eq(donations.stripePaymentIntentId, paymentIntent.id));

            console.log('Donation updated to completed:', paymentIntent.id);
          } catch (donationError) {
            console.error('Failed to update donation status:', donationError);
          }
        }
        
        // Update invoice status to paid
        const invoiceId = paymentIntent.metadata.invoiceId;
        if (invoiceId) {
          try {
            await storage.updateInvoice(invoiceId, {
              status: "paid",
              paidAt: new Date(),
              stripePaymentIntentId: paymentIntent.id,
            });

            console.log('Invoice updated to paid:', invoiceId);

            // Get invoice details for notifications
            const invoice = await storage.getInvoice(invoiceId);
            if (invoice) {
              // Notify patient
              if (paymentIntent.metadata.patientId) {
                await notificationService.createNotification({
                  userId: paymentIntent.metadata.patientId,
                  title: "Payment Successful",
                  message: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} for invoice ${invoice.invoiceNumber} has been processed successfully.`,
                  type: "payment_success",
                  priority: "medium",
                  actionUrl: `/billing`,
                  data: {
                    invoiceId,
                    amount: paymentIntent.amount / 100,
                    invoiceNumber: invoice.invoiceNumber
                  }
                });
              }

              // Notify practitioner
              if (invoice.practitionerId) {
                const practitioner = await storage.getPractitionerById(invoice.practitionerId);
                if (practitioner) {
                  await notificationService.createNotification({
                    userId: practitioner.userId,
                    title: "Payment Received",
                    message: `Payment of $${(paymentIntent.amount / 100).toFixed(2)} received for invoice ${invoice.invoiceNumber}`,
                    type: "payment_received",
                    priority: "medium",
                    actionUrl: `/billing`,
                    data: {
                      invoiceId,
                      amount: paymentIntent.amount / 100,
                      invoiceNumber: invoice.invoiceNumber
                    }
                  });
                }
              }

              // Notify all admin/staff users
              try {
                const allUsers = await storage.getUsers();
                const adminStaffUsers = allUsers.filter(user => user.role === 'admin' || user.role === 'staff');
                for (const adminStaff of adminStaffUsers) {
                  await notificationService.createNotification({
                    userId: adminStaff.id,
                    title: `Payment Received - Invoice ${invoice.invoiceNumber}`,
                    message: `Payment of $${(paymentIntent.amount / 100).toFixed(2)} received for service bill`,
                    type: "payment_received",
                    priority: "medium",
                    actionUrl: `/admin/transactions`,
                    data: {
                      invoiceId,
                      amount: paymentIntent.amount / 100,
                      invoiceNumber: invoice.invoiceNumber
                    }
                  });
                }
              } catch (adminNotificationError) {
                console.error('Failed to notify admin/staff:', adminNotificationError);
              }
            }
          } catch (updateError) {
            console.error('Failed to update invoice status:', updateError);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        
        // Handle failed donation payments
        if (failedPayment.metadata.type === 'donation') {
          try {
            // Update donation status to failed
            await db
              .update(donations)
              .set({
                status: 'failed',
              })
              .where(eq(donations.stripePaymentIntentId, failedPayment.id));

            console.log('Donation updated to failed:', failedPayment.id);
          } catch (donationError) {
            console.error('Failed to update donation status:', donationError);
          }
        }
        
        const failedInvoiceId = failedPayment.metadata.invoiceId;
        if (failedInvoiceId) {
          try {
            // Update invoice status to reflect failed payment
            await storage.updateInvoice(failedInvoiceId, {
              status: "sent", // Reset to sent status for retry
            });

            // Create notification about failed payment
            if (failedPayment.metadata.patientId) {
              await notificationService.createNotification({
                userId: failedPayment.metadata.patientId,
                title: "Payment Failed",
                message: `Your payment attempt for $${(failedPayment.amount / 100).toFixed(2)} was unsuccessful. Please try again.`,
                type: "payment_failed",
                priority: "high",
                actionUrl: `/billing`,
                data: {
                  invoiceId: failedInvoiceId,
                  amount: failedPayment.amount / 100
                }
              });
            }
          } catch (notificationError) {
            console.error('Failed to handle payment failure:', notificationError);
          }
        }
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment canceled:', canceledPayment.id);
        
        const canceledInvoiceId = canceledPayment.metadata.invoiceId;
        if (canceledInvoiceId) {
          try {
            // Update invoice status to reflect canceled payment
            await storage.updateInvoice(canceledInvoiceId, {
              status: "sent", // Reset to sent status
            });
          } catch (updateError) {
            console.error('Failed to update invoice for canceled payment:', updateError);
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

      res.json({ received: true });
  });

  // Test endpoint to manually trigger payment success (for debugging)
  app.post("/api/payments/test-success", verifyToken, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { invoiceId } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      // Update invoice status to paid
      await storage.updateInvoice(invoiceId, {
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: "test_payment_intent_" + Date.now(),
      });

      console.log('Test payment success for invoice:', invoiceId);

      res.json({ 
        success: true, 
        message: "Invoice marked as paid for testing purposes" 
      });
    } catch (error) {
      console.error('Test payment error:', error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to process test payment" 
      });
    }
  });

  // Cancel payment intent
  app.post("/api/payments/cancel", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment Intent ID is required" 
        });
      }

      // Cancel the payment intent with Stripe
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ success: false, error: "Payment system not configured" });
      }
      const paymentIntent = await stripeInstance.paymentIntents.cancel(paymentIntentId);
      console.log('Payment intent canceled:', paymentIntent.id, 'Status:', paymentIntent.status);

      res.json({ 
        success: true, 
        status: paymentIntent.status,
        message: "Payment intent canceled successfully"
      });
    } catch (error: any) {
      console.error('Payment cancellation error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to cancel payment intent" 
      });
    }
  });

  // Verify payment intent status
  app.post("/api/payments/verify", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment Intent ID is required" 
        });
      }

      // Retrieve the payment intent from Stripe
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ success: false, error: "Payment system not configured" });
      }
      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
      console.log('Payment intent verification:', paymentIntent.id, 'Status:', paymentIntent.status);

      res.json({ 
        success: true, 
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        last_payment_error: paymentIntent.last_payment_error
      });
    } catch (error: any) {
      console.error('Payment verification error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to verify payment intent" 
      });
    }
  });

  // Debug endpoint to check payment intent status
  app.get("/api/payments/debug/:paymentIntentId", verifyToken, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment Intent ID is required" });
      }

      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log('Payment intent debug info:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        created: paymentIntent.created,
        last_payment_error: paymentIntent.last_payment_error,
        charges: paymentIntent.charges?.data?.map(charge => ({
          id: charge.id,
          status: charge.status,
          amount: charge.amount,
          failure_message: charge.failure_message
        }))
      });

      res.json({ 
        success: true, 
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          created: paymentIntent.created,
          last_payment_error: paymentIntent.last_payment_error,
          charges: paymentIntent.charges?.data?.map(charge => ({
            id: charge.id,
            status: charge.status,
            amount: charge.amount,
            failure_message: charge.failure_message
          }))
        }
      });
    } catch (error: any) {
      console.error('Payment intent debug error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to retrieve payment intent" 
      });
    }
  });

  // Admin Management API endpoints
  app.get("/api/admin/admins", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const allUsers = await storage.getAllUsers();
      console.log("All users from storage:", allUsers.length);
      
      const adminUsers = allUsers.filter(user => user.role === 'admin');
      console.log("Admin users found:", adminUsers.length);
      console.log("Admin users data:", adminUsers);
      
      res.json(adminUsers);
    } catch (error) {
      console.error("Admin management error:", error);
      res.status(500).json({ message: "Failed to get admin users" });
    }
  });

  app.post("/api/admin/admins", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { firstName, lastName, email, phone, department, position, permissions } = req.body;

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + Math.floor(Math.random() * 1000);

      // Hash the temporary password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create admin user
      const adminUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'admin',
        isActive: true,
        department,
        position,
        permissions: permissions || [],
        firstLogin: true,
      });

      // Send welcome email
      try {
        await emailService.sendAdminWelcomeEmail({
          to: email,
          recipientName: `${firstName} ${lastName}`,
          tempPassword,
          department,
          position,
          portalUrl: process.env.CLIENT_BASE_URL || 'http://localhost:3000',
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      res.json({
        success: true,
        admin: adminUser,
        tempPassword
      });
    } catch (error: any) {
      console.error("Create admin error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create admin user",
        error: error.message 
      });
    }
  });

  app.put("/api/admin/admins/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;
      const { firstName, lastName, email, phone, department, position, permissions } = req.body;

      // Update admin user
      await storage.updateUser(id, {
        firstName,
        lastName,
        email,
        phone,
        department,
        position,
        permissions: permissions || [],
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Update admin error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update admin user",
        error: error.message 
      });
    }
  });

  app.delete("/api/admin/admins/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;

      // Prevent self-deletion
      if (id === user.id) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      // Deactivate admin user
      await storage.updateUser(id, {
        isActive: false,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete admin error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to deactivate admin user",
        error: error.message 
      });
    }
  });

  app.post("/api/admin/admins/:id/send-welcome-email", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;

      // Get admin user
      const adminUser = await storage.getUser(id);
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(404).json({ message: "Admin user not found" });
      }

      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + Math.floor(Math.random() * 1000);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user with new password and reset first login
      await storage.updateUser(id, {
        password: hashedPassword,
        firstLogin: true,
      });

      // Send welcome email
      try {
        await emailService.sendAdminWelcomeEmail({
          to: adminUser.email,
          recipientName: `${adminUser.firstName} ${adminUser.lastName}`,
          tempPassword,
          department: adminUser.department,
          position: adminUser.position,
          portalUrl: process.env.CLIENT_BASE_URL || 'http://localhost:3000',
        });
      } catch (emailError) {
        console.error("Failed to send admin welcome email:", emailError);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        tempPassword
      });
    } catch (error: any) {
      console.error("Send welcome email error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to send welcome email",
        error: error.message 
      });
    }
  });

  // Quotes Management API endpoints
  app.get("/api/admin/quotes", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const quotesData = await db.query.quotes.findMany({
        orderBy: [desc(quotes.displayOrder), desc(quotes.createdAt)],
      });

      res.json(quotesData);
    } catch (error) {
      console.error("Quotes fetch error:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post("/api/admin/quotes", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { text, author, category, tags, isActive, isFeatured, displayOrder } = req.body;

      const newQuote = await db.insert(quotes).values({
        text,
        author,
        category: category || 'general',
        tags: tags || [],
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured !== undefined ? isFeatured : false,
        displayOrder: displayOrder || 0,
        createdBy: user.id,
      }).returning();

      res.status(201).json(newQuote[0]);
    } catch (error) {
      console.error("Create quote error:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get("/api/admin/quotes/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;

      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, id),
      });

      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Get quote error:", error);
      res.status(500).json({ message: "Failed to get quote" });
    }
  });

  app.put("/api/admin/quotes/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;
      const { text, author, category, tags, isActive, isFeatured, displayOrder } = req.body;

      const updatedQuote = await db.update(quotes)
        .set({
          text,
          author,
          category: category || 'general',
          tags: tags || [],
          isActive: isActive !== undefined ? isActive : true,
          isFeatured: isFeatured !== undefined ? isFeatured : false,
          displayOrder: displayOrder || 0,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, id))
        .returning();

      if (updatedQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(updatedQuote[0]);
    } catch (error) {
      console.error("Update quote error:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.patch("/api/admin/quotes/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;
      const updateData = req.body;

      const updatedQuote = await db.update(quotes)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, id))
        .returning();

      if (updatedQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(updatedQuote[0]);
    } catch (error) {
      console.error("Patch quote error:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete("/api/admin/quotes/:id", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { id } = req.params;

      const deletedQuote = await db.delete(quotes)
        .where(eq(quotes.id, id))
        .returning();

      if (deletedQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete quote error:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Donation API endpoints
  app.post("/api/donations/create-payment-intent", verifyToken, async (req, res) => {
    try {
      const { amount, email, description = "TiNHiH Portal Donation", firstName, lastName, phone, message, isAnonymous = false } = req.body;
      
      if (!amount || !email) {
        return res.status(400).json({ 
          success: false, 
          error: "Amount and email are required" 
        });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 1) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid amount. Must be at least $1." 
        });
      }

      // Create payment intent for donation
      const paymentIntentData = {
        amount: Math.round(numAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          type: 'donation',
          email: email,
          description: description,
          firstName: firstName || '',
          lastName: lastName || '',
          isAnonymous: isAnonymous.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: description,
        receipt_email: email,
        capture_method: 'automatic',
      };

      console.log('Creating donation payment intent with data:', paymentIntentData);

      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ 
          success: false, 
          error: "Payment system not configured" 
        });
      }

      const paymentIntent = await stripeInstance.paymentIntents.create(paymentIntentData);

      console.log('Donation payment intent created successfully:', paymentIntent.id);

      // Store donation record in database
      const donationData = {
        amount: numAmount,
        currency: 'usd',
        email: email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        message: message || null,
        isAnonymous: isAnonymous,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata: {
          description: description,
          paymentIntentId: paymentIntent.id,
        },
        donorId: req.user?.id || null,
        receiptUrl: null, // Will be updated after payment confirmation
      };

      const [newDonation] = await db.insert(donations).values(donationData).returning();

      console.log('Donation record created in database:', newDonation.id);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: numAmount,
        donationId: newDonation.id,
      });
    } catch (error: any) {
      console.error('Donation payment intent creation error:', error);
      res.status(500).json({ 
        success: false,
        message: "Error creating donation payment intent",
        error: error.message 
      });
    }
  });

  app.post("/api/donations/confirm", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent ID is required" 
        });
      }

      console.log('Confirming donation payment intent:', paymentIntentId);
      
      // Retrieve the payment intent from Stripe with expanded charges
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ 
          success: false, 
          error: "Payment system not configured" 
        });
      }

      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId, {
        expand: ['charges']
      });
      
      if (!paymentIntent) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent not found" 
        });
      }

      if (paymentIntent.status === 'succeeded') {
        // Donation successful
        console.log('Donation payment confirmed:', paymentIntent.id);
        
        // Get receipt URL from the charge
        let receiptUrl = null;
        console.log('Payment intent charges:', JSON.stringify(paymentIntent.charges, null, 2));
        
        // Try to get charges directly from Stripe
        try {
          const charges = await stripeInstance.charges.list({
            payment_intent: paymentIntentId,
            limit: 1
          });
          
          
          if (charges.data.length > 0) {
            const charge = charges.data[0];
            receiptUrl = charge.receipt_url;
          } else {
            console.log('No charges found via API');
          }
        } catch (chargeError) {
          console.error('Error fetching charges from API:', chargeError);
        }
        
        // Fallback: try to get from payment intent charges if available
        if (!receiptUrl && paymentIntent.charges && paymentIntent.charges.data.length > 0) {
          const charge = paymentIntent.charges.data[0];
          console.log('Charge data from payment intent:', JSON.stringify(charge, null, 2));
          receiptUrl = charge.receipt_url;
          console.log('Receipt URL extracted from payment intent:', receiptUrl);
        }

        // Update donation record in database
        const updateData = {
          status: 'succeeded',
          paymentMethod: paymentIntent.payment_method_types[0],
          receiptUrl: receiptUrl,
          metadata: {
            ...paymentIntent.metadata,
            confirmedAt: new Date(),
            paymentMethodTypes: paymentIntent.payment_method_types,
            amountReceived: paymentIntent.amount,
            currency: paymentIntent.currency,
            chargeId: paymentIntent.charges?.data[0]?.id,
          },
          updatedAt: new Date(),
        };

        console.log('Updating donation with data:', JSON.stringify(updateData, null, 2));
        
        const [updatedDonation] = await db
          .update(donations)
          .set(updateData)
          .where(eq(donations.stripePaymentIntentId, paymentIntentId))
          .returning();

        console.log('Donation record updated in database:', updatedDonation?.id);
        console.log('Updated donation receipt URL:', updatedDonation?.receiptUrl);
        
        // TODO: Send thank you email
        
        res.json({ 
          success: true, 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          email: paymentIntent.metadata.email,
          donationId: updatedDonation?.id,
        });
      } else {
        // Update donation status to failed if payment failed
        if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
          await db
            .update(donations)
            .set({ 
              status: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(donations.stripePaymentIntentId, paymentIntentId));
        }

        res.status(400).json({ 
          success: false, 
          error: `Payment not completed. Status: ${paymentIntent.status}` 
        });
      }
    } catch (error: any) {
      console.error('Donation confirmation error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Donation confirmation failed" 
      });
    }
  });

  app.get("/api/donations/payment-intent/:paymentIntentId", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent ID is required" 
        });
      }

      console.log('Retrieving donation payment intent details:', paymentIntentId);
      
      // Retrieve the payment intent from Stripe
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        return res.status(500).json({ 
          success: false, 
          error: "Payment system not configured" 
        });
      }

      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
      
      if (!paymentIntent) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent not found" 
        });
      }

      res.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paymentMethodTypes: paymentIntent.payment_method_types,
        status: paymentIntent.status,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata,
      });
    } catch (error: any) {
      console.error('Payment intent retrieval error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to retrieve payment intent details" 
      });
    }
  });

  // Get donation history for admin or donor
  app.get("/api/donations", verifyToken, async (req, res) => {
    try {
      const { page = 1, limit = 10, status, email } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Build query conditions
      const conditions = [];
      
      // If user is not admin, only show their donations
      if (req.user?.role !== 'admin') {
        conditions.push(eq(donations.donorId, req.user!.id));
      }
      
      // Filter by status if provided
      if (status) {
        conditions.push(eq(donations.status, status as string));
      }
      
      // Filter by email if provided (admin only)
      if (email && req.user?.role === 'admin') {
        conditions.push(ilike(donations.email, `%${email}%`));
      }

      // Get donations with donor information
      const donationsData = await db
        .select({
          id: donations.id,
          amount: donations.amount,
          currency: donations.currency,
          email: donations.email,
          firstName: donations.firstName,
          lastName: donations.lastName,
          message: donations.message,
          isAnonymous: donations.isAnonymous,
          status: donations.status,
          paymentMethod: donations.paymentMethod,
          receiptUrl: donations.receiptUrl,
          createdAt: donations.createdAt,
          donor: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(donations)
        .leftJoin(users, eq(donations.donorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(donations.createdAt))
        .limit(parseInt(limit as string))
        .offset(offset);

      // Get total count
      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(donations)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        success: true,
        donations: donationsData,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching donations:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch donations" 
      });
    }
  });


  app.get("/api/admin/reports/export", verifyToken, async (req, res) => {
    try {
      const { type, dateRange = "30" } = req.query;
      const days = parseInt(dateRange as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let csvData = "";
      let filename = "";

      switch (type) {
        case "overview":
          // Export overview data (all time)
          const overviewData = await db
            .select({
              totalPatients: sql<number>`(SELECT COUNT(*) FROM users WHERE role = 'patient')`,
              totalAppointments: sql<number>`(SELECT COUNT(*) FROM appointments)`,
              totalDonations: sql<number>`(SELECT COUNT(*) FROM donations)`,
              totalRevenue: sql<number>`(SELECT COALESCE(SUM(amount), 0) FROM donations WHERE status = 'succeeded')`
            })
            .from(users)
            .limit(1);

          csvData = "Metric,Value\n";
          csvData += `Total Patients,${overviewData[0]?.totalPatients || 0}\n`;
          csvData += `Total Appointments,${overviewData[0]?.totalAppointments || 0}\n`;
          csvData += `Total Donations,${overviewData[0]?.totalDonations || 0}\n`;
          csvData += `Total Revenue,${overviewData[0]?.totalRevenue || 0}\n`;
          filename = "overview-report";
          break;

        case "financial":
          // Export financial data
          const donations = await db
            .select({
              id: donations.id,
              amount: donations.amount,
              email: donations.email,
              status: donations.status,
              createdAt: donations.createdAt
            })
            .from(donations)
            .where(gte(donations.createdAt, startDate))
            .orderBy(desc(donations.createdAt));

          csvData = "ID,Amount,Email,Status,Created At\n";
          donations.forEach(donation => {
            csvData += `${donation.id},${donation.amount},${donation.email},${donation.status},${donation.createdAt}\n`;
          });
          filename = "financial-report";
          break;

        case "patients":
          // Export patient data
          const patients = await db
            .select({
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              createdAt: users.createdAt
            })
            .from(users)
            .where(and(eq(users.role, "patient"), gte(users.createdAt, startDate)))
            .orderBy(desc(users.createdAt));

          csvData = "ID,Email,First Name,Last Name,Created At\n";
          patients.forEach(patient => {
            csvData += `${patient.id},${patient.email},${patient.firstName},${patient.lastName},${patient.createdAt}\n`;
          });
          filename = "patients-report";
          break;

        case "appointments":
          // Export appointment data
          const appointments = await db
            .select({
              id: appointments.id,
              patientId: appointments.patientId,
              appointmentDate: appointments.appointmentDate,
              status: appointments.status,
              notes: appointments.notes
            })
            .from(appointments)
            .where(gte(appointments.appointmentDate, startDate))
            .orderBy(desc(appointments.appointmentDate));

          csvData = "ID,Patient ID,Appointment Date,Status,Notes\n";
          appointments.forEach(appointment => {
            csvData += `${appointment.id},${appointment.patientId},${appointment.appointmentDate},${appointment.status},${appointment.notes || ""}\n`;
          });
          filename = "appointments-report";
          break;

        default:
          return res.status(400).json({ 
            success: false, 
            error: "Invalid report type" 
          });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
      res.send(csvData);
    } catch (error: any) {
      console.error('Error exporting report:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to export report" 
      });
    }
  });

  // Admin activities endpoint
  app.get("/api/admin/activities", verifyToken, async (req, res) => {
    try {
      const { dateRange = "7" } = req.query;
      const days = parseInt(dateRange as string);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const activitiesData = await db
        .select({
          id: activities.id,
          userId: activities.userId,
          type: activities.type,
          title: activities.title,
          description: activities.description,
          metadata: activities.metadata,
          ipAddress: activities.ipAddress,
          userAgent: activities.userAgent,
          createdAt: activities.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          }
        })
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(gte(activities.createdAt, startDate))
        .orderBy(desc(activities.createdAt))
        .limit(1000);

      res.json(activitiesData);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Test Reports API (for development)
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const { dateRange = "30", reportType = "overview" } = req.query;
      const days = parseInt(dateRange as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic stats (all time for overview, filtered for specific reports)
      const dateFilter = reportType === "overview" ? undefined : gte(users.createdAt, startDate);
      const appointmentDateFilter = reportType === "overview" ? undefined : gte(appointments.appointmentDate, startDate);
      const donationDateFilter = reportType === "overview" ? undefined : gte(donations.createdAt, startDate);
      const invoicePaidDateFilter = reportType === "overview" ? undefined : gte(invoices.paidAt, startDate);

      // Get total patients
      const [totalPatients] = await db
        .select({ count: count() })
        .from(users)
        .where(reportType === "overview" ? eq(users.role, "patient") : and(eq(users.role, "patient"), dateFilter!));

      // Get total appointments
      const [totalAppointments] = await db
        .select({ count: count() })
        .from(appointments)
        .where(appointmentDateFilter ? appointmentDateFilter : sql`1=1`);

      // Get total donations
      const [totalDonations] = await db
        .select({ count: count() })
        .from(donations)
        .where(donationDateFilter ? donationDateFilter : sql`1=1`);

      // Get total revenue (Service Billing: sum of paid invoices)
      const [totalRevenue] = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${invoices.total}), 0)`
        })
        .from(invoices)
        .where(and(
          eq(invoices.status, "paid"),
          invoicePaidDateFilter ? invoicePaidDateFilter : sql`1=1`
        ));

      // Get real appointment stats
      const appointmentStats = await db
        .select({
          status: appointments.status,
          count: sql<number>`count(*)`
        })
        .from(appointments)
        .groupBy(appointments.status);

      // Get real top donors
      const topDonors = await db
        .select({
          email: donations.email,
          totalAmount: sql<number>`SUM(${donations.amount})`,
          donationCount: sql<number>`count(*)`
        })
        .from(donations)
        .where(eq(donations.status, "succeeded"))
        .groupBy(donations.email)
        .orderBy(desc(sql`SUM(${donations.amount})`))
        .limit(5);

      // Get real activities data
      const recentActivities = await db
        .select({
          id: activities.id,
          type: activities.type,
          title: activities.title,
          description: activities.description,
          metadata: activities.metadata,
          createdAt: activities.createdAt
        })
        .from(activities)
        .orderBy(desc(activities.createdAt))
        .limit(20);

      // Transform activities for frontend
      const transformedActivities = recentActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description || activity.title,
        amount: activity.metadata?.amount || null,
        date: activity.createdAt
      }));

      // Generate monthly stats (last 6 months)
      const monthlyStats = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        // Get stats for this month
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const [monthPatients] = await db
          .select({ count: count() })
          .from(users)
          .where(and(
            eq(users.role, "patient"),
            gte(users.createdAt, monthStart),
            lte(users.createdAt, monthEnd)
          ));

        const [monthMembers] = await db
          .select({ count: count() })
          .from(users)
          .where(and(
            eq(users.role, "member"),
            gte(users.createdAt, monthStart),
            lte(users.createdAt, monthEnd)
          ));

        const [monthAppointments] = await db
          .select({ count: count() })
          .from(appointments)
          .where(and(
            gte(appointments.appointmentDate, monthStart),
            lte(appointments.appointmentDate, monthEnd)
          ));

        const [monthDonationsAmount] = await db
          .select({ total: sql<number>`COALESCE(SUM(${donations.amount}), 0)` })
          .from(donations)
          .where(and(
            eq(donations.status, "succeeded"),
            gte(donations.createdAt, monthStart),
            lte(donations.createdAt, monthEnd)
          ));

        const [monthServiceBilling] = await db
          .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
          .from(invoices)
          .where(and(
            eq(invoices.status, "paid"),
            gte(invoices.paidAt, monthStart),
            lte(invoices.paidAt, monthEnd)
          ));

        monthlyStats.push({
          month: monthName,
          patients: monthPatients.count,
          members: monthMembers.count,
          serviceBilling: monthServiceBilling.total,
          donationsAmount: monthDonationsAmount.total
        });
      }

      // Get additional statistics
      const [totalPractitioners] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "practitioner"));

      const [totalMembers] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "member"));

      const [totalInvoices] = await db
        .select({ count: count() })
        .from(invoices);

      const [paidInvoices] = await db
        .select({ count: count() })
        .from(invoices)
        .where(eq(invoices.status, "paid"));

      const [totalMessages] = await db
        .select({ count: count() })
        .from(messages);

      const [totalTelehealthSessions] = await db
        .select({ count: count() })
        .from(telehealthSessions);

      res.json({
        success: true,
        data: {
          totalPatients: totalPatients.count,
          totalPractitioners: totalPractitioners.count,
          totalMembers: totalMembers.count,
          totalAppointments: totalAppointments.count,
          totalDonations: totalDonations.count,
          totalInvoices: totalInvoices.count,
          paidInvoices: paidInvoices.count,
          totalMessages: totalMessages.count,
          totalTelehealthSessions: totalTelehealthSessions.count,
          totalRevenue: totalRevenue.total,
          monthlyStats,
          topDonors,
          appointmentStats,
          recentActivity: transformedActivities
        }
      });
    } catch (error: any) {
      console.error('Error fetching test reports:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch test reports" 
      });
    }
  });

  // Public Quotes API (for members)
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotesData = await db
        .select()
        .from(quotes)
        .where(eq(quotes.isActive, true))
        .orderBy(desc(quotes.displayOrder), desc(quotes.createdAt));

      res.json({
        success: true,
        data: quotesData
      });
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch quotes" 
      });
    }
  });

  // Public Events API (for members)
  app.get("/api/events", async (req, res) => {
    try {
      // Fetch active events from the events table
      const activeEvents = await db.select()
        .from(events)
        .where(eq(events.isActive, true))
        .orderBy(asc(events.startDate));

      res.json({
        success: true,
        data: activeEvents
      });
    } catch (error: any) {
      console.error('Error fetching events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch events" 
      });
    }
  });

  // Member Stats API
  app.get("/api/member/stats", verifyToken, async (req, res) => {
    try {
      if (req.user?.role !== 'member') {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied" 
        });
      }

      // Get quotes count
      const [quotesCount] = await db
        .select({ count: count() })
        .from(quotes)
        .where(eq(quotes.isActive, true));

      // Get events count from events table
      const [eventsCount] = await db
        .select({ count: count() })
        .from(events)
        .where(eq(events.isActive, true));

      // Get user's donations count and total amount
      const [donationsData] = await db
        .select({ 
          count: count(),
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)`
        })
        .from(donations)
        .where(and(
          eq(donations.donorId, req.user.id),
          eq(donations.status, "succeeded")
        ));

      // Debug: Get all donations for this user to see what's happening
      const allUserDonations = await db
        .select({
          id: donations.id,
          amount: donations.amount,
          status: donations.status,
          donorId: donations.donorId,
          email: donations.email,
          createdAt: donations.createdAt
        })
        .from(donations)
        .where(eq(donations.donorId, req.user.id));

      console.log('Debug - All donations for user:', req.user.id, allUserDonations);
      console.log('Debug - User ID being searched:', req.user.id);
      console.log('Debug - Donations count result:', donationsData.count);
      console.log('Debug - Donations total amount result:', donationsData.totalAmount);

      // Debug: Check if there are donations with this user's email but no donorId
      const donationsByEmail = await db
        .select({
          id: donations.id,
          amount: donations.amount,
          status: donations.status,
          donorId: donations.donorId,
          email: donations.email,
          createdAt: donations.createdAt
        })
        .from(donations)
        .where(and(
          eq(donations.email, req.user.email),
          isNull(donations.donorId)
        ));

      console.log('Debug - Donations by email (no donorId):', donationsByEmail);

      // Get events attended (completed appointments)
      const [eventsAttendedData] = await db
        .select({ count: count() })
        .from(activities)
        .where(and(
          eq(activities.userId, req.user.id),
          eq(activities.type, "appointment_completed")
        ));

      // Get products purchased (completed store orders)
      const [productsPurchasedData] = await db
        .select({ count: count() })
        .from(storeOrders)
        .where(and(
          eq(storeOrders.customerId, req.user.id),
          eq(storeOrders.paymentStatus, "paid")
        ));

      // Debug: Get all store orders for this user
      const allUserOrders = await db
        .select({
          id: storeOrders.id,
          orderNumber: storeOrders.orderNumber,
          total: storeOrders.total,
          status: storeOrders.status,
          paymentStatus: storeOrders.paymentStatus,
          customerId: storeOrders.customerId,
          customerEmail: storeOrders.customerEmail,
          createdAt: storeOrders.createdAt
        })
        .from(storeOrders)
        .where(eq(storeOrders.customerId, req.user.id));

      console.log('Debug - All store orders for user:', req.user.id, allUserOrders);
      console.log('Debug - Store orders count result:', productsPurchasedData.count);

      // Calculate days as member
      const memberSince = new Date(req.user.createdAt);
      const daysAsMember = Math.floor((new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

      res.json({
        success: true,
        data: {
          totalQuotes: quotesCount.count,
          totalEvents: eventsCount.count,
          totalDonations: donationsData.totalAmount || 0,
          eventsAttended: eventsAttendedData.count || 0,
          productsPurchased: productsPurchasedData.count || 0,
          donationsMade: donationsData.count || 0,
          communityContributions: 0, // TODO: Implement actual community contributions tracking
          memberSince: req.user.createdAt,
          daysAsMember: daysAsMember
        }
      });
    } catch (error: any) {
      console.error('Error fetching member stats:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch member stats" 
      });
    }
  });

  // Member Onboarding API
  app.post("/api/member/onboarding", verifyToken, async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        wasPatient,
        patientId,
        treatmentStartDate,
        treatmentEndDate,
        primaryCondition,
        recoveryRating,
        recoveryChallenges,
        recoverySuccesses,
        recoveryJourney,
        serviceRating,
        staffRating,
        facilityRating,
        communicationRating,
        whatWorkedWell,
        whatCouldBeImproved,
        recommendations,
        interestedInEvents,
        interestedInSupporting,
        preferredContactMethod,
        additionalComments
      } = req.body;

      console.log('Received onboarding data:', {
        firstName,
        lastName,
        email,
        phone,
        wasPatient,
        patientId,
        treatmentStartDate,
        treatmentEndDate,
        recoveryChallenges,
        recoverySuccesses
      });

      // Validate treatment dates if both are provided
      if (treatmentStartDate && treatmentEndDate) {
        const startDate = new Date(treatmentStartDate);
        const endDate = new Date(treatmentEndDate);
        
        if (endDate < startDate) {
          return res.status(400).json({
            success: false,
            error: "Treatment end date cannot be before treatment start date"
          });
        }
      }

      // Update user information
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          phone,
          role: "member"
        })
        .where(eq(users.id, req.user!.id));

      // Prepare onboarding data with proper type handling
      // Exclude createdAt and updatedAt as they are handled by the database
      const onboardingValues = {
        userId: req.user!.id,
        firstName: String(firstName),
        lastName: String(lastName),
        email: String(email),
        phone: phone ? String(phone) : null,
        wasPatient: Boolean(wasPatient),
        patientId: patientId ? String(patientId) : null,
        treatmentStartDate: treatmentStartDate ? String(treatmentStartDate).split('T')[0] : null,
        treatmentEndDate: treatmentEndDate ? String(treatmentEndDate).split('T')[0] : null,
        primaryCondition: primaryCondition ? String(primaryCondition) : null,
        recoveryRating: recoveryRating ? Number(recoveryRating) : null,
        recoveryChallenges: Array.isArray(recoveryChallenges) ? recoveryChallenges.map(String) : [],
        recoverySuccesses: Array.isArray(recoverySuccesses) ? recoverySuccesses.map(String) : [],
        recoveryJourney: recoveryJourney ? String(recoveryJourney) : null,
        serviceRating: serviceRating ? Number(serviceRating) : null,
        staffRating: staffRating ? Number(staffRating) : null,
        facilityRating: facilityRating ? Number(facilityRating) : null,
        communicationRating: communicationRating ? Number(communicationRating) : null,
        whatWorkedWell: whatWorkedWell ? String(whatWorkedWell) : null,
        whatCouldBeImproved: whatCouldBeImproved ? String(whatCouldBeImproved) : null,
        recommendations: recommendations ? String(recommendations) : null,
        interestedInEvents: Boolean(interestedInEvents),
        interestedInSupporting: Boolean(interestedInSupporting),
        preferredContactMethod: preferredContactMethod ? String(preferredContactMethod) : null,
        additionalComments: additionalComments ? String(additionalComments) : null
      };

      console.log('Prepared onboarding values:', onboardingValues);

      // Create onboarding record
      const onboardingData = await db
        .insert(memberOnboarding)
        .values(onboardingValues)
        .returning();

      res.json({
        success: true,
        message: "Onboarding completed successfully",
        data: onboardingData[0]
      });
    } catch (error: any) {
      console.error('Error completing member onboarding:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to complete onboarding" 
      });
    }
  });

  // =============================================================================
  // PRINTFUL STORE API ROUTES
  // =============================================================================

  // Initialize Printful service
  const printfulService = new PrintfulService();

  // Get all Printful products (for admin - all catalog products)
  app.get("/api/printful/products", async (req, res) => {
    try {
      const products = await printfulService.getProducts();
      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      console.error('Error fetching Printful products:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch products" 
      });
    }
  });

  // Get sync Printful products (for store - only products synced to your store)
  app.get("/api/printful/sync-products", async (req, res) => {
    try {
      const products = await printfulService.getSyncProducts();
      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      console.error('Error fetching Printful sync products:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch sync products" 
      });
    }
  });

  // Get specific Printful product
  app.get("/api/printful/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await printfulService.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          error: "Product not found" 
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      console.error('Error fetching Printful product:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch product" 
      });
    }
  });

  // Get product templates (for creating new products)
  app.get("/api/printful/templates", async (req, res) => {
    try {
      const templates = await printfulService.getProductTemplates();
      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error fetching product templates:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch templates" 
      });
    }
  });

  // Get variants for a product template
  app.get("/api/printful/templates/:id/variants", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const variants = await printfulService.getProductVariants(templateId);
      res.json({
        success: true,
        data: variants
      });
    } catch (error: any) {
      console.error('Error fetching product variants:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch variants" 
      });
    }
  });

  // Create new product in Printful
  app.post("/api/printful/products", verifyToken, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: "Admin access required" 
        });
      }

      const product = await printfulService.createProduct(req.body);
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          error: "Failed to create product" 
        });
      }

      res.json({
        success: true,
        data: product,
        message: "Product created successfully"
      });
    } catch (error: any) {
      console.error('Error creating Printful product:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to create product" 
      });
    }
  });

  // Create order in Printful
  app.post("/api/printful/orders", verifyToken, async (req, res) => {
    try {
      const order = await printfulService.createOrder(req.body);
      
      if (!order) {
        return res.status(400).json({ 
          success: false, 
          error: "Failed to create order" 
        });
      }

      res.json({
        success: true,
        data: order,
        message: "Order created successfully"
      });
    } catch (error: any) {
      console.error('Error creating Printful order:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to create order" 
      });
    }
  });

  // Get order status
  app.get("/api/printful/orders/:id", verifyToken, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await printfulService.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: "Order not found" 
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      console.error('Error fetching Printful order:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch order" 
      });
    }
  });

  // Get shipping rates
  app.post("/api/printful/shipping/rates", async (req, res) => {
    try {
      const { recipient, items } = req.body;
      const rates = await printfulService.getShippingRates(recipient, items);
      res.json({
        success: true,
        data: rates
      });
    } catch (error: any) {
      console.error('Error fetching shipping rates:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch shipping rates" 
      });
    }
  });

  // Get tax rates
  app.post("/api/printful/tax/rates", async (req, res) => {
    try {
      const { recipient } = req.body;
      const rates = await printfulService.getTaxRates(recipient);
      res.json({
        success: true,
        data: rates
      });
    } catch (error: any) {
      console.error('Error fetching tax rates:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch tax rates" 
      });
    }
  });

  // Get store information
  app.get("/api/printful/store", async (req, res) => {
    try {
      const storeInfo = await printfulService.getStoreInfo();
      res.json({
        success: true,
        data: storeInfo
      });
    } catch (error: any) {
      console.error('Error fetching store info:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch store info" 
      });
    }
  });

  // Test API key endpoint
  app.get("/api/printful/test-key", async (req, res) => {
    try {
      console.log('🧪 Testing Printful API key...');
      const testResponse = await printfulService.makeRequest('/store');
      res.json({ 
        success: true, 
        message: "API key is valid!",
        data: testResponse 
      });
    } catch (error: any) {
      console.error("❌ API key test failed:", error.message);
      res.json({ 
        success: false, 
        message: "API key is invalid",
        error: error.message 
      });
    }
  });

  // Get order tracking
  app.get("/api/printful/orders/:id/tracking", verifyToken, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const tracking = await printfulService.getOrderTracking(orderId);
      
      if (!tracking) {
        return res.status(404).json({ 
          success: false, 
          error: "Tracking information not found" 
        });
      }

      res.json({
        success: true,
        data: tracking
      });
    } catch (error: any) {
      console.error('Error fetching order tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to fetch tracking" 
      });
    }
  });

  // Get payment history
  app.get("/api/payments", verifyToken, async (req, res) => {
    try {
      const { patientId, invoiceId, status, search } = req.query;
      const user = req.user;

      // Build query parameters for Stripe
      const params: any = {
        limit: 100,
      };

      if (status && status !== 'all') {
        params.status = status;
      }

      // Get payments from Stripe
      const payments = await stripe.paymentIntents.list(params);
      
      // Filter by metadata if needed
      let filteredPayments = payments.data;
      
      if (patientId) {
        filteredPayments = filteredPayments.filter(p => p.metadata.patientId === patientId);
      }
      
      if (invoiceId) {
        filteredPayments = filteredPayments.filter(p => p.metadata.invoiceId === invoiceId);
      }

      // Remove duplicates by keeping only the latest payment per invoice
      if (invoiceId) {
        // For single invoice, only show unique payments (remove duplicate intents)
        const seenStatuses = new Set();
        filteredPayments = filteredPayments.filter(payment => {
          const key = `${payment.metadata.invoiceId}-${payment.status}`;
          if (seenStatuses.has(key) && payment.status !== 'succeeded') {
            return false; // Skip duplicate non-successful payments
          }
          seenStatuses.add(key);
          return true;
        });
      }

      // If user is a patient, only show their payments
      if (user.role === 'patient') {
        const patient = await storage.getPatientByUserId(user.id);
        if (patient) {
          filteredPayments = filteredPayments.filter(p => p.metadata.patientId === patient.id);
        }
      }

      // Enhance with invoice data
      const enhancedPayments = await Promise.all(
        filteredPayments.map(async (payment) => {
          let invoice = null;
          if (payment.metadata.invoiceId) {
            try {
              invoice = await storage.getInvoice(payment.metadata.invoiceId);
            } catch (error) {
              console.error('Error fetching invoice:', error);
            }
          }
          
          return {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            created_at: new Date(payment.created * 1000),
            payment_method: payment.payment_method_types?.[0] ? {
              type: payment.payment_method_types[0]
            } : null,
            failure_message: payment.last_payment_error?.message,
            invoice,
            metadata: payment.metadata,
          };
        })
      );

      res.json(enhancedPayments);
    } catch (error: any) {
      console.error('Payment history error:', error);
      res.status(500).json({ 
        message: "Error fetching payment history",
        error: error.message 
      });
    }
  });

  // Refund payment
  app.post("/api/payments/:paymentIntentId/refund", verifyToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const { amount, reason } = req.body;
      const user = req.user;

      // Only admin and practitioners can issue refunds
      if (user.role === 'patient') {
        return res.status(403).json({ message: "Access denied" });
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
        reason: reason || 'requested_by_customer',
      });

      // Get payment intent to update invoice if needed
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const invoiceId = paymentIntent.metadata.invoiceId;
      
      if (invoiceId && !amount) {
        // Full refund - update invoice status
        await storage.updateInvoice(invoiceId, {
          status: "refunded",
        });
      }

      res.json({
        refund,
        message: "Refund processed successfully"
      });
    } catch (error: any) {
      console.error('Refund error:', error);
      res.status(500).json({ 
        message: "Error processing refund",
        error: error.message 
      });
    }
  });

  // =============================================================================
  // PUBLIC BOOKING ROUTES
  // =============================================================================



  // Get available time slots for a practitioner
  app.get("/api/public/available-slots/:bookingLink", async (req, res) => {
    try {
      const { bookingLink } = req.params;
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.bookingLink, bookingLink),
      });

      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner not found" });
      }

      // Get practitioner's calendar settings
      const calendarSettingsData = await db.query.calendarSettings.findFirst({
        where: eq(calendarSettings.practitionerId, practitioner.id),
      });

      // Get practitioner's booking settings for additional constraints
      const bookingSettingsData = await db.query.bookingSettings.findFirst({
        where: eq(bookingSettings.practitionerId, practitioner.id),
      });

      const settings = calendarSettingsData || {
        timeInterval: 60,
        defaultStartTime: "09:00",
        defaultEndTime: "17:00",
        bufferTime: 0,
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"] // Monday to Friday
      };

      // Apply booking settings constraints if available
      if (bookingSettingsData) {
        // Use booking settings buffer time if available
        if (bookingSettingsData.bufferTime !== undefined) {
          settings.bufferTime = bookingSettingsData.bufferTime;
        }
      }

      // Ensure timeInterval is set
      if (!settings.timeInterval) {
        settings.timeInterval = 60;
      }

      // Get existing appointments for the date
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.practitionerId, practitioner.id),
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        ),
      });

      // Generate available time slots
      const [startHour, startMin] = settings.defaultStartTime.split(':').map(Number);
      const [endHour, endMin] = settings.defaultEndTime.split(':').map(Number);
      
      let currentMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const timeSlots = [];

      // Check if the target date is a working day
      const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayName = dayNames[targetDayOfWeek];
      
      // Convert workingDays to array of day names if it's not already
      const workingDaysArray = Array.isArray(settings.workingDays) ? settings.workingDays : [];
      const isWorkingDay = workingDaysArray.includes(targetDayName);

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const min = currentMinutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        // Check if this time slot conflicts with existing appointments
        const slotDateTime = new Date(targetDate);
        slotDateTime.setHours(hour, min, 0, 0);
        
        // Check if slot is in the past
        if (slotDateTime <= new Date()) {
          currentMinutes += settings.timeInterval;
          continue; // Skip past slots
        }
        
        // Check if it's a working day
        if (!isWorkingDay) {
          currentMinutes += settings.timeInterval;
          continue; // Skip non-working days
        }
        
        const conflictingAppointments = existingAppointments.filter(apt => {
          const aptStart = new Date(apt.appointmentDate);
          const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000);
          const slotEnd = new Date(slotDateTime.getTime() + settings.timeInterval * 60000);
          
          // Apply buffer time
          const bufferStart = new Date(slotDateTime.getTime() - settings.bufferTime * 60000);
          const bufferEnd = new Date(slotEnd.getTime() + settings.bufferTime * 60000);
          
          // Check for overlap: if appointment overlaps with slot or buffer time
          return (
            (aptStart < bufferEnd && aptEnd > bufferStart) ||
            (slotDateTime < aptEnd && slotEnd > aptStart)
          );
        });

        // Always add the slot, but mark availability
        timeSlots.push({
          time: timeString,
          available: conflictingAppointments.length === 0
        });
        
        if (conflictingAppointments.length > 0) {
          console.log(`Slot ${timeString} conflicts with ${conflictingAppointments.length} existing appointment(s)`);
        }
        
        currentMinutes += settings.timeInterval;
      }

      res.json(timeSlots);
    } catch (error: any) {
      console.error('Get available slots error:', error);
      res.status(500).json({ 
        message: "Error fetching available slots",
        error: error.message 
      });
    }
  });

  // Book appointment via public link
  app.post("/api/public/book-appointment", async (req, res) => {
    try {
      console.log('Received booking request:', req.body);
      
      const { 
        practitionerId, 
        firstName, 
        lastName, 
        email, 
        phone, 
        appointmentDate, 
        appointmentTime,
        type,
        duration,
        reason,
        additionalNotes,
        bookingLink 
      } = req.body;

      // Verify the booking link matches the practitioner
      console.log('Looking for practitioner with ID:', practitionerId, 'and booking link:', bookingLink);
      
      const practitioner = await db.query.practitioners.findFirst({
        where: and(
          eq(practitioners.id, practitionerId),
          eq(practitioners.bookingLink, bookingLink)
        ),
      });

      console.log('Found practitioner:', practitioner);

      if (!practitioner) {
        console.error('Practitioner not found for ID:', practitionerId, 'and booking link:', bookingLink);
        return res.status(404).json({ message: "Invalid booking link" });
      }

      // Check if user exists, create if not
      console.log('Checking for existing user with email:', email);
      let user = await storage.getUserByEmail(email);
      console.log('Found user:', user ? { id: user.id, email: user.email } : 'Not found');
      
      if (!user) {
        console.log('Creating new user account');
        // Create new user account
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
        user = await storage.createUser({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: "patient",
          isActive: true,
        });
        console.log('Created new user:', { id: user.id, email: user.email });
      }

      // Check if patient profile exists, create if not
      console.log('Checking for existing patient with user ID:', user.id);
      let patient = await db.query.patients.findFirst({
        where: eq(patients.userId, user.id),
      });
      console.log('Found patient:', patient ? { id: patient.id, userId: patient.userId } : 'Not found');

      if (!patient) {
        console.log('Creating new patient profile');
        patient = await storage.createPatient({
          userId: user.id,
          dateOfBirth: null,
          phoneNumber: phone,
        });
        console.log('Created new patient:', { id: patient.id, userId: patient.userId });
      }

      // Create appointment with date stored in YYYY-MM-DD format
      let appointmentDateTime;
      let appointmentDateString;
      
      if (appointmentDate) {
        // Store the date in YYYY-MM-DD format as requested
        appointmentDateString = appointmentDate; // This is already in YYYY-MM-DD format
        
        // Parse the date and time components for conflict checking
        const [year, month, day] = appointmentDate.split('-').map(Number);
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        
        // Create the date for conflict checking (but don't store this in DB)
        appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        console.log('Date creation debug:', {
          year, month, day, hours, minutes,
          appointmentDateString, // This is what we'll store in DB
          createdDate: appointmentDateTime,
          createdDateISO: appointmentDateTime.toISOString(),
          localString: appointmentDateTime.toLocaleString(),
          timezoneOffset: appointmentDateTime.getTimezoneOffset()
        });
      } else {
        // Fallback if appointmentDate is not provided
        appointmentDateTime = new Date();
        appointmentDateString = format(appointmentDateTime, 'yyyy-MM-dd');
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
      }

      console.log('Creating appointment with data:', {
        patientId: patient.id,
        practitionerId,
        appointmentDate,
        appointmentTime,
        reason,
        duration,
        appointmentDateTime: appointmentDateTime,
        timezoneOffset: appointmentDateTime.getTimezoneOffset(),
        localTime: new Date().toLocaleString(),
        utcTime: new Date()
      });

      console.log('Appointment date time:', appointmentDateTime);

      // Check for conflicting appointments before creating
      const appointmentStart = new Date(appointmentDateTime);
      const appointmentEnd = new Date(appointmentStart.getTime() + (duration || 30) * 60000);
      
      const conflictingAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.practitionerId, practitionerId),
          or(
            // Check if new appointment overlaps with existing ones
            and(
              gte(appointments.appointmentDate, appointmentStart),
              lt(appointments.appointmentDate, appointmentEnd)
            ),
            and(
              lt(appointments.appointmentDate, appointmentEnd),
              gt(
                sql`${appointments.appointmentDate} + INTERVAL '1 minute' * ${appointments.duration}`,
                appointmentStart
              )
            )
          )
        ),
      });

      if (conflictingAppointments.length > 0) {
        console.log('Conflicting appointments found:', conflictingAppointments.length);
        return res.status(409).json({ 
          message: "This time slot is no longer available. Please select a different time.",
          conflicts: conflictingAppointments.length
        });
      }

      console.log('No conflicts found, creating appointment');

      // Store the date string in the notes field along with other information
      const notesWithDate = `Date: ${appointmentDateString} | Time: ${appointmentTime} | ${additionalNotes || ''}`.trim();
      
      console.log('Creating appointment with date stored as:', {
        appointmentDateString,
        appointmentTime,
        notesWithDate,
        appointmentDateTime: appointmentDateTime.toISOString()
      });
      
      const appointment = await storage.createAppointment({
        patientId: patient.id,
        practitionerId,
        title: reason,
        description: notesWithDate,
        appointmentDate: appointmentDateTime,
        duration: duration || 30,
        type: type || "consultation",
        status: "scheduled",
        isPublicBooking: true, // Mark as created via public booking link
      });

      console.log('Created appointment:', { id: appointment.id, title: appointment.title });

      // Send notification to practitioner
      console.log('Sending notification to practitioner:', practitioner.userId);
      try {
        await notificationService.createNotification({
          userId: practitioner.userId,
          type: "appointment_created",
          title: "New Appointment Request",
          message: `${firstName} ${lastName} has requested an appointment for ${appointmentDateTime.toLocaleDateString()} at ${appointmentTime}`,
          metadata: {
            appointmentId: appointment.id,
            patientId: patient.id,
            practitionerId: practitioner.id,
          },
          priority: "medium",
          isRead: false,
          isArchived: false,
        });
        console.log('Notification sent successfully');
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the entire booking if notification fails
      }

      console.log('Booking completed successfully');
      res.json({
        appointment,
        message: "Appointment request submitted successfully"
      });
    } catch (error: any) {
      console.error('Public booking error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: "Error booking appointment",
        error: error.message 
      });
    }
  });

  // =============================================================================
  // PRACTITIONER BOOKING LINK ROUTES
  // =============================================================================

  // Get current practitioner's profile
  app.get("/api/practitioner/me", verifyToken, async (req, res) => {
    try {
      const user = req.user;
      
      // Allow practitioners and admin users
      if (user.role !== "practitioner" && user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log('Getting practitioner profile for user:', user.id);

      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.userId, user.id),
        with: {
          user: true,
        },
      });

      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner profile not found" });
      }

      console.log('Found practitioner profile:', {
        id: practitioner.id,
        bookingLink: practitioner.bookingLink,
        userId: practitioner.userId
      });

      res.json(practitioner);
    } catch (error: any) {
      console.error('Get practitioner profile error:', error);
      res.status(500).json({ 
        message: "Error fetching practitioner profile",
        error: error.message 
      });
    }
  });

  // Generate booking link for practitioner
  app.post("/api/practitioner/generate-booking-link", verifyToken, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== "practitioner") {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log('Generating booking link for user:', user.id);

      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.userId, user.id),
      });

      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner profile not found" });
      }

      console.log('Found practitioner:', practitioner.id);

      // Generate unique booking link
      const bookingLink = `dr-${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;

      console.log('Generated booking link:', bookingLink);

      // Update practitioner with booking link
      const updatedPractitioner = await storage.updatePractitioner(practitioner.id, {
        bookingLink,
      });

      console.log('Updated practitioner:', updatedPractitioner);

      res.json({
        bookingLink,
        message: "Booking link generated successfully"
      });
    } catch (error: any) {
      console.error('Generate booking link error:', error);
      res.status(500).json({ 
        message: "Error generating booking link",
        error: error.message 
      });
    }
  });

  // Get booking settings for practitioner
  app.get("/api/practitioner/booking-settings", verifyToken, async (req, res) => {
    try {
      const user = req.user;
      console.log('User requesting booking settings:', user);
      
      // Allow practitioners and admin users
      if (user.role !== "practitioner" && user.role !== "admin") {
        console.log('User role is not practitioner or admin:', user.role);
        return res.status(403).json({ message: "Access denied" });
      }

      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.userId, user.id),
      });

      console.log('Found practitioner profile:', practitioner);

      if (!practitioner) {
        console.log('No practitioner profile found for user:', user.id);
        return res.status(404).json({ message: "Practitioner profile not found" });
      }

      // Get booking settings from database
      let settings = await db.query.bookingSettings.findFirst({
        where: eq(bookingSettings.practitionerId, practitioner.id),
      });

      console.log('Existing settings found:', !!settings);

      // If no settings exist, create default settings
      if (!settings) {
        console.log('Creating default settings for practitioner:', practitioner.id);
        const defaultSettings = {
          practitionerId: practitioner.id,
          isPublicBookingEnabled: true,
          requireApproval: true,
          allowDirectBooking: false,
          showProfile: true,
          showSpecialty: true,
          showConsultationFee: true,
          advanceBookingDays: 30,
          maxBookingsPerDay: 10,
          bufferTime: 15,
          emailNotifications: true,
          smsNotifications: false,
          reminderHours: 24,
          requirePhoneVerification: false,
          requireEmailVerification: true,
          cancellationPolicy: '24 hours notice required for cancellation',
          customMessage: 'Welcome to my booking page. I\'m looking forward to helping you with your healthcare needs.',
        };

        try {
          const inserted = await db.insert(bookingSettings).values(defaultSettings).returning();
          console.log('inserted', inserted);
          settings = inserted[0];
          console.log('Default settings created:', settings);
        } catch (insertError) {
          console.error('Failed to create default settings:', insertError);
          // Return default settings object without saving to database
          settings = defaultSettings;
        }
      }

      console.log('Returning settings:', settings);
      res.json(settings);
    } catch (error: any) {
      console.error('Get booking settings error:', error);
      res.status(500).json({ 
        message: "Error fetching booking settings",
        error: error.message 
      });
    }
  });

  // Save booking settings for practitioner
  app.post("/api/practitioner/booking-settings", verifyToken, async (req, res) => {
    try {
      const user = req.user;
      console.log('User attempting to save settings:', user);
      
      // Allow practitioners and admin users
      if (user.role !== "practitioner" && user.role !== "admin") {
        console.log('User role is not practitioner or admin:', user.role);
        return res.status(403).json({ message: "Access denied" });
      }

      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.userId, user.id),
      });

      console.log('Found practitioner profile:', practitioner);

      if (!practitioner) {
        console.log('No practitioner profile found for user:', user.id);
        return res.status(404).json({ message: "Practitioner profile not found" });
      }

      const settings = req.body;
      console.log('Received settings data:', settings);
      console.log('Practitioner ID:', practitioner.id);

      // Check if booking settings already exist
      const existingSettings = await db.query.bookingSettings.findFirst({
        where: eq(bookingSettings.practitionerId, practitioner.id),
      });

      console.log('Existing settings found:', !!existingSettings);

      let savedSettings;

      if (existingSettings) {
        console.log('Updating existing settings...');
        // Update existing settings
        const updated = await db.update(bookingSettings).set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(bookingSettings.practitionerId, practitioner.id))
        .returning()
        savedSettings = updated[0];
      } else {
        console.log('Creating new settings...');
        // Create new settings
        const inserted = await db.insert(bookingSettings).values({
          practitionerId: practitioner.id,
          ...settings,
        }).returning();
        savedSettings = inserted[0];
      }

      console.log('Booking settings saved for practitioner:', practitioner.id);
      console.log('Saved settings:', savedSettings);

      res.json({
        message: "Booking settings saved successfully",
        settings: savedSettings
      });
    } catch (error: any) {
      console.error('Save booking settings error:', error);
      res.status(500).json({ 
        message: "Error saving booking settings",
        error: error.message 
      });
    }
  });

  // Get public booking settings for a practitioner
  app.get("/api/public/booking-settings/:bookingLink", async (req, res) => {
    try {
      const { bookingLink } = req.params;

      console.log('bookingLink', bookingLink);

      // Find practitioner by booking link
      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.bookingLink, bookingLink),
      });

      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner not found" });
      }

      // Get booking settings from database
      const settings = await db.query.bookingSettings.findFirst({
        where: eq(bookingSettings.practitionerId, practitioner.id),
      });

      // If no settings exist, return default settings
      if (!settings) {
        const defaultSettings = {
          id: null,
          practitionerId: practitioner.id,
          isPublicBookingEnabled: true,
          requireApproval: true,
          allowDirectBooking: false,
          showProfile: true,
          showSpecialty: true,
          showConsultationFee: true,
          advanceBookingDays: 30,
          maxBookingsPerDay: 10,
          bufferTime: 15,
          emailNotifications: true,
          smsNotifications: false,
          reminderHours: 24,
          requirePhoneVerification: false,
          requireEmailVerification: true,
          customMessage: 'Welcome to my booking page. I\'m looking forward to helping you with your healthcare needs.',
          cancellationPolicy: '24 hours notice required for cancellation',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return res.json(defaultSettings);
      }

      // Return public booking settings (filtered for public use)
      res.json(settings);
    } catch (error: any) {
      console.error('Get public booking settings error:', error);
      res.status(500).json({ 
        message: "Error fetching booking settings",
        error: error.message 
      });
    }
  });

  // Get public calendar settings for a practitioner
  app.get("/api/public/calendar-settings/:bookingLink", async (req, res) => {
    try {
      const { bookingLink } = req.params;

      console.log('Getting calendar settings for bookingLink:', bookingLink);

      // Find practitioner by booking link
      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.bookingLink, bookingLink),
      });

      if (!practitioner) {
        return res.status(404).json({ message: "Practitioner not found" });
      }

      // Get calendar settings from database
      const settings = await db.query.calendarSettings.findFirst({
        where: eq(calendarSettings.practitionerId, practitioner.id),
      });

      // If no settings exist, return default settings
      if (!settings) {
        const defaultSettings = {
          id: null,
          practitionerId: practitioner.id,
          timeInterval: 60,
          bufferTime: 0,
          defaultStartTime: "09:00",
          defaultEndTime: "17:00",
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          allowWeekendBookings: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log('No calendar settings found, returning defaults');
        return res.json(defaultSettings);
      }

      console.log('Calendar settings found:', settings);
      res.json(settings);
    } catch (error: any) {
      console.error('Get public calendar settings error:', error);
      res.status(500).json({ 
        message: "Error fetching calendar settings",
        error: error.message 
      });
    }
  });

  // Test route to check database schema
  app.get("/api/test/db-schema", async (req, res) => {
    try {
      // Check if booking_link column exists
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'practitioners' 
        AND column_name = 'booking_link'
      `);
      
      res.json({
        bookingLinkColumnExists: result.length > 0,
        columns: result
      });
    } catch (error: any) {
      console.error('Database schema test error:', error);
      res.status(500).json({ 
        message: "Error testing database schema",
        error: error.message 
      });
    }
  });

  // Test endpoint to check authentication status
  app.get("/api/test/auth-status", verifyToken, async (req, res) => {
    try {
      res.json({
        authenticated: true,
        user: req.user,
        message: "User is authenticated"
      });
    } catch (error) {
      res.status(401).json({
        authenticated: false,
        message: "User is not authenticated"
      });
    }
  });

  // Test endpoint to create a sample appointment
  app.post("/api/test/create-sample-appointment", async (req, res) => {
    try {
      // Get Dr. Sarah Smith practitioner
      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.bookingLink, "dr-sarah-smith"),
      });
      if (!practitioner) {
        return res.status(404).json({ message: "Dr. Sarah Smith practitioner not found" });
      }

      // Get the first patient
      const patient = await db.query.patients.findFirst();
      if (!patient) {
        return res.status(404).json({ message: "No patient found" });
      }

      // Create a sample appointment for Dr. Sarah Smith
      const sampleAppointment = await storage.createAppointment({
        patientId: patient.id,
        practitionerId: practitioner.id,
        title: "Test Appointment for Dr. Sarah Smith",
        description: "This is a test appointment for Dr. Sarah Smith",
        appointmentDate: new Date(),
        duration: 30,
        type: "consultation",
        status: "scheduled",
      });

      res.json({
        message: "Sample appointment created for Dr. Sarah Smith",
        appointment: sampleAppointment,
        practitionerId: practitioner.id
      });
    } catch (error: any) {
      console.error('Create sample appointment error:', error);
      res.status(500).json({ 
        message: "Error creating sample appointment",
        error: error.message 
      });
    }
  });

  // Test endpoint to check appointments table
  app.get("/api/test/appointments-table", async (req, res) => {
    try {
      // Get all appointments
      const allAppointments = await db.query.appointments.findMany({
        with: {
          patient: {
            with: {
              user: true
            }
          },
          practitioner: {
            with: {
              user: true
            }
          }
        }
      });
      
      res.json({
        totalAppointments: allAppointments.length,
        appointments: allAppointments
      });
    } catch (error: any) {
      console.error('Test appointments table error:', error);
      res.status(500).json({ 
        message: "Error testing appointments table",
        error: error.message 
      });
    }
  });

  // Test endpoint to check booking_settings table
  app.get("/api/test/booking-settings-table", async (req, res) => {
    try {
      // Check if booking_settings table exists
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'booking_settings'
        );
      `);
      
      // Get all booking_settings records
      const allSettings = await db.query.bookingSettings.findMany();
      
      // Get table structure
      const tableStructure = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'booking_settings'
        ORDER BY ordinal_position;
      `);
      
      res.json({
        tableExists: tableExists[0]?.exists,
        totalRecords: allSettings.length,
        records: allSettings,
        structure: tableStructure
      });
    } catch (error: any) {
      console.error('Booking settings table test error:', error);
      res.status(500).json({ 
        message: "Error testing booking settings table",
        error: error.message 
      });
    }
  });

  // Get comprehensive practitioner data for public booking
  app.get("/api/public/practitioner/:bookingLink", async (req, res) => {
    try {
      const { bookingLink } = req.params;

      console.log('Fetching comprehensive practitioner data for booking link:', bookingLink);

      // Find practitioner by booking link
      const practitioner = await db.query.practitioners.findFirst({
        where: eq(practitioners.bookingLink, bookingLink),
      });

      if (!practitioner) {
        console.log('Practitioner not found for booking link:', bookingLink);
        return res.status(404).json({ message: "Practitioner not found" });
      }

      // Get user details for the practitioner
      const user = await db.query.users.findFirst({
        where: eq(users.id, practitioner.userId),
      });

      if (!user) {
        console.log('User not found for practitioner:', practitioner.id);
        return res.status(404).json({ message: "Practitioner user not found" });
      }

      // Get calendar settings
      const calendarSettingsData = await db.query.calendarSettings.findFirst({
        where: eq(calendarSettings.practitionerId, practitioner.id),
      });

      // Get booking settings
      const bookingSettingsData = await db.query.bookingSettings.findFirst({
        where: eq(bookingSettings.practitionerId, practitioner.id),
      });

      // Get all appointments for the practitioner
      const appointmentsData = await db.query.appointments.findMany({
        where: eq(appointments.practitionerId, practitioner.id),
        with: {
          patient: {
            with: {
              user: true
            }
          }
        }
      });

      const practitionerData = {
        id: practitioner.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        specialty: practitioner.specialty,
        bio: practitioner.bio,
        consultationFee: practitioner.consultationFee,
        qualifications: practitioner.qualifications,
        bookingLink: practitioner.bookingLink,
      };

      // Return comprehensive data
      const response = {
        practitioner: practitionerData,
        calendarSettings: calendarSettingsData || {
          id: null,
          practitionerId: practitioner.id,
          timeInterval: 60,
          bufferTime: 0,
          defaultStartTime: "09:00",
          defaultEndTime: "17:00",
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          allowWeekendBookings: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        bookingSettings: bookingSettingsData || {
          id: null,
          practitionerId: practitioner.id,
          isPublicBookingEnabled: true,
          requireApproval: false,
          allowDirectBooking: true,
          showProfile: true,
          showSpecialty: true,
          showConsultationFee: true,
          advanceBookingDays: 30,
          maxBookingsPerDay: 10,
          bufferTime: 15,
          emailNotifications: true,
          smsNotifications: false,
          reminderHours: 24,
          requirePhoneVerification: false,
          requireEmailVerification: false,
          customMessage: '',
          cancellationPolicy: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        appointments: appointmentsData || []
      };

      console.log('Returning comprehensive practitioner data');
      
      // Encrypt the response data
      const algorithm = 'aes-256-cbc';
      const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';
      const iv = crypto.randomBytes(16);
      
      // Create a proper 32-byte key using SHA-256 hash
      const key = crypto.createHash('sha256').update(secretKey).digest();
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(JSON.stringify(response), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      res.json({
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex')
      });
    } catch (error: any) {
      console.error('Get comprehensive practitioner data error:', error);
      res.status(500).json({ 
        message: "Error fetching practitioner data",
        error: error.message 
      });
    }
  });





  // Test endpoint to manually insert booking settings
  app.post("/api/test/insert-booking-settings", async (req, res) => {
    try {
      const { practitionerId } = req.body;
      
      if (!practitionerId) {
        return res.status(400).json({ message: "practitionerId is required" });
      }

      const testSettings = {
        practitionerId: practitionerId,
        isPublicBookingEnabled: true,
        requireApproval: true,
        allowDirectBooking: false,
        showProfile: true,
        showSpecialty: true,
        showConsultationFee: true,
        advanceBookingDays: 30,
        maxBookingsPerDay: 10,
        bufferTime: 15,
        emailNotifications: true,
        smsNotifications: false,
        reminderHours: 24,
        requirePhoneVerification: false,
        requireEmailVerification: true,
        customMessage: 'Test welcome message',
        cancellationPolicy: 'Test cancellation policy',
      };

      console.log('Inserting test settings for practitioner:', practitionerId);
      
      const savedSettings = await db.insert(bookingSettings)
        .values(testSettings)
        .returning()[0];

      console.log('Test settings saved:', savedSettings);

      res.json({
        message: "Test booking settings inserted successfully",
        settings: savedSettings
      });
    } catch (error: any) {
      console.error('Test insert booking settings error:', error);
      res.status(500).json({ 
        message: "Error inserting test booking settings",
        error: error.message 
      });
    }
  });

  // Google OAuth Routes
  app.get("/auth/google", (req, res) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ 
        message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables." 
      });
    }


    const { state } = req.query; // Get user ID from state parameter
    
    if (!state) {
      return res.status(400).json({ message: "User ID is required in state parameter" });
    }

    console.log('Google OAuth URL:', process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;
    
    res.redirect(googleAuthUrl);
  });

  app.get("/auth/google/callback", async (req, res) => {
    try {
      // Check if Google OAuth is configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        return res.redirect(`${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/settings?tab=integrations&error=oauth_not_configured`);
      }

      const { code } = req.query;
      
      if (!code) {
        return res.redirect(`${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/settings?tab=integrations&error=no_authorization_code`);
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Google OAuth token error:', tokenData);
        return res.status(400).json({ message: "Failed to exchange code for tokens" });
      }

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userInfo = await userInfoResponse.json();

      if (!userInfoResponse.ok) {
        console.error('Google user info error:', userInfo);
        return res.status(400).json({ message: "Failed to get user info from Google" });
      }

      // For now, we'll store the integration for the current user
      // In a real app, you'd want to get the user from the session/token
      const userId = req.query.state; // Pass user ID in state parameter
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Check if integration already exists
      const existingIntegration = await db.select()
        .from(oauthIntegrations)
        .where(and(
          eq(oauthIntegrations.userId, userId as string),
          eq(oauthIntegrations.provider, 'google')
        ))
        .limit(1);

      if (existingIntegration.length > 0) {
        // Update existing integration
        await db.update(oauthIntegrations)
          .set({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || existingIntegration[0].refreshToken,
            tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            scope: tokenData.scope,
            providerUserId: userInfo.id,
            providerEmail: userInfo.email,
            providerName: userInfo.name,
            updatedAt: new Date(),
          })
          .where(eq(oauthIntegrations.id, existingIntegration[0].id));
      } else {
        // Create new integration
        await db.insert(oauthIntegrations).values({
          userId: userId as string,
          provider: 'google',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          scope: tokenData.scope,
          providerUserId: userInfo.id,
          providerEmail: userInfo.email,
          providerName: userInfo.name,
        });
      }

      // Redirect back to the settings page with success message
      res.redirect(`${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/settings?tab=integrations&success=google_connected`);
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/settings?tab=integrations&error=oauth_failed`);
    }
  });

  // Get user's OAuth integrations
  app.get("/api/oauth/integrations", verifyToken, async (req: any, res) => {
    try {
      const { userId } = req.query;
      
      // If userId is provided, use it (for fetching other users' integrations)
      // Otherwise, use the current user's ID
      const targetUserId = userId || req.user.id;
      
      const integrations = await db.select()
        .from(oauthIntegrations)
        .where(eq(oauthIntegrations.userId, targetUserId));

      res.json(integrations);
    } catch (error: any) {
      console.error('Get OAuth integrations error:', error);
      res.status(500).json({ message: "Failed to get OAuth integrations" });
    }
  });

  // Disconnect OAuth integration
  app.delete("/api/oauth/integrations/:provider", verifyToken, async (req: any, res) => {
    try {
      await db.delete(oauthIntegrations)
        .where(and(
          eq(oauthIntegrations.userId, req.user.id),
          eq(oauthIntegrations.provider, req.params.provider)
        ));

      res.json({ message: "Integration disconnected successfully" });
    } catch (error: any) {
      console.error('Disconnect OAuth integration error:', error);
      res.status(500).json({ message: "Failed to disconnect integration" });
    }
  });

  // Update integration settings
  app.put("/api/oauth/integrations/:provider/settings", verifyToken, async (req: any, res) => {
    try {
      const { provider } = req.params;
      const { calendarSync, driveSync, syncDirection, syncFrequency, syncEventTypes, autoCreateMeetings, teamsAutoCreateMeetings } = req.body;

      // Find the existing integration
      const existingIntegration = await db.select()
        .from(oauthIntegrations)
        .where(and(
          eq(oauthIntegrations.userId, req.user.id),
          eq(oauthIntegrations.provider, provider)
        ));

      if (!existingIntegration.length) {
        return res.status(404).json({ message: "Integration not found" });
      }

      // Update the integration with new settings
      const updateData: any = { updatedAt: new Date() };
      
      if (provider === 'google') {
        if (calendarSync !== undefined) updateData.calendarSync = calendarSync;
        if (driveSync !== undefined) updateData.driveSync = driveSync;
        if (syncDirection !== undefined) updateData.syncDirection = syncDirection;
        if (syncFrequency !== undefined) updateData.syncFrequency = syncFrequency;
        if (syncEventTypes !== undefined) updateData.syncEventTypes = syncEventTypes;
      } else if (provider === 'zoom') {
        if (autoCreateMeetings !== undefined) updateData.autoCreateMeetings = autoCreateMeetings;
      } else if (provider === 'teams') {
        if (teamsAutoCreateMeetings !== undefined) updateData.teamsAutoCreateMeetings = teamsAutoCreateMeetings;
      }

      await db.update(oauthIntegrations)
        .set(updateData)
        .where(eq(oauthIntegrations.id, existingIntegration[0].id));

      res.json({ message: "Integration settings updated successfully" });
    } catch (error: any) {
      console.error('Update integration settings error:', error);
      res.status(500).json({ message: "Failed to update integration settings" });
    }
  });

  // Get Google Calendar events
  app.get("/api/google-calendar/events", verifyToken, async (req: any, res) => {
    try {
      const { date, sync } = req.query;
      
      // Check cache first (unless it's a manual sync)
      if (sync !== 'true') {
        const cacheKey = `google-calendar-${req.user.id}-${date || 'default'}`;
        const cachedData = cacheService.get(cacheKey);
        
        if (cachedData) {
          return res.json(cachedData);
        }
      }
      
      // Find the user's Google integration
      const googleIntegration = await db.select()
        .from(oauthIntegrations)
        .where(and(
          eq(oauthIntegrations.userId, req.user.id),
          eq(oauthIntegrations.provider, 'google')
        ));

      if (!googleIntegration.length || !googleIntegration[0].calendarSync) {
        console.log('No Google integration found or calendar sync disabled');
        return res.json([]);
      }

      const integration = googleIntegration[0];

      
      // Check if token is expired and refresh if needed
      if (integration.tokenExpiry && new Date() > integration.tokenExpiry) {
        console.log("Google token expired, attempting to refresh...");
        
        try {
          // Set up OAuth2 client for token refresh
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
          );

          // Set credentials for refresh
          oauth2Client.setCredentials({
            refresh_token: integration.refreshToken,
          });

          // Refresh the access token
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update the integration with new tokens
          await db.update(oauthIntegrations)
            .set({
              accessToken: credentials.access_token,
              tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
              updatedAt: new Date()
            })
            .where(eq(oauthIntegrations.id, integration.id));

          console.log("Google token refreshed successfully");
          
          // Update integration object with new tokens
          integration.accessToken = credentials.access_token;
          if (credentials.expiry_date) {
            integration.tokenExpiry = new Date(credentials.expiry_date);
          }
        } catch (refreshError: any) {
          console.error('Failed to refresh Google token:', refreshError);
          // If refresh fails, return empty array
          return res.json([]);
        }
      }

      // Set up Google OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
      });

      // Calculate date range - always fetch a wider range to ensure we get all events
      let startDate: Date, endDate: Date;
      
      if (sync === 'true' || integration.syncFrequency === 'manual') {
        // Manual sync - get all events from the past 30 days to next 90 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);
        endDate.setHours(23, 59, 59, 999);

      } else {
        // For all other cases, fetch a wider range to ensure we don't miss events
        const currentDate = date ? new Date(date) : new Date();
        startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 7); // Start 7 days before
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 7); // End 7 days after
        endDate.setHours(23, 59, 59, 999);

      }

      try {

        
        // Fetch events from Google Calendar with more comprehensive parameters
        const response = await calendar.events.list({
          auth: oauth2Client,
          calendarId: 'primary',
          timeMin: startDate,
          timeMax: endDate,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250, // Increased limit to get more events
          showDeleted: false,
          timeZone: 'UTC'
        });

        const events = response.data.items || [];

        
        // Filter out cancelled events and events without summary
        let filteredEvents = events.filter((event: any) => {
          return event.status !== 'cancelled' && event.summary;
        });
        
        // Filter events based on sync event types if specified
        if (integration.syncEventTypes && integration.syncEventTypes.trim()) {
          const allowedTypes = integration.syncEventTypes.split(',').map(t => t.trim().toLowerCase());
          
          filteredEvents = filteredEvents.filter((event: any) => {
            // Check if event summary contains any of the allowed types
            const summary = event.summary?.toLowerCase() || '';
            
            // More flexible matching - check for partial matches
            return allowedTypes.some(type => {
              // Check if the event summary contains the type word
              if (summary.includes(type)) return true;
              
              // Also check for common variations
              if (type === 'meetings' && (summary.includes('meeting') || summary.includes('stand-up') || summary.includes('call'))) return true;
              if (type === 'appointments' && (summary.includes('appointment') || summary.includes('consultation') || summary.includes('session'))) return true;
              if (type === 'reminders' && (summary.includes('reminder') || summary.includes('check') || summary.includes('follow-up'))) return true;
              
              return false;
            });
          });
        }

        // Cache the results
        const cacheKey = `google-calendar-${req.user.id}-${date || 'default'}`;
        cacheService.set(cacheKey, filteredEvents, 5 * 60 * 1000); // 5 minutes TTL
        
        res.json(filteredEvents);
      } catch (googleError: any) {
        console.error('Google Calendar API error:', googleError);
        console.error('Error details:', {
          message: googleError.message,
          code: googleError.code,
          status: googleError.status,
          response: googleError.response?.data
        });
        // Return empty array instead of error to prevent frontend issues
        res.json([]);
      }
    } catch (error: any) {
      console.error('Get Google Calendar events error:', error);
      res.status(500).json({ message: "Failed to get Google Calendar events" });
    }
  });

  // Clear Google Calendar cache for a user
  app.post("/api/google-calendar/clear-cache", verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Remove all cache entries for this user
      const clearedEntries = cacheService.deletePattern(`google-calendar-${userId}`);
      
      res.json({ success: true, clearedEntries });
    } catch (error: any) {
      console.error('Clear Google Calendar cache error:', error);
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });

  // Get cache statistics (for monitoring)
  app.get("/api/cache/stats", verifyToken, async (req: any, res) => {
    try {
      // Only allow admin users to view cache stats
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stats = cacheService.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Get cache stats error:', error);
      res.status(500).json({ message: "Failed to get cache stats" });
    }
  });

  // User Integrations API
  app.get("/api/user-integrations", verifyToken, async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const integrations = await storage.getUserIntegrations(userId as string);
      res.json(integrations);
    } catch (error) {
      console.error("Get user integrations error:", error);
      res.status(500).json({ message: "Failed to get user integrations" });
    }
  });

  app.post("/api/user-integrations", verifyToken, async (req, res) => {
    try {
      const integrationData = {
        userId: req.user.id,
        provider: req.body.provider,
        accessToken: req.body.accessToken,
        refreshToken: req.body.refreshToken,
        tokenExpiry: req.body.tokenExpiry,
        scope: req.body.scope,
        providerUserId: req.body.providerUserId,
        providerEmail: req.body.providerEmail,
        providerName: req.body.providerName,
      };

      const integration = await storage.createUserIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error) {
      console.error("Create user integration error:", error);
      res.status(400).json({ message: "Failed to create user integration" });
    }
  });

  app.delete("/api/user-integrations/:id", verifyToken, async (req, res) => {
    try {
      const success = await storage.deleteUserIntegration(req.params.id, req.user.id);
      if (!success) {
        return res.status(404).json({ message: "Integration not found" });
      }
      res.json({ message: "Integration deleted successfully" });
    } catch (error) {
      console.error("Delete user integration error:", error);
      res.status(500).json({ message: "Failed to delete user integration" });
    }
  });

  // Test endpoint for notifications
  app.post("/api/test-notification", verifyToken, async (req: any, res) => {
    try {
      const { userId, type, data } = req.body;
      
      const notification = await notificationService.createTemplatedNotification(
        userId || req.user.id,
        type || 'system_update',
        data || { message: 'Test notification' },
        '/dashboard'
      );
      
      res.json({ success: true, notification });
    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });

  // Test endpoint for telehealth session notification
  app.post("/api/test-telehealth-notification", verifyToken, async (req: any, res) => {
    try {
      const { patientUserId, practitionerUserId } = req.body;
      
      const notifications = [];
      
      // Create notification for patient
      if (patientUserId) {
        const patientNotification = await notificationService.createTemplatedNotification(
          patientUserId,
          'telehealth_session_scheduled',
          {
            patientName: 'Test Patient',
            practitionerName: 'Dr. Test Practitioner',
            platform: 'webrtc',
            appointmentDate: new Date()
          },
          '/telehealth/test-session'
        );
        notifications.push({ type: 'patient', notification: patientNotification });
      }
      
      // Create notification for practitioner
      if (practitionerUserId) {
        const practitionerNotification = await notificationService.createTemplatedNotification(
          practitionerUserId,
          'telehealth_session_scheduled',
          {
            patientName: 'Test Patient',
            practitionerName: 'Dr. Test Practitioner',
            platform: 'webrtc',
            appointmentDate: new Date()
          },
          '/telehealth/test-session'
        );
        notifications.push({ type: 'practitioner', notification: practitionerNotification });
      }
      
      res.json({ success: true, notifications });
    } catch (error) {
      console.error("Test telehealth notification error:", error);
      res.status(500).json({ message: "Failed to create test telehealth notification" });
    }
  });

  // Audit logs endpoint for HIPAA compliance
  app.post("/api/audit-logs", verifyToken, async (req: any, res) => {
    try {
      const { sessionId, userId, userRole, eventType, eventData } = req.body;
      
      // Validate required fields
      if (!sessionId || !userId || !userRole || !eventType) {
        return res.status(400).json({ 
          message: "Missing required fields: sessionId, userId, userRole, eventType" 
        });
      }
      
      // Validate user role
      const validRoles = ['patient', 'practitioner', 'admin', 'staff'];
      if (!validRoles.includes(userRole)) {
        return res.status(400).json({ 
          message: "Invalid user role. Must be one of: patient, practitioner, admin, staff" 
        });
      }
      
      // Handle system events (sessionId = 'system')
      let actualSessionId = sessionId;
      if (sessionId === 'system') {
        // For system events, we'll use a special UUID or handle differently
        // For now, we'll skip database insertion for system events and just log them
        console.log('📋 System audit log:', {
          sessionId: 'system',
          userId,
          userRole,
          eventType,
          eventData,
          timestamp: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(201).json({ 
          success: true, 
          auditLog: { sessionId: 'system', eventType, timestamp: new Date() },
          message: "System audit log recorded successfully" 
        });
      }
      
      // Create audit log entry for session-specific events
      const auditLog = await db.insert(telehealthAuditLogs).values({
        sessionId: actualSessionId,
        userId,
        userRole,
        eventType,
        eventData: eventData || {},
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }).returning();
      
      console.log('📋 Audit log created:', {
        sessionId,
        userId,
        userRole,
        eventType,
        timestamp: new Date()
      });
      
      res.status(201).json({ 
        success: true, 
        auditLog: auditLog[0],
        message: "Audit log created successfully" 
      });
      
    } catch (error) {
      console.error("Create audit log error:", error);
      res.status(500).json({ 
        message: "Failed to create audit log",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get audit logs for a session
  app.get("/api/audit-logs/:sessionId", verifyToken, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      // Verify user has access to this session
      const session = await storage.getTelehealthSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check if user has permission to view audit logs
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Only allow access if user is admin, staff, or participant in the session
      const isParticipant = session.patientId === userId || session.practitionerId === userId;
      const hasPermission = userRole === 'admin' || userRole === 'staff' || isParticipant;
      
      if (!hasPermission) {
        return res.status(403).json({ message: "Access denied to audit logs" });
      }
      
      // Get audit logs for the session
      const logs = await db.select()
        .from(telehealthAuditLogs)
        .where(eq(telehealthAuditLogs.sessionId, sessionId))
        .orderBy(desc(telehealthAuditLogs.timestamp))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      res.json({ 
        success: true, 
        logs,
        count: logs.length,
        sessionId 
      });
      
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ 
        message: "Failed to get audit logs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Debug endpoint for telehealth sessions
  app.get("/api/debug/telehealth-sessions/:sessionId", verifyToken, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const sessionInfo = wsServer.getTelehealthSessionInfo(sessionId);
      const activeSessions = wsServer.getActiveTelehealthSessions();
      
      res.json({
        sessionId,
        sessionInfo,
        activeSessions,
        connectedClients: wsServer.getConnectedClientsCount(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Debug telehealth session error:", error);
      res.status(500).json({ message: "Failed to get debug info" });
    }
  });

  // Debug endpoint to check all connected clients
  app.get("/api/debug/websocket-clients", verifyToken, async (req, res) => {
    try {
      const activeSessions = wsServer.getActiveTelehealthSessions();
      const sessionDetails = activeSessions.map(sessionId => ({
        sessionId,
        info: wsServer.getTelehealthSessionInfo(sessionId)
      }));
      
      res.json({
        connectedClients: wsServer.getConnectedClientsCount(),
        activeSessions: sessionDetails,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Debug WebSocket clients error:", error);
      res.status(500).json({ message: "Failed to get debug info" });
    }
  });

  // User routes
  app.get("/api/users", verifyToken, async (req: any, res) => {
    try {
      // Only admin and staff can get all users
      if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/users/me", verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Get user with related data (patient/practitioner info)
      const userWithDetails = await storage.getUserWithDetails(user.id);
      
      res.json(userWithDetails);
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Failed to get user details" });
    }
  });

  app.get("/api/users/:id", verifyToken, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const userWithDetails = await storage.getUserWithDetails(userId);
      
      if (!userWithDetails) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(userWithDetails);
    } catch (error) {
      console.error("Get user by ID error:", error);
      res.status(500).json({ message: "Failed to get user details" });
    }
  });

  // Validate Stripe Coupon API
  app.post("/api/store/validate-stripe-coupon", verifyToken, async (req: any, res) => {
    try {
      const { code, amount } = req.body;

      if (!code) {
        return res.status(400).json({ 
          success: false, 
          error: "Coupon code is required" 
        });
      }

      // Validate promotion code with Stripe
      const promotionCodes = await stripe.promotionCodes.list({
        code: code.toUpperCase(),
        active: true,
        limit: 1
      });

      if (promotionCodes.data.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid or expired coupon code" 
        });
      }

      const promotionCode = promotionCodes.data[0];
      const coupon = promotionCode.coupon;

      // Check if coupon is valid
      if (!coupon.valid) {
        return res.status(400).json({ 
          success: false, 
          error: "This coupon is no longer valid" 
        });
      }

      // Check minimum amount if specified
      if (coupon.minimum_amount && amount < coupon.minimum_amount) {
        const minAmount = (coupon.minimum_amount / 100).toFixed(2);
        return res.status(400).json({ 
          success: false, 
          error: `Minimum order amount of $${minAmount} required` 
        });
      }

      // Check maximum amount if specified
      if (coupon.maximum_amount && amount > coupon.maximum_amount) {
        const maxAmount = (coupon.maximum_amount / 100).toFixed(2);
        return res.status(400).json({ 
          success: false, 
          error: `Maximum order amount of $${maxAmount} exceeded` 
        });
      }

      res.json({ 
        success: true, 
        data: {
          id: coupon.id,
          name: coupon.name || promotionCode.code,
          amount_off: coupon.amount_off,
          percent_off: coupon.percent_off,
          currency: coupon.currency,
          duration: coupon.duration,
          description: coupon.name || `${coupon.percent_off ? coupon.percent_off + '%' : '$' + (coupon.amount_off / 100)} off`
        }
      });
    } catch (error) {
      console.error("Stripe coupon validation error:", error);
      res.status(500).json({ success: false, error: "Failed to validate coupon" });
    }
  });

  // Update Payment Intent API
  app.post("/api/store/update-payment-intent", verifyToken, async (req: any, res) => {
    try {
      const { paymentIntentId, couponId, newAmount, items } = req.body;

      console.log("Update payment intent request:", { paymentIntentId, couponId, newAmount });

      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent ID is required" 
        });
      }

      if (!newAmount || newAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid amount" 
        });
      }

      // First, retrieve the payment intent to check its status
      try {
        const existingPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        console.log("Payment intent status:", existingPaymentIntent.status);
        
        // Check if payment intent can be updated
        if (existingPaymentIntent.status === 'succeeded') {
          return res.status(400).json({ 
            success: false, 
            error: "Payment has already been completed. Cannot update payment intent after successful payment." 
          });
        }
        
        if (existingPaymentIntent.status === 'canceled') {
          return res.status(400).json({ 
            success: false, 
            error: "Payment intent has been canceled. Cannot update a canceled payment intent." 
          });
        }
        
        // Only allow updates for these statuses: requires_payment_method, requires_confirmation, requires_action
        const allowedStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
        if (!allowedStatuses.includes(existingPaymentIntent.status)) {
          return res.status(400).json({ 
            success: false, 
            error: `Cannot update payment intent with status: ${existingPaymentIntent.status}. Payment intent can only be updated when it requires payment method, confirmation, or action.` 
          });
        }
      } catch (retrieveError: any) {
        console.error("Error retrieving payment intent:", retrieveError);
        return res.status(400).json({ 
          success: false, 
          error: "Unable to verify payment intent status. Please try again." 
        });
      }

      // Update the existing payment intent
      const updateData: any = {
        amount: newAmount,
        metadata: {
          customer_id: req.user.id,
          items: JSON.stringify(items || []),
        },
      };

      // Note: Stripe doesn't support discounts in payment intent updates
      // The discount should be applied to the amount before updating the payment intent
      // The couponId is stored in metadata for reference
      if (couponId) {
        updateData.metadata.coupon_id = couponId;
      }

      console.log("Updating payment intent with data:", updateData);

      const updatedPaymentIntent = await stripe.paymentIntents.update(paymentIntentId, updateData);

      console.log("Payment intent updated successfully:", updatedPaymentIntent.id);

      res.json({ 
        success: true, 
        data: {
          id: updatedPaymentIntent.id,
          client_secret: updatedPaymentIntent.client_secret,
          amount: updatedPaymentIntent.amount,
          status: updatedPaymentIntent.status
        }
      });
    } catch (error: any) {
      console.error("Update payment intent error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to update payment intent";
      if (error.type === 'StripeInvalidRequestError') {
        errorMessage = error.message || "Invalid payment intent update request";
      } else if (error.type === 'StripeCardError') {
        errorMessage = error.message || "Payment method error";
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: error.message 
      });
    }
  });

  // Confirm Store Payment API
  app.post("/api/store/confirm-payment", verifyToken, async (req: any, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent ID is required" 
        });
      }

      console.log('Confirming store payment intent:', paymentIntentId);
      
      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (!paymentIntent) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment intent not found" 
        });
      }

      if (paymentIntent.status === 'succeeded') {
        // Payment successful - update the order status
        console.log('Store payment confirmed:', paymentIntent.id);
        
        // Find and update the order with this payment intent ID
        const updatedOrder = await db.update(storeOrders)
          .set({
            paymentStatus: 'paid',
            status: 'processing',
            updatedAt: new Date()
          })
          .where(eq(storeOrders.stripePaymentIntentId, paymentIntentId))
          .returning();

        if (updatedOrder.length === 0) {
          console.log('No order found for payment intent:', paymentIntentId);
          return res.status(404).json({ 
            success: false, 
            error: "Order not found for this payment intent" 
          });
        }

        console.log('Order payment status updated:', updatedOrder[0].orderNumber);

        res.json({ 
          success: true, 
          data: {
            orderId: updatedOrder[0].id,
            orderNumber: updatedOrder[0].orderNumber,
            paymentStatus: 'paid',
            status: 'processing'
          }
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: `Payment not successful. Current status: ${paymentIntent.status}` 
        });
      }
    } catch (error: any) {
      console.error('Store payment confirmation error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to confirm payment" 
      });
    }
  });

  // Create Payment Intent API
  app.post("/api/store/create-payment-intent", verifyToken, async (req: any, res) => {
    try {
      const { amount, currency, items } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid amount" 
        });
      }

      const paymentIntentData: any = {
        amount: amount,
        currency: currency || 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          customer_id: req.user.id,
          items: JSON.stringify(items),
        },
      };

      // Add coupon if provided
      if (req.body.couponId) {
        paymentIntentData.discounts = [{
          coupon: req.body.couponId
        }];
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      res.json({ 
        success: true, 
        data: {
          client_secret: paymentIntent.client_secret,
          id: paymentIntent.id,
          amount: paymentIntent.amount,
        }
      });
    } catch (error) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ success: false, error: "Failed to create payment intent" });
    }
  });

  // Store Orders API
  app.post("/api/store/orders", verifyToken, async (req: any, res) => {
    try {
      const {
        paymentIntentId,
        printfulOrderId,
        customer,
        items,
        subtotal,
        shipping,
        tax,
        total
      } = req.body;

      // Generate unique order number
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderNumber = `TNH-${timestamp}-${randomSuffix}`;

      // Validate required fields
      if (!customer || !items || items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required order information" 
        });
      }

      const order = await db.insert(storeOrders).values({
        orderNumber: orderNumber,
        customerId: req.user.id,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
        shippingAddress: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address1: customer.address1,
          address2: customer.address2,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          country: customer.country
        },
        items: items,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        total: total,
        stripePaymentIntentId: paymentIntentId,
        printfulOrderId: printfulOrderId,
        status: "processing",
        paymentStatus: "paid",
        fulfillmentStatus: "pending"
      }).returning();

      // Verify payment intent status before creating order
      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
              success: false, 
              error: "Payment not confirmed. Please complete payment before creating order." 
            });
          }
          
          console.log(`Payment confirmed for order: ${orderNumber}, payment status: ${paymentIntent.status}`);
        } catch (stripeError) {
          console.error("Error verifying payment intent:", stripeError);
          return res.status(400).json({ 
            success: false, 
            error: "Unable to verify payment. Please try again." 
          });
        }
      }

      // Log the order creation
      console.log(`New store order created: ${orderNumber} for user ${req.user.id} with confirmed payment`);

      res.json({ 
        success: true, 
        data: { 
          orderId: order[0].id,
          orderNumber: order[0].orderNumber 
        } 
      });
    } catch (error) {
      console.error("Create store order error:", error);
      res.status(500).json({ success: false, error: "Failed to create order" });
    }
  });

  app.get("/api/store/orders", verifyToken, async (req: any, res) => {
    try {
      const { page = 1, limit = 10, status, customerId } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let whereClause = eq(storeOrders.customerId, req.user.id);
      
      if (req.user.role === 'admin') {
        whereClause = undefined; // Admin can see all orders
      }

      if (status && status !== 'all') {
        whereClause = and(whereClause, eq(storeOrders.status, status as string));
      }

      const orders = await db.select()
        .from(storeOrders)
        .where(whereClause)
        .orderBy(desc(storeOrders.createdAt))
        .limit(parseInt(limit as string))
        .offset(offset);

      const totalCount = await db.select({ count: count() })
        .from(storeOrders)
        .where(whereClause);

      res.json({
        success: true,
        orders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error("Get store orders error:", error);
      res.status(500).json({ success: false, error: "Failed to get orders" });
    }
  });

  app.get("/api/store/orders/:id", verifyToken, async (req: any, res) => {
    try {
      const orderId = req.params.id;
      
      const order = await db.select()
        .from(storeOrders)
        .where(eq(storeOrders.id, orderId))
        .limit(1);

      if (!order[0]) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // Check if user can access this order
      if (req.user.role !== 'admin' && order[0].customerId !== req.user.id) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      res.json({ success: true, data: order[0] });
    } catch (error) {
      console.error("Get store order error:", error);
      res.status(500).json({ success: false, error: "Failed to get order" });
    }
  });

  app.patch("/api/store/orders/:id", verifyToken, async (req: any, res) => {
    try {
      const orderId = req.params.id;
      const updates = req.body;

      // Only admin can update orders
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      const updatedOrder = await db.update(storeOrders)
        .set(updates)
        .where(eq(storeOrders.id, orderId))
        .returning();

      if (!updatedOrder[0]) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      res.json({ success: true, data: updatedOrder[0] });
    } catch (error) {
      console.error("Update store order error:", error);
      res.status(500).json({ success: false, error: "Failed to update order" });
    }
  });

  // Export orders endpoint (admin only)
  app.get("/api/store/orders/export", verifyToken, async (req: any, res) => {
    try {
      // Only admin can export orders
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      const orders = await db.select()
        .from(storeOrders)
        .orderBy(desc(storeOrders.createdAt));

      // Convert to CSV format
      const csvHeader = "Order Number,Customer Name,Email,Total,Status,Payment Status,Date\n";
      const csvRows = orders.map(order => {
        const customerName = `${order.customerFirstName} ${order.customerLastName}`;
        const date = new Date(order.createdAt).toLocaleDateString();
        return `${order.orderNumber},"${customerName}","${order.customerEmail}",${order.total},${order.status},${order.paymentStatus},${date}`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error("Export orders error:", error);
      res.status(500).json({ success: false, error: "Failed to export orders" });
    }
  });

  // Admin Events API endpoints
  app.get("/api/admin/events", verifyToken, async (req: any, res) => {
    try {
      // Only admin can access events
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      const eventsList = await db.select()
        .from(events)
        .orderBy(desc(events.createdAt));

      res.json({ success: true, data: eventsList });
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ success: false, error: "Failed to get events" });
    }
  });

  app.post("/api/admin/events", verifyToken, async (req: any, res) => {
    try {
      // Only admin can create events
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      const eventData = req.body;
      
      // Validate required fields
      if (!eventData.title || !eventData.description || !eventData.startDate || !eventData.endDate) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const newEvent = await db.insert(events)
        .values({
          title: eventData.title,
          description: eventData.description,
          link: eventData.link || null,
          location: eventData.location || null,
          startDate: eventData.startDate,
          startTime: eventData.startTime || null,
          endDate: eventData.endDate,
          endTime: eventData.endTime || null,
          thumbnail: eventData.thumbnail || null,
          isActive: eventData.isActive !== undefined ? eventData.isActive : true,
        })
        .returning();

      res.json({ success: true, data: newEvent[0] });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ success: false, error: "Failed to create event" });
    }
  });

  app.put("/api/admin/events/:id", verifyToken, async (req: any, res) => {
    try {
      // Only admin can update events
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      const eventId = req.params.id;
      const eventData = req.body;

      // Validate required fields
      if (!eventData.title || !eventData.description || !eventData.startDate || !eventData.endDate) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const updatedEvent = await db.update(events)
        .set({
          title: eventData.title,
          description: eventData.description,
          link: eventData.link || null,
          location: eventData.location || null,
          startDate: eventData.startDate,
          startTime: eventData.startTime || null,
          endDate: eventData.endDate,
          endTime: eventData.endTime || null,
          thumbnail: eventData.thumbnail || null,
          isActive: eventData.isActive !== undefined ? eventData.isActive : true,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
        .returning();

      if (!updatedEvent[0]) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      res.json({ success: true, data: updatedEvent[0] });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ success: false, error: "Failed to update event" });
    }
  });

  app.delete("/api/admin/events/:id", verifyToken, async (req: any, res) => {
    try {
      // Only admin can delete events
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      const eventId = req.params.id;

      const deletedEvent = await db.delete(events)
        .where(eq(events.id, eventId))
        .returning();

      if (!deletedEvent[0]) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      res.json({ success: true, data: deletedEvent[0] });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ success: false, error: "Failed to delete event" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for telehealth meeting generation
function generateMeetingUrl(platform: string, sessionId: string): string {
  const baseUrls = {
    zoom: "https://zoom.us/j/",
    teams: "https://teams.microsoft.com/l/meetup-join/",
    google_meet: "https://meet.google.com/"
  };
  
  const meetingId = generateMeetingId();
  
  switch (platform) {
    case "webrtc":
      // For WebRTC, generate actual session URL
      return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/telehealth-session/${sessionId}`;
    case "zoom":
      return `${baseUrls.zoom}${meetingId}`;
    case "teams":
      return `${baseUrls.teams}${meetingId}`;
    case "google_meet":
      return `${baseUrls.google_meet}${meetingId}`;
    default:
      // Default to WebRTC session URL
      return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/telehealth-session/${sessionId}`;
  }
}

function generateMeetingId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generatePasscode(): string {
  return Math.random().toString(10).substring(2, 8);
}

function generateHostKey(): string {
  return Math.random().toString(36).substring(2, 15);
}


