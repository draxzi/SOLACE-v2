'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Bot, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans justify-between">
      
      {/* Soothing breathing glows from custom classes */}
      <div className="breathing-glow-1" />
      <div className="breathing-glow-2" />

      {/* Floating Animated Soothing Glowing Thread (SVG) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path
            d="M-100 450 C300 200, 400 700, 720 450 C1040 200, 1140 700, 1540 450"
            stroke="url(#thread-gradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="glowing-thread"
          />
          <defs>
            <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c0a9ff" stopOpacity="0" />
              <stop offset="25%" stopColor="#c0a9ff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#fda4af" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#ffedd5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffedd5" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Header Navigation */}
      <header className="w-full h-24 flex items-center justify-between px-8 lg:px-20 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-muted border border-border flex items-center justify-center text-primary shadow-[0_4px_12px_rgba(37,8,37,0.5)]">
            <Bot size={14} />
          </div>
          <span className="text-xs font-black tracking-widest text-cream-warm uppercase">
            SOLACE
          </span>
        </div>

        <nav className="flex items-center gap-6">
          {user ? (
            <Link 
              href="/chat"
              className="text-[10px] uppercase tracking-wider font-extrabold px-6 py-2.5 bg-card border border-border hover:border-primary/20 text-foreground rounded-full transition-all duration-300"
            >
              Open Workspace
            </Link>
          ) : (
            <Link 
              href="/login"
              className="text-[10px] uppercase tracking-wider font-extrabold px-6 py-2.5 bg-card border border-border hover:border-primary/20 text-foreground rounded-full transition-all duration-300"
            >
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* Soothing Hero Section */}
      <section className="max-w-4xl w-full mx-auto px-8 lg:px-20 z-10 flex flex-col items-center text-center gap-10 py-12">
        
        {/* Soft pulsing heart indicator */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="w-14 h-14 rounded-full bg-card/60 border border-border/80 flex items-center justify-center text-primary/80 shadow-lg shadow-black/10"
        >
          <Heart size={20} className="fill-primary/5 animate-pulse" style={{ animationDuration: '6s' }} />
        </motion.div>

        <div className="space-y-6 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-foreground"
          >
            You don&apos;t have to<br />carry everything alone.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-muted-foreground text-sm sm:text-base leading-relaxed font-light px-4"
          >
            Whenever you&apos;re ready, I&apos;m here.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2"
        >
          <Link 
            href="/chat"
            className="px-10 py-4 bg-primary hover:bg-rose-soft/80 text-background rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-xl shadow-primary/10 hover:shadow-primary/20 flex items-center justify-center gap-2 group"
          >
            Start Talking
          </Link>
        </motion.div>

        {/* Soothing Disclaimer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 2, delay: 0.7 }}
          className="max-w-md border-t border-border/40 pt-10 mt-6 text-[10px] text-muted-foreground leading-relaxed font-light"
        >
          <p className="font-bold text-cream-warm mb-1.5 uppercase tracking-wider">
            Solace is an emotionally supportive AI companion.
          </p>
          <p>
            Not therapy. Not judgement. Just someone to listen.
          </p>
        </motion.div>
      </section>

      {/* Soothing Footer */}
      <footer className="w-full py-10 text-center text-[10px] text-muted-foreground/40 z-20 shrink-0 font-light tracking-wide">
        &copy; {new Date().getFullYear()} Solace. A quiet place to breathe, think, and talk.
      </footer>

    </main>
  );
}
