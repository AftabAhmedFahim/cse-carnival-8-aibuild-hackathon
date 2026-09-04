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

    // Priority badges for announcements
    if (key === "priority") {
      const p = String(value).toLowerCase();
      let colorClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
      if (p === "high") {
        colorClass = "bg-rose-950/60 text-rose-300 border-rose-800/80";
      } else if (p === "medium") {
        colorClass = "bg-amber-950/60 text-amber-300 border-amber-800/80";
      } else if (p === "low") {
        colorClass = "bg-blue-950/60 text-blue-300 border-blue-800/80";
      }
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass} capitalize`}
        >
          {String(value)}
        </span>
      );
    }

    // Status badges
    if (key === "status") {
      const s = String(value).toLowerCase();
      let badgeClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
      if (s === "available" || s === "ongoing") {
        badgeClass = "bg-emerald-950/60 text-emerald-300 border-emerald-800/80";
      } else if (s === "upcoming" || s === "submitted") {
        badgeClass = "bg-sky-950/60 text-sky-300 border-sky-800/80";
      } else if (s === "full" || s === "late") {
        badgeClass = "bg-rose-950/60 text-rose-300 border-rose-800/80";
      } else if (s === "pending") {
        badgeClass = "bg-amber-950/60 text-amber-300 border-amber-800/80";
      }
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass} capitalize`}
        >
          {String(value)}
        </span>
      );
    }

    // Deadline check with overdue highlight for assignments
    if (key === "deadline") {
      const deadlineDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue =
        !isNaN(deadlineDate.getTime()) &&
        deadlineDate < today &&
        record.status !== "submitted" &&
        record.status !== "graded";

      return (
        <div className="flex flex-col">
          <span
            className={`font-medium ${
              isOverdue ? "text-rose-400 font-semibold" : "text-zinc-200"
            }`}
          >
            {String(value)}
          </span>
          {isOverdue && (
            <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">
              Overdue
            </span>
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
              className="inline-block px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[11px] rounded border border-zinc-700/60"
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

    return <span className="text-zinc-200">{String(value)}</span>;
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
