'use client';

import { useState } from 'react';
import { ShieldCheck, Cpu, Code2, Database, AlertCircle, RefreshCw, Server, CheckCircle2 } from 'lucide-react';

export default function Home() {
  interface TestResponse {
    success: boolean;
    status: string;
    message: string;
    provider: string;
    apiKeyStatus?: string;
    testResponse?: string;
    error?: string;
  }

  const [testResult, setTestResult] = useState<TestResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if public environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseUrlSet = supabaseUrl && !supabaseUrl.includes('your-project-id') && supabaseUrl !== '';

  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isSupabaseKeySet = supabaseKey && !supabaseKey.includes('your-supabase-anon-key') && supabaseKey !== '';

  const runAiTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-ai');
      const data = await res.json() as TestResponse;
      setTestResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setTestResult({
        success: false,
        status: 'error',
        message: 'Failed to call the test-ai API route.',
        provider: 'groq',
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sansSelection">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/20 blur-[120px]" />

      <div className="max-w-4xl w-full z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-950/40 text-violet-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Server size={12} className="animate-pulse" /> Phase 1 Live: Setup & Abstractions
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Solace <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">v2</span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-base">
            Your production-ready, custom-built AI companion web application. 
            All core architectural setups and provider abstractions are configured.
          </p>
        </div>

        {/* Status Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stack Status Card */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
              <Code2 className="text-violet-400" size={18} /> System Initialization
            </h2>

            <div className="space-y-4">
              {/* Next.js Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <span className="text-xs font-bold text-slate-300">N15</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Next.js Framework</p>
                    <p className="text-xs text-slate-500">App Router & Server Components</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Ready
                </span>
              </div>

              {/* Tailwind CSS Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <span className="text-xs font-bold text-slate-300">TW4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tailwind CSS v4</p>
                    <p className="text-xs text-slate-500">Utility-First CSS & Theme Engines</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Active
                </span>
              </div>

              {/* Supabase Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <Database size={14} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Supabase Configuration</p>
                    <p className="text-xs text-slate-500">Client, Server, & Session Cookies</p>
                  </div>
                </div>
                {isSupabaseUrlSet && isSupabaseKeySet ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Configured
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                    <AlertCircle size={12} /> env.local Pending
                  </span>
                )}
              </div>

              {/* AI Provider Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <Cpu size={14} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI Abstraction Layer</p>
                    <p className="text-xs text-slate-500">Provider-Agnostic Interface</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Groq Loaded
                </span>
              </div>
            </div>
          </div>

          {/* AI Connectivity Checker Card */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="text-emerald-400" size={18} /> Connectivity Diagnostic
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                We created a test API route at <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">/api/test-ai</code>.
                Click below to hit this route. It will test if our provider-agnostic factory resolves correctly and verify your API keys.
              </p>

              {testResult && (
                <div className="mt-4 p-4 rounded-xl text-xs font-mono max-h-48 overflow-y-auto bg-slate-950/80 border border-slate-800/50 scrollbar-thin text-slate-300">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Diagnostics Console</span>
                    <span className={`h-2 w-2 rounded-full ${testResult.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
                </div>
              )}
            </div>

            <button
              onClick={runAiTest}
              disabled={loading}
              className="mt-6 w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Running Diagnostic...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Verify AI Abstraction & Connection
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helpful instructions */}
        <div className="p-5 rounded-2xl bg-slate-900/20 border border-slate-800/40 text-center text-xs text-slate-500 space-y-2 max-w-lg mx-auto">
          <p className="font-semibold text-slate-400">💡 Senior Engineer&apos;s Advice</p>
          <p>
            Please copy <code className="text-slate-300">.env.example</code> to <code className="text-slate-300">.env.local</code> (done for you) 
            and replace the placeholders with your actual **Supabase URL**, **Anon Key**, and **Groq API Key**. Then click the Verify button above!
          </p>
        </div>
      </div>
    </main>
  );
}
