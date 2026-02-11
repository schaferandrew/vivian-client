"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DuplicateInfoPanel,
  ExpenseEditor,
  ReimbursementStatusSelector,
  SuccessState,
  TaskStatusRow,
} from "@/components/receipt/SharedReceiptComponents";
import { ConfidenceBadge } from "@/components/receipt/ReceiptStatusBadge";
import { ErrorPanel, WarningPanel } from "@/components/receipt/StatusPanels";
import { useDuplicateCheck, useReceiptConfirmation } from "@/lib/hooks/useReceiptWorkflow";
import { CharitableExpenseEditor } from "@/components/receipt/CharitableExpenseEditor";
import { useCharitableReceiptConfirmation } from "@/lib/hooks/useCharitableReceiptConfirmation";
import type {
  DocumentWorkflowArtifact,
  ExpenseSchema,
  ParsedReceipt,
  ReimbursementStatus,
  CharitableDonationSchema,
} from "@/types";

function HsaReceiptConfirmationCard({ workflow, onCancel }: { workflow: DocumentWorkflowArtifact; onCancel?: () => void }) {
  const parsed = workflow.parsed_data as ParsedReceipt | undefined;
  const tempFilePath = workflow.temp_file_path;
  const [step, setStep] = useState<"review" | "confirm" | "success" | "canceled">("review");
  const [editedExpense, setEditedExpense] = useState<ExpenseSchema | null>(
    parsed?.expense ?? null
  );
  const [status, setStatus] = useState<ReimbursementStatus>("unreimbursed");
  const [forceImport, setForceImport] = useState(false);

  // Sync state when workflow changes (e.g., new receipt uploaded)
  useEffect(() => {
    if (parsed?.expense) {
      setEditedExpense(parsed.expense);
      setStatus(parsed.expense.hsa_eligible === false ? "not_hsa_eligible" : "unreimbursed");
      setForceImport(false);
    }
  }, [workflow.workflow_id, parsed?.expense]);

  const {
    isChecking: isCheckingDuplicates,
    isDuplicate: isDuplicateFromCheck,
    duplicateInfo: duplicateInfoFromCheck,
    error: duplicateCheckError,
    check: checkDuplicates,
    setDuplicateState,
    reset: resetDuplicateCheck,
  } = useDuplicateCheck();

  // Use workflow's initial duplicate data if available, otherwise use hook results
  const isDuplicate = isDuplicateFromCheck || Boolean(workflow.is_duplicate);
  const duplicateInfo = duplicateInfoFromCheck.length > 0 ? duplicateInfoFromCheck : (workflow.duplicate_info ?? []);

  const {
    isSubmitting,
    error: submitError,
    driveStatus,
    sheetStatus,
    submit: submitReceipt,
    reset: resetConfirmation,
  } = useReceiptConfirmation();

  if (!parsed || !tempFilePath || !editedExpense) {
    return (
      <ErrorPanel size="sm">
        {workflow.message || "This workflow is missing parsed data."}
      </ErrorPanel>
    );
  }

  const confidence = Math.round((parsed.confidence || 0) * 100);
  const needsReview = confidence < 85;

  const handleContinue = async () => {
    // Skip duplicate check if workflow already has duplicate info and expense hasn't changed
    const hasExistingDuplicateCheck = workflow.duplicate_info !== undefined;
    const expenseChanged = JSON.stringify(editedExpense) !== JSON.stringify(parsed?.expense);
    
    if (!hasExistingDuplicateCheck || expenseChanged) {
      await checkDuplicates(editedExpense);
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const result = await submitReceipt({
      tempFilePath,
      expense: editedExpense,
      status,
      forceImport,
    });

    if (result.success) {
      setStep("success");
    } else if (result.isDuplicate) {
      // Update duplicate state with submit-time detection results
      setDuplicateState(true, result.duplicateInfo || []);
      setForceImport(false);
    }
  };

  if (step === "success") {
    return <SuccessState compact title="Receipt saved successfully." />;
  }

  if (step === "canceled") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{workflow.filename || "Receipt"}</p>
          <span className="text-xs text-muted-foreground">Canceled</span>
        </div>
        <p className="text-sm text-muted-foreground">
          This receipt was not saved. You can resume or discard it.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep("review")}
          >
            Resume
          </Button>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Discard
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{workflow.filename || "Receipt"}</p>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {duplicateCheckError && (
        <WarningPanel size="sm">{duplicateCheckError}</WarningPanel>
      )}

      {isDuplicate && (
        <DuplicateInfoPanel
          duplicateInfo={duplicateInfo}
          forceImport={forceImport}
          onForceImportChange={setForceImport}
        />
      )}

      {submitError && <ErrorPanel size="sm">{submitError}</ErrorPanel>}

      {step === "review" && (
        <div className="space-y-2">
          <ExpenseEditor
            expense={editedExpense}
            onChange={(next) => setEditedExpense(next)}
            needsReview={needsReview}
          />
          <div className="flex items-center justify-between">
            <Button onClick={handleContinue} disabled={isCheckingDuplicates} size="sm">
              {isCheckingDuplicates ? "Checking duplicates..." : "Continue"}
            </Button>
            <button
              onClick={() => setStep("canceled")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <ReimbursementStatusSelector
            status={status}
            onChange={setStatus}
            radioName={`${workflow.workflow_id}-status`}
            compact
          />

          <div className="space-y-1 rounded-lg border border-border bg-card p-2">
            <TaskStatusRow label="Uploading receipt to Google Drive" status={driveStatus} />
            <TaskStatusRow label="Updating Google Sheet ledger" status={sheetStatus} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep("review");
                // Clear all errors and duplicate state when going back
                resetConfirmation();
                resetDuplicateCheck();
                setForceImport(false);
              }}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
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

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setStep("canceled")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              type="button"
            >
              Cancel and discard this receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CharitableReceiptConfirmationCard({
  workflow,
  onCancel,
}: {
  workflow: DocumentWorkflowArtifact;
  onCancel?: () => void;
}) {
  const parsed = workflow.parsed_data as ParsedReceipt | undefined;
  const tempFilePath = workflow.temp_file_path;
  const [step, setStep] = useState<"review" | "confirm" | "success" | "canceled">("review");
  const [editedDonation, setEditedDonation] = useState<CharitableDonationSchema | null>(
    parsed?.charitable_data ?? null
  );

  const {
    isSubmitting,
    error,
    driveStatus,
    sheetStatus,
    submit,
    reset,
  } = useCharitableReceiptConfirmation();

  useEffect(() => {
    if (parsed?.charitable_data) {
      setEditedDonation(parsed.charitable_data);
    }
  }, [workflow.workflow_id, parsed?.charitable_data]);

  if (!parsed || !tempFilePath || !editedDonation) {
    return (
      <ErrorPanel size="sm">
        {workflow.message || "This workflow is missing parsed charitable data."}
      </ErrorPanel>
    );
  }

  const confidence = Math.round((parsed.confidence || 0) * 100);
  const needsReview = confidence < 85;

  const handleContinue = () => setStep("confirm");

  const handleConfirm = async () => {
    const result = await submit({
      tempFilePath,
      charitableData: editedDonation,
    });

    if (result.success) {
      setStep("success");
    }
  };

  if (step === "success") {
    return (
      <SuccessState
        compact
        title="Donation saved"
        description="This charitable donation is now part of your giving ledger."
      >
        <Link href="/donations">
          <Button size="sm">View Donations</Button>
        </Link>
      </SuccessState>
    );
  }

  if (step === "canceled") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{workflow.filename || "Charitable Receipt"}</p>
          <span className="text-xs text-muted-foreground">Canceled</span>
        </div>
        <p className="text-sm text-muted-foreground">
          This donation was not saved. You can resume or discard it.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("review")}>Resume</Button>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Discard
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{workflow.filename || "Charitable Receipt"}</p>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {error && <ErrorPanel size="sm">{error}</ErrorPanel>}

      {step === "review" && (
        <div className="space-y-2">
          <CharitableExpenseEditor
            donation={editedDonation}
            onChange={(next) => setEditedDonation(next)}
            needsReview={needsReview}
          />
          <div className="flex items-center justify-between">
            <Button onClick={handleContinue} disabled={isSubmitting} size="sm">
              Continue
            </Button>
            <button
              onClick={() => setStep("canceled")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <div className="space-y-1 rounded-lg border border-border bg-card p-2">
            <TaskStatusRow label="Uploading receipt to Google Drive" status={driveStatus} />
            <TaskStatusRow label="Updating charitable donation ledger" status={sheetStatus} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep("review");
                reset();
              }}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Confirm & Save"}
            </Button>
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setStep("canceled")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              type="button"
            >
              Cancel and discard this donation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentWorkflowCard({ workflow, onCancel }: { workflow: DocumentWorkflowArtifact; onCancel?: () => void }) {
  if (workflow.document_type === "charitable_receipt") {
    if (workflow.status !== "ready_for_confirmation") {
      return <ErrorPanel size="sm">{workflow.message}</ErrorPanel>;
    }

    return <CharitableReceiptConfirmationCard workflow={workflow} onCancel={onCancel} />;
  }

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
      <ErrorPanel size="sm">{workflow.message}</ErrorPanel>
    );
  }

  return <HsaReceiptConfirmationCard workflow={workflow} onCancel={onCancel} />;
}
