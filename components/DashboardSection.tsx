// Universal CRUD dashboard section controller powering all system pages with optimistic mutations.
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SystemConfig } from "@/lib/configs";
import { DataTable } from "./DataTable";
import { RecordForm } from "./RecordForm";
import { useToast } from "./Toast";

interface DashboardSectionProps<T extends Record<string, any>> {
  config: SystemConfig;
  customActions?: (record: T, refresh: () => Promise<void>) => React.ReactNode;
  extraHeaderActions?: React.ReactNode;
}

export function DashboardSection<T extends Record<string, any>>({
  config,
  customActions,
  extraHeaderActions,
}: DashboardSectionProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(config.endpoint);
      if (!res.ok) {
        throw new Error(`Failed to load ${config.title} (HTTP ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      showToast(err.message || `Failed to fetch ${config.title}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [config.endpoint, config.title, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: T) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    setIsSubmitting(true);
    const isEdit = Boolean(editingRecord && editingRecord[config.idKey]);
    const previousData = [...data];

    if (isEdit) {
      const id = editingRecord![config.idKey];
      // Optimistic update
      setData((prev) =>
        prev.map((item) =>
          item[config.idKey] === id ? ({ ...item, ...formData } as T) : item,
        ),
      );
      setIsFormOpen(false);

      try {
        const res = await fetch(`${config.endpoint}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Update failed with status ${res.status}`);
        }

        const updated = await res.json();
        setData((prev) =>
          prev.map((item) => (item[config.idKey] === id ? updated : item)),
        );
        showToast(`${config.singularTitle} updated successfully!`, "success");
      } catch (err: any) {
        setData(previousData); // Rollback
        showToast(err.message || "Failed to update record", "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Optimistic create
      const tempId = `temp-${Date.now()}`;
      const tempRecord = { ...formData, [config.idKey]: tempId } as T;
      setData((prev) => [tempRecord, ...prev]);
      setIsFormOpen(false);

      try {
        const res = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Creation failed with status ${res.status}`);
        }

        const created = await res.json();
        setData((prev) =>
          prev.map((item) => (item[config.idKey] === tempId ? created : item)),
        );
        showToast(`${config.singularTitle} created successfully!`, "success");
      } catch (err: any) {
        setData(previousData); // Rollback
        showToast(err.message || "Failed to create record", "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async (record: T) => {
    const id = record[config.idKey];
    const previousData = [...data];

    // Optimistic delete
    setData((prev) => prev.filter((item) => item[config.idKey] !== id));

    try {
      const res = await fetch(`${config.endpoint}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Delete failed with status ${res.status}`);
      }

      showToast(`${config.singularTitle} deleted successfully.`, "success");
    } catch (err: any) {
      setData(previousData); // Rollback
      showToast(err.message || "Failed to delete record", "error");
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {config.title}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">{config.description}</p>
      </div>

      <DataTable
        config={config}
        data={data}
        isLoading={isLoading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        customActions={customActions ? (record) => customActions(record, loadData) : undefined}
        extraHeaderActions={extraHeaderActions}
      />

      <RecordForm
        isOpen={isFormOpen}
        config={config}
        initialData={editingRecord}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
