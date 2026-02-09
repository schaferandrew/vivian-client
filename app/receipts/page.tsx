"use client";

import { useState, useCallback } from "react";
import { useReceiptStore } from "@/lib/stores/receipt";
import { uploadReceipt, parseReceipt, confirmReceipt } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, FolderOpen, FileUp } from "lucide-react";
import Link from "next/link";
import type { ReimbursementStatus } from "@/types";

function UploadStep() {
  const { setStep, setTempFilePath, setUploading, isUploading, setError } = useReceiptStore();

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
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
          <div className="flex items-center gap-3">
            <FileUp className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">Single Receipt</p>
              <p className="text-sm text-muted-foreground">Upload one receipt at a time</p>
            </div>
          </div>
        </div>
        
        <Link href="/receipts/bulk-import">
          <div className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-secondary transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Bulk Import</p>
                <p className="text-sm text-muted-foreground">Import multiple receipts with duplicate detection</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Single Upload Area */}
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
        <label className="cursor-pointer">
          <Input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          <Button variant="outline" disabled={isUploading}>
            {isUploading ? "Uploading..." : "Select File"}
          </Button>
        </label>
      </div>
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
    setError 
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

  const handleContinue = () => {
    setStep("confirm");
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
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}

function ConfirmStep() {
  const { tempFilePath, parsedData, setStep } = useReceiptStore();
  const [status, setStatus] = useState<ReimbursementStatus>("unreimbursed");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!tempFilePath || !parsedData) return;

    setIsSubmitting(true);
    try {
      await confirmReceipt({
        temp_file_path: tempFilePath,
        expense_data: parsedData.expense,
        status,
      });
      setStep("success");
    } catch (err) {
      console.error("Failed to confirm:", err);
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

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("review")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Confirm & Save"}
        </Button>
      </div>
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
        <Button variant="outline" onClick={() => reset()}>
          Upload Another
        </Button>
        <Link href="/hsa">
          <Button>View HSA Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const { step, error } = useReceiptStore();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <FileText className="w-6 h-6 text-foreground" />
            <h1 className="text-xl font-semibold">Upload Receipt</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Step {step === "upload" ? 1 : step === "review" ? 2 : step === "confirm" ? 3 : 4} of 4</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-[var(--error-50)] border border-[var(--error-200)] rounded-lg flex items-center gap-2 text-[var(--error-700)]">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {step === "upload" && <UploadStep />}
            {step === "review" && <ReviewStep />}
            {step === "confirm" && <ConfirmStep />}
            {step === "success" && <SuccessStep />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
