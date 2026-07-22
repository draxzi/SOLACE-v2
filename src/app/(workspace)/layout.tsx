'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LayoutProvider from '@/context/LayoutContext';

/**
 * Global layout wrapper for protected routes.
 * Enforces client-side auth verification and builds the App Shell (Sidebar + Header + Page Pane).
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  // If loading session, show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <span className="text-sm font-medium tracking-wide">Loading workspace...</span>
      </div>
    );
  }

  return (
    <LayoutProvider>
      <div className="h-screen w-screen flex overflow-hidden bg-background transition-colors duration-300">
        
        {/* Collapsible Sidebar */}
        <Sidebar />

        {/* Main Work Pane */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* Decorative ambient breathing background glows inside shell */}
          <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-glow blur-[130px] pointer-events-none opacity-40" />

          {/* Dashboard Header Bar */}
          <Header />

          {/* Core Page Content */}
          <div className="flex-1 overflow-hidden relative page-transition">
            {children}
          </div>
        </div>
      </div>
    </LayoutProvider>
  );
}
