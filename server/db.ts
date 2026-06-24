import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = postgres(process.env.DATABASE_URL, {
  // Force UTC timezone for all database operations
  connection: {
    timezone: 'UTC'
  },
  // Set timezone for all queries
  onnotice: (notice) => {
    console.log('Database notice:', notice);
  }
});

// Set timezone for the database connection
client`SET timezone = 'UTC'`.then(() => {
  console.log('🗄️ Database timezone set to UTC');
}).catch(console.error);
export const db = drizzle(client, { schema });