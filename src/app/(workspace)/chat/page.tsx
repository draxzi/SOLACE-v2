'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { 
  Send, 
  Bot, 
  Copy, 
  Check, 
  Square, 
  AlertCircle, 
  Sparkles,
  Heart,
  UserPlus,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Markdown = dynamic(() => import('@/components/ui/Markdown'), {
  ssr: false,
  loading: () => <span className="text-slate-400/80 text-[10px] animate-pulse">Generating layout...</span>
});

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

function ChatFormContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Default welcoming prompt matching the Solace emotional blueprint
  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: "Hi, I'm Solace. It's nice to see you. What's on your mind today?",
    createdAt: new Date().toISOString()
  };

  // 1. Initial State: Load Guest sessionStorage or check for auth sync
  useEffect(() => {
    if (authLoading) return;

    const initializeChatState = async () => {
      if (user) {
        // Handle automatic guest chat migration to Supabase DB upon auth success
        const guestHistory = sessionStorage.getItem('solace_guest_chat');
        if (guestHistory) {
          try {
            const parsed = JSON.parse(guestHistory) as Message[];
            if (parsed && parsed.length > 0) {
              setSyncing(true);
              try {
                // Create conversation row
                const { data: conv, error: convError } = await supabase
                  .from('conversations')
                  .insert({
                    user_id: user.id,
                    companion_name: 'Solace',
                  })
                  .select()
                  .single();

                if (convError) throw convError;

                // Create message rows (strip welcome/mock ids)
                const messagesToInsert = parsed
                  .filter(m => m.id !== 'welcome')
                  .map(m => ({
                    conversation_id: conv.id,
                    role: m.role,
                    content: m.content,
                    created_at: m.createdAt,
                  }));

                if (messagesToInsert.length > 0) {
                  const { error: msgError } = await supabase
                    .from('messages')
                    .insert(messagesToInsert);
                  if (msgError) throw msgError;
                }

                // Invalidate query caches and clear session
                sessionStorage.removeItem('solace_guest_chat');
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
                router.push(`/chat/${conv.id}`);
              } catch (err) {
                console.error('Failed to sync guest session:', err);
                setMessages([welcomeMessage]);
                setSyncing(false);
              }
              return;
            }
          } catch (e) {
            console.error('Failed to parse guest storage:', e);
          }
        }
        
        // If authenticated and no guest history, default to empty/fresh state
        setMessages([]);
      } else {
        // Unauthenticated Guest: Load session storage or initialize with welcome message
        const guestHistory = sessionStorage.getItem('solace_guest_chat');
        if (guestHistory) {
          try {
            setMessages(JSON.parse(guestHistory));
          } catch {
            setMessages([welcomeMessage]);
          }
        } else {
          setMessages([welcomeMessage]);
        }
      }
    };

    const timer = setTimeout(() => {
      initializeChatState();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Scroll to bottom when messages or streamed text updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Save guest conversation locally on message additions
  const saveGuestMessagesLocally = (updated: Message[]) => {
    if (!user) {
      sessionStorage.setItem('solace_guest_chat', JSON.stringify(updated));
    }
  };

  // 2. Core Stream Function
  const streamAiResponse = async (history: { role: string; content: string }[]) => {
    setIsStreaming(true);
    setStreamedText('');
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'guest', // Mark guest session for provider completions
          messages: history,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate response.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Failed to load stream reader.');

      let accumulated = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamedText(accumulated);
      }

      const finalMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: accumulated,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => {
        const updated = [...prev, finalMsg];
        saveGuestMessagesLocally(updated);
        return updated;
      });

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (streamedText.trim()) {
          const stoppedMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `${streamedText}\n\n*[Response stopped by user]*`,
            createdAt: new Date().toISOString()
          };
          setMessages(prev => {
            const updated = [...prev, stoppedMsg];
            saveGuestMessagesLocally(updated);
            return updated;
          });
        }
      } else {
        const errMsg = err instanceof Error ? err.message : 'An error occurred during streaming.';
        setError(errMsg);
      }
    } finally {
      setIsStreaming(false);
      setStreamedText('');
      abortControllerRef.current = null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setError(null);

    // If authenticated and in fresh /chat page, auto-create a conversation on first message
    if (user) {
      try {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            companion_name: 'Solace',
          })
          .select()
          .single();

        if (convError) throw convError;

        // Insert first message to Supabase
        await supabase
          .from('messages')
          .insert({
            conversation_id: conv.id,
            role: 'user',
            content: messageContent,
          });

        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        
        // Redirect user to the newly initialized database conversation layout
        router.push(`/chat/${conv.id}`);
      } catch (err) {
        console.error('Failed to create new conversation:', err);
        setError('Failed to start conversation. Please try again.');
      }
      return;
    }

    // Guest Flow: append message locally
    const newUserMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      createdAt: new Date().toISOString()
    };

    const updatedHistory = [...messages, newUserMsg];
    setMessages(updatedHistory);
    saveGuestMessagesLocally(updatedHistory);

    // Trigger AI streaming completions
    await streamAiResponse(updatedHistory.map(m => ({ role: m.role, content: m.content })));
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = async () => {
    if (isStreaming || messages.length === 0) return;
    setError(null);

    const lastMsg = messages[messages.length - 1];
    let updatedHistory = [...messages];

    if (lastMsg.role === 'assistant') {
      updatedHistory = updatedHistory.slice(0, -1);
      setMessages(updatedHistory);
      saveGuestMessagesLocally(updatedHistory);
    }

    const payload = updatedHistory.map(m => ({ role: m.role, content: m.content }));
    await streamAiResponse(payload);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const clearGuestSession = () => {
    sessionStorage.removeItem('solace_guest_chat');
    setMessages([welcomeMessage]);
  };

  // Render loading screen if background sync is in progress
  if (syncing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <span className="text-sm font-medium tracking-wide">Syncing your guest session...</span>
      </div>
    );
  }

  return (
    <main className="h-full flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      
      {/* Soft ambient background glow inside chat pane */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-violet-650/5 blur-[120px] pointer-events-none" />

      {/* Chat pane header */}
      <div className="h-14 border-b border-slate-900/60 dark:border-slate-900/80 light:border-slate-200 bg-slate-950/40 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-violet-650/20 text-violet-400 flex items-center justify-center">
            <Heart size={11} className="fill-violet-400/20" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-100">Solace</h1>
            <p className="text-[9px] text-slate-550 font-medium tracking-wider">A quiet place to breathe, think, and talk.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Guest Action Options */}
          {!user && messages.length > 1 && (
            <>
              <button 
                onClick={clearGuestSession}
                type="button"
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                Clear History
              </button>
              <button 
                onClick={() => setShowSaveModal(true)}
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-550 text-white font-bold text-[10px] shadow-md shadow-violet-600/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={11} />
                Save Conversation
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Messages Scrolling Pane */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Bot size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-200">Solace</h3>
              <p className="text-[10px] text-slate-550 leading-relaxed font-light">
                A quiet place to breathe, think, and talk. Write whatever is on your mind.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </div>
                )}
                
                <div className={`relative max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600/90 text-white dark:bg-violet-650/90 shadow-md'
                    : 'bg-slate-900/40 border border-slate-900/60 dark:bg-slate-900/30 dark:border-slate-800/80 light:bg-white light:border-slate-200 light:text-slate-800 text-slate-200 shadow-sm'
                }`}>
                  <Markdown content={msg.content} />

                  {/* Copy helper */}
                  {msg.role !== 'user' && (
                    <button
                      onClick={() => copyToClipboard(msg.id, msg.content)}
                      type="button"
                      className="absolute right-2 bottom-2 p-1.5 rounded bg-slate-900/80 hover:bg-slate-850 text-slate-500 hover:text-slate-350 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer border border-slate-800/40"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Stream output rendering */}
            {isStreaming && streamedText && (
              <div className="flex gap-4 justify-start">
                <div className="w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed bg-slate-900/40 border border-slate-900/60 dark:bg-slate-900/30 dark:border-slate-800/80 light:bg-white light:border-slate-200 text-slate-200 shadow-sm">
                  <Markdown content={streamedText} />
                </div>
              </div>
            )}

            {/* Typing indicators */}
            {isStreaming && !streamedText && (
              <div className="flex gap-4 justify-start">
                <div className="w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-slate-900/40 border border-slate-900/60 dark:bg-slate-900/30 dark:border-slate-850 rounded-2xl px-4.5 py-3.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Error notifications */}
            {error && (
              <div className="max-w-md mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold">Generation Issue</p>
                  <p>{error}</p>
                </div>
                <button 
                  onClick={handleRetry}
                  type="button"
                  className="px-2.5 py-1 rounded bg-red-550/20 hover:bg-red-550/30 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Message Form / Stream Actions */}
      <div className="p-4 border-t border-slate-900/60 dark:border-slate-900/80 light:border-slate-200 bg-slate-950 shrink-0">
        {isStreaming && (
          <div className="flex justify-center mb-3">
            <button
              onClick={handleStopGeneration}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-850 text-[10px] text-slate-350 font-bold transition-all shadow-md cursor-pointer"
            >
              <Square size={10} className="fill-slate-300" />
              Stop Generation
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
          <input
            type="text"
            required
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isStreaming}
            placeholder={isStreaming ? "Generating response..." : "Write whatever is on your mind..."}
            className="w-full pl-4 pr-12 py-3 bg-slate-900/40 border border-slate-900 focus:border-violet-500/50 rounded-xl text-slate-250 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-555 dark:bg-slate-950/60 dark:border-slate-900 light:bg-white light:border-slate-200 light:text-slate-800"
            aria-label="Message companion input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="absolute right-2 p-2 bg-violet-650 hover:bg-violet-550 disabled:opacity-30 disabled:hover:bg-violet-650 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Send message"
            aria-label="Send message"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

      {/* Soothing Save Account Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-center z-10"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
              
              <div className="flex justify-center pt-2">
                <div className="w-10 h-10 rounded-full bg-violet-650/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-100">Save your conversation</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed px-2 font-light">
                  Create a free account to keep your conversations safe, private, and accessible across all your devices.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    router.push('/register?redirectTo=/chat&saveGuest=true');
                  }}
                  type="button"
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus size={12} />
                  Continue with Email
                </button>
                
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    router.push('/login?redirectTo=/chat&saveGuest=true');
                  }}
                  type="button"
                  className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-slate-300 rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn size={12} />
                  Continue with password login
                </button>
                
                <button
                  onClick={() => setShowSaveModal(false)}
                  type="button"
                  className="w-full py-2.5 bg-transparent hover:bg-slate-850/30 text-slate-500 hover:text-slate-400 rounded-xl text-[10px] font-medium transition-all cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}

export default function CoreChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-405">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ChatFormContent />
    </Suspense>
  );
}
