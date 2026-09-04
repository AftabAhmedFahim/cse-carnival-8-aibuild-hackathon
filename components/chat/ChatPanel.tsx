// components/chat/ChatPanel.tsx
// ChatPanel composed of MessageList, StepTrace, and ChatInput.
"use client";

import { useState } from "react";
import MessageList, { type ChatMessage } from "./message-list";
import ChatInput from "./chat-input";

export default function ChatPanel() {
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#0d0d0d]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white tracking-tight">
                  CampusOS Agent
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <div className="relative flex items-center justify-center w-2.5 h-2.5">
                    <div className="absolute w-full h-full rounded-full bg-emerald-400 animate-radar-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative z-10" />
                  </div>
                  Live DB
                </span>
              </div>
              <p className="text-xs text-[#8e8e8e]">
                Autonomous tool calling over campus schedules, rooms, events &amp; assignments
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={isLoading}
              className="btn-action-pill text-xs text-[#8e8e8e] hover:text-white bg-[#28282a] hover:bg-[#343438] hover:border-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.08)] px-3.5 py-1.5 rounded-full transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
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
