// Generic data table driven by field configuration array with search, actions, and custom renderers.
"use client";

import React, { useState, useMemo } from "react";
import { SystemConfig } from "@/lib/configs";
import { TableSkeleton } from "./TableSkeleton";
import { EmptyState } from "./EmptyState";

interface DataTableProps<T extends Record<string, any>> {
  config: SystemConfig;
  data: T[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (record: T) => void;
  onDelete: (record: T) => void;
  customActions?: (record: T) => React.ReactNode;
  extraHeaderActions?: React.ReactNode;
}

function getRelativeDateLabel(dateStr: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 14) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -14) return `${Math.abs(diffDays)} days ago`;
  return null;
}

export function DataTable<T extends Record<string, any>>({
  config,
  data,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  customActions,
  extraHeaderActions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const query = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [data, searchTerm]);

  // Format cell contents cleanly according to field and system
  const renderCellContent = (key: string, value: any, record: T) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-zinc-500">—</span>;
    }

    // Color-coded priority badges for announcements
    if (key === "priority") {
      const p = String(value).toLowerCase();
      let badgeStyle = "bg-zinc-800 text-zinc-300 border-zinc-700";
      let dotColor = "bg-zinc-400";

      if (p === "high") {
        badgeStyle = "bg-rose-950/70 text-rose-300 border-rose-700/80";
        dotColor = "bg-rose-400";
      } else if (p === "medium") {
        badgeStyle = "bg-amber-950/70 text-amber-300 border-amber-700/80";
        dotColor = "bg-amber-400";
      } else if (p === "low") {
        badgeStyle = "bg-blue-950/70 text-blue-300 border-blue-700/80";
        dotColor = "bg-blue-400";
      }

      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} capitalize shadow-xs`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {String(value)}
        </span>
      );
    }

    // Status badges
    if (key === "status") {
      const s = String(value).toLowerCase();
      let badgeClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
      if (s === "available" || s === "ongoing") {
        badgeClass = "bg-emerald-950/70 text-emerald-300 border-emerald-700/80";
      } else if (s === "upcoming" || s === "submitted") {
        badgeClass = "bg-sky-950/70 text-sky-300 border-sky-700/80";
      } else if (s === "full" || s === "late") {
        badgeClass = "bg-rose-950/70 text-rose-300 border-rose-700/80";
      } else if (s === "pending") {
        badgeClass = "bg-amber-950/70 text-amber-300 border-amber-700/80";
      }
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeClass} capitalize`}
        >
          {String(value)}
        </span>
      );
    }

    // Deadline check with overdue highlight for assignments
    if (key === "deadline") {
      const deadlineDate = new Date(String(value) + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue =
        !isNaN(deadlineDate.getTime()) &&
        deadlineDate < today &&
        record.status !== "submitted" &&
        record.status !== "graded";

      const relative = getRelativeDateLabel(String(value));

      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs ${
                isOverdue ? "text-rose-400 font-bold" : "text-zinc-200"
              }`}
            >
              {String(value)}
            </span>
            {isOverdue && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800">
                Overdue
              </span>
            )}
          </div>
          {relative && !isOverdue && (
            <span className="text-[11px] text-zinc-400 font-medium mt-0.5">{relative}</span>
          )}
        </div>
      );
    }

    // General date fields with relative hints
    if (key === "date" || key === "assignedDate" || key === "expires" || key === "endDate") {
      const relative = getRelativeDateLabel(String(value));
      return (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-zinc-200">{String(value)}</span>
          {relative && (
            <span className="text-[11px] text-zinc-400 font-medium mt-0.5">{relative}</span>
          )}
        </div>
      );
    }

    // Equipment chips
    if (key === "equipment") {
      let items: string[] = [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = String(value)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (items.length === 0) return <span className="text-zinc-500">—</span>;

      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {items.map((eq, i) => (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 bg-zinc-800/80 text-zinc-300 text-[11px] rounded border border-zinc-700/60"
            >
              {eq}
            </span>
          ))}
        </div>
      );
    }

    // Long description / body truncation
    if (key === "description" || key === "body") {
      const text = String(value);
      return (
        <span className="line-clamp-2 text-zinc-300 text-xs max-w-xs" title={text}>
          {text}
        </span>
      );
    }

    return <span className="text-zinc-200 text-sm">{String(value)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Table Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{config.title}</h2>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {data.length} {data.length === 1 ? "record" : "records"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 sm:w-64 pl-9 pr-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <svg
              className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {extraHeaderActions}

          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add new
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <TableSkeleton columns={config.fields.length} rows={7} />
      ) : data.length === 0 ? (
        <EmptyState
          title={`No ${config.title.toLowerCase()} yet`}
          description={`There are currently no records in ${config.title.toLowerCase()}. Click below to add the first one.`}
          actionLabel={`Add ${config.singularTitle}`}
          onAction={onAdd}
        />
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 border border-zinc-800 rounded-xl bg-zinc-900/20 text-zinc-400">
          No records match your search criteria &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/90 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  {config.fields.map((field) => (
                    <th key={field.key} scope="col" className="px-5 py-3.5 whitespace-nowrap">
                      {field.label}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {filteredData.map((record, index) => {
                  const id = record[config.idKey] || `row-${index}`;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {config.fields.map((field) => (
                        <td
                          key={`${id}-${field.key}`}
                          className="px-5 py-3.5 align-middle whitespace-nowrap"
                        >
                          {renderCellContent(field.key, record[field.key], record)}
                        </td>
                      ))}
                      <td className="px-5 py-3.5 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {customActions && customActions(record)}
                          <button
                            onClick={() => onEdit(record)}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/50 transition-colors focus:outline-none"
                            title="Edit record"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete this ${config.singularTitle.toLowerCase()}?`)) {
                                onDelete(record);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-rose-100 border border-rose-900/50 transition-colors focus:outline-none"
                            title="Delete record"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
