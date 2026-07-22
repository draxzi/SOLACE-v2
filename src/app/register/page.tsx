'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, UserPlus, Loader2, AlertCircle, User as UserIcon, CheckCircle2 } from 'lucide-react';

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  const redirectTo = searchParams.get('redirectTo') || '/chat';

  useEffect(() => {
    if (user && !success) {
      router.push(redirectTo);
    }
  }, [user, router, redirectTo, success]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const redirectUrl = `${origin}/api/auth/callback`;

      // 1. Sign up the user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        // 2. Insert corresponding row into public profiles table
        // Drizzle schema maps this row. This handles fallback if database triggers are not configured.
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            name: name,
          });

        if (profileError) {
          console.warn('Profile sync warning during signup (might exist already):', profileError.message);
        }

        // 3. Refresh user profile context
        await refreshProfile();

        setSuccess(true);
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-2xl relative backdrop-blur-md">
      {/* Decorative top glowing accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(253,164,175,0.4)]" />

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary-glow text-primary border border-primary/20">
            <UserPlus size={24} />
          </div>
          <h2 className="text-2xl font-bold text-cream-warm">Create Account</h2>
          <p className="text-xs text-muted-foreground/65 font-light">Join Solace and design your companion</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-light">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span className="font-light">Registration successful! Redirecting you to home...</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground/80 tracking-wide" htmlFor="name">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground/50">
                <UserIcon size={16} />
              </span>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 font-light"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground/80 tracking-wide" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground/50">
                <Mail size={16} />
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 font-light"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground/80 tracking-wide" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground/50">
                <Lock size={16} />
              </span>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 font-light"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 bg-primary hover:bg-rose-soft/85 disabled:opacity-40 text-background rounded-xl text-xs font-bold transition-all duration-300 shadow-md shadow-primary/5 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Sign Up
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground/60 font-light">
            Already have an account?{' '}
            <Link href={`/login${searchParams.toString() ? '?' + searchParams.toString() : ''}`} className="text-primary hover:underline font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Soothing breathing glows from custom classes */}
      <div className="breathing-glow-1 opacity-20" />
      <div className="breathing-glow-2 opacity-20" />

      <Suspense fallback={
        <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-2xl flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
