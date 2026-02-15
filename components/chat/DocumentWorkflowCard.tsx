"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

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
import { useChatStore } from "@/lib/stores/chat";
import type {
  DocumentWorkflowArtifact,
  ExpenseSchema,
  ParsedReceipt,
  ReimbursementStatus,
  CharitableDonationSchema,
  ExpenseCategory,
} from "@/types";

function CategoryToggle({ value, onChange }: { value: ExpenseCategory; onChange: (val: ExpenseCategory) => void }) {
  return (
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        onClick={() => onChange("hsa")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          value === "hsa" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        HSA Medical
      </button>
      <button
        type="button"
        onClick={() => onChange("charitable")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          value === "charitable" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        Charitable Donation
      </button>
    </div>
  );
}

function CompletedWorkflowCard({ workflow }: { workflow: DocumentWorkflowArtifact }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <CheckCircle2 className="w-4 h-4 text-[var(--success-600)] shrink-0" />
      <span className="text-sm text-foreground truncate">{workflow.filename || "Receipt"}</span>
      <span className="text-xs text-[var(--success-600)] ml-auto shrink-0">Saved</span>
    </div>
  );
}

function ReceiptConfirmationCard({ workflow, onCancel }: { workflow: DocumentWorkflowArtifact; onCancel?: () => void }) {
  const parsed = workflow.parsed_data as ParsedReceipt | undefined;
  const tempFilePath = workflow.temp_file_path;
  const { markWorkflowCompleted, isWorkflowCompleted } = useChatStore();
  const alreadyCompleted = isWorkflowCompleted(workflow.workflow_id);
  const [step, setStep] = useState<"review" | "confirm" | "success" | "canceled" | "collapsed">(
    alreadyCompleted ? "collapsed" : "review"
  );
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup auto-collapse timer on unmount
  useEffect(() => {
    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
    };
  }, []);

  // Category state - initialize from parsed_data.suggested_category
  const [category, setCategory] = useState<ExpenseCategory>(
    (parsed?.suggested_category as ExpenseCategory) || "hsa"
  );

  // Edited data for both types
  const [editedExpense, setEditedExpense] = useState<ExpenseSchema | null>(parsed?.expense ?? null);
  const [editedCharitable, setEditedCharitable] = useState<CharitableDonationSchema | null>(parsed?.charitable_data ?? null);

  const [status, setStatus] = useState<ReimbursementStatus>("unreimbursed");
  const [forceImport, setForceImport] = useState(false);

  // Sync state when workflow changes
  useEffect(() => {
    if (parsed?.expense) {
      setEditedExpense(parsed.expense);
      setStatus(parsed.expense.hsa_eligible === false ? "not_hsa_eligible" : "unreimbursed");
    }
    if (parsed?.charitable_data) {
      setEditedCharitable(parsed.charitable_data);
    }
    if (parsed?.suggested_category) {
      setCategory(parsed.suggested_category as ExpenseCategory);
    }
    setForceImport(false);
  }, [workflow.workflow_id, parsed?.expense, parsed?.charitable_data, parsed?.suggested_category]);

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

  // Handle category switching - map fields between schemas
  const handleCategoryChange = (newCategory: ExpenseCategory) => {
    if (newCategory === category) return;

    if (newCategory === "charitable") {
      // HSA -> Charitable: map provider to organization_name, service_date to donation_date
      const existingExpense = editedExpense;
      setEditedCharitable({
        organization_name: existingExpense?.provider || "",
        donation_date: existingExpense?.service_date || "",
        amount: existingExpense?.amount ?? 0,
        tax_deductible: true,
        description: "",
      });
      setEditedExpense(null);
    } else {
      // Charitable -> HSA: map organization_name to provider, donation_date to service_date
      const existingCharitable = editedCharitable;
      setEditedExpense({
        provider: existingCharitable?.organization_name || "",
        service_date: existingCharitable?.donation_date || "",
        paid_date: "",
        amount: existingCharitable?.amount ?? 0,
        hsa_eligible: true,
      });
      setEditedCharitable(null);
    }

    setCategory(newCategory);
    // Reset duplicate state when switching categories
    resetDuplicateCheck();
  };

  if (!parsed || !tempFilePath) {
    return (
      <ErrorPanel size="sm">
        {workflow.message || "This workflow is missing parsed data."}
      </ErrorPanel>
    );
  }

  if ((category === "hsa" && !editedExpense) || (category === "charitable" && !editedCharitable)) {
    return (
      <ErrorPanel size="sm">
        Missing {category === "hsa" ? "expense" : "charitable"} data.
      </ErrorPanel>
    );
  }

  const confidence = Math.round((parsed.confidence || 0) * 100);
  const needsReview = confidence < 85;

  const handleContinue = async () => {
    // Skip duplicate check if workflow already has duplicate info and data hasn't changed
    const hasExistingDuplicateCheck = workflow.duplicate_info !== undefined;
    const dataChanged = category === "hsa"
      ? JSON.stringify(editedExpense) !== JSON.stringify(parsed?.expense)
      : JSON.stringify(editedCharitable) !== JSON.stringify(parsed?.charitable_data);
    
    if (!hasExistingDuplicateCheck || dataChanged) {
      await checkDuplicates({
        category,
        expense: editedExpense ?? undefined,
        charitable: editedCharitable ?? undefined,
      });
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const result = await submitReceipt({
      tempFilePath,
      category,
      expense: editedExpense ?? undefined,
      charitable: editedCharitable ?? undefined,
      status,
      forceImport,
    });

    if (result.success) {
      setStep("success");
      markWorkflowCompleted(workflow.workflow_id);
      // Auto-collapse after 2 seconds
      autoCollapseTimer.current = setTimeout(() => {
        setStep("collapsed");
      }, 2000);
    } else if (result.isDuplicate) {
      // Update duplicate state with submit-time detection results
      setDuplicateState(true, result.duplicateInfo || []);
      setForceImport(false);
    }
  };

  if (step === "collapsed") {
    return <CompletedWorkflowCard workflow={workflow} />;
  }

  if (step === "success") {
    return (
      <SuccessState
        compact
        title={category === "charitable" ? "Donation saved" : "Receipt saved successfully."}
        description={category === "charitable" ? "This charitable donation is now part of your giving ledger." : undefined}
      >
        {category === "charitable" ? (
          <Link href="/donations">
            <Button size="sm">View Donations</Button>
          </Link>
        ) : (
          <Link href="/hsa">
            <Button size="sm">View HSA Dashboard</Button>
          </Link>
        )}
      </SuccessState>
    );
  }

  if (step === "canceled") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{workflow.filename || "Receipt"}</p>
          <span className="text-xs text-muted-foreground">Canceled</span>
        </div>
        <p className="text-sm text-muted-foreground">
          This {category === "charitable" ? "donation" : "receipt"} was not saved. You can resume or discard it.
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
          <CategoryToggle value={category} onChange={handleCategoryChange} />

          {needsReview && (
            <WarningPanel size="sm">
              Low confidence parse. Please verify the fields below.
            </WarningPanel>
          )}

          {category === "hsa" && editedExpense && (
            <ExpenseEditor
              expense={editedExpense}
              onChange={(next) => setEditedExpense(next)}
              needsReview={needsReview}
            />
          )}

          {category === "charitable" && editedCharitable && (
            <CharitableExpenseEditor
              donation={editedCharitable}
              onChange={(next) => setEditedCharitable(next)}
              needsReview={needsReview}
            />
          )}

          <div className="flex items-center justify-between">
            <Button
              onClick={handleContinue}
              size="sm"
              loading={isCheckingDuplicates}
              loadingText="Checking duplicates..."
            >
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
          {category === "hsa" ? (
            <ReimbursementStatusSelector
              status={status}
              onChange={setStatus}
              radioName={`${workflow.workflow_id}-status`}
              compact
            />
          ) : (
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground">Charitable donations are automatically tracked in your donation ledger.</p>
            </div>
          )}

          <div className="space-y-1 rounded-lg border border-border bg-card p-2">
            <TaskStatusRow label="Uploading receipt to Google Drive" status={driveStatus} />
            <TaskStatusRow
              label={category === "charitable" ? "Updating charitable donation ledger" : "Updating Google Sheet ledger"}
              status={sheetStatus}
            />
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
              disabled={isDuplicate && !forceImport}
              loading={isSubmitting}
              loadingText="Saving..."
            >
              {isDuplicate ? "Import Anyway" : "Confirm & Save"}
            </Button>
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setStep("canceled")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              type="button"
            >
              Cancel and discard this {category === "charitable" ? "donation" : "receipt"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentWorkflowCard({ workflow, onCancel }: { workflow: DocumentWorkflowArtifact; onCancel?: () => void }) {
  // Route all receipt types through the unified component
  if (workflow.document_type === "receipt" || 
      workflow.document_type === "hsa_receipt" || 
      workflow.document_type === "charitable_receipt") {
    if (workflow.status !== "ready_for_confirmation") {
      return <ErrorPanel size="sm">{workflow.message}</ErrorPanel>;
    }

    return <ReceiptConfirmationCard workflow={workflow} onCancel={onCancel} />;
  }

  // Unknown type - generic display
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-sm">
      <p className="font-medium">
        {workflow.filename || workflow.document_type.replace(/_/g, " ")}
      </p>
      <p className="text-muted-foreground mt-1">{workflow.message}</p>
    </div>
  );
}
