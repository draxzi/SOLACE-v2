import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration file.
 * Tells Drizzle where to look for schemas and where to output migration SQL files.
 */
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
