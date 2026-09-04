// Announcements dashboard page for publishing and reviewing official campus notices.
import { DashboardSection } from "@/components/DashboardSection";
import { announcementConfig } from "@/lib/configs";

export default function AnnouncementsPage() {
  return <DashboardSection config={announcementConfig} />;
}
