'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

const Markdown = dynamic(() => import('@/components/ui/Markdown'), {
  ssr: false,
  loading: () => <span className="text-slate-400/80 text-[10px] animate-pulse">Generating layout...</span>
});
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  ArrowLeft,
  Loader2,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Square,
  AlertCircle,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  companionName: string;
  companionAvatar: string | null;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirectTo=/chat/${chatId}`);
    }
  }, [user, authLoading, router, chatId]);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch active conversation details
  const { data: conversation, isLoading: isConvLoading } = useQuery<Conversation | null>({
    queryKey: ['conversation', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, companion_name, companion_avatar')
        .eq('id', chatId)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        return null;
      }

      return {
        id: data.id,
        companionName: data.companion_name,
        companionAvatar: data.companion_avatar,
      };
    },
    enabled: !!chatId && !!user,
  });

  // Emotional Modes State resolved from companionName (which stores the active mode)
  const activeMode = conversation?.companionName || 'Just Listen';

  const handleModeChange = async (modeName: string) => {
    if (!user || !conversation) return;
    
    // Update local query cache immediately to keep UX feel instant
    queryClient.setQueryData(['conversation', chatId], (old: Conversation | null) => {
      if (!old) return null;
      return { ...old, companionName: modeName };
    });

    // Run remote Supabase update query
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ companion_name: modeName })
      .eq('id', chatId);

    if (updateError) {
      console.error('Failed to update emotional mode:', updateError);
    }

    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  // 2. Fetch conversation message logs
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      interface MessageRow {
        id: string;
        role: string;
        content: string;
        created_at: string;
      }

      return (data || []).map((msg: MessageRow) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        createdAt: msg.created_at,
      }));
    },
    enabled: !!chatId && !!user,
  });

  // Scroll to bottom when messages or streamed text updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText]);

  // Initial focus on mount
  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [chatId]);

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

  // 3. Core Stream function
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
          chatId,
          messages: history.map(h => ({ role: h.role, content: h.content })),
          mode: activeMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError = 'Failed to generate response.';
        try {
          const jsonError = JSON.parse(errorText);
          parsedError = jsonError.error || parsedError;
        } catch {
          parsedError = errorText || parsedError;
        }
        throw new Error(parsedError);
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

      // Stream completed successfully. Optimistically save in react query first to prevent disappearances
      const assistantMsgId = crypto.randomUUID();
      queryClient.setQueryData(['messages', chatId], (old: Message[] = []) => [
        ...old,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: accumulated,
          createdAt: new Date().toISOString()
        }
      ]);

      const { error: saveError } = await supabase
        .from('messages')
        .insert({
          id: assistantMsgId,
          conversation_id: chatId,
          role: 'assistant',
          content: accumulated,
        });

      if (saveError) throw saveError;

      // Update conversation timestamp for sidebar order
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User clicked STOP generation. Save whatever we received so far.
        if (streamedText.trim()) {
          const finalContent = `${streamedText}\n\n*[Response stopped by user]*`;
          const assistantMsgId = crypto.randomUUID();
          
          queryClient.setQueryData(['messages', chatId], (old: Message[] = []) => [
            ...old,
            {
              id: assistantMsgId,
              role: 'assistant',
              content: finalContent,
              createdAt: new Date().toISOString()
            }
          ]);

          await supabase
            .from('messages')
            .insert({
              id: assistantMsgId,
              conversation_id: chatId,
              role: 'assistant',
              content: finalContent,
            });

          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId);

          queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

    try {
      // A. Optimistically write User message to DB
      const { data: userMsg, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: chatId,
          role: 'user',
          content: messageContent,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update react query cache immediately (avoid full query refresh delay)
      queryClient.setQueryData(['messages', chatId], (old: Message[] = []) => [
        ...old,
        {
          id: userMsg.id,
          role: 'user',
          content: messageContent,
          createdAt: userMsg.created_at,
        },
      ]);

      // B. Trigger AI Streaming call
      const updatedHistory = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: messageContent }
      ];
      await streamAiResponse(updatedHistory);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to write message.';
      setError(errMsg);
    }
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

    try {
      if (lastMsg.role === 'assistant') {
        // Delete the last assistant message from database first
        const { error: deleteError } = await supabase
          .from('messages')
          .delete()
          .eq('id', lastMsg.id);

        if (deleteError) throw deleteError;

        // Strip it from our local array
        updatedHistory = messages.slice(0, -1);
        queryClient.setQueryData(['messages', chatId], updatedHistory);
      }

      // Compile query history
      const queryHistory = updatedHistory.map(m => ({ role: m.role, content: m.content }));
      if (queryHistory.length === 0) return;

      await streamAiResponse(queryHistory);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to retry response.';
      setError(errMsg);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDeleteChat = async () => {
    if (confirm('Delete this conversation permanently?')) {
      const { error } = await supabase.from('conversations').delete().eq('id', chatId);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        router.push('/chat');
      }
    }
  };

  // Render a custom shimmer skeleton loading screen for conversation info
  if (isConvLoading) {
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

  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-background space-y-4">
        <p className="text-xs font-light">Conversation not found.</p>
        <button 
          onClick={() => router.push('/chat')}
          className="text-xs text-primary hover:underline font-bold transition-all btn-premium cursor-pointer animate-pulse"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground relative font-sans">
      
      {/* Soft ambient background glow inside chat pane */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-glow blur-[140px] pointer-events-none opacity-40 animate-pulse" />

      {/* Active Companion Top Info Bar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-background/45 backdrop-blur-sm shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/chat')}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/40 cursor-pointer transition-all duration-300 btn-premium"
          >
            <ArrowLeft size={16} />
          </button>
          
          {conversation.companionAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={conversation.companionAvatar} 
              alt={conversation.companionName} 
              className="w-8 h-8 rounded-lg bg-background border border-border shrink-0 shadow-sm" 
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
              <Bot size={14} className="text-primary" />
            </div>
          )}
          
          <div>
            <h1 className="text-xs font-bold text-cream-warm tracking-wide uppercase">
              Solace
            </h1>
            <p className="text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> companion online
            </p>
          </div>
        </div>

        {/* Delete Chat Button */}
        <button
          onClick={handleDeleteChat}
          className="p-2 text-muted-foreground/60 hover:text-rose-soft hover:bg-card/45 rounded-lg transition-all duration-300 cursor-pointer btn-premium"
          title="Delete Chat"
        >
          <Trash2 size={16} />
        </button>
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

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {isMessagesLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin text-muted-foreground/50" size={20} />
          </div>
        ) : messages.length === 0 && !streamedText ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 fade-in-message select-none">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border text-primary shadow-lg shadow-black/10 shadow-primary/5 animate-pulse flex items-center justify-center">
              <Heart size={22} className="fill-primary/10 text-primary" />
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold text-cream-warm tracking-wider uppercase">Solace</h2>
              <p className="text-xs text-muted-foreground/85 leading-relaxed font-light">
                You don&apos;t need the right words.<br />Just start wherever you are.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Rendered History */}
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isLastMsg = index === messages.length - 1;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-4 group/msg fade-in-message ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar for Assistant */}
                    {!isUser && (
                      <div className="shrink-0 w-8 h-8 rounded-xl bg-card border border-border/80 text-primary flex items-center justify-center shadow-sm">
                        {conversation.companionAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={conversation.companionAvatar} alt="" className="w-full h-full rounded-xl" />
                        ) : (
                          <Bot size={15} />
                        )}
                      </div>
                    )}

                    {/* Chat Bubble & Copy/Retry Actions */}
                    <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[70%] items-start">
                      <div
                        className={`rounded-[20px] px-4.5 py-3.5 text-xs leading-relaxed shadow-sm w-full ${
                          isUser
                            ? 'bg-primary text-background rounded-tr-[12px] font-medium'
                            : 'bg-card border border-border/60 text-foreground rounded-tl-[12px] font-light'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <Markdown content={msg.content} />
                        )}
                      </div>
                      
                      {/* Action buttons on message hover */}
                      <div className={`opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 text-[9px] text-muted-foreground/40 pl-1 mt-0.5 transition-opacity duration-300 ${isUser ? 'self-end pr-1' : ''}`}>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-foreground flex items-center gap-0.5 cursor-pointer py-0.5 px-1.5 rounded hover:bg-card transition-all duration-300 btn-premium"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={9} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={9} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        
                        {!isUser && isLastMsg && !isStreaming && (
                          <button
                            onClick={handleRetry}
                            className="hover:text-foreground flex items-center gap-0.5 cursor-pointer py-0.5 px-1.5 rounded hover:bg-card transition-all duration-300 btn-premium"
                          >
                            <RotateCcw size={9} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>

                      {/* Nicer subtle timestamps */}
                      <span className={`text-[8px] text-muted-foreground/35 px-2 select-none font-light ${isUser ? 'self-end' : 'self-start'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Avatar for User */}
                    {isUser && (
                      <div className="shrink-0 w-8 h-8 rounded-xl bg-card border border-border/80 flex items-center justify-center text-muted-foreground shadow-sm">
                        <UserIcon size={14} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {/* Live Streaming Active Bubble */}
            {isStreaming && streamedText && (
              <div className="flex items-start gap-4 justify-start fade-in-message">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-card border border-border/80 text-primary flex items-center justify-center shadow-sm">
                  {conversation.companionAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conversation.companionAvatar} alt="" className="w-full h-full rounded-xl" />
                  ) : (
                    <Bot size={15} />
                  )}
                </div>
                <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[70%] items-start">
                  <div className="rounded-[20px] rounded-tl-[12px] px-4.5 py-3.5 text-xs leading-relaxed shadow-sm bg-card border border-border/60 text-foreground font-light w-full">
                    <Markdown content={streamedText} />
                    <span className="inline-block h-3 w-1.5 bg-primary rounded-sm animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Standard Loading Typing indicator using calm slow-bounce */}
            {isStreaming && !streamedText && (
              <div className="flex items-start gap-4 justify-start fade-in-message">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-card border border-border/80 text-primary flex items-center justify-center shadow-sm">
                  <Bot size={15} />
                </div>
                <div className="bg-card border border-border/60 rounded-[20px] rounded-tl-[12px] px-4.5 py-3.5 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-slow-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-slow-bounce" style={{ animationDelay: '250ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-slow-bounce" style={{ animationDelay: '500ms' }} />
                </div>
              </div>
            )}

            {/* Error Message bar */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-3 max-w-xl mx-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span className="font-light">{error}</span>
                </div>
                {!isStreaming && (
                  <button 
                    onClick={handleRetry}
                    className="px-3.5 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 btn-premium"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Message Form / Stream Actions */}
      <div className="p-4 bg-background/30 backdrop-blur-sm border-t border-border/60 shrink-0">
        
        {/* Stream control bar */}
        {isStreaming && (
          <div className="flex justify-center mb-3">
            <button
              onClick={handleStopGeneration}
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
            aria-label={`Message text input`}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="absolute right-3.5 bottom-3.5 p-2.5 bg-primary hover:bg-rose-soft/85 disabled:opacity-30 text-background rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 w-9 h-9 shadow-md btn-premium"
            title="Send Message"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

    </div>
  );
}
