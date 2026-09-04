// app/(dashboard)/chat/page.tsx
// Full chat interface matching the app's aesthetic, with message list and live step trace.
"use client";

import { useState } from "react";
import MessageList, { type ChatMessage } from "@/components/chat/message-list";
import ChatInput from "@/components/chat/chat-input";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };

    const loadingPlaceholder: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for the API
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server responded with status ${res.status}`,
        );
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant_reply_${Date.now()}`,
        role: "assistant",
        content: data.reply || "No reply generated.",
        steps: data.steps || [],
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingPlaceholder.id ? assistantMessage : m)),
      );
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Agent Error:** ${
          err instanceof Error ? err.message : String(err)
        }\n\nPlease check your query or verify database connectivity.`,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingPlaceholder.id ? errorMessage : m)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (isLoading) return;
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/20 ring-1 ring-white/10">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white tracking-tight">
                  CampusOS Agent
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live DB
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Autonomous tool calling over campus schedules, rooms, events &amp; assignments
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={isLoading}
              className="text-xs text-gray-400 hover:text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Clear conversation"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* Main chat layout */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
        <MessageList
          messages={messages}
          onSelectSuggestion={(prompt) => {
            setInput(prompt);
            handleSendMessage(prompt);
          }}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
