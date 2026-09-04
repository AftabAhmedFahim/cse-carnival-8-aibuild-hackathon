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

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
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
    </div>
  );
}
