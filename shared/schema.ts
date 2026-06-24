import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, uuid, jsonb, pgEnum, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "practitioner", "staff", "patient", "member"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);
export const appointmentTypeEnum = pgEnum("appointment_type", ["consultation", "follow_up", "therapy", "procedure", "emergency", "telehealth"]);
export const appointmentLocationEnum = pgEnum("appointment_location", ["telehealth", "physical"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);
export const messageStatusEnum = pgEnum("message_status", ["unread", "read", "archived"]);
export const messageTypeEnum = pgEnum("message_type", [
  "general",
  "appointment_confirmation",
  "appointment_reminder",
  "appointment_cancellation",
  "appointment_reschedule",
  "pre_appointment_instructions",
  "follow_up_reminder",
  "emergency_notification",
  "system_notification"
]);
export const documentTypeEnum = pgEnum("document_type", ["medical_record", "lab_result", "imaging", "prescription", "insurance", "consent_form", "other"]);
export const telehealthPlatformEnum = pgEnum("telehealth_platform", ["zoom", "teams", "google_meet", "webrtc"]);
export const telehealthStatusEnum = pgEnum("telehealth_status", ["scheduled", "waiting_room", "in_session", "completed", "cancelled", "technical_issues", "consent_required"]);

// Events table for community events
export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  link: text("link"),
  location: text("location"),
  startDate: date("start_date").notNull(),
  startTime: time("start_time"),
  endDate: date("end_date").notNull(),
  endTime: time("end_time"),
  thumbnail: text("thumbnail"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("patient"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  department: text("department"),
  position: text("position"),
  hireDate: timestamp("hire_date"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  firstLogin: boolean("first_login").notNull().default(true),
  // Practitioner-specific fields
  licenseNumber: text("license_number"),
  specialty: text("specialty"),
  qualifications: jsonb("qualifications").$type<string[]>().default([]),
  bio: text("bio"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  bookingLink: text("booking_link").unique(),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Patients table (extends user info for patients)
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  insuranceProvider: text("insurance_provider"),
  insuranceNumber: text("insurance_number"),
  medicalHistory: jsonb("medical_history").$type<string[]>().default([]),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  medications: jsonb("medications").$type<string[]>().default([]),
  // Comprehensive onboarding data storage
  onboardingData: jsonb("onboarding_data").$type<any>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Practitioners table (extends user info for healthcare providers)
export const practitioners = pgTable("practitioners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  licenseNumber: text("license_number"),
  specialty: text("specialty"),
  qualifications: jsonb("qualifications").$type<string[]>().default([]),
  bio: text("bio"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  bookingLink: text("booking_link").unique(), // Unique public booking link
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  readableId: text("readable_id").notNull().unique().default(sql`substring(md5(random()::text), 1, 8)`),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  practitionerId: uuid("practitioner_id").notNull().references(() => practitioners.id, { onDelete: "cascade" }),
  // Regular appointment fields
  title: text("title").notNull(),
  description: text("description"),
  appointmentDate: timestamp("appointment_date", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull().default(30), // minutes
  type: appointmentTypeEnum("type").notNull().default("consultation"),
  location: appointmentLocationEnum("location").notNull().default("physical"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  telehealthType: text("telehealth_type"),
  telehealthPlatform: text("telehealth_platform"), // "inapp", "zoom", "teams", "google_meet"
  sendEmailConfirmation: boolean("send_email_confirmation").notNull().default(true),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Recovery Notes table (SOAP notes, treatment plans, etc.)
export const clinicalNotes = pgTable("clinical_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  practitionerId: uuid("practitioner_id").notNull().references(() => practitioners.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  subjective: text("subjective"), // SOAP - Subjective
  objective: text("objective"), // SOAP - Objective
  assessment: text("assessment"), // SOAP - Assessment
  plan: text("plan"), // SOAP - Plan
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  practitionerId: uuid("practitioner_id").notNull().references(() => practitioners.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});



// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").notNull().default("general"),
  status: messageStatusEnum("status").notNull().default("unread"),
  readAt: timestamp("read_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryStatus: text("delivery_status").notNull().default("sent"), // sent, delivered, read
  isSystemMessage: boolean("is_system_message").notNull().default(false),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  metadata: jsonb("metadata").$type<{
    appointmentDetails?: {
      appointmentId: string;
      appointmentDate: string;
      practitionerName: string;
      patientName: string;
    };
    systemAction?: {
      action: string;
      data: Record<string, any>;
    };
  }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Documents table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  uploadedById: uuid("uploaded_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  type: documentTypeEnum("type").notNull().default("other"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});



// Telehealth Sessions table
export const telehealthSessions = pgTable("telehealth_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  practitionerId: uuid("practitioner_id").notNull().references(() => practitioners.id, { onDelete: "cascade" }),
  platform: telehealthPlatformEnum("platform").notNull(),
  status: telehealthStatusEnum("status").notNull().default("scheduled"),
  meetingUrl: text("meeting_url"),
  meetingId: text("meeting_id"),
  passcode: text("passcode"),
  hostKey: text("host_key"),
  patientJoinedAt: timestamp("patient_joined_at"),
  practitionerJoinedAt: timestamp("practitioner_joined_at"),
  sessionStartedAt: timestamp("session_started_at"),
  sessionEndedAt: timestamp("session_ended_at"),
  recordingUrl: text("recording_url"),
  sessionNotes: text("session_notes"),
  technicalIssues: text("technical_issues"),
  // HIPAA Compliance Fields
  consentGranted: boolean("consent_granted").default(false),
  consentGrantedAt: timestamp("consent_granted_at"),
  consentGrantedBy: uuid("consent_granted_by").references(() => users.id),
  recordingConsent: boolean("recording_consent").default(false),
  recordingConsentAt: timestamp("recording_consent_at"),
  recordingConsentBy: uuid("recording_consent_by").references(() => users.id),
  auditLog: jsonb("audit_log").$type<Array<{
    timestamp: string;
    userId: string;
    userRole: string;
    eventType: string;
    eventData: Record<string, any>;
  }>>().default([]),
  // Participant Readiness Tracking
  patientReady: boolean("patient_ready").default(false),
  patientReadyAt: timestamp("patient_ready_at"),
  practitionerReady: boolean("practitioner_ready").default(false),
  practitionerReadyAt: timestamp("practitioner_ready_at"),
  // Session Security
  encryptionLevel: text("encryption_level").default("SRTP"),
  sessionKey: text("session_key"), // Encrypted session key
  metadata: jsonb("metadata").$type<{
    zoom?: { 
      meetingUuid?: string;
      participantCount?: number;
      duration?: number;
    };
    teams?: {
      threadId?: string;
      organizerMeetingId?: string;
    };
    googleMeet?: {
      conferenceId?: string;
      hangoutLink?: string;
    };
    webrtc?: {
      sessionKey?: string;
      encryptionLevel?: string;
      participantStates?: Record<string, {
        status: 'waiting' | 'ready' | 'in_meeting';
        joinedAt?: string;
        readyAt?: string;
      }>;
    };
  }>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Telehealth Audit Logs table for HIPAA compliance
export const telehealthAuditLogs = pgTable("telehealth_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => telehealthSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  userRole: text("user_role").notNull(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").default({}),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// System Settings - Global platform configuration
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: text("organization_name").notNull().default("TiNHiH Portal"),
  organizationLogo: text("organization_logo"),
  primaryColor: text("primary_color").notNull().default("#ffdd00"),
  secondaryColor: text("secondary_color").notNull().default("#1f2937"),
  timezone: text("timezone").notNull().default("America/New_York"),
  dateFormat: text("date_format").notNull().default("MM/dd/yyyy"),
  timeFormat: text("time_format").notNull().default("12h"),
  currency: text("currency").notNull().default("USD"),
  language: text("language").notNull().default("en"),
  businessHoursStart: text("business_hours_start").notNull().default("09:00"),
  businessHoursEnd: text("business_hours_end").notNull().default("17:00"),
  workingDays: text("working_days").array().notNull().default(sql`ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']`),
  allowWeekendBookings: boolean("allow_weekend_bookings").default(false),
  defaultAppointmentDuration: integer("default_appointment_duration").notNull().default(60),
  maxAdvanceBookingDays: integer("max_advance_booking_days").notNull().default(90),
  minAdvanceBookingHours: integer("min_advance_booking_hours").notNull().default(24),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
  smsNotificationsEnabled: boolean("sms_notifications_enabled").default(false),
  appointmentReminderHours: integer("appointment_reminder_hours").notNull().default(24),
  sessionTimeoutMinutes: integer("session_timeout_minutes").notNull().default(480),
  passwordMinLength: integer("password_min_length").notNull().default(8),
  requireTwoFactor: boolean("require_two_factor").default(false),
  defaultTelehealthPlatform: text("default_telehealth_platform").notNull().default("zoom"),
  telehealthBufferMinutes: integer("telehealth_buffer_minutes").notNull().default(5),
  allowRecording: boolean("allow_recording").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// User Preferences - Individual user customization
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("light"),
  language: text("language").notNull().default("en"),
  timezone: text("timezone").notNull().default("America/New_York"),
  dateFormat: text("date_format").notNull().default("MM/dd/yyyy"),
  timeFormat: text("time_format").notNull().default("12h"),
  defaultDashboardView: text("default_dashboard_view").notNull().default("overview"),
  showPatientPhotos: boolean("show_patient_photos").default(true),
  compactMode: boolean("compact_mode").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  browserNotifications: boolean("browser_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  appointmentReminders: boolean("appointment_reminders").default(true),
  messageNotifications: boolean("message_notifications").default(true),
  calendarView: text("calendar_view").notNull().default("week"),
  startDayOfWeek: integer("start_day_of_week").notNull().default(0),
  showWeekends: boolean("show_weekends").default(false),
  timeSlotDuration: integer("time_slot_duration").notNull().default(60),
  calendarStartHour: integer("calendar_start_hour").notNull().default(8),
  calendarEndHour: integer("calendar_end_hour").notNull().default(18),
  fontSizeScale: text("font_size_scale").notNull().default("medium"),
  highContrast: boolean("high_contrast").default(false),
  reduceMotion: boolean("reduce_motion").default(false),
  screenReaderOptimized: boolean("screen_reader_optimized").default(false),
  shareDataForAnalytics: boolean("share_data_for_analytics").default(true),
  allowTelemetry: boolean("allow_telemetry").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Calendar Settings (per practitioner)
export const calendarSettings = pgTable("calendar_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  practitionerId: uuid("practitioner_id").references(() => practitioners.id),
  isGlobal: boolean("is_global").default(false),
  timeInterval: integer("time_interval").notNull().default(60),
  bufferTime: integer("buffer_time").notNull().default(0),
  defaultStartTime: text("default_start_time").notNull().default("09:00"),
  defaultEndTime: text("default_end_time").notNull().default("17:00"),
  workingDays: text("working_days").array().notNull().default(sql`ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']`),
  allowWeekendBookings: boolean("allow_weekend_bookings").default(false),
  timezone: text("timezone").notNull().default("UTC"), // Practitioner's timezone
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Booking Settings table
export const bookingSettings = pgTable("booking_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  practitionerId: uuid("practitioner_id").notNull().references(() => practitioners.id, { onDelete: "cascade" }),
  isPublicBookingEnabled: boolean("is_public_booking_enabled").notNull().default(true),
  requireApproval: boolean("require_approval").notNull().default(true),
  allowDirectBooking: boolean("allow_direct_booking").notNull().default(false),
  showProfile: boolean("show_profile").notNull().default(true),
  showSpecialty: boolean("show_specialty").notNull().default(true),
  showConsultationFee: boolean("show_consultation_fee").notNull().default(true),
  advanceBookingDays: integer("advance_booking_days").notNull().default(30),
  maxBookingsPerDay: integer("max_bookings_per_day").notNull().default(10),
  bufferTime: integer("buffer_time").notNull().default(15),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  smsNotifications: boolean("sms_notifications").notNull().default(false),
  reminderHours: integer("reminder_hours").notNull().default(24),
  requirePhoneVerification: boolean("require_phone_verification").notNull().default(false),
  requireEmailVerification: boolean("require_email_verification").notNull().default(true),
  customMessage: text("custom_message").default('Welcome to my booking page. I\'m looking forward to helping you with your healthcare needs.'),
  cancellationPolicy: text("cancellation_policy").default('24 hours notice required for cancellation'),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// OAuth Integrations table
export const oauthIntegrations = pgTable("oauth_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'google', 'zoom', 'teams', etc.
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  scope: text("scope"),
  providerUserId: text("provider_user_id"), // User ID from the provider
  providerEmail: text("provider_email"),
  providerName: text("provider_name"),
  isActive: boolean("is_active").notNull().default(true),
  // Google-specific sync settings
  calendarSync: boolean("calendar_sync").default(false),
  driveSync: boolean("drive_sync").default(false),
  // Calendar sync detailed settings
  syncDirection: text("sync_direction").default("bidirectional"), // "one_way_to_google", "one_way_from_google", "bidirectional"
  syncFrequency: text("sync_frequency").default("realtime"), // "realtime", "hourly", "daily", "manual"
  syncEventTypes: text("sync_event_types").default("appointments,meetings"), // comma-separated list
  // Zoom-specific settings
  autoCreateMeetings: boolean("auto_create_meetings").default(false),
  // Teams-specific settings
  teamsAutoCreateMeetings: boolean("teams_auto_create_meetings").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Quotes table
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  author: text("author").notNull(),
  category: text("category").default("general"), // 'general', 'health', 'wellness', 'motivation', 'recovery'
  tags: jsonb("tags").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: integer("display_order").default(0),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, {
    fields: [users.id],
    references: [patients.userId],
  }),
  practitioner: one(practitioners, {
    fields: [users.id],
    references: [practitioners.userId],
  }),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  uploadedDocuments: many(documents),
  oauthIntegrations: many(oauthIntegrations),
  createdQuotes: many(quotes),
  donations: many(donations),
  storeOrders: many(storeOrders),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  clinicalNotes: many(clinicalNotes),
  invoices: many(invoices),
  documents: many(documents),
}));

export const practitionersRelations = relations(practitioners, ({ one, many }) => ({
  user: one(users, {
    fields: [practitioners.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  clinicalNotes: many(clinicalNotes),
  invoices: many(invoices),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [appointments.practitionerId],
    references: [practitioners.id],
  }),
  clinicalNotes: many(clinicalNotes),
  invoices: many(invoices),
  telehealthSession: one(telehealthSessions),
}));

export const clinicalNotesRelations = relations(clinicalNotes, ({ one }) => ({
  patient: one(patients, {
    fields: [clinicalNotes.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [clinicalNotes.practitionerId],
    references: [practitioners.id],
  }),
  appointment: one(appointments, {
    fields: [clinicalNotes.appointmentId],
    references: [appointments.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [invoices.practitionerId],
    references: [practitioners.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  patient: one(patients, {
    fields: [documents.patientId],
    references: [patients.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  creator: one(users, {
    fields: [quotes.createdBy],
    references: [users.id],
  }),
}));

// Donations table
export const donations = pgTable("donations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  status: text("status").notNull().default("pending"), // pending, succeeded, failed, cancelled
  paymentMethod: text("payment_method"),
  receiptUrl: text("receipt_url"),
  metadata: jsonb("metadata").$type<any>().default({}),
  donorId: uuid("donor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Donations relations
export const donationsRelations = relations(donations, ({ one }) => ({
  donor: one(users, {
    fields: [donations.donorId],
    references: [users.id],
  }),
}));

// Store Orders table
export const storeOrders = pgTable("store_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  shippingAddress: jsonb("shipping_address").notNull(),
  items: jsonb("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"), // pending, processing, shipped, delivered, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  fulfillmentStatus: text("fulfillment_status").notNull().default("pending"), // pending, processing, shipped, delivered
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  printfulOrderId: text("printful_order_id").unique(),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<any>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Store Orders relations
export const storeOrdersRelations = relations(storeOrders, ({ one }) => ({
  customer: one(users, {
    fields: [storeOrders.customerId],
    references: [users.id],
  }),
}));

// Member Onboarding Feedback
export const memberOnboarding = pgTable("member_onboarding", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // Personal Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  
  // Patient History
  wasPatient: boolean("was_patient").notNull().default(false),
  patientId: text("patient_id"),
  treatmentStartDate: date("treatment_start_date"),
  treatmentEndDate: date("treatment_end_date"),
  primaryCondition: text("primary_condition"),
  
  // Recovery Journey
  recoveryRating: integer("recovery_rating"),
  recoveryChallenges: text("recovery_challenges").array(),
  recoverySuccesses: text("recovery_successes").array(),
  recoveryJourney: text("recovery_journey"),
  
  // Service Feedback
  serviceRating: integer("service_rating"),
  staffRating: integer("staff_rating"),
  facilityRating: integer("facility_rating"),
  communicationRating: integer("communication_rating"),
  
  // Detailed Feedback
  whatWorkedWell: text("what_worked_well"),
  whatCouldBeImproved: text("what_could_be_improved"),
  recommendations: text("recommendations"),
  
  // Community Engagement
  interestedInEvents: boolean("interested_in_events").default(true),
  interestedInSupporting: boolean("interested_in_supporting").default(true),
  preferredContactMethod: text("preferred_contact_method").default("email"),
  additionalComments: text("additional_comments"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const memberOnboardingRelations = relations(memberOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [memberOnboarding.userId],
    references: [users.id],
  }),
}));

// Activity types enum
export const activityTypeEnum = pgEnum("activity_type", [
  "user_registered",
  "user_login",
  "appointment_created",
  "appointment_updated",
  "appointment_cancelled",
  "appointment_completed",
  "donation_made",
  "invoice_created",
  "invoice_paid",
  "message_sent",
  "clinical_note_created",
  "document_uploaded",
  "telehealth_session_started",
  "telehealth_session_ended",
  "quote_created",
  "quote_updated",
  "store_order_placed",
  "store_order_updated",
  "member_onboarding_completed",
  "system_notification"
]);

// Activities table for tracking user actions and system events
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Can be null for system activities
  type: activityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<any>().default({}), // Store additional data like amounts, IDs, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const oauthIntegrationsRelations = relations(oauthIntegrations, ({ one }) => ({
  user: one(users, {
    fields: [oauthIntegrations.userId],
    references: [users.id],
  }),
}));

export const telehealthSessionsRelations = relations(telehealthSessions, ({ one }) => ({
  appointment: one(appointments, {
    fields: [telehealthSessions.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [telehealthSessions.patientId],
    references: [patients.id],
  }),
  practitioner: one(practitioners, {
    fields: [telehealthSessions.practitionerId],
    references: [practitioners.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dateOfBirth: z.union([z.date(), z.string(), z.null()]).optional().transform((val) => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
});

export const insertPractitionerSchema = createInsertSchema(practitioners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  appointmentDate: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  appointmentId: z.string().uuid().optional().nullable(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  appointmentId: z.string().uuid().optional().nullable(),
  dueDate: z.union([z.date(), z.string(), z.null()]).optional().transform((val) => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  paidAt: z.union([z.date(), z.string(), z.null()]).optional().transform((val) => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  readAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTelehealthSessionSchema = createInsertSchema(telehealthSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sessionStartedAt: true,
  sessionEndedAt: true,
  practitionerJoinedAt: true,
  patientJoinedAt: true,
}).extend({
  appointmentId: z.string().uuid().optional().nullable(),
});

export const insertTelehealthAuditLogSchema = createInsertSchema(telehealthAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarSettingsSchema = createInsertSchema(calendarSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSettingsSchema = createInsertSchema(bookingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOAuthIntegrationSchema = createInsertSchema(oauthIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberOnboardingSchema = createInsertSchema(memberOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreOrderSchema = createInsertSchema(storeOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

// Public Booking User table (for guest bookings)
export const publicBookingUsers = pgTable("public_booking_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  message: text("message"),
  isGuest: boolean("is_guest").notNull().default(true), // Track if this is a guest booking
  userId: uuid("user_id").references(() => users.id), // Optional link to full user account
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Public Booking table
export const publicBookings = pgTable("public_bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingLink: text("booking_link").notNull(),
  practitionerId: uuid("practitioner_id").notNull().references(() => practitioners.id),
  publicBookingUserId: uuid("public_booking_user_id").references(() => publicBookingUsers.id),
  service: text("service").notNull().default("consultation"),
  appointmentDate: date("appointment_date").notNull(), // Date only (YYYY-mm-dd format)
  appointmentTime: time("appointment_time", { precision: 0 }).notNull(), // Time only (HH:MM format)
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertPublicBookingUserSchema = createInsertSchema(publicBookingUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPublicBookingSchema = createInsertSchema(publicBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Events schema
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Practitioner = typeof practitioners.$inferSelect;
export type InsertPractitioner = z.infer<typeof insertPractitionerSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type TelehealthSession = typeof telehealthSessions.$inferSelect;
export type InsertTelehealthSession = z.infer<typeof insertTelehealthSessionSchema>;
export type TelehealthAuditLog = typeof telehealthAuditLogs.$inferSelect;
export type InsertTelehealthAuditLog = z.infer<typeof insertTelehealthAuditLogSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type CalendarSettings = typeof calendarSettings.$inferSelect;
export type InsertCalendarSettings = z.infer<typeof insertCalendarSettingsSchema>;
export type BookingSettings = typeof bookingSettings.$inferSelect;
export type InsertBookingSettings = z.infer<typeof insertBookingSettingsSchema>;
export type OAuthIntegration = typeof oauthIntegrations.$inferSelect;
export type InsertOAuthIntegration = z.infer<typeof insertOAuthIntegrationSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type StoreOrder = typeof storeOrders.$inferSelect;
export type InsertStoreOrder = z.infer<typeof insertStoreOrderSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type PublicBookingUser = typeof publicBookingUsers.$inferSelect;
export type InsertPublicBookingUser = z.infer<typeof insertPublicBookingUserSchema>;
export type PublicBooking = typeof publicBookings.$inferSelect;
export type InsertPublicBooking = z.infer<typeof insertPublicBookingSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Additional types for API responses
export type PatientWithUser = Patient & { user: User };
export type PractitionerWithUser = Practitioner & { user: User };
export type AppointmentWithDetails = Appointment & {
  patient: PatientWithUser;
  practitioner: PractitionerWithUser;
  telehealthSession?: TelehealthSession;
};
export type MessageWithSender = Message & { sender: User; recipient: User };
export type DocumentWithUploader = Document & { uploadedBy: User };
export type TelehealthSessionWithDetails = TelehealthSession & {
  patient: PatientWithUser;
  practitioner: PractitionerWithUser;
  appointment: Appointment | null;
};
export type QuoteWithCreator = Quote & { creator: User | null };
export type DonationWithDonor = Donation & { donor: User | null };
export type StoreOrderWithCustomer = StoreOrder & { customer: User | null };
export type MemberOnboarding = typeof memberOnboarding.$inferSelect;
export type InsertMemberOnboarding = z.infer<typeof insertMemberOnboardingSchema>;
export type MemberOnboardingWithUser = MemberOnboarding & { user: User };
export type ActivityWithUser = Activity & { user: User | null };

// Re-export notification schemas
export * from "./notification-schema";
