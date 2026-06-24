import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './db';
import { storage } from './storage';
import { practitioners, users as usersTable } from '@shared/schema';
import { seedDummyData } from './seed-data';
import { eq } from 'drizzle-orm';

async function ensureDefaultPractitioner() {
  const [existingPractitioner] = await db.select().from(practitioners).limit(1);
  if (existingPractitioner) {
    return existingPractitioner;
  }

  const defaultEmail = 'practitioner@tinhih.org';
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, defaultEmail));

  let practitionerUser = existingUser;
  if (!practitionerUser) {
    const hashedPassword = await bcrypt.hash('practitioner123', 10);
    practitionerUser = await storage.createUser({
      email: defaultEmail,
      password: hashedPassword,
      firstName: 'Default',
      lastName: 'Practitioner',
      role: 'practitioner',
      phone: '+1-555-000-0000',
      isActive: true,
    } as any);
  }

  const practitioner = await storage.createPractitioner({
    userId: practitionerUser.id,
    specialty: 'Primary Care',
    qualifications: ['MD'],
    bio: 'Default practitioner for seeded data',
  } as any);

  return practitioner;
}

async function main() {
  try {
    console.log('Ensuring default practitioner exists...');
    await ensureDefaultPractitioner();
    console.log('Seeding dummy data (patients, appointments, notes, invoices)...');
    await seedDummyData();
    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

main();



