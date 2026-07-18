import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Route handler to handle the OAuth / Email Verification Code exchange.
 * Exposes an endpoint that Supabase Auth redirects to when a user verifies their email or logs in via OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = new URL(next, origin);
      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  // Redirect to login with error details if verification fails
  const errorRedirect = new URL('/login', origin);
  errorRedirect.searchParams.set('error', 'Auth exchange code failed. Link may have expired.');
  return NextResponse.redirect(errorRedirect.toString());
}
