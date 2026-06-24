import 'dotenv/config';
import { db } from './db.js';
import { appointments, patients, practitioners, users } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

async function createSampleAppointments() {
  try {
    console.log('Creating sample appointments for telehealth testing...');

    // Get existing patients and practitioners
    const [patientUser] = await db.select().from(users).where(eq(users.role, 'patient')).limit(1);
    const [practitionerUser] = await db.select().from(users).where(eq(users.role, 'practitioner')).limit(1);

    if (!patientUser || !practitionerUser) {
      console.log('No patient or practitioner users found. Creating them first...');
      return;
    }

    const [patient] = await db.select().from(patients).where(eq(patients.userId, patientUser.id)).limit(1);
    const [practitioner] = await db.select().from(practitioners).where(eq(practitioners.userId, practitionerUser.id)).limit(1);

    if (!patient || !practitioner) {
      console.log('No patient or practitioner records found. Creating them first...');
      return;
    }

    // Create future appointments for telehealth testing
    const futureDates = [
      new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    ];

    for (let i = 0; i < futureDates.length; i++) {
      const appointmentDate = futureDates[i];
      
      // Check if appointment already exists
      const existingAppointment = await db.select()
        .from(appointments)
        .where(eq(appointments.patientId, patient.id))
        .where(eq(appointments.practitionerId, practitioner.id))
        .where(eq(appointments.appointmentDate, appointmentDate));

      if (existingAppointment.length === 0) {
        await db.insert(appointments).values({
          patientId: patient.id,
          practitionerId: practitioner.id,
          title: `Telehealth Consultation ${i + 1}`,
          description: `Sample telehealth appointment for testing - Session ${i + 1}`,
          appointmentDate: appointmentDate,
          duration: 30,
          type: 'consultation',
          location: 'telehealth',
          status: 'scheduled',
          notes: 'Sample appointment for telehealth testing'
        });

        console.log(`Created appointment for ${appointmentDate.toLocaleDateString()}`);
      } else {
        console.log(`Appointment already exists for ${appointmentDate.toLocaleDateString()}`);
      }
    }

    console.log('Sample appointments created successfully!');
    console.log('\nYou can now test the telehealth functionality:');
    console.log('1. Go to the Telehealth page');
    console.log('2. Click "Schedule Session"');
    console.log('3. You should see the sample appointments in the dropdown');

  } catch (error) {
    console.error('Error creating sample appointments:', error);
  }
}

createSampleAppointments();
