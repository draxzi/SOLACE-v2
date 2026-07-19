'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAppLayout } from '@/context/LayoutContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Bot, 
  MessageSquare, 
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  id: string;
  companionName: string;
  companionAvatar: string | null;
  updatedAt: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    isSidebarOpen, 
    setIsSidebarOpen, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed 
  } = useAppLayout();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Fetch conversations using React Query
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('conversations')
        .select('id, companion_name, companion_avatar, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      interface ConversationRow {
        id: string;
        companion_name: string;
        companion_avatar: string | null;
        updated_at: string;
      }

      return (data || []).map((conv: ConversationRow) => ({
        id: conv.id,
        companionName: conv.companion_name,
        companionAvatar: conv.companion_avatar,
        updatedAt: conv.updated_at,
      }));
    },
    enabled: !!user,
  });

  // 2. Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // If we are currently viewing the deleted conversation, redirect to /chat
      if (pathname === `/chat/${deletedId}`) {
        router.push('/chat');
      }
    },
  });

  // 3. Create a conversation
  const handleNewChat = () => {
    setIsSidebarOpen(false);
    router.push('/chat');
  };

  const handleLinkClick = () => {
    setIsSidebarOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat history?')) {
      deleteMutation.mutate(id);
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 dark:bg-slate-950 dark:border-slate-800/80 light:bg-slate-100 light:border-slate-200 light:text-slate-700 transition-all duration-200">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 dark:border-slate-800/80 light:border-slate-200">
        <Link 
          href="/chat" 
          onClick={handleLinkClick}
          className="flex items-center gap-2.5 font-bold text-slate-100 dark:text-slate-100 light:text-slate-950"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-violet-500/10">
            <Bot size={16} />
          </div>
          {(!isSidebarCollapsed || isSidebarOpen) && (
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-base tracking-tight font-extrabold"
            >
              Solace
            </motion.span>
          )}
        </Link>

        {/* Desktop Collapse Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg border border-slate-800 bg-slate-900/60 dark:border-slate-800 dark:bg-slate-950 light:border-slate-200 light:bg-white items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 dark:hover:bg-slate-900 light:hover:bg-slate-50 transition-all cursor-pointer"
            aria-label={isSidebarCollapsed ? "Expand sidebar panel" : "Collapse sidebar panel"}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* Mobile Close Button */}
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className={`w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-violet-600/10 flex items-center justify-center cursor-pointer ${
            isSidebarCollapsed && !isSidebarOpen ? 'px-0 aspect-square' : 'px-4 gap-2 text-sm'
          }`}
          title="New Chat"
          aria-label="Create new companion chat session"
        >
          <Plus size={16} />
          {(!isSidebarCollapsed || isSidebarOpen) && <span>New Chat</span>}
        </button>
      </div>

      {/* Navigation List */}
      <div className="px-3 py-1 space-y-1">
        <Link
          href="/chat"
          onClick={handleLinkClick}
          className={`flex items-center rounded-xl py-2 px-3 transition-all text-xs font-semibold ${
            pathname === '/chat' || pathname.startsWith('/chat/')
              ? 'bg-slate-800 text-slate-100 dark:bg-slate-900 light:bg-slate-200 light:text-slate-950 font-bold'
              : 'hover:bg-slate-800/40 hover:text-slate-100 dark:hover:bg-slate-900/40 light:hover:bg-slate-200/40'
          } ${isSidebarCollapsed && !isSidebarOpen ? 'justify-center py-3' : 'gap-3'}`}
          title="Solace"
        >
          <MessageSquare size={16} />
          {(!isSidebarCollapsed || isSidebarOpen) && <span>Solace</span>}
        </Link>
      </div>

      {/* Conversation List Header */}
      {(!isSidebarCollapsed || isSidebarOpen) && (
        <div className="px-6 py-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-800 dark:border-slate-800/50 light:border-slate-200 pt-4 flex items-center justify-between">
          <span>Recent Chats</span>
          {isLoading && <Loader2 size={10} className="animate-spin text-slate-500" />}
        </div>
      )}

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        <AnimatePresence initial={false}>
          {conversations.map((conv) => {
            const isActive = pathname === `/chat/${conv.id}`;
            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="relative group"
              >
                <Link
                  href={`/chat/${conv.id}`}
                  onClick={handleLinkClick}
                  className={`w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs transition-all ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 dark:bg-slate-900 light:bg-slate-200 light:text-slate-950 font-bold'
                      : 'hover:bg-slate-800/30 hover:text-slate-100 dark:hover:bg-slate-900/30 light:hover:bg-slate-200/40'
                  } ${isSidebarCollapsed && !isSidebarOpen ? 'justify-center py-3' : 'gap-3'}`}
                  title={conv.companionName}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {conv.companionAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={conv.companionAvatar} 
                        alt={conv.companionName} 
                        className="w-5 h-5 rounded-lg bg-slate-800 border border-slate-700/50 shrink-0" 
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0">
                        <Bot size={10} />
                      </div>
                    )}
                    {(!isSidebarCollapsed || isSidebarOpen) && (
                      <span className="truncate pr-4">{conv.companionName}</span>
                    )}
                  </div>
                  
                  {/* Delete Button on Hover */}
                  {(!isSidebarCollapsed || isSidebarOpen) && (
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 text-slate-500 hover:text-red-400 rounded flex items-center justify-center hover:bg-slate-900 dark:hover:bg-slate-950 light:hover:bg-white transition-all cursor-pointer shrink-0"
                      title="Delete Chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {conversations.length === 0 && !isLoading && (!isSidebarCollapsed || isSidebarOpen) && (
          <div className="text-center py-8 text-xs text-slate-500 leading-relaxed px-4">
            No companion chats. Click &quot;New Companion&quot; above to create one.
          </div>
        )}
      </div>

      {/* Sidebar Footer (Settings) */}
      <div className="p-3 border-t border-slate-800 dark:border-slate-800/80 light:border-slate-200">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={`flex items-center rounded-xl py-2.5 px-3 text-xs font-semibold ${
            pathname === '/settings'
              ? 'bg-slate-800 text-slate-100 dark:bg-slate-900 light:bg-slate-200 light:text-slate-950 font-bold'
              : 'hover:bg-slate-800/40 hover:text-slate-100 dark:hover:bg-slate-900/40 light:hover:bg-slate-200/40'
          } ${isSidebarCollapsed && !isSidebarOpen ? 'justify-center py-3' : 'gap-3'}`}
          title="Settings"
        >
          <Settings size={16} />
          {(!isSidebarCollapsed || isSidebarOpen) && <span>Settings</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Left-positioned) */}
      <aside 
        className={`hidden lg:block shrink-0 h-full transition-all duration-200 overflow-hidden ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            {/* Backdrop shadow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-[280px] max-w-[85vw] h-full z-50 flex flex-col"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
