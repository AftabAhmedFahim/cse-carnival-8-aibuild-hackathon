// Rooms dashboard page with booking management and overlap conflict detection.
"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/DashboardSection";
import { roomConfig } from "@/lib/configs";
import { RoomBookingModal } from "@/components/RoomBookingModal";

export default function RoomsPage() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [refreshFn, setRefreshFn] = useState<(() => Promise<void>) | null>(null);

  return (
    <>
      <DashboardSection
        config={roomConfig}
        customActions={(room, refresh) => (
          <button
            onClick={() => {
              if (refresh) setRefreshFn(() => refresh);
              setSelectedRoom(room);
            }}
            className="btn-secondary-pill px-3 py-1 text-xs"
          >
            Book
          </button>
        )}
      />
      <RoomBookingModal
        room={selectedRoom}
        isOpen={Boolean(selectedRoom)}
        onClose={() => {
          setSelectedRoom(null);
          if (refreshFn) refreshFn();
        }}
        onBookingChanged={async () => {
          if (selectedRoom) {
            const r = await fetch(`/api/rooms/${selectedRoom.id}`);
            if (r.ok) setSelectedRoom(await r.json());
          }
          if (refreshFn) await refreshFn();
        }}
      />
    </>
  );
}
