// components/landing/StatsCounter.tsx
// Animated stats row that counts up from 0 on mount with easeOutCubic and 80ms stagger.
// Respects prefers-reduced-motion.
"use client";

import { useEffect, useState } from "react";
import { easeOutCubic, motionTokens } from "@/lib/motion";

export interface LiveStatsData {
  totalClasses: number;
  availableRooms: number;
  upcomingEvents: number;
  assignmentsDue: number;
}

interface StatItemConfig {
  key: keyof LiveStatsData;
  label: string;
  sublabel: string;
  icon: string;
}

const STAT_CONFIGS: StatItemConfig[] = [
  {
    key: "totalClasses",
    label: "Classes Scheduled",
    sublabel: "Weekly live timetable",
    icon: "📅",
  },
  {
    key: "availableRooms",
    label: "Rooms Available",
    sublabel: "Ready for booking",
    icon: "🚪",
  },
  {
    key: "upcomingEvents",
    label: "Upcoming Events",
    sublabel: "Active campus events",
    icon: "🎟️",
  },
  {
    key: "assignmentsDue",
    label: "Assignments Due",
    sublabel: "Academic deliverables",
    icon: "📝",
  },
];

export default function StatsCounter({ stats }: { stats: LiveStatsData }) {
  const [counts, setCounts] = useState<LiveStatsData>({
    totalClasses: 0,
    availableRooms: 0,
    upcomingEvents: 0,
    assignmentsDue: 0,
  });

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setCounts(stats);
      return;
    }

    const duration = motionTokens.durations.counter; // 1200ms
    const startTime = performance.now();
    let animFrame: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      let allDone = true;

      const nextCounts: LiveStatsData = { ...stats };

      STAT_CONFIGS.forEach((item, index) => {
        const itemDelay = index * motionTokens.delays.statsStagger; // 80ms stagger
        const itemElapsed = elapsed - itemDelay;

        if (itemElapsed <= 0) {
          nextCounts[item.key] = 0;
          allDone = false;
        } else if (itemElapsed >= duration) {
          nextCounts[item.key] = stats[item.key];
        } else {
          allDone = false;
          const progress = itemElapsed / duration;
          const eased = easeOutCubic(progress);
          nextCounts[item.key] = Math.round(eased * stats[item.key]);
        }
      });

      setCounts(nextCounts);

      if (!allDone) {
        animFrame = requestAnimationFrame(animate);
      } else {
        setCounts(stats);
      }
    };

    animFrame = requestAnimationFrame(animate);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [stats]);

  return (
    <div className="w-full max-w-5xl mx-auto animate-landing-stats">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {STAT_CONFIGS.map((item, idx) => {
          const value = counts[item.key];
          return (
            <div
              key={item.key}
              className="p-3.5 sm:p-4 rounded-2xl card-interactive flex flex-col justify-between group cursor-default"
              style={{
                animationDelay: `${motionTokens.delays.statsBase + idx * motionTokens.delays.statsStagger}ms`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base sm:text-lg inline-block transform group-hover:scale-125 transition-transform duration-300">
                  {item.icon}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8e8e8e] group-hover:text-white transition-colors">
                  Live DB
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums group-hover:text-zinc-100 transition-colors">
                  {value}
                </div>
                <div className="text-xs font-medium text-white mt-0.5">
                  {item.label}
                </div>
                <div className="text-[11px] text-[#8e8e8e] truncate mt-0.5">
                  {item.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
