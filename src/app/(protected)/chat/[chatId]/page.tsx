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
  AlertCircle
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
  useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    enabled: !!chatId,
  });

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
    enabled: !!chatId,
  });

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

      // Stream completed successfully. Save response in Supabase DB.
      const { error: saveError } = await supabase
        .from('messages')
        .insert({
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
          await supabase
            .from('messages')
            .insert({
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
        router.push('/dashboard');
      }
    }
  };

  if (isConvLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-950">
        <Loader2 className="animate-spin text-violet-400" size={24} />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-950 space-y-4">
        <p className="text-sm">Conversation not found.</p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="text-xs text-violet-400 hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 dark:bg-slate-950 light:bg-slate-50 transition-colors duration-200">
      
      {/* Active Companion Top Info Bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-900 bg-slate-905/40 backdrop-blur-sm dark:border-slate-800/80 light:border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          
          {conversation.companionAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={conversation.companionAvatar} 
              alt={conversation.companionName} 
              className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 shrink-0" 
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-violet-400" />
            </div>
          )}
          
          <div>
            <h1 className="text-xs font-bold text-slate-200 dark:text-slate-200 light:text-slate-900">
              {conversation.companionName}
            </h1>
            <p className="text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
            </p>
          </div>
        </div>

        {/* Delete Chat Button */}
        <button
          onClick={handleDeleteChat}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-900/60 dark:hover:bg-slate-950/60 light:hover:bg-white rounded-lg transition-all cursor-pointer"
          title="Delete Chat"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {isMessagesLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Loader2 className="animate-spin text-slate-500" size={20} />
          </div>
        ) : messages.length === 0 && !streamedText ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <Bot size={20} />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-xs font-bold text-slate-300 dark:text-slate-300 light:text-slate-800">
                Say hello to {conversation.companionName}!
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-550 leading-normal">
                Type a message in the input below. Your companion will respond in real-time using Groq.
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
                    className={`flex items-start gap-3 group/msg ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar for Assistant */}
                    {!isUser && (
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-[10px]">
                        {conversation.companionAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={conversation.companionAvatar} alt="" className="w-full h-full rounded-lg" />
                        ) : (
                          <Bot size={14} />
                        )}
                      </div>
                    )}

                    {/* Chat Bubble & Copy/Retry Actions */}
                    <div className="flex flex-col gap-1 max-w-[80%] items-start">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm w-full ${
                          isUser
                            ? 'bg-violet-600 text-white rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 dark:bg-slate-900/60 dark:border-slate-850 dark:text-slate-200 light:bg-white light:border-slate-200 light:text-slate-850 rounded-tl-none'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <Markdown content={msg.content} />
                        )}
                      </div>
                      
                      {/* Action buttons on message hover */}
                      <div className={`opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 text-[10px] text-slate-500 pl-1 mt-0.5 transition-opacity ${isUser ? 'self-end pr-1' : ''}`}>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-slate-300 flex items-center gap-0.5 cursor-pointer py-0.5 px-1 rounded hover:bg-slate-900/60 light:hover:bg-slate-200"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        
                        {!isUser && isLastMsg && !isStreaming && (
                          <button
                            onClick={handleRetry}
                            className="hover:text-slate-300 flex items-center gap-0.5 cursor-pointer py-0.5 px-1 rounded hover:bg-slate-900/60 light:hover:bg-slate-200"
                          >
                            <RotateCcw size={10} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Avatar for User */}
                    {isUser && (
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 text-[10px]">
                        <UserIcon size={14} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {/* Live Streaming Active Bubble */}
            {isStreaming && streamedText && (
              <div className="flex items-start gap-3 justify-start">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  {conversation.companionAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conversation.companionAvatar} alt="" className="w-full h-full rounded-lg" />
                  ) : (
                    <Bot size={14} />
                  )}
                </div>
                <div className="flex flex-col gap-1 max-w-[80%] items-start">
                  <div className="rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm bg-slate-900 border border-slate-800 text-slate-200 dark:bg-slate-900/60 dark:border-slate-850 dark:text-slate-200 light:bg-white light:border-slate-200 light:text-slate-850 rounded-tl-none w-full">
                    <Markdown content={streamedText} />
                    <span className="inline-block h-3 w-1.5 bg-violet-400 rounded-sm animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Standard Loading Typing indicator */}
            {isStreaming && !streamedText && (
              <div className="flex items-start gap-3 justify-start animate-fade-in">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  <Bot size={14} />
                </div>
                <div className="bg-slate-900 border border-slate-800 dark:bg-slate-900/60 dark:border-slate-850 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Error Message bar */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-3 max-w-xl mx-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
                {!isStreaming && (
                  <button 
                    onClick={handleRetry}
                    className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
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
      <div className="p-4 border-t border-slate-900 dark:border-slate-800/80 light:border-slate-200 bg-slate-950 shrink-0">
        
        {/* Stream control bar */}
        {isStreaming && (
          <div className="flex justify-center mb-3">
            <button
              onClick={handleStopGeneration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 font-bold transition-all shadow-md cursor-pointer"
            >
              <Square size={10} className="fill-slate-300" />
              Stop Responding
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
            placeholder={isStreaming ? "Companion is thinking..." : `Message ${conversation.companionName}...`}
            className="w-full pl-4 pr-12 py-3 bg-slate-900/40 border border-slate-800/80 focus:border-violet-500/50 rounded-xl text-slate-250 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500 dark:bg-slate-950/60 dark:border-slate-800 light:bg-white light:border-slate-200 light:text-slate-850"
            aria-label={`Message text for ${conversation.companionName}`}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="absolute right-2 p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Send Message"
            aria-label="Send message"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

    </div>
  );
}
