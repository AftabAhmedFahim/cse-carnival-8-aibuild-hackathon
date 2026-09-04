// CampusOS dashboard landing overview with quick links to all campus management sections.
import Link from "next/link";

const SECTIONS = [
  {
    title: "Class Schedules",
    href: "/dashboard/schedules",
    description: "View weekly timetables, classroom assignments, and faculty allocations.",
    icon: "📅",
    count: "24 classes",
  },
  {
    title: "Rooms & Labs",
    href: "/dashboard/rooms",
    description: "Track room availability, seat capacities, equipment, and reserve slots.",
    icon: "🚪",
    count: "20 rooms",
  },
  {
    title: "Campus Events",
    href: "/dashboard/events",
    description: "Manage seminars, workshops, attendee limits, and student registrations.",
    icon: "🎟️",
    count: "7 events",
  },
  {
    title: "Announcements",
    href: "/dashboard/announcements",
    description: "Publish high-priority notices, academic alerts, and departmental news.",
    icon: "📢",
    count: "8 notices",
  },
  {
    title: "Assignments",
    href: "/dashboard/assignments",
    description: "Track deadlines, marks distributions, and submission status across courses.",
    icon: "📝",
    count: "8 assignments",
  },
  {
    title: "AI Campus Assistant",
    href: "/dashboard/chat",
    description: "Ask natural language questions about schedules, rooms, and campus activities.",
    icon: "💬",
    count: "Live agent",
  },
];

export default function DashboardHomePage() {
  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Welcome to <span className="text-white">CampusOS</span>
        </h1>
        <p className="text-[#8e8e8e] text-sm sm:text-base max-w-2xl">
          Unified university operations platform. Select a module below to view live data, create
          and edit records, or interact with campus resources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SECTIONS.map((sec, idx) => (
          <Link
            key={sec.href}
            href={sec.href}
            style={{ animationDelay: `${idx * 65}ms` }}
            className="group block p-6 rounded-2xl card-interactive animate-card-cascade"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl inline-block transform group-hover:scale-125 group-hover:-rotate-3 transition-transform duration-300 ease-out">
                {sec.icon}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#28282a] text-[#8e8e8e] group-hover:text-white group-hover:bg-[#343438] border border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.2)] transition-all duration-200">
                {sec.count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white group-hover:text-zinc-100 transition-colors">
                {sec.title}
              </h2>
              <span className="text-xs text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all duration-200 font-mono">
                &rarr;
              </span>
            </div>
            <p className="text-xs text-[#8e8e8e] group-hover:text-[#a0a0a0] mt-1.5 leading-relaxed transition-colors">
              {sec.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
