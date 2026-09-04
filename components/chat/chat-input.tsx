// components/chat/chat-input.tsx
// Input box with submit on Enter, auto-resize, and disabled state while agent runs.
"use client";

import { useEffect, useRef } from "react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height up to 140px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140,
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="border-t border-[rgba(255,255,255,0.08)] bg-black/90 backdrop-blur-md p-4 sticky bottom-0 z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2 bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-3 focus-within:border-[rgba(255,255,255,0.35)] focus-within:ring-2 focus-within:ring-white/10 transition-all duration-200 shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              isLoading
                ? "Agent is processing your request…"
                : "Ask about classes, rooms, events, or assignments… (Press Enter to send)"
            }
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-[#8e8e8e] resize-none outline-none text-sm leading-relaxed max-h-36 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-9 h-9 rounded-full bg-white hover:bg-zinc-100 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] disabled:bg-[#28282a] disabled:text-[#8e8e8e] disabled:cursor-not-allowed text-black flex items-center justify-center transition-all duration-200 shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:scale-105 active:scale-90"
            title="Send message"
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin text-black"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8e8e8e] mt-2 px-1">
          <span>CampusOS live database agent</span>
          <span>Press Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
