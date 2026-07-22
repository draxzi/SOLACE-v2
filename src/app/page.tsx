'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans justify-between">
      
      {/* Soothing breathing glows from custom classes */}
      <div className="breathing-glow-1" />
      <div className="breathing-glow-2" />

      {/* Floating Animated Soothing Glowing Thread (SVG) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path
            d="M-100 450 C300 200, 400 700, 720 450 C1040 200, 1140 700, 1540 450"
            stroke="url(#thread-gradient)"
            strokeWidth="1"
            strokeLinecap="round"
            className="glowing-thread"
          />
          <defs>
            <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c0a9ff" stopOpacity="0" />
              <stop offset="25%" stopColor="#c0a9ff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#fda4af" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#ffedd5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffedd5" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Center Logo Header */}
      <header className="w-full h-24 flex items-center justify-center px-8 lg:px-20 z-20 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-card border border-border/80 flex items-center justify-center text-primary shadow-sm">
            <Heart size={13} className="fill-primary/5" />
          </div>
          <span className="text-xs font-bold tracking-widest text-cream-warm uppercase">
            SOLACE
          </span>
        </div>
      </header>

      {/* Soothing Hero Section */}
      <section className="max-w-3xl w-full mx-auto px-8 z-10 flex flex-col items-center justify-center text-center gap-12 py-16 flex-1">
        
        {/* Soft pulsing heart indicator */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="w-12 h-12 rounded-full bg-card/45 border border-border/60 flex items-center justify-center text-primary/75 shadow-sm"
        >
          <Heart size={16} className="fill-primary/5 animate-pulse" style={{ animationDuration: '4s' }} />
        </motion.div>

        <div className="space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-serif font-light leading-[1.25] text-cream-warm px-4 max-w-2xl mx-auto italic"
          >
            &ldquo;A quiet place for the conversations you can&apos;t always have out loud.&rdquo;
          </motion.h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4 pt-4"
        >
          <Link 
            href="/chat"
            className="px-8 py-3.5 bg-primary hover:bg-rose-soft/85 text-background rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-400 shadow-xl shadow-primary/5 hover:shadow-primary/10 flex items-center justify-center gap-2 group btn-premium w-44 sm:w-auto"
          >
            Start Talking
          </Link>
          
          {user ? (
            <Link 
              href="/chat"
              className="px-8 py-3.5 bg-card/40 border border-border/50 hover:bg-card/75 text-muted-foreground hover:text-foreground rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-400 flex items-center justify-center gap-2 btn-premium w-44 sm:w-auto"
            >
              Open Workspace
            </Link>
          ) : (
            <Link 
              href="/login"
              className="px-8 py-3.5 bg-card/40 border border-border/50 hover:bg-card/75 text-muted-foreground hover:text-foreground rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-400 flex items-center justify-center gap-2 btn-premium w-44 sm:w-auto"
            >
              Sign In
            </Link>
          )}
        </motion.div>
        
      </section>

      {/* Soothing Footer */}
      <footer className="w-full py-10 text-center text-[9px] text-muted-foreground/30 z-20 shrink-0 font-light tracking-widest select-none uppercase">
        &copy; {new Date().getFullYear()} Solace. A quiet place to breathe, think, and talk.
      </footer>

    </main>
  );
}
