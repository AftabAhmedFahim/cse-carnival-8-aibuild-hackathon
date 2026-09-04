// Event registration modal with capacity counter, cancellation, and 409 limit handling.
"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "./Toast";

interface Registration {
  id: string;
  eventId: string;
  studentName: string;
  studentId?: string | null;
}

interface EventItem {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: number;
  registered: number;
  status: string;
  registrations?: Registration[];
}

interface EventRegistrationModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRegistrationChanged: () => Promise<void>;
}

export function EventRegistrationModal({
  event,
  isOpen,
  onClose,
  onRegistrationChanged,
}: EventRegistrationModalProps) {
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [registeredCount, setRegisteredCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setRegistrations(event.registrations || []);
      setRegisteredCount(event.registered || 0);
      setCapacityError(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const isAtCapacity = registeredCount >= event.capacity;
  const capacityPercent = Math.min(100, Math.round((registeredCount / event.capacity) * 100));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCapacityError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentId: studentId.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        const errorData = await res.json();
        setCapacityError(
          errorData.error ||
            `Event is at maximum capacity (${event.capacity}/${event.capacity} registered).`,
        );
        showToast("Registration rejected: Event is already at full capacity.", "error");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Registration failed (HTTP ${res.status})`);
      }

      const responseData = await res.json();
      setRegistrations((prev) => [...prev, responseData.registration]);
      setRegisteredCount((prev) => prev + 1);
      setStudentName("");
      setStudentId("");
      showToast(`Successfully registered ${studentName}!`, "success");
      await onRegistrationChanged();
    } catch (err: any) {
      showToast(err.message || "Failed to register", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRegistration = async (regId: string) => {
    if (!confirm("Are you sure you want to cancel this registration?")) return;

    try {
      const res = await fetch(`/api/registrations/${regId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to cancel registration");
      }

      setRegistrations((prev) => prev.filter((r) => r.id !== regId));
      setRegisteredCount((prev) => Math.max(0, prev - 1));
      showToast("Registration cancelled successfully.", "success");
      await onRegistrationChanged();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel registration", "error");
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
            <h3 className="text-lg font-semibold text-white">{event.name}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Venue: <span className="text-zinc-300 font-medium">{event.venue}</span> · Date: <span className="text-zinc-300 font-medium">{event.date}</span> ({event.startTime} - {event.endTime})
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
          {/* Capacity Progress Bar */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-300">Registration Capacity</span>
              <span className="font-mono text-xs font-bold text-zinc-200">
                {registeredCount} / {event.capacity} ({capacityPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isAtCapacity ? "bg-rose-500" : capacityPercent > 80 ? "bg-amber-500" : "bg-indigo-500"
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            {isAtCapacity && (
              <p className="text-xs text-rose-400 font-medium">
                ⚠️ Event has reached maximum capacity.
              </p>
            )}
          </div>

          {/* Capacity Error Banner (409) */}
          {capacityError && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800/90 text-rose-200 text-sm flex items-center gap-3 animate-in fade-in">
              <svg className="w-5 h-5 flex-shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{capacityError}</span>
            </div>
          )}

          {/* Student Registration Form */}
          <form onSubmit={handleRegister} className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Register Student
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Student ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 20-40532"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isAtCapacity}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : isAtCapacity ? "Event Full" : "Submit Registration"}
              </button>
            </div>
          </form>

          {/* Registrations List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Registered Attendees ({registrations.length})
            </h4>

            {registrations.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-2">No individual student registrations listed.</p>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                {registrations.map((reg) => (
                  <div key={reg.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors">
                    <div>
                      <span className="font-medium text-sm text-zinc-100">{reg.studentName}</span>
                      {reg.studentId && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {reg.studentId}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancelRegistration(reg.id)}
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
