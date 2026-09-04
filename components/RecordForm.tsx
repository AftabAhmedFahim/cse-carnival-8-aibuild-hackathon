// Generic modal form generated from system field configuration for creating and editing records.
"use client";

import React, { useState, useEffect, useRef } from "react";
import { SystemConfig } from "@/lib/configs";

interface RecordFormProps {
  isOpen: boolean;
  config: SystemConfig;
  initialData?: Record<string, any> | null;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting?: boolean;
}

export function RecordForm({
  isOpen,
  config,
  initialData,
  onClose,
  onSubmit,
  isSubmitting = false,
}: RecordFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEdit = Boolean(initialData && initialData[config.idKey]);

  useEffect(() => {
    if (initialData) {
      const data: Record<string, any> = {};
      config.fields.forEach((f) => {
        if (f.key === "equipment" && Array.isArray(initialData.equipment)) {
          data[f.key] = initialData.equipment.join(", ");
        } else {
          data[f.key] = initialData[f.key] ?? (f.type === "number" ? 0 : "");
        }
      });
      setFormData(data);
    } else {
      const defaults: Record<string, any> = {};
      config.fields.forEach((f) => {
        if (f.type === "select" && f.options && f.options.length > 0) {
          defaults[f.key] = f.options[0];
        } else if (f.type === "number") {
          defaults[f.key] = 0;
        } else {
          defaults[f.key] = "";
        }
      });
      setFormData(defaults);
    }
    setErrorMessage(null);
  }, [initialData, config, isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const payload: Record<string, any> = {};
      config.fields.forEach((f) => {
        if (formData[f.key] !== undefined) {
          payload[f.key] = formData[f.key];
        }
      });
      await onSubmit(payload);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save record");
    }
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-zinc-100">
              {isEdit ? `Edit ${config.singularTitle}` : `New ${config.singularTitle}`}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEdit ? "Update the details below." : `Fill in the details to create a new ${config.singularTitle.toLowerCase()}.`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {config.fields.map((field) => {
              const value = formData[field.key] ?? "";
              const isFullWidth = field.type === "textarea" || field.key === "title" || field.key === "name" || field.key === "description" || field.key === "body";

              return (
                <div
                  key={field.key}
                  className={isFullWidth ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
                >
                  <label className="block text-xs font-medium text-zinc-300">
                    {field.label}
                    {field.required && <span className="text-rose-400 ml-1">*</span>}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={value}
                      required={field.required}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={value}
                      required={field.required}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={value}
                      required={field.required}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        handleChange(
                          field.key,
                          field.type === "number" ? Number(e.target.value) : e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                isEdit ? "Update" : "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
