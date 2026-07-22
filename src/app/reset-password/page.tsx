'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Loader2, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // Updates the user's password in the active Supabase session
      const { error: resetError } = await supabase.auth.updateUser({
        password,
      });

      if (resetError) throw resetError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/chat');
      }, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update password. Session may have expired.';
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Soothing breathing glows from custom classes */}
      <div className="breathing-glow-1 opacity-20" />
      <div className="breathing-glow-2 opacity-20" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-2xl relative backdrop-blur-md">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(253,164,175,0.4)]" />

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-primary-glow text-primary border border-primary/20">
              <KeyRound size={24} />
            </div>
            <h2 className="text-2xl font-bold text-cream-warm">Reset Password</h2>
            <p className="text-xs text-muted-foreground/65 font-light text-center">Establish a new secure password for your account</p>
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
              <span className="font-light">Password successfully reset! Redirecting to workspace...</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground/80 tracking-wide" htmlFor="password">
                New Password
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground/80 tracking-wide" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground/50">
                  <Lock size={16} />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
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
                  Resetting Password...
                </>
              ) : (
                <>
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
