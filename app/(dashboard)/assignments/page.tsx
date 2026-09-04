// Assignments dashboard page for tracking coursework tasks, deadlines, and marks.
import { DashboardSection } from "@/components/DashboardSection";
import { assignmentConfig } from "@/lib/configs";

export default function AssignmentsPage() {
  return <DashboardSection config={assignmentConfig} />;
}
