import { db } from "./db";
import { eq, desc, and, or, like, count, sum, gte, lte, sql, ilike, asc, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { 
  users, patients, practitioners, appointments, clinicalNotes, invoices, messages, telehealthSessions,
  systemSettings, userPreferences, calendarSettings, bookingSettings, oauthIntegrations
} from "@shared/schema";
import type {
  ClinicalNote, InsertClinicalNote, Invoice, InsertInvoice,
  Message, InsertMessage, TelehealthSession, InsertTelehealthSession,
  SystemSettings, InsertSystemSettings, UserPreferences, InsertUserPreferences,
  CalendarSettings, InsertCalendarSettings, BookingSettings, InsertBookingSettings,
  User, InsertUser, Patient, InsertPatient, Practitioner, InsertPractitioner,
  Appointment, InsertAppointment, PatientWithUser, PractitionerWithUser, AppointmentWithDetails,
  InvoiceWithDetails, MessageWithSender, TelehealthSessionWithDetails
} from "@shared/schema";

// Enhanced types for Recovery Notes with related data
export type ClinicalNoteWithDetails = ClinicalNote & {
  patient: PatientWithUser | null;
  practitioner: PractitionerWithUser | null;
  appointment: Appointment | null;
};

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithDetails(id: string): Promise<any>;
  getAllUsers(): Promise<any[]>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Patient methods
  getPatients(search?: string, limit?: number, offset?: number): Promise<PatientWithUser[]>;
  getPatientsByPractitioner(practitionerId: string, search?: string, limit?: number, offset?: number): Promise<PatientWithUser[]>;
  getPatient(id: string): Promise<PatientWithUser | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  createPatient(insertPatient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined>;

  // Practitioner methods
  getPractitioners(): Promise<PractitionerWithUser[]>;
  getPractitionerByUserId(userId: string): Promise<Practitioner | undefined>;
  getPractitionerById(id: string): Promise<Practitioner | undefined>;
  getPractitionerByIdWithUser(id: string): Promise<PractitionerWithUser | undefined>;
  createPractitioner(insertPractitioner: InsertPractitioner): Promise<Practitioner>;
  updatePractitioner(id: string, updates: Partial<Practitioner>): Promise<Practitioner | undefined>;

  // Appointment methods
  getAppointments(practitionerId?: string, patientId?: string): Promise<AppointmentWithDetails[]>;
  getAppointmentsByPractitionerIds(practitionerIds: string[], patientId?: string): Promise<AppointmentWithDetails[]>;
  getAppointmentsByPatientId(patientId: string): Promise<AppointmentWithDetails[]>;
  getAllAppointments(patientId?: string): Promise<AppointmentWithDetails[]>;
  getAppointment(id: string): Promise<AppointmentWithDetails | undefined>;
  getTodayAppointments(practitionerId: string): Promise<AppointmentWithDetails[]>;
  createAppointment(insertAppointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Recovery Notes methods
  getClinicalNotes(patientId?: string, practitionerId?: string): Promise<ClinicalNoteWithDetails[]>;
  getClinicalNote(id: string): Promise<ClinicalNoteWithDetails | undefined>;
  createClinicalNote(insertNote: InsertClinicalNote): Promise<ClinicalNote>;
  updateClinicalNote(id: string, updates: Partial<ClinicalNote>): Promise<ClinicalNote | undefined>;

  // Invoice methods
  getInvoices(patientId?: string, practitionerId?: string): Promise<Invoice[]>;
  getInvoicesWithSearch(search?: string, status?: string, limit?: number, offset?: number): Promise<Invoice[]>;
  getInvoicesByPatientId(patientId: string, search?: string, status?: string, limit?: number, offset?: number): Promise<Invoice[]>;
  getInvoicesByPractitionerId(practitionerId: string, search?: string, status?: string, limit?: number, offset?: number): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(insertInvoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;

  // Message methods
  getMessage(id: string): Promise<MessageWithSender | undefined>;
  getMessages(userId: string): Promise<MessageWithSender[]>;
  getUnreadMessagesCount(userId: string): Promise<number>;
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<boolean>;
  markMessageAsDelivered(id: string): Promise<boolean>;
  bulkMarkMessagesAsRead(recipientId: string, senderId: string, appointmentId?: string): Promise<boolean>;

  // Telehealth Session methods
  getTelehealthSessions(practitionerId?: string, patientId?: string): Promise<TelehealthSessionWithDetails[]>;
  getTelehealthSession(id: string): Promise<TelehealthSessionWithDetails | undefined>;
  getTelehealthSessionByAppointmentId(appointmentId: string): Promise<TelehealthSession | undefined>;
  createTelehealthSession(insertSession: InsertTelehealthSession): Promise<TelehealthSession>;
  updateTelehealthSession(id: string, updates: Partial<TelehealthSession>): Promise<TelehealthSession | undefined>;
  startTelehealthSession(id: string): Promise<boolean>;

  // User Integration methods
  getUserIntegrations(userId: string): Promise<any[]>;
  createUserIntegration(integrationData: any): Promise<any>;
  deleteUserIntegration(id: string, userId: string): Promise<boolean>;
  joinTelehealthSession(id: string, isPatient: boolean): Promise<boolean>;
  endTelehealthSession(id: string): Promise<boolean>;
  
  // Additional methods for Google Calendar integration
  getPractitionerByEmail(email: string): Promise<PractitionerWithUser | undefined>;
  getOAuthIntegrationByProviderAndUserId(provider: string, userId: string): Promise<any | undefined>;

  // System Settings methods
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings | undefined>;
  createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings>;

  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Dashboard methods
  getDashboardStats(practitionerId: string): Promise<{
    totalPatients: number;
    todayAppointments: number;
    totalRevenue: number;
    paidRevenue: number;
    outstandingRevenue: number;
  }>;
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserWithDetails(id: string): Promise<any> {
    const [user] = await db
      .select({
        user: users,
        patient: patients,
        practitioner: practitioners,
      })
      .from(users)
      .leftJoin(patients, eq(users.id, patients.userId))
      .leftJoin(practitioners, eq(users.id, practitioners.userId))
      .where(eq(users.id, id));

    if (!user) return undefined;

    return {
      ...user.user,
      patient: user.patient,
      practitioner: user.practitioner,
    };
  }

  async getAllUsers(): Promise<any[]> {
    const result = await db
      .select({
        user: users,
        patient: patients,
        practitioner: practitioners,
      })
      .from(users)
      .leftJoin(patients, eq(users.id, patients.userId))
      .leftJoin(practitioners, eq(users.id, practitioners.userId))
      .orderBy(asc(users.firstName), asc(users.lastName));

    return result.map(row => ({
      ...row.user,
      patient: row.patient,
      practitioner: row.practitioner,
    }));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getPatients(search?: string, limit: number = 50, offset: number = 0): Promise<PatientWithUser[]> {
    let query = db
      .select()
      .from(patients)
      .leftJoin(users, eq(patients.userId, users.id))
      .limit(limit)
      .offset(offset);

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      
      query = query.where(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.phone, searchTerm),
          ilike(patients.insuranceProvider, searchTerm),
          ilike(patients.insuranceNumber, searchTerm)
        )
      );
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.patients,
      user: row.users!
    }));
  }

  async getPatientsByPractitioner(practitionerId: string, search?: string, limit: number = 50, offset: number = 0): Promise<PatientWithUser[]> {
    // Get unique patients who have appointments with this practitioner
    let query = db
      .selectDistinct({
        patient: patients,
        user: users
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(users, eq(patients.userId, users.id))
      .where(eq(appointments.practitionerId, practitionerId))
      .orderBy(patients.id) // Ensure consistent ordering for DISTINCT
      .limit(limit)
      .offset(offset);

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      
      query = query.where(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.phone, searchTerm),
          ilike(patients.insuranceProvider, searchTerm),
          ilike(patients.insuranceNumber, searchTerm)
        )
      );
    }

    const result = await query;
    
    // Additional deduplication by patient ID to ensure uniqueness
    const uniquePatients = new Map();
    result.forEach(row => {
      if (!uniquePatients.has(row.patient.id)) {
        uniquePatients.set(row.patient.id, {
          ...row.patient,
          user: row.user!
        });
      }
    });
    
    return Array.from(uniquePatients.values());
  }

  async getPatient(id: string): Promise<PatientWithUser | undefined> {
    const [result] = await db
      .select()
      .from(patients)
      .leftJoin(users, eq(patients.userId, users.id))
      .where(eq(patients.id, id));
    
    if (!result) return undefined;
    return {
      ...result.patients,
      user: result.users!
    };
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, userId));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values([insertPatient])
      .returning();
    return patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient || undefined;
  }

  async getPractitioners(): Promise<PractitionerWithUser[]> {
    return await db
      .select()
      .from(practitioners)
      .leftJoin(users, eq(practitioners.userId, users.id))
      .leftJoin(calendarSettings, eq(practitioners.id, calendarSettings.practitionerId))
      .then(rows => rows.map(row => ({
        ...row.practitioners,
        user: row.users!
      })));
  }

  async getPractitionerByUserId(userId: string): Promise<Practitioner | undefined> {
    const [practitioner] = await db.select().from(practitioners).where(eq(practitioners.userId, userId));
    return practitioner || undefined;
  }

  async getPractitionerById(id: string): Promise<Practitioner | undefined> {
    const [practitioner] = await db.select().from(practitioners).where(eq(practitioners.id, id));
    return practitioner || undefined;
  }

  async getPractitionerByIdWithUser(id: string): Promise<PractitionerWithUser | undefined> {
    const [result] = await db
      .select()
      .from(practitioners)
      .leftJoin(users, eq(practitioners.userId, users.id))
      .where(eq(practitioners.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.practitioners,
      user: result.users!
    };
  }

  async createPractitioner(insertPractitioner: InsertPractitioner): Promise<Practitioner> {
    const [practitioner] = await db
      .insert(practitioners)
      .values([insertPractitioner])
      .returning();
    return practitioner;
  }

  async updatePractitioner(id: string, updates: Partial<Practitioner>): Promise<Practitioner | undefined> {
    const [practitioner] = await db
      .update(practitioners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(practitioners.id, id))
      .returning();
    return practitioner || undefined;
  }

  async getAppointments(practitionerId?: string, patientId?: string): Promise<AppointmentWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    let query = db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(appointments.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .orderBy(desc(appointments.appointmentDate));

    if (practitionerId) {
      query = query.where(eq(appointments.practitionerId, practitionerId)) as any;
    }
    if (patientId) {
      query = query.where(eq(appointments.patientId, patientId)) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.appointments,
      patient: row.patients ? {
        ...row.patients,
        user: row.patientUsers ? {
          ...row.patientUsers,
          firstName: row.patientUsers.firstName,
          lastName: row.patientUsers.lastName
        } : null
      } : null,
      practitioner: row.practitioners ? {
        ...row.practitioners,
        user: row.practitionerUsers ? {
          ...row.practitionerUsers,
          firstName: row.practitionerUsers.firstName,
          lastName: row.practitionerUsers.lastName
        } : null
      } : null
    }));
  }

  async getAppointmentsByPractitionerIds(practitionerIds: string[], patientId?: string): Promise<AppointmentWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    let query = db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(appointments.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(inArray(appointments.practitionerId, practitionerIds))
      .orderBy(desc(appointments.appointmentDate));

    if (patientId) {
      query = query.where(eq(appointments.patientId, patientId)) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.appointments,
      patient: row.patients ? {
        ...row.patients,
        user: row.patientUsers ? {
          ...row.patientUsers,
          firstName: row.patientUsers.firstName,
          lastName: row.patientUsers.lastName
        } : null
      } : null,
      practitioner: row.practitioners ? {
        ...row.practitioners,
        user: row.practitionerUsers ? {
          ...row.practitionerUsers,
          firstName: row.practitionerUsers.firstName,
          lastName: row.practitionerUsers.lastName
        } : null
      } : null
    }));
  }

  async getAppointmentsByPatientId(patientId: string): Promise<AppointmentWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    const result = await db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(appointments.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate));
    
    return result.map(row => ({
      ...row.appointments,
      patient: row.patients ? {
        ...row.patients,
        user: row.patientUsers ? {
          ...row.patientUsers,
          firstName: row.patientUsers.firstName,
          lastName: row.patientUsers.lastName
        } : null
      } : null,
      practitioner: row.practitioners ? {
        ...row.practitioners,
        user: row.practitionerUsers ? {
          ...row.practitionerUsers,
          firstName: row.practitionerUsers.firstName,
          lastName: row.practitionerUsers.lastName
        } : null
      } : null
    }));
  }

  async getAllAppointments(patientId?: string): Promise<AppointmentWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    let query = db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(appointments.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .orderBy(desc(appointments.appointmentDate));

    if (patientId) {
      query = query.where(eq(appointments.patientId, patientId)) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.appointments,
      patient: row.patients ? {
        ...row.patients,
        user: row.patientUsers ? {
          ...row.patientUsers,
          firstName: row.patientUsers.firstName,
          lastName: row.patientUsers.lastName
        } : null
      } : null,
      practitioner: row.practitioners ? {
        ...row.practitioners,
        user: row.practitionerUsers ? {
          ...row.practitionerUsers,
          firstName: row.practitionerUsers.firstName,
          lastName: row.practitionerUsers.lastName
        } : null
      } : null
    }));
  }

  async getAppointment(id: string): Promise<AppointmentWithDetails | undefined> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    const [result] = await db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(appointments.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(eq(appointments.id, id));

    if (!result) return undefined;
    return {
      ...result.appointments,
      patient: result.patients ? {
        ...result.patients,
        user: result.patientUsers ? {
          ...result.patientUsers,
          firstName: result.patientUsers.firstName,
          lastName: result.patientUsers.lastName
        } : null
      } : null,
      practitioner: result.practitioners ? {
        ...result.practitioners,
        user: result.practitionerUsers ? {
          ...result.practitionerUsers,
          firstName: result.practitionerUsers.firstName,
          lastName: result.practitionerUsers.lastName
        } : null
      } : null
    };
  }

  async getTodayAppointments(practitionerId: string): Promise<AppointmentWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const result = await db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(appointments.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(
        and(
          eq(appointments.practitionerId, practitionerId),
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        )
      )
      .orderBy(appointments.appointmentDate);

    return result.map(row => ({
      ...row.appointments,
      patient: row.patients ? {
        ...row.patients,
        user: row.patientUsers ? {
          ...row.patientUsers,
          firstName: row.patientUsers.firstName,
          lastName: row.patientUsers.lastName
        } : null
      } : null,
      practitioner: row.practitioners ? {
        ...row.practitioners,
        user: row.practitionerUsers ? {
          ...row.practitionerUsers,
          firstName: row.practitionerUsers.firstName,
          lastName: row.practitionerUsers.lastName
        } : null
      } : null
    }));
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    console.log('Storage: Creating appointment with data:', insertAppointment);
    try {
      const [appointment] = await db
        .insert(appointments)
        .values(insertAppointment)
        .returning();
      console.log('Storage: Appointment created successfully:', appointment);
      return appointment;
    } catch (error) {
      console.error('Storage: Error creating appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(eq(appointments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getClinicalNotes(patientId?: string, practitionerId?: string): Promise<ClinicalNoteWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    let query = db
      .select({
        note: clinicalNotes,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers,
        appointment: appointments
      })
      .from(clinicalNotes)
      .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(clinicalNotes.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .leftJoin(appointments, eq(clinicalNotes.appointmentId, appointments.id))
      .orderBy(desc(clinicalNotes.createdAt));

    if (patientId) {
      query = query.where(eq(clinicalNotes.patientId, patientId)) as any;
    }
    if (practitionerId) {
      query = query.where(eq(clinicalNotes.practitionerId, practitionerId)) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.note,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null,
      appointment: row.appointment || null
    }));
  }

  async getClinicalNote(id: string): Promise<ClinicalNoteWithDetails | undefined> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    const result = await db
      .select({
        note: clinicalNotes,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers,
        appointment: appointments
      })
      .from(clinicalNotes)
      .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(clinicalNotes.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .leftJoin(appointments, eq(clinicalNotes.appointmentId, appointments.id))
      .where(eq(clinicalNotes.id, id));

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    return {
      ...row.note,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null,
      appointment: row.appointment || null
    };
  }

  async createClinicalNote(insertNote: InsertClinicalNote): Promise<ClinicalNote> {
    const [note] = await db
      .insert(clinicalNotes)
      .values(insertNote)
      .returning();
    return note;
  }

  async updateClinicalNote(id: string, updates: Partial<ClinicalNote>): Promise<ClinicalNote | undefined> {
    const [note] = await db
      .update(clinicalNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clinicalNotes.id, id))
      .returning();
    return note || undefined;
  }

  async getInvoices(patientId?: string, practitionerId?: string): Promise<Invoice[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    let query = db
      .select({
        invoice: invoices,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(invoices.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .orderBy(desc(invoices.createdAt));

    if (patientId) {
      query = query.where(eq(invoices.patientId, patientId)) as any;
    }
    if (practitionerId) {
      query = query.where(eq(invoices.practitionerId, practitionerId)) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.invoice,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null
    }));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    const result = await db
      .select({
        invoice: invoices,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(invoices.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(eq(invoices.id, id));

    if (!result[0]) return undefined;

    const row = result[0];
    return {
      ...row.invoice,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null
    } as any;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async getInvoicesWithSearch(search?: string, status?: string, limit: number = 50, offset: number = 0): Promise<Invoice[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    console.log("getInvoicesWithSearch called with:", { search, status, limit, offset });
    
    let query = db
      .select({
        invoice: invoices,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(invoices.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const conditions = [];

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, searchTerm),
          ilike(invoices.description, searchTerm)
        )!
      );
    }

    // Add status filter if provided
    if (status && status !== "all") {
      console.log("Filtering by status:", status);
      conditions.push(eq(invoices.status, status as any));
    } else {
      console.log("No status filter applied, showing all invoices");
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    console.log("Query result count:", result.length);
    
    return result.map(row => ({
      ...row.invoice,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null
    }));
  }

  async getInvoicesByPatientId(patientId: string, search?: string, status?: string, limit: number = 50, offset: number = 0): Promise<Invoice[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    let query = db
      .select({
        invoice: invoices,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(invoices.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(eq(invoices.patientId, patientId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const conditions = [eq(invoices.patientId, patientId)];

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, searchTerm),
          ilike(invoices.description, searchTerm)
        )!
      );
    }

    // Add status filter if provided
    if (status && status !== "all") {
      conditions.push(eq(invoices.status, status as any));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions.slice(1))) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.invoice,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null
    }));
  }

  async getInvoicesByPractitionerId(practitionerId: string, search?: string, status?: string, limit: number = 50, offset: number = 0): Promise<Invoice[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    console.log("getInvoicesByPractitionerId called with:", { practitionerId, search, status, limit, offset });
    
    const conditions = [eq(invoices.practitionerId, practitionerId)];

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, searchTerm),
          ilike(invoices.description, searchTerm)
        )!
      );
    }

    // Add status filter if provided
    if (status && status !== "all") {
      conditions.push(eq(invoices.status, status as any));
    }

    const query = db
      .select({
        invoice: invoices,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(invoices.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const result = await query;
    
    return result.map(row => ({
      ...row.invoice,
      patient: row.patient ? {
        ...row.patient,
        user: row.patientUser ? {
          ...row.patientUser,
          firstName: row.patientUser.firstName,
          lastName: row.patientUser.lastName
        } : null
      } : null,
      practitioner: row.practitioner ? {
        ...row.practitioner,
        user: row.practitionerUser ? {
          ...row.practitionerUser,
          firstName: row.practitionerUser.firstName,
          lastName: row.practitionerUser.lastName
        } : null
      } : null
    }));
  }

  async getMessage(id: string): Promise<MessageWithSender | undefined> {
    const senderUsers = alias(users, 'senderUsers');
    const recipientUsers = alias(users, 'recipientUsers');
    
    const [result] = await db
      .select({
        message: messages,
        sender: senderUsers,
        recipient: recipientUsers,
        appointment: appointments
      })
      .from(messages)
      .leftJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .leftJoin(recipientUsers, eq(messages.recipientId, recipientUsers.id))
      .leftJoin(appointments, eq(messages.appointmentId, appointments.id))
      .where(eq(messages.id, id));

    if (!result) return undefined;

    return {
      ...result.message,
      sender: result.sender ? {
        ...result.sender,
        firstName: result.sender.firstName,
        lastName: result.sender.lastName
      } : null,
      recipient: result.recipient ? {
        ...result.recipient,
        firstName: result.recipient.firstName,
        lastName: result.recipient.lastName
      } : null,
      appointment: result.appointment
    };
  }

  async getMessages(userId: string, options?: {
    limit?: number;
    offset?: number;
    messageType?: string;
    appointmentId?: string;
    status?: string;
  }): Promise<MessageWithSender[]> {
    const { limit = 50, offset = 0, messageType, appointmentId, status } = options || {};
    
    const senderUsers = alias(users, 'senderUsers');
    const recipientUsers = alias(users, 'recipientUsers');
    
    let query = db
      .select({
        message: messages,
        sender: senderUsers,
        recipient: recipientUsers,
        appointment: appointments
      })
      .from(messages)
      .leftJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .leftJoin(recipientUsers, eq(messages.recipientId, recipientUsers.id))
      .leftJoin(appointments, eq(messages.appointmentId, appointments.id))
      .where(
        or(
          eq(messages.recipientId, userId),
          eq(messages.senderId, userId)
        )
      );

    // Apply filters
    if (messageType) {
      query = query.where(eq(messages.messageType, messageType as any));
    }
    if (appointmentId) {
      query = query.where(eq(messages.appointmentId, appointmentId));
    }
    if (status) {
      query = query.where(eq(messages.status, status as any));
    }

    return await query
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset)
      .then(rows => rows.map(row => ({
        ...row.message,
        sender: row.sender ? {
          ...row.sender,
          firstName: row.sender.firstName,
          lastName: row.sender.lastName
        } : null,
        recipient: row.recipient ? {
          ...row.recipient,
          firstName: row.recipient.firstName,
          lastName: row.recipient.lastName
        } : null,
        appointment: row.appointment
      })));
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.status, "unread")
        )
      );
    return result.count;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // ALWAYS use UTC timestamp regardless of server timezone
    const utcNow = new Date();
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        createdAt: utcNow // Use Date object directly
      })
      .returning();
    
    return message;
  }

  async markMessageAsRead(id: string): Promise<boolean> {
    const result = await db
      .update(messages)
      .set({ 
        status: "read", 
        readAt: new Date(), // Use Date object, not ISO string
        deliveryStatus: "read",
        deliveredAt: new Date()
      })
      .where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markMessageAsDelivered(id: string): Promise<boolean> {
    const result = await db
      .update(messages)
      .set({ 
        deliveryStatus: "delivered",
        deliveredAt: new Date()
      })
      .where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async bulkMarkMessagesAsRead(recipientId: string, senderId: string, appointmentId?: string): Promise<boolean> {
    const conditions = [
      eq(messages.recipientId, recipientId),
      eq(messages.senderId, senderId),
      eq(messages.status, "unread")
    ];

    // If appointmentId is provided, only mark messages for that appointment
    if (appointmentId) {
      conditions.push(eq(messages.appointmentId, appointmentId));
    } else {
      // If no appointmentId, only mark general messages (no appointmentId)
      conditions.push(isNull(messages.appointmentId));
    }

    const result = await db
      .update(messages)
      .set({ 
        status: "read", 
        readAt: new Date(),
        deliveryStatus: "read",
        deliveredAt: new Date()
      })
      .where(and(...conditions));
    
    return (result.rowCount ?? 0) > 0;
  }

  async getMessagesByAppointment(appointmentId: string): Promise<MessageWithSender[]> {
    const senderUsers = alias(users, 'senderUsers');
    const recipientUsers = alias(users, 'recipientUsers');
    
    return await db
      .select({
        message: messages,
        sender: senderUsers,
        recipient: recipientUsers,
        appointment: appointments
      })
      .from(messages)
      .leftJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .leftJoin(recipientUsers, eq(messages.recipientId, recipientUsers.id))
      .leftJoin(appointments, eq(messages.appointmentId, appointments.id))
      .where(eq(messages.appointmentId, appointmentId))
      .orderBy(asc(messages.createdAt))
      .then(rows => rows.map(row => ({
        ...row.message,
        sender: row.sender ? {
          ...row.sender,
          firstName: row.sender.firstName,
          lastName: row.sender.lastName
        } : null,
        recipient: row.recipient ? {
          ...row.recipient,
          firstName: row.recipient.firstName,
          lastName: row.recipient.lastName
        } : null,
        appointment: row.appointment
      })));
  }

  async getConversation(userId1: string, userId2: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<MessageWithSender[]> {
    const { limit = 50, offset = 0 } = options || {};
    
    return await db
      .select({
        message: messages,
        sender: users,
        recipient: users,
        appointment: appointments
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .leftJoin(appointments, eq(messages.appointmentId, appointments.id))
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset)
      .then(rows => rows.map(row => ({
        ...row.message,
        sender: row.sender!,
        recipient: row.recipient!,
        appointment: row.appointment
      })));
  }

  async createSystemMessage(data: {
    recipientId: string;
    subject: string;
    content: string;
    messageType: string;
    appointmentId?: string;
    priority?: string;
    metadata?: any;
  }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...data,
        senderId: '00000000-0000-0000-0000-000000000000', // System user ID
        isSystemMessage: true,
        priority: data.priority || 'normal',
        metadata: data.metadata || {}
      })
      .returning();
    return message;
  }

  async getDashboardStats(practitionerId: string): Promise<{
    totalPatients: number;
    todayAppointments: number;
    totalRevenue: number;
    paidRevenue: number;
    outstandingRevenue: number;
  }> {
    // Get total patients count for this practitioner
    const [patientsCount] = await db
      .select({ count: count() })
      .from(patients)
      .where(eq(patients.practitionerId, practitionerId));

    // Get today's appointments
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [todayCount] = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.practitionerId, practitionerId),
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        )
      );

    // Get total revenue
    const [totalRevenueResult] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)::text` 
      })
      .from(invoices)
      .where(eq(invoices.practitionerId, practitionerId));

    // Get paid revenue
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

    return {
      totalPatients: patientsCount.count,
      todayAppointments: todayCount.count,
      totalRevenue: totalRevenue,
      paidRevenue: paidRevenue,
      outstandingRevenue: outstandingRevenue,
    };
  }

  // Practitioner Activities methods
  async getPractitionerActivities(practitionerId: string): Promise<any[]> {
    try {
      // Get recent appointments for this practitioner
      const recentAppointments = await db
        .select({
          id: appointments.id,
          type: sql<string>`'appointment'`,
          title: appointments.title,
          description: sql<string>`CONCAT('Appointment with ', p.first_name, ' ', p.last_name)`,
          createdAt: appointments.createdAt,
          status: appointments.status
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(users, eq(patients.userId, users.id))
        .where(eq(appointments.practitionerId, practitionerId))
        .orderBy(desc(appointments.createdAt))
        .limit(10);

      // Get recent Recovery Notes for this practitioner
      const recentNotes = await db
        .select({
          id: clinicalNotes.id,
          type: sql<string>`'clinical_note'`,
          title: sql<string>`'Clinical Note Updated'`,
          description: sql<string>`CONCAT('SOAP notes for ', p.first_name, ' ', p.last_name)`,
          createdAt: clinicalNotes.createdAt,
          status: sql<string>`'completed'`
        })
        .from(clinicalNotes)
        .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
        .leftJoin(users, eq(patients.userId, users.id))
        .where(eq(clinicalNotes.practitionerId, practitionerId))
        .orderBy(desc(clinicalNotes.createdAt))
        .limit(10);

      // Get recent invoices for this practitioner
      const recentInvoices = await db
        .select({
          id: invoices.id,
          type: sql<string>`'invoice'`,
          title: sql<string>`'Invoice Created'`,
          description: sql<string>`CONCAT('Invoice #', invoices.invoice_number, ' for ', p.first_name, ' ', p.last_name)`,
          createdAt: invoices.createdAt,
          status: invoices.status
        })
        .from(invoices)
        .leftJoin(patients, eq(invoices.patientId, patients.id))
        .leftJoin(users, eq(patients.userId, users.id))
        .where(eq(invoices.practitionerId, practitionerId))
        .orderBy(desc(invoices.createdAt))
        .limit(10);

      // Combine and sort all activities by creation date
      const allActivities = [
        ...recentAppointments.map(apt => ({ ...apt, alias: 'p' })),
        ...recentNotes.map(note => ({ ...note, alias: 'p' })),
        ...recentInvoices.map(inv => ({ ...inv, alias: 'p' }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return allActivities.slice(0, 15); // Return top 15 most recent activities
    } catch (error) {
      console.error("Error fetching practitioner activities:", error);
      return [];
    }
  }

  // Calendar Settings methods
  async getCalendarSettings(practitionerId?: string): Promise<CalendarSettings | undefined> {
    if (!practitionerId) {
      return this.getGlobalCalendarSettings();
    }
    
    const [settings] = await db
      .select()
      .from(calendarSettings)
      .where(eq(calendarSettings.practitionerId, practitionerId));
    
    return settings || undefined;
  }

  async getGlobalCalendarSettings(): Promise<CalendarSettings | undefined> {
    const [settings] = await db
      .select()
      .from(calendarSettings)
      .where(eq(calendarSettings.isGlobal, true));
    
    return settings || undefined;
  }

  async createCalendarSettings(insertSettings: InsertCalendarSettings): Promise<CalendarSettings> {
    const [settings] = await db
      .insert(calendarSettings)
      .values([insertSettings])
      .returning();
    
    return settings;
  }

  async updateCalendarSettings(id: string, updates: Partial<CalendarSettings>): Promise<CalendarSettings | undefined> {
    const [settings] = await db
      .update(calendarSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(calendarSettings.id, id))
      .returning();
    
    return settings || undefined;
  }

  // Telehealth Session methods
  async getTelehealthSessions(practitionerId?: string, patientId?: string): Promise<TelehealthSessionWithDetails[]> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    console.log("getTelehealthSessions called with:", { practitionerId, patientId });
    
    let query = db
      .select({
        session: telehealthSessions,
        appointment: appointments,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(telehealthSessions)
      .leftJoin(appointments, eq(telehealthSessions.appointmentId, appointments.id))
      .leftJoin(patients, eq(telehealthSessions.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(telehealthSessions.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .orderBy(desc(telehealthSessions.createdAt));

    const conditions = [];
    if (practitionerId) conditions.push(eq(telehealthSessions.practitionerId, practitionerId));
    if (patientId) conditions.push(eq(telehealthSessions.patientId, patientId));
    
    console.log("Applying conditions:", conditions.length > 0 ? "Yes" : "No");
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    console.log("Raw query result:", result.length, "sessions");
    
    return result.map(row => ({
      ...row.session,
      patient: {
        ...row.patient!,
        user: row.patientUser!
      },
      practitioner: {
        ...row.practitioner!,
        user: row.practitionerUser!
      },
      appointment: row.appointment || null
    }));
  }

  async getTelehealthSession(id: string): Promise<TelehealthSessionWithDetails | undefined> {
    const patientUsers = alias(users, 'patientUsers');
    const practitionerUsers = alias(users, 'practitionerUsers');
    
    const [result] = await db
      .select({
        session: telehealthSessions,
        appointment: appointments,
        patient: patients,
        patientUser: patientUsers,
        practitioner: practitioners,
        practitionerUser: practitionerUsers
      })
      .from(telehealthSessions)
      .leftJoin(appointments, eq(telehealthSessions.appointmentId, appointments.id))
      .leftJoin(patients, eq(telehealthSessions.patientId, patients.id))
      .leftJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .leftJoin(practitioners, eq(telehealthSessions.practitionerId, practitioners.id))
      .leftJoin(practitionerUsers, eq(practitioners.userId, practitionerUsers.id))
      .where(eq(telehealthSessions.id, id));

    if (!result) return undefined;
    
    return {
      ...result.session,
      patient: {
        ...result.patient!,
        user: result.patientUser!
      },
      practitioner: {
        ...result.practitioner!,
        user: result.practitionerUser!
      },
      appointment: result.appointment || null
    };
  }

  async getTelehealthSessionByAppointmentId(appointmentId: string): Promise<TelehealthSession | undefined> {
    const [session] = await db
      .select()
      .from(telehealthSessions)
      .where(eq(telehealthSessions.appointmentId, appointmentId));
    return session || undefined;
  }

  async createTelehealthSession(insertSession: InsertTelehealthSession): Promise<TelehealthSession> {
    const [session] = await db
      .insert(telehealthSessions)
      .values([insertSession])
      .returning();
    return session;
  }

  async updateTelehealthSession(id: string, updates: Partial<TelehealthSession>): Promise<TelehealthSession | undefined> {
    const [session] = await db
      .update(telehealthSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telehealthSessions.id, id))
      .returning();
    return session || undefined;
  }

  async startTelehealthSession(id: string): Promise<boolean> {
    const [updated] = await db
      .update(telehealthSessions)
      .set({ 
        status: "in_session", 
        sessionStartedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(telehealthSessions.id, id))
      .returning();
    return !!updated;
  }

  // User Integration methods
  async getUserIntegrations(userId: string): Promise<any[]> {
    const integrations = await db
      .select()
      .from(oauthIntegrations)
      .where(eq(oauthIntegrations.userId, userId))
      .where(eq(oauthIntegrations.isActive, true));
    
    return integrations;
  }

  async createUserIntegration(integrationData: any): Promise<any> {
    const [integration] = await db
      .insert(oauthIntegrations)
      .values({
        userId: integrationData.userId,
        provider: integrationData.provider,
        accessToken: integrationData.accessToken,
        refreshToken: integrationData.refreshToken,
        tokenExpiry: integrationData.tokenExpiry,
        scope: integrationData.scope,
        providerUserId: integrationData.providerUserId,
        providerEmail: integrationData.providerEmail,
        providerName: integrationData.providerName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return integration;
  }

  async deleteUserIntegration(id: string, userId: string): Promise<boolean> {
    const [integration] = await db
      .update(oauthIntegrations)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(oauthIntegrations.id, id))
      .where(eq(oauthIntegrations.userId, userId))
      .returning();
    
    return !!integration;
  }

  async joinTelehealthSession(id: string, isPatient: boolean): Promise<boolean> {
    const updateField = isPatient ? "patientJoinedAt" : "practitionerJoinedAt";
    const [updated] = await db
      .update(telehealthSessions)
      .set({ 
        [updateField]: new Date(),
        status: "in_session", // Changed from "waiting_room" to "in_session"
        sessionStartedAt: new Date(), // Auto-start the session
        updatedAt: new Date() 
      })
      .where(eq(telehealthSessions.id, id))
      .returning();
    
    // Check if both participants have joined and auto-start the session
    if (updated) {
      const session = await this.getTelehealthSession(id);
      if (session && session.patientJoinedAt && session.practitionerJoinedAt) {
        console.log(`Both participants joined session ${id}, auto-starting session`);
        await this.startTelehealthSession(id);
      }
    }
    
    return !!updated;
  }

  async endTelehealthSession(id: string): Promise<boolean> {
    const [updated] = await db
      .update(telehealthSessions)
      .set({ 
        status: "completed", 
        sessionEndedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(telehealthSessions.id, id))
      .returning();
    return !!updated;
  }

  // Additional methods for Google Calendar integration
  async getPractitionerByEmail(email: string): Promise<PractitionerWithUser | undefined> {
    const [practitioner] = await db
      .select()
      .from(practitioners)
      .innerJoin(users, eq(practitioners.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);
    
    if (!practitioner) return undefined;
    
    return {
      ...practitioner.practitioners,
      user: practitioner.users
    };
  }

  async getOAuthIntegrationByProviderAndUserId(provider: string, userId: string): Promise<any | undefined> {
    const [integration] = await db
      .select()
      .from(oauthIntegrations)
      .where(eq(oauthIntegrations.provider, provider))
      .where(eq(oauthIntegrations.userId, userId))
      .where(eq(oauthIntegrations.isActive, true))
      .limit(1);
    
    return integration;
  }

  // System Settings methods
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await db
      .select()
      .from(systemSettings)
      .limit(1);
    return settings || undefined;
  }

  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings | undefined> {
    const [settings] = await db
      .update(systemSettings)
      .set({ ...updates, updatedAt: new Date() })
      .returning();
    return settings || undefined;
  }

  async createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings> {
    const [newSettings] = await db
      .insert(systemSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences || undefined;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return preferences || undefined;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [newPreferences] = await db
      .insert(userPreferences)
      .values(preferences)
      .returning();
    return newPreferences;
  }
}

export const storage = new DatabaseStorage();