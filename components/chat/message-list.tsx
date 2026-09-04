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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4 ring-1 ring-white/20">
            <svg
              className="w-8 h-8 text-white"
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

          <h2 className="text-xl font-bold text-white mb-2">CampusOS AI Agent</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Query live university schedules, check available rooms, track assignments,
            and inspect real-time tool execution traces.
          </p>

          <div className="w-full space-y-2 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">
              Suggested queries
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="flex items-center justify-between text-xs text-gray-300 hover:text-white bg-gray-900/70 hover:bg-gray-800/90 border border-gray-800 hover:border-indigo-500/40 rounded-xl px-4 py-3 transition-all duration-150 text-left group"
                >
                  <span>{suggestion}</span>
                  <span className="text-gray-500 group-hover:text-indigo-400 font-mono text-[11px] transition-colors">
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
            className={`flex items-start gap-3 ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            {/* Assistant avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 text-white text-xs font-bold ring-1 ring-white/20 mt-0.5">
                🤖
              </div>
            )}

            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 transition-all ${
                isUser
                  ? "bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20 text-sm leading-relaxed whitespace-pre-wrap"
                  : "bg-gray-900/90 border border-gray-800 text-gray-100 rounded-tl-sm shadow-lg shadow-black/40"
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-3 py-1 text-sm text-gray-400">
                  <div className="flex gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-xs text-indigo-300 font-medium">
                    Reasoning &amp; executing tools over live data…
                  </span>
                </div>
              ) : isUser ? (
                message.content
              ) : (
                <>
                  {/* Rich Markdown Output */}
                  <div className="prose prose-invert prose-sm max-w-none text-gray-200 text-sm leading-relaxed overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="my-3 overflow-x-auto rounded-lg border border-gray-800">
                            <table className="min-w-full divide-y divide-gray-800 text-left text-xs">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-950/80 text-gray-300 uppercase tracking-wider font-semibold">
                            {children}
                          </thead>
                        ),
                        th: ({ children }) => (
                          <th className="px-3 py-2 text-gray-400 border-b border-gray-800 font-medium">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3 py-2 border-b border-gray-800/60 font-mono text-[12px] text-gray-300">
                            {children}
                          </td>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="px-1.5 py-0.5 rounded bg-gray-950 text-indigo-300 font-mono text-[12px] border border-gray-800">
                              {children}
                            </code>
                          ) : (
                            <pre className="p-3 my-2 rounded-xl bg-gray-950 text-gray-300 font-mono text-xs border border-gray-800 overflow-x-auto">
                              <code>{children}</code>
                            </pre>
                          );
                        },
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 space-y-1 my-2 text-gray-300">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-4 space-y-1 my-2 text-gray-300">
                            {children}
                          </ol>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-base font-bold text-white mt-3 mb-1">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-sm font-bold text-indigo-300 mt-3 mb-1">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-2 mb-1">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="my-1.5 leading-relaxed">{children}</p>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 text-gray-400 italic text-xs">
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
              <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-gray-300 text-xs font-semibold mt-0.5">
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
