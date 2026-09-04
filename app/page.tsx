// CampusOS dashboard landing overview with quick links to all campus management sections.
import Link from "next/link";

const SECTIONS = [
  {
    title: "Class Schedules",
    href: "/schedules",
    description: "View weekly timetables, classroom assignments, and faculty allocations.",
    icon: "📅",
    count: "24 classes",
  },
  {
    title: "Rooms & Labs",
    href: "/rooms",
    description: "Track room availability, seat capacities, equipment, and reserve slots.",
    icon: "🚪",
    count: "20 rooms",
  },
  {
    title: "Campus Events",
    href: "/events",
    description: "Manage seminars, workshops, attendee limits, and student registrations.",
    icon: "🎟️",
    count: "7 events",
  },
  {
    title: "Announcements",
    href: "/announcements",
    description: "Publish high-priority notices, academic alerts, and departmental news.",
    icon: "📢",
    count: "8 notices",
  },
  {
    title: "Assignments",
    href: "/assignments",
    description: "Track deadlines, marks distributions, and submission status across courses.",
    icon: "📝",
    count: "8 assignments",
  },
  {
    title: "AI Campus Assistant",
    href: "/chat",
    description: "Ask natural language questions about schedules, rooms, and campus activities.",
    icon: "💬",
    count: "Live agent",
  },
];

export default function HomePage() {
  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Welcome to <span className="text-indigo-400">CampusOS</span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
          Unified university operations platform. Select a module below to view live data, create
          and edit records, or interact with campus resources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SECTIONS.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group block p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{sec.icon}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {sec.count}
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
              {sec.title}
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{sec.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
