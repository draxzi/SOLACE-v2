'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Bot, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Compass, 
  Smile, 
  Lightbulb, 
  BookOpen 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user } = useAuth();

  const companions = [
    {
      name: 'Nova',
      role: 'Empathetic Companion',
      description: 'Nova provides a safe, warm space to talk, offering emotional support, validation, and compassionate active listening.',
      icon: Smile,
      color: 'from-pink-500 to-rose-500',
      textColor: 'text-rose-400',
      bgGlow: 'bg-rose-500/10'
    },
    {
      name: 'Zephyr',
      role: 'Witty Brainstormer',
      description: 'Zephyr challenges your intellect with dry humor, playful energy, and creative out-of-the-box brainstorming sessions.',
      icon: Lightbulb,
      color: 'from-amber-500 to-orange-500',
      textColor: 'text-orange-400',
      bgGlow: 'bg-orange-500/10'
    },
    {
      name: 'Astra',
      role: 'Academic Mentor',
      description: 'Astra adopts a structured, informative tone to help explain complex ideas, mentor your learning, and clarify educational topics.',
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-500',
      textColor: 'text-indigo-400',
      bgGlow: 'bg-indigo-500/10'
    },
    {
      name: 'Echo',
      role: 'Philosophical Sage',
      description: 'Echo engages you in meditative, deep discussions about ethics, life, and the larger questions of existence.',
      icon: Compass,
      color: 'from-violet-500 to-purple-500',
      textColor: 'text-purple-400',
      bgGlow: 'bg-purple-500/10'
    }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* Background radial ambient lights */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-violet-900/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-950/15 blur-[140px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full h-16 flex items-center justify-between px-6 lg:px-12 border-b border-slate-900/80 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-violet-650 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Bot size={15} />
          </div>
          <span className="text-sm font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-350">
            SOLACE
          </span>
        </div>

        <nav className="flex items-center gap-4">
          {user ? (
            <Link 
              href="/dashboard"
              className="text-xs font-semibold px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg shadow-violet-600/15 transition-all"
            >
              Enter Workspace
            </Link>
          ) : (
            <>
              <Link 
                href="/login"
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/register"
                className="text-xs font-semibold px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg shadow-violet-600/15 transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-12 py-16 lg:py-24 z-10 flex flex-col justify-center gap-12">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/25 bg-violet-955/20 text-violet-400 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
          >
            <Sparkles size={11} className="animate-pulse" />
            Empowering AI companions at your service
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400"
          >
            Real Connections.<br />
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400">Solace v2</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
          >
            Experience a private, secure workspace to speak, explore ideas, and seek intellectual mentorship with distinct, customizable companion archetypes.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
          >
            <Link 
              href={user ? "/dashboard" : "/register"}
              className="px-6 py-3 bg-violet-650 hover:bg-violet-550 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-violet-600/10 flex items-center justify-center gap-1.5 group"
            >
              <span>Initialize Companion</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link 
              href="/login"
              className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center"
            >
              Access Account
            </Link>
          </motion.div>
        </div>

        {/* Companion Archetypes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          {companions.map((comp, idx) => {
            const Icon = comp.icon;
            return (
              <motion.div
                key={comp.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx + 0.3 }}
                className="group relative bg-slate-900/35 border border-slate-900/80 rounded-2xl p-5 hover:border-slate-800/80 hover:bg-slate-900/50 backdrop-blur-xl transition-all duration-200"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-xl opacity-20 group-hover:opacity-40 transition-opacity ${comp.bgGlow}`} />
                
                <div className="space-y-4 relative">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-r ${comp.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-200 group-hover:text-white transition-colors">{comp.name}</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${comp.textColor}`}>{comp.role}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal group-hover:text-slate-400 transition-colors">
                    {comp.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tech Stack Info Banner */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 border-t border-slate-900/60 pt-10 text-[10px] font-semibold text-slate-650"
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-slate-500" />
            <span>Supabase Secure Authentication</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-slate-500" />
            <span>Groq LLM Streaming API</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={12} className="text-slate-500" />
            <span>Drizzle PostgreSQL Schemas</span>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-[10px] text-slate-700 border-t border-slate-900/60 z-20 shrink-0">
        &copy; {new Date().getFullYear()} Solace Workspace. All rights reserved. Deployed production-ready.
      </footer>

    </main>
  );
}
