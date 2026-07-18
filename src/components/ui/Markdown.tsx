'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownProps {
  content: string;
}

/**
 * Custom Markdown renderer using react-markdown and remark-gfm.
 * Intercepts code blocks to render copyable code components with language labels.
 */
export default function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2 dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize rendering of code elements
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match;

            if (!isInline) {
              return <CodeBlock language={language || 'text'} code={codeString} />;
            }

            return (
              <code 
                className="bg-slate-800/60 dark:bg-slate-900/60 light:bg-slate-200/60 px-1.5 py-0.5 rounded text-[11px] font-mono text-violet-400 dark:text-violet-400 light:text-violet-600 font-bold" 
                {...rest}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-[11px] text-slate-200 dark:border-slate-800 dark:bg-slate-950 light:border-slate-200 light:bg-slate-900">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-500 dark:bg-slate-900 dark:border-slate-800 light:bg-slate-950 light:border-slate-800">
        <span className="uppercase tracking-wider font-semibold">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-200 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400 animate-pulse" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto scrollbar-thin">
        <pre className="text-slate-300 dark:text-slate-300 light:text-slate-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
