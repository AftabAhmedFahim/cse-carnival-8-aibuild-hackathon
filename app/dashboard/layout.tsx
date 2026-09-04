// Layout for all /dashboard/** routes — includes Sidebar navigation and desktop offset chrome.
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-black text-white antialiased">
      <Sidebar />
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col bg-black">
        <div className="flex-1 w-full">{children}</div>
      </main>
    </div>
  );
}
