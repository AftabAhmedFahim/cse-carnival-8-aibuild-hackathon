// Rooms dashboard page with booking management and overlap conflict detection.
"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/DashboardSection";
import { roomConfig } from "@/lib/configs";
import { RoomBookingModal } from "@/components/RoomBookingModal";

export default function RoomsPage() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  return (
    <>
      <DashboardSection
        config={roomConfig}
        customActions={(room) => (
          <button
            onClick={() => setSelectedRoom(room)}
            className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80 hover:text-white border border-indigo-800/80 transition-colors"
          >
            Book
          </button>
        )}
      />
      <RoomBookingModal
        room={selectedRoom}
        isOpen={Boolean(selectedRoom)}
        onClose={() => setSelectedRoom(null)}
        onBookingChanged={async () => {
          if (selectedRoom) {
            const r = await fetch(`/api/rooms/${selectedRoom.id}`);
            if (r.ok) setSelectedRoom(await r.json());
          }
        }}
      />
    </>
  );
}
