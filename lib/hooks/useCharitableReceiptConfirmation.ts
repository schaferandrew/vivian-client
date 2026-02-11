"use client";

import { useState, useCallback } from "react";
import { confirmReceipt } from "@/lib/api/client";
import type { CharitableDonationSchema } from "@/types";

export type TaskStatus = "pending" | "loading" | "success" | "error";

interface UseCharitableReceiptConfirmationReturn {
  isSubmitting: boolean;
  error: string | null;
  driveStatus: TaskStatus;
  sheetStatus: TaskStatus;
  submit: (params: {
    tempFilePath: string;
    charitableData: CharitableDonationSchema;
    forceImport?: boolean;
  }) => Promise<{ success: boolean };
  reset: () => void;
}

export function useCharitableReceiptConfirmation(): UseCharitableReceiptConfirmationReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<TaskStatus>("pending");
  const [sheetStatus, setSheetStatus] = useState<TaskStatus>("pending");

  const submit = useCallback(
    async ({ tempFilePath, charitableData, forceImport = false }) => {
      setIsSubmitting(true);
      setError(null);
      setDriveStatus("loading");
      setSheetStatus("loading");

      try {
        const result = await confirmReceipt({
          temp_file_path: tempFilePath,
          category: "charitable",
          charitable_data: charitableData,
          force: forceImport,
        });

        if (!result.success) {
          setError(result.message || "Failed to save donation.");
          setDriveStatus("error");
          setSheetStatus("error");
          return { success: false };
        }

        setDriveStatus("success");
        setSheetStatus("success");
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save donation.";
        setError(message);

        if (message.includes("Drive upload failed")) {
          setDriveStatus("error");
          setSheetStatus("pending");
        } else if (message.includes("Ledger update failed")) {
          setDriveStatus("success");
          setSheetStatus("error");
        } else {
          setDriveStatus("error");
          setSheetStatus("error");
        }

        return { success: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setDriveStatus("pending");
    setSheetStatus("pending");
  }, []);

  return {
    isSubmitting,
    error,
    driveStatus,
    sheetStatus,
    submit,
    reset,
  };
}
