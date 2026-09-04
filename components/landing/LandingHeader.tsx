// components/landing/LandingHeader.tsx
// Top navigation bar for the CampusOS landing page with white floating nav pill.
"use client";

import Link from "next/link";

interface LandingHeaderProps {
  onFeaturesClick?: () => void;
}

export default function LandingHeader({ onFeaturesClick }: LandingHeaderProps) {
  return (
    <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between z-20 animate-landing-header">
      {/* Wordmark Left */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-black text-sm shadow-[0_4px_14px_rgba(0,0,0,0.16)] group-hover:scale-105 transition-transform">
          C
        </div>
        <span className="font-bold text-base text-white tracking-tight">CampusOS</span>
      </Link>

      {/* Centered Nav Pill */}
      <nav className="hidden sm:flex items-center bg-white rounded-full px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.16)] space-x-1">
        <Link
          href="/dashboard"
          className="px-3.5 py-1 text-xs font-semibold text-[#2e2e2e] opacity-50 hover:opacity-100 transition-opacity rounded-full hover:bg-black/5"
        >
          Features
        </Link>
        <Link
          href="/dashboard/chat"
          className="px-3.5 py-1 text-xs font-semibold text-[#2e2e2e] opacity-50 hover:opacity-100 transition-opacity rounded-full hover:bg-black/5"
        >
          Agent
        </Link>
        <Link
          href="/dashboard"
          className="px-3.5 py-1 text-xs font-semibold text-[#2e2e2e] opacity-100 hover:opacity-100 transition-opacity rounded-full bg-black/5"
        >
          Dashboard
        </Link>
      </nav>

      {/* Right CTA Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-xs font-semibold px-4 py-2 rounded-full bg-white text-black shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:bg-[#e5e5e5] transition-all duration-150 active:scale-95"
        >
          Open CampusOS
        </Link>
      </div>
    </header>
  );
}
