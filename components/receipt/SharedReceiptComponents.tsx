"use client";

import { AlertCircle, CheckCircle, Circle, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { DuplicateInfo, ExpenseSchema, ReimbursementStatus } from "@/types";

export type TaskStatus = "pending" | "loading" | "success" | "error";

export function TaskStatusRow({
  label,
  status,
}: {
  label: string;
  status: TaskStatus;
}) {
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

export function DuplicateInfoPanel({
  duplicateInfo,
  title = "Potential Duplicate Found",
  description = "This receipt appears to match existing entries in your ledger.",
  forceImport,
  onForceImportChange,
}: {
  duplicateInfo: DuplicateInfo[];
  title?: string;
  description?: string;
  forceImport?: boolean;
  onForceImportChange?: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--warning-200)] bg-[var(--warning-50)] p-4 dark:border-[var(--warning-800)] dark:bg-[var(--warning-900)]/20">
      <div className="flex items-center gap-2 font-medium text-[var(--warning-800)] dark:text-[var(--warning-200)]">
        <AlertCircle className="w-5 h-5" />
        <span>{title}</span>
      </div>
      <p className="text-sm text-[var(--warning-700)] dark:text-[var(--warning-300)]">{description}</p>

      {duplicateInfo.length > 0 ? (
        <div className="space-y-2">
          {duplicateInfo.map((dup, idx) => (
            <div
              key={idx}
              className="rounded border border-[var(--warning-200)] bg-background p-3 text-sm dark:border-[var(--warning-800)] dark:bg-[var(--warning-900)]/30"
            >
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Provider:</span> {dup.provider}</div>
                <div><span className="text-muted-foreground">Amount:</span> ${dup.amount.toFixed(2)}</div>
                <div><span className="text-muted-foreground">Date:</span> {dup.date || "N/A"}</div>
                <div><span className="text-muted-foreground">Status:</span> {dup.status}</div>
              </div>
              {dup.message && (
                <div className="mt-1 text-sm text-[var(--warning-700)] dark:text-[var(--warning-300)]">{dup.message}</div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">Entry ID: {dup.entry_id}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--warning-700)] dark:text-[var(--warning-300)]">
          Duplicate was detected but exact matching rows were not returned.
        </p>
      )}

      {typeof forceImport === "boolean" && onForceImportChange && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={forceImport}
            onChange={(e) => onForceImportChange(e.target.checked)}
          />
          <span className="text-[var(--warning-800)] dark:text-[var(--warning-200)]">I understand - import anyway</span>
        </label>
      )}
    </div>
  );
}

export function ExpenseEditor({
  expense,
  onChange,
  needsReview,
}: {
  expense: ExpenseSchema;
  onChange: (next: ExpenseSchema) => void;
  needsReview?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-foreground">Provider</label>
        <Input
          value={expense.provider || ""}
          onChange={(e) => onChange({ ...expense, provider: e.target.value })}
          className={needsReview ? "border-[var(--brand-400)]" : ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Amount</label>
          <Input
            type="number"
            step="0.01"
            value={expense.amount}
            onChange={(e) => {
              const parsed = Number.parseFloat(e.target.value);
              onChange({ ...expense, amount: Number.isFinite(parsed) ? parsed : 0 });
            }}
            className={needsReview ? "border-[var(--brand-400)]" : ""}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Service Date</label>
          <Input
            type="date"
            value={expense.service_date || ""}
            onChange={(e) => onChange({ ...expense, service_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">HSA Eligible</label>
        <div className="flex gap-4 mt-1">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={expense.hsa_eligible === true}
              onChange={() => onChange({ ...expense, hsa_eligible: true })}
            />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={expense.hsa_eligible === false}
              onChange={() => onChange({ ...expense, hsa_eligible: false })}
            />
            No
          </label>
        </div>
      </div>
    </div>
  );
}

export function ReimbursementStatusSelector({
  status,
  onChange,
  radioName,
  compact = false,
}: {
  status: ReimbursementStatus;
  onChange: (value: ReimbursementStatus) => void;
  radioName: string;
  compact?: boolean;
}) {
  const wrapperClass = compact
    ? "flex items-start gap-2 rounded-md border border-border p-2 text-xs"
    : "flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary";

  return (
    <div className="space-y-2">
      <label className={wrapperClass}>
        <input
          type="radio"
          name={radioName}
          value="reimbursed"
          checked={status === "reimbursed"}
          onChange={(e) => onChange(e.target.value as ReimbursementStatus)}
        />
        <div>
          <p className="font-medium">Already Reimbursed</p>
          <p className="text-sm text-muted-foreground">I&apos;ve already been paid back from my HSA</p>
        </div>
      </label>

      <label className={wrapperClass}>
        <input
          type="radio"
          name={radioName}
          value="unreimbursed"
          checked={status === "unreimbursed"}
          onChange={(e) => onChange(e.target.value as ReimbursementStatus)}
        />
        <div>
          <p className="font-medium">Save for Future</p>
          <p className="text-sm text-muted-foreground">Track this expense for future reimbursement</p>
        </div>
      </label>

      <label className={wrapperClass}>
        <input
          type="radio"
          name={radioName}
          value="not_hsa_eligible"
          checked={status === "not_hsa_eligible"}
          onChange={(e) => onChange(e.target.value as ReimbursementStatus)}
        />
        <div>
          <p className="font-medium">Not HSA Eligible</p>
          <p className="text-sm text-muted-foreground">This expense doesn&apos;t qualify for HSA</p>
        </div>
      </label>
    </div>
  );
}

export function SuccessState({
  compact = false,
  title,
  description,
  children,
}: {
  compact?: boolean;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  if (compact) {
    return (
      <div className="rounded-lg border border-[var(--success-200)] bg-[var(--success-50)] p-3 dark:border-[var(--success-800)] dark:bg-[var(--success-900)]/20">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--success-700)] dark:text-[var(--success-300)]">
          <CheckCircle className="h-4 w-4" />
          <span>{title || "Receipt saved successfully."}</span>
        </div>
        {children && <div className="mt-3">{children}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <CheckCircle className="h-16 w-16 text-[var(--success-600)]" />
      <h3 className="text-lg font-semibold">{title || "Receipt Saved!"}</h3>
      {description && <p className="text-muted-foreground text-center max-w-sm">{description}</p>}
      {children}
    </div>
  );
}
