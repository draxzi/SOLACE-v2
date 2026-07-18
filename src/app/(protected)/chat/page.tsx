'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmptyChatPage() {
  return (
    <main className="h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center dark:bg-slate-950 light:bg-slate-50 transition-colors duration-200">
      
      <div className="max-w-md w-full space-y-6 z-10">
        
        {/* Animated icon */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="w-16 h-16 rounded-3xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)] shrink-0"
          >
            <Bot size={32} />
          </motion.div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight">
            Start a Session
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 leading-relaxed px-4">
            No active conversation selected. Go back to your Dashboard or create a new companion to start sharing thoughts, brainstorming ideas, or studying together.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-violet-600/10 cursor-pointer"
          >
            <LayoutDashboard size={14} />
            Go to Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}
