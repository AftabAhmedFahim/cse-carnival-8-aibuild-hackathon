// components/chat/step-trace.tsx
// Collapsible "thought / tool execution" drawer under each agent message showing:
// tool name, input arguments, execution duration, and output preview.
"use client";

import { useState } from "react";

export interface StepRecord {
  id: string;
  toolName: string;
  input: string;
  output: string;
  durationMs?: number;
  createdAt: string | Date;
}

// ---------------------------------------------------------------------------
// Human-readable labels and formatting helpers
// ---------------------------------------------------------------------------

function formatToolName(name: string): { label: string; icon: string; color: string } {
  const meta: Record<string, { label: string; icon: string; color: string }> = {
    list_records: {
      label: "List Records",
      icon: "📋",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    create_record: {
      label: "Create Record",
      icon: "✏️",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    update_record: {
      label: "Update Record",
      icon: "🔄",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    delete_record: {
      label: "Delete Record",
      icon: "🗑️",
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    find_free_rooms: {
      label: "Find Free Rooms",
      icon: "🔍",
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    },
    book_room: {
      label: "Book Room",
      icon: "📅",
      color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    cancel_booking: {
      label: "Cancel Booking",
      icon: "❌",
      color: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    register_event: {
      label: "Register Event",
      icon: "🎟️",
      color: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    },
  };
  return meta[name] || {
    label: name,
    icon: "⚙️",
    color: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
}

function formatInputPreview(name: string, rawInput: string): string {
  try {
    const data = JSON.parse(rawInput);
    switch (name) {
      case "list_records": {
        const parts = [`system: "${data.system}"`];
        if (data.filters && Object.keys(data.filters).length > 0) {
          const filterStr = Object.entries(data.filters)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(", ");
          parts.push(`filters: { ${filterStr} }`);
        }
        return parts.join(" · ");
      }
      case "find_free_rooms": {
        const parts = [`date: "${data.date}"`, `time: ${data.startTime}–${data.endTime}`];
        if (data.minCapacity) parts.push(`minCap: ${data.minCapacity}`);
        if (data.equipment?.length) parts.push(`eq: [${data.equipment.join(", ")}]`);
        return parts.join(" · ");
      }
      case "book_room":
        return `roomId: "${data.roomId}" · ${data.date} ${data.startTime}–${data.endTime} · by: "${data.bookedBy}"`;
      case "cancel_booking":
        return `bookingId: "${data.bookingId}"`;
      case "register_event":
        return `eventId: "${data.eventId}" · student: "${data.studentName}"`;
      case "create_record":
        return `system: "${data.system}" · fields: [${Object.keys(data.data || {}).join(", ")}]`;
      case "update_record":
        return `system: "${data.system}" · id: "${data.id}" · fields: [${Object.keys(data.data || {}).join(", ")}]`;
      case "delete_record":
        return `system: "${data.system}" · id: "${data.id}"`;
      default:
        return Object.entries(data)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(", ");
    }
  } catch {
    return rawInput;
  }
}

function formatOutputPreview(rawOutput: string): { preview: string; isError: boolean; count?: number } {
  try {
    const data = JSON.parse(rawOutput);

    if (data.error) {
      return { preview: data.error, isError: true };
    }

    if (data.message) {
      return { preview: data.message, isError: false };
    }

    if (Array.isArray(data)) {
      const count = data.length;
      if (count === 0) {
        return { preview: "0 records matched query", isError: false, count: 0 };
      }
      const items = data.slice(0, 3).map((item: Record<string, unknown>) => {
        const id = item.id || item.roomNumber || item.course || "item";
        const title = item.name || item.title || item.courseTitle || item.roomNumber || "";
        return title ? `${id} (${title})` : String(id);
      });
      let text = `${count} record${count > 1 ? "s" : ""}: ${items.join(", ")}`;
      if (count > 3) text += ` +${count - 3} more`;
      return { preview: text, isError: false, count };
    }

    if (typeof data === "object" && data !== null) {
      const keys = Object.keys(data);
      const preview = keys
        .slice(0, 4)
        .map((k) => `${k}: ${JSON.stringify(data[k])}`)
        .join(", ");
      return { preview, isError: false };
    }

    return { preview: String(data), isError: false };
  } catch {
    return { preview: rawOutput.slice(0, 150), isError: false };
  }
}

// ---------------------------------------------------------------------------
// StepTrace Component
// ---------------------------------------------------------------------------

export default function StepTrace({ steps }: { steps: StepRecord[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  return (
    <div className="mt-3.5 pt-3 border-t border-[rgba(255,255,255,0.08)]">
      {/* Collapsible toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs px-3.5 py-2.5 rounded-full bg-[#141416] hover:bg-[#1a1a1c] border border-[rgba(255,255,255,0.08)] text-[#8e8e8e] hover:text-white transition-all duration-150 group shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-5 h-5 rounded-full bg-[#28282a] text-white border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[11px] font-medium">
            ⚡
          </div>
          <span className="font-semibold text-white">
            {steps.length} tool execution{steps.length > 1 ? "s" : ""}
          </span>
          <span className="text-[#8e8e8e] text-[11px]">
            ({totalDuration > 0 ? `${totalDuration}ms` : "completed"})
          </span>
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            {steps.map((s, idx) => {
              const { label } = formatToolName(s.toolName);
              return (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#28282a] text-white font-mono"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#8e8e8e] group-hover:text-white">
          <span>{isOpen ? "Hide trace" : "View trace"}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded drawer */}
      {isOpen && (
        <div className="mt-2.5 space-y-2 pl-2 sm:pl-3 border-l-2 border-white/20 ml-2">
          {steps.map((step, idx) => {
            const { label, icon, color } = formatToolName(step.toolName);
            const inputPreview = formatInputPreview(step.toolName, step.input);
            const { preview: outputPreview, isError } = formatOutputPreview(step.output);
            const isItemExpanded = expandedIndex === idx;

            return (
              <div
                key={step.id || idx}
                className="bg-[#121214] rounded-2xl border border-[rgba(255,255,255,0.08)] p-3.5 text-xs transition-all shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
              >
                {/* Step header */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8e8e8e] font-mono text-[11px]">{idx + 1}.</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${color}`}>
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                    <code className="text-[#8e8e8e] text-[11px] font-mono">
                      {step.toolName}
                    </code>
                  </div>

                  <div className="flex items-center gap-2">
                    {step.durationMs !== undefined && (
                      <span className="text-[11px] text-[#8e8e8e] font-mono">
                        {step.durationMs}ms
                      </span>
                    )}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isError ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      title={isError ? "Execution error" : "Success"}
                    />
                  </div>
                </div>

                {/* Input row */}
                <div className="mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-[#8e8e8e] font-semibold mb-1">
                    Input Arguments
                  </div>
                  <div className="bg-black rounded-xl p-2.5 font-mono text-[11px] text-white border border-[rgba(255,255,255,0.08)] overflow-x-auto whitespace-pre-wrap break-all">
                    {inputPreview}
                  </div>
                </div>

                {/* Output preview */}
                <div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#8e8e8e] font-semibold mb-1">
                    <span>Output Preview</span>
                    <button
                      onClick={() => setExpandedIndex(isItemExpanded ? null : idx)}
                      className="text-white hover:text-zinc-300 lowercase font-normal hover:underline"
                    >
                      {isItemExpanded ? "collapse raw json" : "view raw json"}
                    </button>
                  </div>
                  <div
                    className={`rounded-xl p-2.5 font-mono text-[11px] border overflow-x-auto whitespace-pre-wrap break-all ${
                      isError
                        ? "bg-rose-950/30 text-rose-300 border-rose-900/40"
                        : "bg-black text-emerald-400 border-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    {isItemExpanded ? step.output : outputPreview}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
