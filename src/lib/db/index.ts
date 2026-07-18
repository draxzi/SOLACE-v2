import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Gracefully handle undefined database URL during build/dev initialization checks
  console.warn('Warning: DATABASE_URL is not defined in the environment variables.');
}

// In Next.js Server Components, we want a single/reusable client connection.
// For Supabase, set prepare: false to ensure compatibility with connection pooling (e.g., PgBouncer).
const client = postgres(connectionString || '', { prepare: false });

export const db = drizzle(client, { schema });
export * from './schema';
