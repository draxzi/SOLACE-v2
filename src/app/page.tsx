'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Bot, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative overflow-hidden font-sans select-none justify-between">
      
      {/* Gentle, breathing ambient glow circles */}
      <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-violet-900/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-950/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Top Header Navigation */}
      <header className="w-full h-20 flex items-center justify-between px-6 lg:px-16 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-650/80 flex items-center justify-center text-white shadow-lg shadow-violet-500/10">
            <Bot size={13} />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-100 uppercase">
            SOLACE
          </span>
        </div>

        <nav className="flex items-center gap-6">
          {user ? (
            <Link 
              href="/chat"
              className="text-xs font-semibold px-4.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 rounded-full transition-all"
            >
              Open Chat
            </Link>
          ) : (
            <Link 
              href="/login"
              className="text-xs font-semibold px-4.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 rounded-full transition-all"
            >
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* Soothing Hero Section */}
      <section className="max-w-4xl w-full mx-auto px-6 lg:px-16 z-10 flex flex-col items-center text-center gap-8 py-10">
        
        {/* Soft, heart icon placeholder indicating emotion support */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="w-12 h-12 rounded-full bg-violet-500/5 border border-violet-500/10 flex items-center justify-center text-violet-400/70 shadow-inner"
        >
          <Heart size={18} className="fill-violet-400/5 animate-pulse" style={{ animationDuration: '4s' }} />
        </motion.div>

        <div className="space-y-4 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-slate-100"
          >
            You&apos;re safe here.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-slate-450 text-sm sm:text-base leading-relaxed font-light"
          >
            Whenever life feels heavy, you don&apos;t have to carry it alone.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="pt-4"
        >
          <Link 
            href="/chat"
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-xs font-bold transition-all shadow-xl shadow-violet-600/15 flex items-center justify-center gap-2 group"
          >
            Start Talking
          </Link>
        </motion.div>

        {/* Minimal Disclaimer & Statement */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          className="max-w-md border-t border-slate-900/60 pt-8 mt-4 text-[10px] text-slate-500 leading-relaxed font-light"
        >
          <p className="font-semibold text-slate-400 mb-1">
            Solace is an emotionally supportive AI companion.
          </p>
          <p>
            Not therapy. Not judgement. Just someone to listen.
          </p>
        </motion.div>
      </section>

      {/* Minimal Footer */}
      <footer className="w-full py-8 text-center text-[9px] text-slate-650 z-20 shrink-0">
        &copy; {new Date().getFullYear()} Solace. Minimal, private, emotionally supportive companion.
      </footer>

    </main>
  );
}
