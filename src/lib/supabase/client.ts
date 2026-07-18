import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for browser-side (client component) usage.
 * It automatically reads the public URL and anon key from environment variables.
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
