// Events dashboard page with attendee registration and capacity enforcement.
"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/DashboardSection";
import { eventConfig } from "@/lib/configs";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  return (
    <>
      <DashboardSection
        config={eventConfig}
        customActions={(event) => (
          <button
            onClick={() => setSelectedEvent(event)}
            className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80 hover:text-white border border-indigo-800/80 transition-colors"
          >
            Register
          </button>
        )}
      />
      <EventRegistrationModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        onRegistrationChanged={async () => {
          if (selectedEvent) {
            const r = await fetch(`/api/events/${selectedEvent.id}`);
            if (r.ok) setSelectedEvent(await r.json());
          }
        }}
      />
    </>
  );
}
