import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './db';
import { storage } from './storage';
import { practitioners, patients, users as usersTable } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function createUserIfNotExists(userData: any) {
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, userData.email));

  if (existingUser) {
    console.log(`⚠️ User ${userData.email} already exists, skipping...`);
    return existingUser;
  }

  const user = await storage.createUser(userData);
  console.log(`✅ User created: ${user.email}`);
  return user;
}

async function main() {
  try {
    console.log('Starting simple seed...');
    
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Create Admin User
    console.log('Creating admin user...');
    const adminUser = await createUserIfNotExists({
      email: 'admin@tinhih.org',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      phone: '+1-555-000-0001',
      isActive: true,
    } as any);

    // Create Staff User
    console.log('Creating staff user...');
    const staffUser = await createUserIfNotExists({
      email: 'staff@tinhih.org',
      password: hashedPassword,
      firstName: 'Staff',
      lastName: 'User',
      role: 'staff',
      phone: '+1-555-000-0002',
      isActive: true,
    } as any);

    // Create Practitioner User
    console.log('Creating practitioner user...');
    const practitionerUser = await createUserIfNotExists({
      email: 'practitioner@tinhih.org',
      password: hashedPassword,
      firstName: 'Dr. John',
      lastName: 'Smith',
      role: 'practitioner',
      phone: '+1-555-000-0003',
      isActive: true,
    } as any);

    // Create Practitioner Profile (if doesn't exist)
    const [existingPractitioner] = await db
      .select()
      .from(practitioners)
      .where(eq(practitioners.userId, practitionerUser.id));

    if (!existingPractitioner) {
      const practitioner = await storage.createPractitioner({
        userId: practitionerUser.id,
        licenseNumber: 'MD123456',
        specialty: 'Primary Care',
        qualifications: ['MD', 'Board Certified'],
        bio: 'Experienced primary care physician with over 10 years of practice.',
        consultationFee: 150.00,
      } as any);
      console.log('✅ Practitioner profile created');
    } else {
      console.log('⚠️ Practitioner profile already exists, skipping...');
    }

    // Create Patient User
    console.log('Creating patient user...');
    const patientUser = await createUserIfNotExists({
      email: 'patient@tinhih.org',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'patient',
      phone: '+1-555-000-0004',
      isActive: true,
    } as any);

    // Create Patient Profile (if doesn't exist)
    const [existingPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, patientUser.id));

    if (!existingPatient) {
      const patient = await storage.createPatient({
        userId: patientUser.id,
        dateOfBirth: new Date('1990-01-15'),
        gender: 'Female',
        address: '123 Main St, Anytown, USA',
        emergencyContact: 'John Doe',
        emergencyPhone: '+1-555-000-0005',
        insuranceProvider: 'Blue Cross Blue Shield',
        insuranceNumber: 'BCBS123456789',
        medicalHistory: ['Hypertension', 'Diabetes Type 2'],
        allergies: ['Penicillin'],
        medications: ['Metformin', 'Lisinopril'],
      } as any);
      console.log('✅ Patient profile created');
    } else {
      console.log('⚠️ Patient profile already exists, skipping...');
    }

    // Create Member User
    console.log('Creating member user...');
    const memberUser = await createUserIfNotExists({
      email: 'member@tinhih.org',
      password: hashedPassword,
      firstName: 'Community',
      lastName: 'Member',
      role: 'member',
      phone: '+1-555-000-0006',
      isActive: true,
    } as any);
    console.log('✅ Member user created');

    console.log('\n🎉 Simple seeding completed successfully!');
    console.log('\nAvailable users:');
    console.log('👨‍💼 Admin: admin@tinhih.org (password: test123)');
    console.log('👨‍💼 Staff: staff@tinhih.org (password: test123)');
    console.log('👨‍⚕️ Practitioner: practitioner@tinhih.org (password: test123)');
    console.log('👤 Patient: patient@tinhih.org (password: test123)');
    console.log('👥 Member: member@tinhih.org (password: test123)');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

main();
