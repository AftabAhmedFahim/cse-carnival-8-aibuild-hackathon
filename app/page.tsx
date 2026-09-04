// app/page.tsx
// Marketing landing page for CampusOS — single viewport, live database stats, and refined motion.
import Link from "next/link";
import { prisma } from "@/lib/db";
import LandingHeader from "@/components/landing/LandingHeader";
import StatsCounter, { type LiveStatsData } from "@/components/landing/StatsCounter";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Fetch live stats from the SQLite database via Prisma
  const [totalClasses, availableRooms, upcomingEvents, assignmentsDue] =
    await Promise.all([
      prisma.schedule.count(),
      prisma.room.count({ where: { status: "available" } }),
      prisma.event.count({ where: { status: "upcoming" } }),
      prisma.assignment.count(),
    ]);

  const stats: LiveStatsData = {
    totalClasses,
    availableRooms,
    upcomingEvents,
    assignmentsDue,
  };

  return (
    <div className="relative min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-black text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Subtle animated background radial gradient in deep purple/warm grey */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[850px] sm:w-[1100px] h-[550px] sm:h-[700px] rounded-full blur-[110px] opacity-70 animate-radial-drift"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(68, 36, 102, 0.18) 0%, rgba(45, 45, 52, 0.12) 45%, rgba(0, 0, 0, 0) 75%)",
          }}
        />
        <div
          className="absolute -bottom-[20%] right-1/4 w-[600px] h-[450px] rounded-full blur-[120px] opacity-40 animate-radial-drift"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(55, 30, 85, 0.15) 0%, rgba(35, 35, 42, 0.1) 50%, rgba(0, 0, 0, 0) 80%)",
            animationDelay: "-10s",
          }}
        />
      </div>

      {/* Top Header */}
      <LandingHeader />

      {/* Hero Section — Centered, single viewport */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto w-full">
        {/* Headline on two lines */}
        <h1 className="font-display-headline text-white font-normal text-center tracking-[-0.04em] leading-[1.12] text-[clamp(28px,6.2vw,76px)] mb-5 select-none">
          <span className="block animate-landing-line1">Your Campus.</span>
          <span className="block animate-landing-line2">One Question Away.</span>
        </h1>

        {/* Subhead */}
        <p className="animate-landing-subhead text-[#8e8e8e] text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-normal leading-relaxed mb-8 px-2">
          Schedules, rooms, events, deadlines — managed in one place, with an AI agent
          that reads live campus data and acts on it.
        </p>

        {/* CTAs */}
        <div className="animate-landing-cta flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
          {/* Primary CTA: White pill, black text, glowing shadow */}
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-white text-black font-semibold text-sm transition-all duration-150 active:scale-95 glow-primary-cta hover:bg-[#f0f0f0] text-center"
          >
            Open Dashboard
          </Link>

          {/* Secondary CTA: #28282a background, #c8c8c8 text, same pill shape */}
          <Link
            href="/dashboard/chat"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#28282a] text-[#c8c8c8] hover:text-white hover:bg-[#343438] border border-[rgba(255,255,255,0.08)] font-medium text-sm transition-all duration-150 active:scale-95 text-center shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
          >
            Talk to the Agent
          </Link>
        </div>
      </main>

      {/* Stats row at the bottom */}
      <footer className="relative z-10 w-full px-4 sm:px-6 pb-6 pt-2">
        <StatsCounter stats={stats} />
      </footer>
    </div>
  );
}
