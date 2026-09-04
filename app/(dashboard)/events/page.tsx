// Events dashboard page with attendee registration and capacity enforcement.
"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/DashboardSection";
import { eventConfig } from "@/lib/configs";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [refreshFn, setRefreshFn] = useState<(() => Promise<void>) | null>(null);

  return (
    <>
      <DashboardSection
        config={eventConfig}
        customActions={(event, refresh) => (
          <button
            onClick={() => {
              if (refresh) setRefreshFn(() => refresh);
              setSelectedEvent(event);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80 hover:text-white border border-indigo-800/80 transition-colors"
          >
            Register
          </button>
        )}
      />
      <EventRegistrationModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => {
          setSelectedEvent(null);
          if (refreshFn) refreshFn();
        }}
        onRegistrationChanged={async () => {
          if (selectedEvent) {
            const r = await fetch(`/api/events/${selectedEvent.id}`);
            if (r.ok) setSelectedEvent(await r.json());
          }
          if (refreshFn) await refreshFn();
        }}
      />
    </>
  );
}
