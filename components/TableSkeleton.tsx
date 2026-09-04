// Skeleton loading placeholder matching table rows and column layouts during data fetching.
import React from "react";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 6, rows = 6 }: TableSkeletonProps) {
  return (
    <div className="w-full animate-pulse space-y-4">
      <div className="flex items-center justify-between pb-4">
        <div className="h-6 w-48 bg-zinc-800/60 rounded-md" />
        <div className="h-9 w-28 bg-zinc-800/60 rounded-md" />
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
        <div className="grid grid-flow-col auto-cols-fr gap-4 px-6 py-3.5 bg-zinc-900/80 border-b border-zinc-800">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`th-${i}`} className="h-4 bg-zinc-800/80 rounded w-3/4" />
          ))}
          <div className="h-4 bg-zinc-800/80 rounded w-16 justify-self-end" />
        </div>

        <div className="divide-y divide-zinc-800/60">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={`row-${r}`}
              className="grid grid-flow-col auto-cols-fr gap-4 px-6 py-4 items-center"
            >
              {Array.from({ length: columns }).map((_, c) => (
                <div
                  key={`cell-${r}-${c}`}
                  className="h-4 bg-zinc-800/50 rounded"
                  style={{ width: `${Math.max(45, (c * 17 + 55) % 90)}%` }}
                />
              ))}
              <div className="flex justify-end gap-2">
                <div className="h-7 w-12 bg-zinc-800/60 rounded" />
                <div className="h-7 w-12 bg-zinc-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
