// Events dashboard page for viewing and managing campus seminars, workshops, and gatherings.
import { DashboardSection } from "@/components/DashboardSection";
import { eventConfig } from "@/lib/configs";

export default function EventsPage() {
  return <DashboardSection config={eventConfig} />;
}
