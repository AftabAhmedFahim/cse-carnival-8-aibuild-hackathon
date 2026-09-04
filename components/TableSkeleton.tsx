// Skeleton loading placeholder matching table rows and column layouts during data fetching.
import React from "react";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 6, rows = 6 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between pb-4">
        <div className="h-6 w-48 rounded-full skeleton-shimmer bg-[#1a1a1c]" />
        <div className="h-9 w-28 rounded-full skeleton-shimmer bg-[#1a1a1c]" />
      </div>

      <div className="border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden bg-[#0d0d0d]">
        <div className="grid grid-flow-col auto-cols-fr gap-4 px-6 py-3.5 bg-[#141416] border-b border-[rgba(255,255,255,0.08)]">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`th-${i}`} className="h-3.5 skeleton-shimmer bg-[#222226] rounded-full w-3/4" />
          ))}
          <div className="h-3.5 skeleton-shimmer bg-[#222226] rounded-full w-16 justify-self-end" />
        </div>

        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={`row-${r}`}
              className="grid grid-flow-col auto-cols-fr gap-4 px-6 py-4 items-center"
            >
              {Array.from({ length: columns }).map((_, c) => (
                <div
                  key={`cell-${r}-${c}`}
                  className="h-3.5 skeleton-shimmer bg-[#18181c] rounded-full"
                  style={{ width: `${Math.max(40, (c * 19 + 50) % 85)}%` }}
                />
              ))}
              <div className="flex justify-end gap-2">
                <div className="h-6 w-12 skeleton-shimmer bg-[#222226] rounded-full" />
                <div className="h-6 w-12 skeleton-shimmer bg-[#222226] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
