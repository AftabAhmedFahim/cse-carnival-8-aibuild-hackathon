// components/chat/message-list.tsx
// Message history with rich Markdown rendering and collapsible step traces.
"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StepTrace, { type StepRecord } from "./step-trace";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: StepRecord[];
  isLoading?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
  onSelectSuggestion: (prompt: string) => void;
}

const SAMPLE_SUGGESTIONS = [
  "When is my next class?",
  "Find me a free room right now",
  "Show me all high priority announcements",
  "What assignments are due this week?",
  "Book room 7A01 today from 14:00 to 15:00 for study group",
];

export default function MessageList({
  messages,
  onSelectSuggestion,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center max-w-xl mx-auto py-8">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.16)] mb-4 ring-1 ring-white/20 text-black">
            <svg
              className="w-7 h-7 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">CampusOS AI Assistant</h2>
          <p className="text-sm text-[#8e8e8e] mb-6 leading-relaxed">
            Query live university schedules, check available rooms, track assignments,
            and inspect real-time tool execution traces.
          </p>

          <div className="w-full space-y-2 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8e8e8e] px-1">
              Suggested queries
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="flex items-center justify-between text-xs text-white bg-[#0d0d0d] hover:bg-[#141416] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.3)] rounded-full px-5 py-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] text-left group shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
                >
                  <span className="group-hover:text-zinc-100 transition-colors">{suggestion}</span>
                  <span className="text-[#8e8e8e] group-hover:text-white group-hover:translate-x-1.5 font-mono text-[11px] transition-all duration-200">
                    Ask &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            className={`flex items-start gap-3 animate-message-enter ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            {/* Assistant avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.16)] text-black text-xs font-bold ring-1 ring-white/20 mt-0.5 transform hover:scale-105 transition-transform">
                🤖
              </div>
            )}

            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 transition-all duration-200 ${
                isUser
                  ? "bg-[#28282a] text-white border border-[rgba(255,255,255,0.08)] rounded-tr-sm shadow-[0_4px_14px_rgba(0,0,0,0.16)] text-sm leading-relaxed whitespace-pre-wrap hover:border-[rgba(255,255,255,0.15)]"
                  : "bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-white rounded-tl-sm shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:border-[rgba(255,255,255,0.15)]"
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-3 py-1 text-sm text-[#8e8e8e]">
                  <div className="flex gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-xs text-white font-medium animate-pulse">
                    Reasoning &amp; executing tools over live data…
                  </span>
                </div>
              ) : isUser ? (
                message.content
              ) : (
                <>
                  {/* Rich Markdown Output */}
                  <div className="prose prose-invert prose-sm max-w-none text-white text-sm leading-relaxed overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="my-3 overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)]">
                            <table className="min-w-full divide-y divide-[rgba(255,255,255,0.08)] text-left text-xs">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-[#141416] text-[#8e8e8e] uppercase tracking-wider font-semibold">
                            {children}
                          </thead>
                        ),
                        th: ({ children }) => (
                          <th className="px-3 py-2 text-[#8e8e8e] border-b border-[rgba(255,255,255,0.08)] font-medium">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)] font-mono text-[12px] text-white">
                            {children}
                          </td>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="px-1.5 py-0.5 rounded-md bg-[#161618] text-white font-mono text-[12px] border border-[rgba(255,255,255,0.08)]">
                              {children}
                            </code>
                          ) : (
                            <pre className="p-3 my-2 rounded-xl bg-[#141416] text-white font-mono text-xs border border-[rgba(255,255,255,0.08)] overflow-x-auto">
                              <code>{children}</code>
                            </pre>
                          );
                        },
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 space-y-1 my-2 text-white">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-4 space-y-1 my-2 text-white">
                            {children}
                          </ol>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-base font-bold text-white mt-3 mb-1">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-sm font-bold text-white mt-3 mb-1">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8e8e8e] mt-2 mb-1">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="my-1.5 leading-relaxed text-white">{children}</p>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-white/40 pl-3 my-2 text-[#8e8e8e] italic text-xs">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Collapsible Step Trace */}
                  {message.steps && message.steps.length > 0 && (
                    <StepTrace steps={message.steps} />
                  )}
                </>
              )}
            </div>

            {/* User avatar */}
            {isUser && (
              <div className="w-8 h-8 rounded-full bg-[#28282a] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shrink-0 text-white text-xs font-semibold mt-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
                👤
              </div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
