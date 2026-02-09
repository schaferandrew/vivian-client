"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useReceiptStore } from "@/lib/stores/receipt";
import { useBulkImportStore } from "@/lib/stores/bulk-import";
import { uploadReceipt, parseReceipt, confirmReceipt } from "@/lib/api/client";
import { BulkImportFlow } from "@/components/receipt/BulkImportFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, FolderOpen, FileUp, Loader2, Circle } from "lucide-react";
import type { ReimbursementStatus, DuplicateInfo } from "@/types";

type UploadMode = "single" | "bulk";

function SingleUploadStep() {
  const { setStep, setTempFilePath, setUploading, isUploading, setError } = useReceiptStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = useCallback(async (acceptedFiles: FileList | null) => {
    const file = acceptedFiles?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      setError("Please upload a PDF file");
      return;
    }

    setUploading(true);
    setError(undefined);

    try {
      const result = await uploadReceipt(file);
      setTempFilePath(result.temp_file_path);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [setStep, setTempFilePath, setUploading, setError]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDrop(e.target.files);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.files);
      }}
      className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-[var(--neutral-300)] transition-colors"
    >
      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground mb-2">Drag and drop a PDF receipt here</p>
      <p className="text-sm text-[var(--neutral-400)] mb-4">or</p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="hidden"
      />
      <Button
        variant="outline"
        disabled={isUploading}
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : "Select File"}
      </Button>
    </div>
  );
}

function ReviewStep() {
  const {
    tempFilePath,
    parsedData,
    setStep,
    setParsing,
    setParsedData,
    isParsing,
    setError,
  } = useReceiptStore();

  const [editedExpense, setEditedExpense] = useState(parsedData?.expense);

  const handleParse = async () => {
    if (!tempFilePath) return;

    setParsing(true);
    setError(undefined);

    try {
      const result = await parseReceipt(tempFilePath);
      setParsedData(result.parsed_data);
      setEditedExpense(result.parsed_data.expense);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parsing failed");
    } finally {
      setParsing(false);
    }
  };

  if (!parsedData) {
    return (
      <div className="text-center py-8">
        <Button onClick={handleParse} disabled={isParsing}>
          {isParsing ? "Parsing..." : "Parse Receipt"}
        </Button>
      </div>
    );
  }

  const needsReview = parsedData.confidence < 0.85;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={needsReview ? "destructive" : "default"}>
          Confidence: {Math.round(parsedData.confidence * 100)}%
        </Badge>
        {needsReview && (
          <span className="text-sm text-[var(--error-600)]">Review recommended</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Provider</label>
          <Input
            value={editedExpense?.provider || ""}
            onChange={(e) => setEditedExpense(prev => prev ? { ...prev, provider: e.target.value } : undefined)}
            className={needsReview ? "border-[var(--brand-400)]" : ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={editedExpense?.amount || ""}
              onChange={(e) => setEditedExpense(prev => prev ? { ...prev, amount: parseFloat(e.target.value) } : undefined)}
              className={needsReview ? "border-[var(--brand-400)]" : ""}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Service Date</label>
            <Input
              type="date"
              value={editedExpense?.service_date || ""}
              onChange={(e) => setEditedExpense(prev => prev ? { ...prev, service_date: e.target.value } : undefined)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">HSA Eligible</label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={editedExpense?.hsa_eligible === true}
                onChange={() => setEditedExpense(prev => prev ? { ...prev, hsa_eligible: true } : undefined)}
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={editedExpense?.hsa_eligible === false}
                onChange={() => setEditedExpense(prev => prev ? { ...prev, hsa_eligible: false } : undefined)}
              />
              No
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("upload")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => setStep("confirm")}>Continue</Button>
      </div>
    </div>
  );
}

function ConfirmStep() {
  const { tempFilePath, parsedData, setStep, setError } = useReceiptStore();
  const [status, setStatus] = useState<ReimbursementStatus>("unreimbursed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo[] | null>(null);
  const [forceImport, setForceImport] = useState(false);
  const [driveStatus, setDriveStatus] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [sheetStatus, setSheetStatus] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [showTaskStatus, setShowTaskStatus] = useState(false);

  const handleConfirm = async () => {
    if (!tempFilePath || !parsedData) return;

    setIsSubmitting(true);
    setDuplicateInfo(null);
    setError(undefined);
    setShowTaskStatus(true);
    setDriveStatus("loading");
    setSheetStatus("loading");

    try {
      const result = await confirmReceipt({
        temp_file_path: tempFilePath,
        expense_data: parsedData.expense,
        status,
        force: forceImport,
      });

      if (result.is_duplicate && !forceImport) {
        setDuplicateInfo(result.duplicate_info || []);
        setError("Duplicate receipt detected. Review the existing entries below.");
        setShowTaskStatus(false);
        setDriveStatus("pending");
        setSheetStatus("pending");
        setIsSubmitting(false);
        return;
      }

      if (result.success) {
        setDriveStatus("success");
        setSheetStatus("success");
        setStep("success");
      } else {
        setDriveStatus("error");
        setSheetStatus("error");
        setError(result.message || "Failed to save receipt");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save receipt";
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
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Select the reimbursement status:</p>

      <div className="space-y-2">
        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary">
          <input
            type="radio"
            name="status"
            value="reimbursed"
            checked={status === "reimbursed"}
            onChange={(e) => setStatus(e.target.value as ReimbursementStatus)}
          />
          <div>
            <p className="font-medium">Already Reimbursed</p>
            <p className="text-sm text-muted-foreground">I&apos;ve already been paid back from my HSA</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary">
          <input
            type="radio"
            name="status"
            value="unreimbursed"
            checked={status === "unreimbursed"}
            onChange={(e) => setStatus(e.target.value as ReimbursementStatus)}
          />
          <div>
            <p className="font-medium">Save for Future</p>
            <p className="text-sm text-muted-foreground">Track this expense for future reimbursement</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary">
          <input
            type="radio"
            name="status"
            value="not_hsa_eligible"
            checked={status === "not_hsa_eligible"}
            onChange={(e) => setStatus(e.target.value as ReimbursementStatus)}
          />
          <div>
            <p className="font-medium">Not HSA Eligible</p>
            <p className="text-sm text-muted-foreground">This expense doesn&apos;t qualify for HSA</p>
          </div>
        </label>
      </div>

      {showTaskStatus && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <TaskStatusRow label="Uploading receipt to Google Drive" status={driveStatus} />
          <TaskStatusRow label="Updating Google Sheet ledger" status={sheetStatus} />
        </div>
      )}

      {duplicateInfo && duplicateInfo.length > 0 && (
        <div className="p-4 bg-[var(--warning-50)] border border-[var(--warning-200)] rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-[var(--warning-800)] font-medium">
            <AlertCircle className="w-5 h-5" />
            <span>Potential Duplicate{duplicateInfo.length > 1 ? "s" : ""} Found</span>
          </div>
          <p className="text-sm text-[var(--warning-700)]">
            This receipt appears to match existing entries in your ledger.
          </p>

          <div className="space-y-2">
            {duplicateInfo.map((dup, idx) => (
              <div key={idx} className="p-3 bg-white rounded border border-[var(--warning-200)] text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Provider:</span> {dup.provider}</div>
                  <div><span className="text-muted-foreground">Amount:</span> ${dup.amount.toFixed(2)}</div>
                  <div><span className="text-muted-foreground">Date:</span> {dup.service_date || "N/A"}</div>
                  <div><span className="text-muted-foreground">Status:</span> {dup.status}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Entry ID: {dup.entry_id}</div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={forceImport}
              onChange={(e) => setForceImport(e.target.checked)}
            />
            <span className="text-[var(--warning-800)]">I understand - import anyway</span>
          </label>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("review")} disabled={isSubmitting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting || (duplicateInfo !== null && !forceImport)}>
          {isSubmitting ? "Saving..." : duplicateInfo ? "Import Anyway" : "Confirm & Save"}
        </Button>
      </div>
    </div>
  );
}

function TaskStatusRow({
  label,
  status,
}: {
  label: string;
  status: "pending" | "loading" | "success" | "error";
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

function SuccessStep() {
  const { reset } = useReceiptStore();

  return (
    <div className="text-center py-8">
      <CheckCircle className="w-16 h-16 text-[var(--success-500)] mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Receipt Saved!</h3>
      <p className="text-muted-foreground mb-6">Your receipt has been processed and saved.</p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => reset()}>Upload Another</Button>
        <Link href="/hsa"><Button>View HSA Dashboard</Button></Link>
      </div>
    </div>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: UploadMode; onChange: (mode: UploadMode) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <button
        type="button"
        onClick={() => onChange("single")}
        className={`p-4 border-2 rounded-lg text-left transition-colors ${
          mode === "single" ? "border-primary bg-primary/5" : "border-border hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-3">
          <FileUp className="w-8 h-8 text-primary" />
          <div>
            <p className="font-medium text-lg">Single Receipt</p>
            <p className="text-sm text-muted-foreground">Upload one receipt at a time</p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange("bulk")}
        className={`p-4 border-2 rounded-lg text-left transition-colors ${
          mode === "bulk" ? "border-primary bg-primary/5" : "border-border hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-8 h-8 text-primary" />
          <div>
            <p className="font-medium text-lg">Bulk Import</p>
            <p className="text-sm text-muted-foreground">Import multiple receipts with duplicate detection</p>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function ReceiptsPage() {
  const [mode, setMode] = useState<UploadMode>("single");

  const receipt = useReceiptStore();
  const bulkStep = useBulkImportStore((state) => state.step);
  const bulkError = useBulkImportStore((state) => state.error);
  const bulkReset = useBulkImportStore((state) => state.reset);

  const handleModeChange = (nextMode: UploadMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === "single") {
      bulkReset();
    } else {
      receipt.reset();
    }
  };

  const singleStepNumber = receipt.step === "upload" ? 1 : receipt.step === "review" ? 2 : receipt.step === "confirm" ? 3 : 4;
  const bulkStepNumber = bulkStep === "upload" ? 1 : bulkStep === "scanning" ? 2 : bulkStep === "review" ? 3 : bulkStep === "confirm" ? 4 : 5;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <FileText className="w-6 h-6 text-foreground" />
            <h1 className="text-xl font-semibold">Receipt Upload</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Step {mode === "single" ? singleStepNumber : bulkStepNumber} of {mode === "single" ? 4 : 5}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ModeSwitcher mode={mode} onChange={handleModeChange} />

            {mode === "single" && receipt.error && (
              <div className="mb-4 p-3 bg-[var(--error-50)] border border-[var(--error-200)] rounded-lg flex items-center gap-2 text-[var(--error-700)]">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{receipt.error}</span>
              </div>
            )}

            {mode === "bulk" && bulkError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{bulkError}</span>
              </div>
            )}

            {mode === "single" && receipt.step === "upload" && <SingleUploadStep />}
            {mode === "single" && receipt.step === "review" && <ReviewStep />}
            {mode === "single" && receipt.step === "confirm" && <ConfirmStep />}
            {mode === "single" && receipt.step === "success" && <SuccessStep />}

            {mode === "bulk" && <BulkImportFlow />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
