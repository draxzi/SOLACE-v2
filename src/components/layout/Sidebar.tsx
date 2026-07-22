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
    router.push(`/chat?new=true&t=${Date.now()}`);
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
    <div className="h-full flex flex-col bg-background border-r border-border text-muted-foreground transition-all duration-350">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <Link 
          href="/chat" 
          onClick={handleLinkClick}
          className="flex items-center gap-2.5 font-bold text-foreground"
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-background shrink-0 shadow-lg shadow-primary/10">
            <Bot size={16} />
          </div>
          {(!isSidebarCollapsed || isSidebarOpen) && (
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-base tracking-tight font-extrabold text-cream-warm"
            >
              Solace
            </motion.span>
          )}
        </Link>

        {/* Desktop Collapse Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg border border-border bg-card/40 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-300 cursor-pointer"
            aria-label={isSidebarCollapsed ? "Expand sidebar panel" : "Collapse sidebar panel"}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* Mobile Close Button */}
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
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
          className={`w-full py-2.5 bg-primary hover:bg-rose-soft/80 text-background rounded-xl font-bold transition-all duration-300 shadow-md shadow-primary/5 flex items-center justify-center cursor-pointer ${
            isSidebarCollapsed && !isSidebarOpen ? 'px-0 aspect-square' : 'px-4 gap-2 text-xs'
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
          className={`flex items-center rounded-xl py-2.5 px-3 transition-all duration-300 text-xs font-semibold ${
            pathname === '/chat'
              ? 'bg-card text-foreground font-bold shadow-sm border border-border/60'
              : 'hover:bg-card/45 hover:text-foreground text-muted-foreground'
          } ${isSidebarCollapsed && !isSidebarOpen ? 'justify-center py-3' : 'gap-3'}`}
          title="Solace"
        >
          <MessageSquare size={16} />
          {(!isSidebarCollapsed || isSidebarOpen) && (
            <div className="flex flex-col items-start min-w-0 leading-tight">
              <span className="font-bold text-cream-warm">Solace</span>
              {!user && (
                <span className="text-[9px] text-primary/80 font-normal">Temporary Conversation</span>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Conversation List Header */}
      {(!isSidebarCollapsed || isSidebarOpen) && (
        <div className="px-6 py-2 mt-4 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest border-t border-border pt-4 flex items-center justify-between">
          <span>Recent Chats</span>
          {isLoading && <Loader2 size={10} className="animate-spin text-muted-foreground" />}
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
                  className={`w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs transition-all duration-300 ${
                    isActive
                      ? 'bg-card text-foreground font-bold shadow-sm border border-border/50'
                      : 'hover:bg-card/35 hover:text-foreground text-muted-foreground'
                  } ${isSidebarCollapsed && !isSidebarOpen ? 'justify-center py-3' : 'gap-3'}`}
                  title={conv.companionName}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {conv.companionAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={conv.companionAvatar} 
                        alt={conv.companionName} 
                        className="w-5 h-5 rounded-lg bg-background border border-border/50 shrink-0" 
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
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
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 text-muted-foreground/60 hover:text-rose-soft rounded flex items-center justify-center hover:bg-background transition-all duration-300 cursor-pointer shrink-0"
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
          <div className="text-center py-8 text-xs text-muted-foreground/50 leading-relaxed px-4 font-light">
            No saved conversations. Click &quot;New Chat&quot; above to start.
          </div>
        )}
      </div>

      {/* Sidebar Footer (Settings) */}
      <div className="p-3 border-t border-border">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={`flex items-center rounded-xl py-2.5 px-3 text-xs font-semibold transition-all duration-300 ${
            pathname === '/settings'
              ? 'bg-card text-foreground font-bold shadow-sm border border-border/50'
              : 'hover:bg-card/45 hover:text-foreground text-muted-foreground'
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
