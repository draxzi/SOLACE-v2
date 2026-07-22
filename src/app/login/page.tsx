'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, LogIn, Loader2, Sparkles, AlertCircle } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createClient();

  const redirectTo = searchParams.get('redirectTo') || '/chat';

  useEffect(() => {
    if (user) {
      router.push(redirectTo);
    }
  }, [user, router, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      router.push(redirectTo);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
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
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold text-cream-warm">Welcome Back</h2>
          <p className="text-xs text-muted-foreground/65 font-light">Reconnect with your AI companion</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-light">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 font-light"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-rose-soft/85 disabled:opacity-40 text-background rounded-xl text-xs font-bold transition-all duration-300 shadow-md shadow-primary/5 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground/60 font-light">
            Don&apos;t have an account?{' '}
            <Link href={`/register${searchParams.toString() ? '?' + searchParams.toString() : ''}`} className="text-primary hover:underline font-bold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>
    </main>
  );
}
