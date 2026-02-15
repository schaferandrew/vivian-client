"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useReceiptStore } from "@/lib/stores/receipt";
import { useBulkImportStore } from "@/lib/stores/bulk-import";
import { uploadReceipt, parseReceipt, confirmReceipt, checkReceiptDuplicate } from "@/lib/api/client";
import { BulkImportFlow } from "@/components/receipt/BulkImportFlow";
import { ConfidenceBadge } from "@/components/receipt/ReceiptStatusBadge";
import { ErrorPanel, WarningPanel } from "@/components/receipt/StatusPanels";
import { SuccessState } from "@/components/receipt/SharedReceiptComponents";
import {
  DuplicateInfoPanel,
  ExpenseEditor,
  ReimbursementStatusSelector,
  TaskStatusRow,
} from "@/components/receipt/SharedReceiptComponents";
import { CharitableExpenseEditor } from "@/components/receipt/CharitableExpenseEditor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Upload, FileText, ArrowLeft, FolderOpen, FileUp } from "lucide-react";
import type { ReimbursementStatus, DuplicateInfo, ExpenseCategory } from "@/types";

type UploadMode = "single" | "bulk";

function CategoryToggle({ value, onChange }: { value: ExpenseCategory; onChange: (val: ExpenseCategory) => void }) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        type="button"
        onClick={() => onChange("hsa")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          value === "hsa" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        HSA Medical
      </button>
      <button
        type="button"
        onClick={() => onChange("charitable")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          value === "charitable" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        Charitable Donation
      </button>
    </div>
  );
}

function SingleUploadStep() {
  const { setStep, setTempFilePath, setUploading, isUploading, setError, category, setCategory } = useReceiptStore();
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
    <div>
      <CategoryToggle value={category} onChange={setCategory} />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-[var(--neutral-300)] transition-colors"
      >
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">
          {category === "charitable" ? "Drag and drop a charitable donation receipt here" : "Drag and drop a medical receipt here"}
        </p>
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
    </div>
  );
}

function ReviewStep() {
  const {
    tempFilePath,
    parsedData,
    parseIsDuplicate,
    parseDuplicateInfo,
    parseDuplicateCheckError,
    setStep,
    setParsing,
    setParsedData,
    setParseDuplicateInfo,
    isParsing,
    setError,
    category,
    setCategory,
    editedExpense,
    editedCharitableData,
    setEditedExpense,
    setEditedCharitableData,
    reset,
  } = useReceiptStore();

  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);



  useEffect(() => {
    if (parsedData?.expense) {
      setEditedExpense(parsedData.expense);
    }
  }, [parsedData?.expense, setEditedExpense]);

  useEffect(() => {
    if (parsedData?.charitable_data) {
      setEditedCharitableData(parsedData.charitable_data);
    }
  }, [parsedData?.charitable_data, setEditedCharitableData]);

  const handleParse = async () => {
    if (!tempFilePath) return;

    setParsing(true);
    setError(undefined);

    try {
      const result = await parseReceipt(tempFilePath);
      setParsedData(result.parsed_data);
      setParseDuplicateInfo(
        Boolean(result.is_duplicate),
        result.duplicate_info || [],
        result.duplicate_check_error
      );
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

  const hasExpenseChanges =
    !!editedExpense &&
    parsedData.expense &&
    (
      editedExpense.provider !== parsedData.expense.provider ||
      editedExpense.service_date !== parsedData.expense.service_date ||
      editedExpense.amount !== parsedData.expense.amount ||
      editedExpense.hsa_eligible !== parsedData.expense.hsa_eligible
    );

  const hasCharitableChanges =
    !!editedCharitableData &&
    parsedData.charitable_data &&
    (
      editedCharitableData.organization_name !== parsedData.charitable_data.organization_name ||
      editedCharitableData.amount !== parsedData.charitable_data.amount ||
      editedCharitableData.donation_date !== parsedData.charitable_data.donation_date ||
      editedCharitableData.tax_deductible !== parsedData.charitable_data.tax_deductible
    );

  const hasCoreFieldChanges = category === "hsa" ? hasExpenseChanges : hasCharitableChanges;

  const handleContinue = async () => {
    if (category === "hsa" && !editedExpense) return;
    if (category === "charitable" && !editedCharitableData) return;

    setIsCheckingDuplicates(true);
    try {
      if (category === "hsa" && editedExpense && editedExpense.hsa_eligible) {
        const duplicateResult = await checkReceiptDuplicate(editedExpense);
        setParseDuplicateInfo(
          Boolean(duplicateResult.is_duplicate),
          duplicateResult.duplicate_info || [],
          duplicateResult.check_error
        );
      } else {
        setParseDuplicateInfo(false, [], undefined);
      }

      setParsedData({
        ...parsedData,
        suggested_category: category,
        expense: category === "hsa" ? editedExpense : undefined,
        charitable_data: category === "charitable" ? editedCharitableData : undefined,
      });
      setStep("confirm");
    } catch {
      setParseDuplicateInfo(false, [], "Duplicate check unavailable. You can still continue and final duplicate checks will run on save.");
      setParsedData({
        ...parsedData,
        suggested_category: category,
        expense: category === "hsa" ? editedExpense : undefined,
        charitable_data: category === "charitable" ? editedCharitableData : undefined,
      });
      setStep("confirm");
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  return (
    <div className="space-y-4">
      <CategoryToggle value={category} onChange={setCategory} />

      <div className="flex items-center gap-2 mb-4">
        <ConfidenceBadge 
          confidence={Math.round(parsedData.confidence * 100)} 
          showHelperText 
        />
      </div>

      {parseIsDuplicate && (
        <DuplicateInfoPanel
          duplicateInfo={parseDuplicateInfo || []}
          title={`Potential Duplicate${(parseDuplicateInfo?.length || 0) === 1 ? "" : "s"} Found During Scan`}
          description="This is flagged before save so you can review now. You can still choose to import later."
        />
      )}

      {parseDuplicateCheckError && (
        <WarningPanel>{parseDuplicateCheckError}</WarningPanel>
      )}

      {category === "hsa" && editedExpense && (
        <ExpenseEditor
          expense={editedExpense}
          onChange={(next) => setEditedExpense(next)}
          needsReview={needsReview}
        />
      )}

      {category === "charitable" && editedCharitableData && (
        <CharitableExpenseEditor
          donation={editedCharitableData}
          onChange={(next) => setEditedCharitableData(next)}
          needsReview={needsReview}
        />
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("upload")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isCheckingDuplicates}>
          {isCheckingDuplicates
            ? "Checking duplicates..."
            : hasCoreFieldChanges
            ? "Continue (Re-check Duplicates)"
            : "Continue"}
        </Button>
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={() => {
            reset();
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
          type="button"
        >
          Cancel and start over
        </button>
      </div>
    </div>
  );
}

function ConfirmStep() {
  const { tempFilePath, parsedData, setStep, setError, reset, category } = useReceiptStore();
  const [status, setStatus] = useState<ReimbursementStatus>("unreimbursed");

  useEffect(() => {
    if (parsedData?.expense) {
      setStatus(parsedData.expense.hsa_eligible === false ? "not_hsa_eligible" : "unreimbursed");
    }
  }, [parsedData?.expense]);
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
        category,
        expense_data: category === "hsa" ? parsedData.expense : undefined,
        charitable_data: category === "charitable" ? parsedData.charitable_data : undefined,
        status: category === "hsa" ? status : undefined,
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
      {category === "charitable" ? (
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Charitable donations are automatically tracked in your donation ledger.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Select the reimbursement status:</p>
          <ReimbursementStatusSelector
            status={status}
            onChange={setStatus}
            radioName="status"
          />
        </>
      )}

      {showTaskStatus && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <TaskStatusRow label="Uploading receipt to Google Drive" status={driveStatus} />
          {category === "hsa" && <TaskStatusRow label="Updating Google Sheet ledger" status={sheetStatus} />}
          {category === "charitable" && <TaskStatusRow label="Updating charitable donation ledger" status={sheetStatus} />}
        </div>
      )}

      {duplicateInfo !== null && (
        <DuplicateInfoPanel
          duplicateInfo={duplicateInfo}
          forceImport={forceImport}
          onForceImportChange={setForceImport}
        />
      )}

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setStep("review");
            setError(undefined);
            setDuplicateInfo(null);
            setForceImport(false);
            setShowTaskStatus(false);
            setDriveStatus("pending");
            setSheetStatus("pending");
          }}
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting || (duplicateInfo !== null && !forceImport)}>
          {isSubmitting ? "Saving..." : duplicateInfo ? "Import Anyway" : "Confirm & Save"}
        </Button>
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={() => {
            reset();
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
          type="button"
        >
          Cancel and start over
        </button>
      </div>
    </div>
  );
}

function SuccessStep() {
  const { reset } = useReceiptStore();
  const category = useReceiptStore((state) => state.category);

  return (
    <SuccessState
      title="Receipt Saved!"
      description="Your receipt has been processed and saved."
    >
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => reset()}>Upload Another</Button>
        {category === "charitable" ? (
          <Link href="/donations"><Button>View Donations Dashboard</Button></Link>
        ) : (
          <Link href="/hsa"><Button>View HSA Dashboard</Button></Link>
        )}
      </div>
    </SuccessState>
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
              <ErrorPanel showIcon>{receipt.error}</ErrorPanel>
            )}

            {mode === "bulk" && bulkError && (
              <ErrorPanel showIcon>{bulkError}</ErrorPanel>
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
