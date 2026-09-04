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
        {SECTIONS.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group block p-6 rounded-2xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.25)] hover:bg-[#141416] transition-all duration-200 shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{sec.icon}</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#28282a] text-[#8e8e8e] group-hover:text-white border border-[rgba(255,255,255,0.08)] transition-colors">
                {sec.count}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white transition-colors">
              {sec.title}
            </h2>
            <p className="text-xs text-[#8e8e8e] mt-1.5 leading-relaxed">{sec.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
