// Rooms dashboard page for viewing and managing campus classrooms, labs, and seminar halls.
import { DashboardSection } from "@/components/DashboardSection";
import { roomConfig } from "@/lib/configs";

export default function RoomsPage() {
  return <DashboardSection config={roomConfig} />;
}
