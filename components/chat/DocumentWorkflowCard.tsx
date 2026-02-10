"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Circle, Loader2 } from "lucide-react";

import { checkReceiptDuplicate, confirmReceipt } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DocumentWorkflowArtifact,
  DuplicateInfo,
  ExpenseSchema,
  ParsedReceipt,
  ReimbursementStatus,
} from "@/types";

type TaskStatus = "pending" | "loading" | "success" | "error";

function TaskStatusRow({ label, status }: { label: string; status: TaskStatus }) {
  let icon = <Circle className="h-4 w-4 text-[var(--neutral-400)]" />;
  let tone = "text-muted-foreground";

  if (status === "loading") {
    icon = <Loader2 className="h-4 w-4 animate-spin text-[var(--neutral-500)]" />;
    tone = "text-foreground";
  } else if (status === "success") {
    icon = <CheckCircle className="h-4 w-4 text-[var(--success-600)]" />;
    tone = "text-foreground";
  } else if (status === "error") {
    icon = <AlertCircle className="h-4 w-4 text-[var(--error-600)]" />;
    tone = "text-[var(--error-700)]";
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${tone}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DuplicateBanner({
  duplicates,
  forceImport,
  onForceImportChange,
}: {
  duplicates: DuplicateInfo[];
  forceImport: boolean;
  onForceImportChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--warning-200)] bg-[var(--warning-50)] p-3 space-y-2">
      <div className="flex items-center gap-2 text-[var(--warning-800)] font-medium">
        <AlertCircle className="h-4 w-4" />
        <span>Potential Duplicate{duplicates.length === 1 ? "" : "s"} Found</span>
      </div>
      <div className="space-y-2">
        {duplicates.map((dup, idx) => (
          <div key={idx} className="rounded border border-[var(--warning-200)] bg-white p-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Provider:</span> {dup.provider}
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> ${dup.amount.toFixed(2)}
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span> {dup.service_date || "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span> {dup.status}
              </div>
            </div>
            {dup.message && <p className="mt-1 text-[var(--warning-700)]">{dup.message}</p>}
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={forceImport}
          onChange={(e) => onForceImportChange(e.target.checked)}
        />
        <span className="text-[var(--warning-800)]">I understand - import anyway</span>
      </label>
    </div>
  );
}

function HsaReceiptConfirmationCard({ workflow }: { workflow: DocumentWorkflowArtifact }) {
  const parsed = workflow.parsed_data as ParsedReceipt | undefined;
  const tempFilePath = workflow.temp_file_path;
  const [step, setStep] = useState<"review" | "confirm" | "success">("review");
  const [editedExpense, setEditedExpense] = useState<ExpenseSchema | null>(
    parsed?.expense ?? null
  );
  const [status, setStatus] = useState<ReimbursementStatus>("unreimbursed");
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo[]>(
    workflow.duplicate_info ?? []
  );
  const [isDuplicate, setIsDuplicate] = useState(Boolean(workflow.is_duplicate));
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(
    workflow.duplicate_check_error ?? null
  );
  const [forceImport, setForceImport] = useState(false);
  const [driveStatus, setDriveStatus] = useState<TaskStatus>("pending");
  const [sheetStatus, setSheetStatus] = useState<TaskStatus>("pending");

  if (!parsed || !tempFilePath || !editedExpense) {
    return (
      <div className="rounded-lg border border-[var(--error-200)] bg-[var(--error-50)] p-3 text-sm text-[var(--error-700)]">
        {workflow.message || "This workflow is missing parsed data."}
      </div>
    );
  }

  const confidence = Math.round((parsed.confidence || 0) * 100);
  const needsReview = confidence < 85;

  const handleContinue = async () => {
    setError(null);
    setDuplicateCheckError(null);

    if (!editedExpense.hsa_eligible) {
      setIsDuplicate(false);
      setDuplicateInfo([]);
      setStep("confirm");
      return;
    }

    setIsCheckingDuplicates(true);
    try {
      const dupResult = await checkReceiptDuplicate(editedExpense);
      setIsDuplicate(Boolean(dupResult.is_duplicate));
      setDuplicateInfo(dupResult.duplicate_info || []);
      setDuplicateCheckError(dupResult.check_error || null);
    } catch {
      setDuplicateCheckError(
        "Duplicate check unavailable right now. Final duplicate checks still run on save."
      );
      setIsDuplicate(false);
      setDuplicateInfo([]);
    } finally {
      setIsCheckingDuplicates(false);
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    if (!tempFilePath || !editedExpense) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setDriveStatus("loading");
    setSheetStatus("loading");

    try {
      const result = await confirmReceipt({
        temp_file_path: tempFilePath,
        expense_data: editedExpense,
        status,
        force: forceImport,
      });

      if (result.is_duplicate && !forceImport) {
        setIsDuplicate(true);
        setDuplicateInfo(result.duplicate_info || []);
        setError("Duplicate receipt detected. Review existing entries.");
        setDriveStatus("pending");
        setSheetStatus("pending");
        return;
      }

      if (!result.success) {
        setError(result.message || "Failed to save receipt.");
        setDriveStatus("error");
        setSheetStatus("error");
        return;
      }

      setDriveStatus("success");
      setSheetStatus("success");
      setStep("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save receipt.";
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="rounded-lg border border-[var(--success-200)] bg-[var(--success-50)] p-3">
        <div className="flex items-center gap-2 text-[var(--success-700)] text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Receipt saved successfully.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{workflow.filename || "Receipt"}</p>
        <Badge variant={needsReview ? "destructive" : "default"}>
          Confidence {confidence}%
        </Badge>
      </div>

      {duplicateCheckError && (
        <div className="rounded-md border border-[var(--warning-200)] bg-[var(--warning-50)] p-2 text-xs text-[var(--warning-700)]">
          {duplicateCheckError}
        </div>
      )}

      {isDuplicate && duplicateInfo.length > 0 && (
        <DuplicateBanner
          duplicates={duplicateInfo}
          forceImport={forceImport}
          onForceImportChange={setForceImport}
        />
      )}

      {error && (
        <div className="rounded-md border border-[var(--error-200)] bg-[var(--error-50)] p-2 text-xs text-[var(--error-700)]">
          {error}
        </div>
      )}

      {step === "review" && (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-foreground">Provider</label>
            <Input
              value={editedExpense.provider}
              onChange={(e) => setEditedExpense((prev) => (prev ? { ...prev, provider: e.target.value } : null))}
              className="h-9 mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-foreground">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={editedExpense.amount}
                onChange={(e) =>
                  setEditedExpense((prev) => {
                    if (!prev) {
                      return null;
                    }
                    const parsedValue = Number.parseFloat(e.target.value);
                    return { ...prev, amount: Number.isFinite(parsedValue) ? parsedValue : 0 };
                  })
                }
                className="h-9 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Service Date</label>
              <Input
                type="date"
                value={editedExpense.service_date || ""}
                onChange={(e) =>
                  setEditedExpense((prev) => (prev ? { ...prev, service_date: e.target.value } : null))
                }
                className="h-9 mt-1"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">HSA Eligible</p>
            <div className="mt-1 flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={editedExpense.hsa_eligible === true}
                  onChange={() =>
                    setEditedExpense((prev) => (prev ? { ...prev, hsa_eligible: true } : null))
                  }
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={editedExpense.hsa_eligible === false}
                  onChange={() =>
                    setEditedExpense((prev) => (prev ? { ...prev, hsa_eligible: false } : null))
                  }
                />
                <span>No</span>
              </label>
            </div>
          </div>
          <Button onClick={handleContinue} disabled={isCheckingDuplicates} size="sm">
            {isCheckingDuplicates ? "Checking duplicates..." : "Continue"}
          </Button>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <div className="space-y-2 text-xs">
            <label className="flex items-start gap-2 rounded-md border border-border p-2">
              <input
                type="radio"
                name={`${workflow.workflow_id}-status`}
                value="reimbursed"
                checked={status === "reimbursed"}
                onChange={(e) => setStatus(e.target.value as ReimbursementStatus)}
              />
              <div>
                <p className="font-medium">Already Reimbursed</p>
                <p className="text-muted-foreground">I&apos;ve already been paid back.</p>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-2">
              <input
                type="radio"
                name={`${workflow.workflow_id}-status`}
                value="unreimbursed"
                checked={status === "unreimbursed"}
                onChange={(e) => setStatus(e.target.value as ReimbursementStatus)}
              />
              <div>
                <p className="font-medium">Save for Future</p>
                <p className="text-muted-foreground">Track for future reimbursement.</p>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-2">
              <input
                type="radio"
                name={`${workflow.workflow_id}-status`}
                value="not_hsa_eligible"
                checked={status === "not_hsa_eligible"}
                onChange={(e) => setStatus(e.target.value as ReimbursementStatus)}
              />
              <div>
                <p className="font-medium">Not HSA Eligible</p>
                <p className="text-muted-foreground">Do not track as HSA expense.</p>
              </div>
            </label>
          </div>

          <div className="space-y-1 rounded-lg border border-border bg-card p-2">
            <TaskStatusRow label="Uploading receipt to Google Drive" status={driveStatus} />
            <TaskStatusRow label="Updating Google Sheet ledger" status={sheetStatus} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("review")}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting || (isDuplicate && !forceImport)}
            >
              {isSubmitting ? "Saving..." : isDuplicate ? "Import Anyway" : "Confirm & Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentWorkflowCard({ workflow }: { workflow: DocumentWorkflowArtifact }) {
  if (workflow.document_type !== "hsa_receipt") {
    return (
      <div className="rounded-lg border border-border bg-background p-3 text-sm">
        <p className="font-medium">
          {workflow.filename || workflow.document_type.replace(/_/g, " ")}
        </p>
        <p className="text-muted-foreground mt-1">{workflow.message}</p>
      </div>
    );
  }

  if (workflow.status !== "ready_for_confirmation") {
    return (
      <div className="rounded-lg border border-[var(--error-200)] bg-[var(--error-50)] p-3 text-sm text-[var(--error-700)]">
        {workflow.message}
      </div>
    );
  }

  return <HsaReceiptConfirmationCard workflow={workflow} />;
}
