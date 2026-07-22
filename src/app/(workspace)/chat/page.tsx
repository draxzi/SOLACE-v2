'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
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

  // Emotional Modes State
  const [activeMode, setActiveMode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('solace_active_mode') || 'Just Listen';
    }
    return 'Just Listen';
  });

  const handleModeChange = (modeName: string) => {
    setActiveMode(modeName);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('solace_active_mode', modeName);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const newParam = searchParams?.get('new');
  const tParam = searchParams?.get('t');

  // Handle New Chat search parameter signals
  useEffect(() => {
    if (newParam || tParam) {
      const timer = setTimeout(() => {
        setMessages([]);
        setInputValue('');
        setError(null);
        if (!user) {
          sessionStorage.removeItem('solace_guest_chat');
        }
        textareaRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [newParam, tParam, user]);

  // Initial focus on mount
  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

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
                // Create conversation row using the guest active mode
                const chosenMode = sessionStorage.getItem('solace_active_mode') || 'Just Listen';
                const { data: conv, error: convError } = await supabase
                  .from('conversations')
                  .insert({
                    user_id: user.id,
                    companion_name: chosenMode,
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
                setMessages([]);
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
        // Unauthenticated Guest: Load session storage or initialize with empty array
        const guestHistory = sessionStorage.getItem('solace_guest_chat');
        if (guestHistory) {
          try {
            setMessages(JSON.parse(guestHistory));
          } catch {
            setMessages([]);
          }
        } else {
          setMessages([]);
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

  // Auto-grow textarea handler
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Keyboard shortcut submit handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isStreaming) {
        const form = e.currentTarget.form;
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

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
          chatId: 'guest',
          messages: history,
          mode: activeMode,
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
        const chosenMode = sessionStorage.getItem('solace_active_mode') || 'Just Listen';
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            companion_name: chosenMode,
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
    setMessages([]);
  };

  // Render loading screen if background sync is in progress using a beautiful shimmer skeleton
  if (syncing) {
    return (
      <div className="h-full flex flex-col bg-background relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-glow blur-[140px] pointer-events-none opacity-40 animate-pulse" />
        
        {/* Top Info Bar Shimmer */}
        <div className="h-16 border-b border-border bg-background/45 backdrop-blur-sm px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 w-1/3">
            <div className="w-8 h-8 rounded-lg bg-card/60 animate-pulse border border-border shimmer-bg" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 bg-card/80 rounded animate-pulse w-24 shimmer-bg" />
              <div className="h-1.5 bg-card/60 rounded animate-pulse w-12 shimmer-bg" />
            </div>
          </div>
        </div>

        {/* Shimmer Messages list */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-3xl mx-auto w-full">
          <div className="text-center py-4 text-xs text-muted-foreground/60 animate-pulse">
            Syncing guest conversation history...
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex gap-4 ${n % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              {n % 2 !== 0 && <div className="w-8 h-8 rounded-xl bg-card border border-border/80 animate-pulse shrink-0 shimmer-bg" />}
              <div className="space-y-2 max-w-[70%] flex-1">
                <div className={`h-12 rounded-2xl animate-pulse ${n % 2 === 0 ? 'bg-primary/20 ml-auto' : 'bg-card/50 border border-border/40'} w-48 shimmer-bg`} />
                <div className={`h-3.5 rounded animate-pulse bg-card/30 w-16 ${n % 2 === 0 ? 'ml-auto mr-2' : 'ml-2'} shimmer-bg`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="h-full flex flex-col overflow-hidden bg-background text-foreground relative font-sans">
      
      {/* Soft ambient background glow inside chat pane */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-glow blur-[140px] pointer-events-none opacity-40 animate-pulse" />

      {/* Chat pane header */}
      <div className="h-16 border-b border-border bg-background/45 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-primary-glow text-primary flex items-center justify-center border border-primary/20">
            <Heart size={12} className="fill-primary/10" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-cream-warm uppercase tracking-wider">Solace</h1>
            <p className="text-[9px] text-muted-foreground/60 font-medium">A quiet place to breathe, think, and talk.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Guest Action Options */}
          {!user && messages.length > 0 && (
            <>
              <button 
                onClick={clearGuestSession}
                type="button"
                className="px-3.5 py-1.5 rounded-full border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-300 cursor-pointer btn-premium"
              >
                Clear History
              </button>
              <button 
                onClick={() => setShowSaveModal(true)}
                type="button"
                className="px-4 py-1.5 rounded-full bg-primary hover:bg-rose-soft/80 text-background font-bold text-[10px] shadow-md shadow-primary/5 transition-all duration-300 cursor-pointer flex items-center gap-1.5 btn-premium"
              >
                <Sparkles size={11} />
                Save Conversation
              </button>
            </>
          )}
        </div>
      </div>

      {/* Emotional Modes Switcher Bar */}
      <div className="px-6 py-2.5 bg-card/15 border-b border-border/40 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 z-10 select-none">
        <span className="text-[9px] text-muted-foreground/50 uppercase font-bold tracking-widest mr-1 shrink-0">Companion Mode:</span>
        {['Just Listen', 'Breakup Support', 'Grief Support', 'Heavy Days'].map((modeName) => {
          const isSelected = activeMode === modeName;
          return (
            <button
              key={modeName}
              onClick={() => handleModeChange(modeName)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all duration-300 cursor-pointer border shrink-0 btn-premium ${
                isSelected 
                  ? 'bg-primary text-background border-primary shadow-sm font-bold'
                  : 'bg-card/45 border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/75'
              }`}
            >
              {modeName}
            </button>
          );
        })}
      </div>

      {/* Chat Messages Scrolling Pane */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 fade-in-message select-none">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-primary shadow-lg shadow-black/10 shadow-primary/5 animate-pulse">
              <Heart size={22} className="fill-primary/10 text-primary" />
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold text-cream-warm tracking-wider uppercase">Solace</h2>
              <p className="text-xs text-muted-foreground/80 leading-relaxed font-light">
                You don&apos;t need the right words.<br />Just start wherever you are.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-4 fade-in-message ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-card border border-border/80 text-primary flex items-center justify-center shrink-0 shadow-sm">
                    <Bot size={15} />
                  </div>
                )}
                
                <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[70%] items-start">
                  <div className={`relative px-4.5 py-3.5 text-xs leading-relaxed group shadow-sm w-full ${
                    msg.role === 'user'
                      ? 'bg-primary text-background rounded-[20px] rounded-tr-[12px] font-medium'
                      : 'bg-card border border-border/60 text-foreground rounded-[20px] rounded-tl-[12px] font-light'
                  }`}>
                    <Markdown content={msg.content} />
   
                    {/* Copy helper */}
                    {msg.role !== 'user' && (
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        type="button"
                        className="absolute right-2 bottom-2 p-1.5 rounded bg-background/80 hover:bg-card text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-300 cursor-pointer border border-border/40 btn-premium"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                    )}
                  </div>
                  {/* Nicer subtle timestamps */}
                  <span className={`text-[8px] text-muted-foreground/40 px-2 select-none font-light ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Stream output rendering */}
            {isStreaming && streamedText && (
              <div className="flex gap-4 justify-start fade-in-message">
                <div className="w-8 h-8 rounded-xl bg-card border border-border/80 text-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={15} />
                </div>
                <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[70%] items-start">
                  <div className="max-w-full rounded-[20px] rounded-tl-[12px] px-4.5 py-3.5 text-xs leading-relaxed bg-card border border-border/60 text-foreground shadow-sm font-light">
                    <Markdown content={streamedText} />
                    <span className="inline-block h-3 w-1.5 bg-primary rounded-sm animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicators using calm slow-bounce */}
            {isStreaming && !streamedText && (
              <div className="flex gap-4 justify-start fade-in-message">
                <div className="w-8 h-8 rounded-xl bg-card border border-border/80 text-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={15} />
                </div>
                <div className="bg-card border border-border/60 rounded-[20px] rounded-tl-[12px] px-4.5 py-3.5 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-slow-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-slow-bounce" style={{ animationDelay: '250ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-slow-bounce" style={{ animationDelay: '500ms' }} />
                </div>
              </div>
            )}

            {/* Error notifications */}
            {error && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold">Generation Issue</p>
                  <p className="font-light">{error}</p>
                </div>
                <button 
                  onClick={handleRetry}
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 btn-premium"
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
      <div className="p-4 bg-background/30 backdrop-blur-sm border-t border-border/60 shrink-0">
        {isStreaming && (
          <div className="flex justify-center mb-3">
            <button
              onClick={handleStopGeneration}
              type="button"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border bg-card hover:bg-card/80 text-[10px] text-muted-foreground font-bold transition-all duration-300 shadow-md cursor-pointer btn-premium"
            >
              <Square size={10} className="fill-muted-foreground/60 text-muted-foreground/60" />
              Stop Responding
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="max-w-2xl mx-auto w-full relative flex items-end p-2 bg-card/65 border border-border/80 focus-within:border-primary/40 rounded-[24px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={isStreaming ? "Thinking..." : "Type whatever's on your mind..."}
            className="w-full pl-4 pr-12 py-3 bg-transparent border-none outline-none text-foreground text-xs focus:ring-0 focus:outline-none placeholder:text-muted-foreground/40 font-light resize-none max-h-40 overflow-y-auto scrollbar-none"
            aria-label="Message companion input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="absolute right-3.5 bottom-3.5 p-2.5 bg-primary hover:bg-rose-soft/85 disabled:opacity-30 text-background rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 w-9 h-9 shadow-md btn-premium"
            title="Send message"
          >
            <Send size={14} />
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
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
 
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm p-6 rounded-3xl bg-card border border-border shadow-2xl space-y-6 text-center z-10"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <div className="flex justify-center pt-2">
                <div className="w-10 h-10 rounded-full bg-primary-glow border border-primary/20 text-primary flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
              </div>
 
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-cream-warm">Save your conversation</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed px-2 font-light">
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
                  className="w-full py-2.5 bg-primary hover:bg-rose-soft/80 text-background rounded-xl text-[10px] font-bold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 btn-premium"
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
                  className="w-full py-2.5 bg-transparent border border-border hover:bg-card/45 text-foreground rounded-xl text-[10px] font-bold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 btn-premium"
                >
                  <LogIn size={12} />
                  Continue with password login
                </button>
                
                <button
                  onClick={() => setShowSaveModal(false)}
                  type="button"
                  className="w-full py-2.5 bg-transparent hover:bg-card/30 text-muted-foreground/60 hover:text-foreground rounded-xl text-[10px] font-semibold transition-all duration-300 cursor-pointer btn-premium"
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
      <div className="h-full flex flex-col bg-background relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-glow blur-[140px] pointer-events-none opacity-40 animate-pulse" />
        
        {/* Top Info Bar Shimmer */}
        <div className="h-16 border-b border-border bg-background/45 backdrop-blur-sm px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 w-1/3">
            <div className="w-8 h-8 rounded-lg bg-card/60 animate-pulse border border-border shimmer-bg" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 bg-card/80 rounded animate-pulse w-24 shimmer-bg" />
              <div className="h-1.5 bg-card/60 rounded animate-pulse w-12 shimmer-bg" />
            </div>
          </div>
        </div>

        {/* Shimmer Messages list */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-3xl mx-auto w-full">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex gap-4 ${n % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              {n % 2 !== 0 && <div className="w-8 h-8 rounded-xl bg-card border border-border/80 animate-pulse shrink-0 shimmer-bg" />}
              <div className="space-y-2 max-w-[70%] flex-1">
                <div className={`h-12 rounded-2xl animate-pulse ${n % 2 === 0 ? 'bg-primary/20 ml-auto' : 'bg-card/50 border border-border/40'} w-48 shimmer-bg`} />
                <div className={`h-3.5 rounded animate-pulse bg-card/30 w-16 ${n % 2 === 0 ? 'ml-auto mr-2' : 'ml-2'} shimmer-bg`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <ChatFormContent />
    </Suspense>
  );
}
