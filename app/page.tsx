// Default index route automatically redirecting to schedules dashboard.
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/schedules");
}
