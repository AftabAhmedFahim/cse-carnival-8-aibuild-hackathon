// Room booking modal showing existing bookings with cancel options and 409 conflict detection.
"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "./Toast";

interface Booking {
  id: string;
  roomId: string;
  bookedBy: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string | null;
}

interface Room {
  id: string;
  roomNumber: string;
  type: string;
  capacity: number;
  bookings?: Booking[];
}

interface RoomBookingModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingChanged: () => Promise<void>;
}

export function RoomBookingModal({
  room,
  isOpen,
  onClose,
  onBookingChanged,
}: RoomBookingModalProps) {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookedBy, setBookedBy] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<{
    message: string;
    conflictingBooking?: Booking;
  } | null>(null);

  useEffect(() => {
    if (room) {
      setBookings(room.bookings || []);
      setConflictError(null);
    }
  }, [room]);

  if (!isOpen || !room) return null;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/rooms/${room.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookedBy,
          date,
          startTime,
          endTime,
          purpose,
        }),
      });

      if (res.status === 409) {
        const errorData = await res.json();
        setConflictError({
          message: errorData.error || "Time conflict with an existing booking.",
          conflictingBooking: errorData.conflictingBooking,
        });
        showToast("Booking conflict: Room already booked for this slot.", "error");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Booking failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      const bookingRecord = data.booking || data;
      setBookings((prev) => [...prev, bookingRecord]);
      setBookedBy("");
      setPurpose("");
      showToast(`Room ${room.roomNumber} booked successfully!`, "success");
      await onBookingChanged();
    } catch (err: any) {
      showToast(err.message || "Failed to book room", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!bookingId) return;
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to cancel booking");
      }

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      showToast("Booking cancelled successfully.", "success");
      await onBookingChanged();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel booking", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Room {room.roomNumber} Bookings
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Type: <span className="capitalize text-zinc-300 font-medium">{room.type}</span> · Capacity: <span className="text-zinc-300 font-medium">{room.capacity}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Conflicting Booking Banner (409) */}
          {conflictError && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800/90 text-rose-200 text-sm space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{conflictError.message}</span>
              </div>
              {conflictError.conflictingBooking && (
                <div className="text-xs text-rose-200/90 pl-7">
                  <p>
                    <strong>Booked By:</strong> {conflictError.conflictingBooking.bookedBy}
                  </p>
                  <p>
                    <strong>Date & Time:</strong> {conflictError.conflictingBooking.date} from {conflictError.conflictingBooking.startTime} to {conflictError.conflictingBooking.endTime}
                  </p>
                  {conflictError.conflictingBooking.purpose && (
                    <p>
                      <strong>Purpose:</strong> {conflictError.conflictingBooking.purpose}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New Booking Form */}
          <form onSubmit={handleBook} className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              New Reservation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Booked By *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith or ACM"
                  value={bookedBy}
                  onChange={(e) => setBookedBy(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Start Time (24h) *</label>
                <input
                  type="text"
                  required
                  placeholder="HH:MM (e.g. 09:00)"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">End Time (24h) *</label>
                <input
                  type="text"
                  required
                  placeholder="HH:MM (e.g. 10:30)"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">Purpose / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Makeup Class or Society Meeting"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Checking..." : "Confirm Booking"}
              </button>
            </div>
          </form>

          {/* Existing Bookings List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Current Reservations ({bookings.length})
              </h4>
            </div>

            {bookings.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-2">No bookings recorded for this room.</p>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-100">{booking.bookedBy}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {booking.date}
                        </span>
                        <span className="text-xs font-mono text-indigo-400 font-semibold">
                          {booking.startTime} – {booking.endTime}
                        </span>
                      </div>
                      {booking.purpose && (
                        <p className="text-xs text-zinc-400 mt-1">{booking.purpose}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-rose-950/50 text-rose-300 hover:bg-rose-900 hover:text-white border border-rose-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
