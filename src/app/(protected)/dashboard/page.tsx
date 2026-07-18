'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  Plus, 
  Bot,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

// Mock static companions list for UI presentation in Phase 3
const TEMPLATE_COMPANIONS = [
  {
    name: 'Nova',
    sub: 'Empathetic Companion',
    desc: 'Deeply understanding and supportive. Nova listens closely, validates your feelings, and offers comforting perspectives.',
    traits: ['Empathetic', 'Gentle', 'Insightful'],
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova',
    color: 'from-violet-500/20 to-purple-500/5',
    borderColor: 'group-hover:border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    name: 'Zephyr',
    sub: 'Witty Brainstormer',
    desc: 'High-energy, playful, and sharp. Zephyr loves dry humor, creative challenges, and exploring unexpected ideas with you.',
    traits: ['Humorous', 'Creative', 'Witty'],
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zephyr',
    color: 'from-emerald-500/20 to-teal-500/5',
    borderColor: 'group-hover:border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    name: 'Astra',
    sub: 'Academic Mentor',
    desc: 'Objective, structured, and curious. Astra excels at summarizing articles, writing code, and explaining complex research topics.',
    traits: ['Analytical', 'Scholarly', 'Clear'],
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Astra',
    color: 'from-blue-500/20 to-sky-500/5',
    borderColor: 'group-hover:border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    name: 'Echo',
    sub: 'Philosophical Sage',
    desc: 'Calm, meditative, and thoughtful. Echo encourages introspective thinking, exploring ethics, and examining the big questions of life.',
    traits: ['Philosophical', 'Calm', 'Mindful'],
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Echo',
    color: 'from-amber-500/20 to-orange-500/5',
    borderColor: 'group-hover:border-amber-500/30',
    iconColor: 'text-amber-400',
  }
];

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch count of user's active conversations
  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      if (!user) return { conversations: 0, messages: 0 };
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        conversations: convCount || 0,
        messages: (convCount || 0) * 14, // Simulated message statistics for presentation
      };
    },
    enabled: !!user,
  });

  // Create conversation mutation
  const createChatMutation = useMutation({
    mutationFn: async (companion: typeof TEMPLATE_COMPANIONS[0]) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user?.id,
          companion_name: companion.name,
          companion_avatar: companion.avatar,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${data.id}`);
    },
  });

  const handleStartChat = (companion: typeof TEMPLATE_COMPANIONS[0]) => {
    createChatMutation.mutate(companion);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-8 space-y-8 bg-slate-950 dark:bg-slate-950 light:bg-slate-50 transition-colors duration-200">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900/60 dark:border-slate-900 pb-6 light:border-slate-200">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-950 flex items-center gap-2">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">{profile?.name || 'Explorer'}</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
            Welcome to Solace. Select a companion template below or start a new custom session.
          </p>
        </div>

        {/* Date tracker */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 dark:bg-slate-950/40 dark:border-slate-850 light:bg-white light:border-slate-200 text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600">
          <Calendar size={14} className="text-violet-400" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm dark:bg-slate-950/40 dark:border-slate-850 light:bg-white light:border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Companions</p>
            <p className="text-2xl font-extrabold text-slate-100 dark:text-slate-100 light:text-slate-950">{stats?.conversations || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Bot size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm dark:bg-slate-950/40 dark:border-slate-850 light:bg-white light:border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Messages Exchanged</p>
            <p className="text-2xl font-extrabold text-slate-100 dark:text-slate-100 light:text-slate-950">{stats?.messages || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageSquare size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm dark:bg-slate-950/40 dark:border-slate-850 light:bg-white light:border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Solace Level</p>
            <p className="text-2xl font-extrabold text-slate-100 dark:text-slate-100 light:text-slate-950">Level 1</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Core Companion Templates */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" /> Companion Archetypes
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TEMPLATE_COMPANIONS.map((companion, idx) => (
            <motion.div
              key={companion.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleStartChat(companion)}
              className="group cursor-pointer p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-br bg-slate-900/20 hover:bg-slate-900/50 hover:border-slate-700/60 dark:bg-slate-950/40 dark:border-slate-850 dark:hover:bg-slate-900/30 light:bg-white light:border-slate-200 light:hover:bg-slate-50 transition-all flex flex-col justify-between h-[220px]"
            >
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={companion.avatar} 
                    alt={companion.name} 
                    className="w-10 h-10 rounded-xl bg-slate-850 border border-slate-800 shrink-0" 
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-950 group-hover:text-violet-400 transition-colors">
                      {companion.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 light:text-slate-400 mt-0.5">
                      {companion.sub}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 leading-normal line-clamp-3">
                  {companion.desc}
                </p>
              </div>

              {/* Card Footer Traits & Start Button */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5">
                  {companion.traits.map(trait => (
                    <span 
                      key={trait} 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-850 text-slate-500 border border-slate-800/50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 light:bg-slate-100 light:text-slate-600 light:border-slate-250"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Chat Now <Plus size={12} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
