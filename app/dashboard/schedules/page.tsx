// Schedules dashboard page displaying weekly course timetables and room allocations.
import { DashboardSection } from "@/components/DashboardSection";
import { scheduleConfig } from "@/lib/configs";

export default function SchedulesPage() {
  return <DashboardSection config={scheduleConfig} />;
}
