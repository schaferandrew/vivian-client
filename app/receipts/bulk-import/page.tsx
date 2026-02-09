"use client";

import { useState, useCallback } from "react";
import { useBulkImportStore } from "@/lib/stores/bulk-import";
import { bulkImportScan, bulkImportConfirm } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Folder,
  AlertTriangle,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import Link from "next/link";
import type { BulkImportFileResult, DuplicateInfo } from "@/types";

// Step 1: Upload
function UploadStep() {
  const { setStep, setDirectoryPath, setError, setIsScanning, setResults, setSummary } =
    useBulkImportStore();
  const [path, setPath] = useState("");

  const handleScan = async () => {
    if (!path.trim()) {
      setError("Please enter a directory path");
      return;
    }

    setDirectoryPath(path);
    setError(null);
    setStep("scanning");
    setIsScanning(true);

    try {
      const response = await bulkImportScan(path, {
        checkDuplicates: true,
        duplicateAction: "flag",
        skipErrors: true,
      });

      setResults({
        new: response.new,
        duplicates: response.duplicates,
        flagged: response.flagged,
        failed: response.failed,
      });
      setSummary(response.summary);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setStep("upload");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Directory Path</label>
        <div className="flex gap-2">
          <Input
            placeholder="/path/to/receipts"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleScan}>
            <Folder className="w-4 h-4 mr-2" />
            Scan Directory
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the full path to a directory containing PDF, JPG, or PNG receipt files
        </p>
      </div>

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Or use the chat interface to drag and drop files
        </p>
      </div>
    </div>
  );
}

// Step 2: Scanning
function ScanningStep() {
  const { scanningProgress } = useBulkImportStore();

  const percent = scanningProgress
    ? Math.round((scanningProgress.current / scanningProgress.total) * 100)
    : 0;

  return (
    <div className="text-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Scanning Receipts...</h3>
        {scanningProgress && (
          <>
            <p className="text-muted-foreground">
              Processing {scanningProgress.current} of {scanningProgress.total} files
            </p>
            {scanningProgress.currentFile && (
              <p className="text-sm text-muted-foreground">
                {scanningProgress.currentFile}
              </p>
            )}
          </>
        )}
      </div>
      <Progress value={percent} className="w-full max-w-md mx-auto" />
      <p className="text-sm text-muted-foreground">
        This may take a few minutes depending on the number of files
      </p>
    </div>
  );
}

// Duplicate Detail Panel
function DuplicateDetailPanel({ duplicates }: { duplicates: DuplicateInfo[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-amber-800 w-full"
      >
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <AlertTriangle className="w-4 h-4" />
        {duplicates.length} potential duplicate{duplicates.length > 1 ? "s" : ""} found
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {duplicates.map((dup, idx) => (
            <div
              key={idx}
              className="p-2 bg-white rounded border border-amber-200 text-sm"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Provider:</span>{" "}
                  {dup.provider}
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span> $
                  {dup.amount.toFixed(2)}
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {dup.service_date || "N/A"}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {dup.status}
                </div>
              </div>
              {dup.days_difference !== undefined && dup.days_difference !== null && (
                <div className="mt-1 text-amber-700">
                  {dup.days_difference} day{dup.days_difference !== 1 ? "s" : ""} difference
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                Entry ID: {dup.entry_id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Receipt Row Component
function ReceiptRow({
  result,
  isSelected,
  onToggle,
}: {
  result: BulkImportFileResult;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const getStatusBadge = () => {
    switch (result.status) {
      case "new":
        return <Badge className="bg-green-100 text-green-800">New</Badge>;
      case "duplicate_exact":
        return <Badge className="bg-amber-100 text-amber-800">Duplicate (Exact)</Badge>;
      case "duplicate_fuzzy":
        return (
          <Badge className="bg-orange-100 text-orange-800">Duplicate (Fuzzy)</Badge>
        );
      case "flagged":
        return <Badge className="bg-yellow-100 text-yellow-800">Flagged</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "skipped":
        return <Badge className="bg-gray-100 text-gray-800">Skipped</Badge>;
      default:
        return null;
    }
  };

  const canSelect = result.status === "new" || result.status === "flagged";

  return (
    <div className="p-4 border-b border-border last:border-0">
      <div className="flex items-start gap-4">
        {canSelect && (
          <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge()}
            <span className="font-medium truncate">{result.filename}</span>
          </div>

          {result.expense && (
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span>{" "}
                {result.expense.provider}
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                {result.expense.service_date || "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> $
                {result.expense.amount.toFixed(2)}
              </div>
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm text-yellow-700">
              <AlertTriangle className="w-4 h-4" />
              {result.warnings.join(", ")}
            </div>
          )}

          {result.error && (
            <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
              <X className="w-4 h-4" />
              {result.error}
            </div>
          )}

          {result.duplicate_info && result.duplicate_info.length > 0 && (
            <DuplicateDetailPanel duplicates={result.duplicate_info} />
          )}

          <div className="mt-2 text-xs text-muted-foreground">
            Confidence: {Math.round(result.confidence * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Review
function ReviewStep() {
  const {
    results,
    summary,
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    setStep,
  } = useBulkImportStore();

  const hasNew = results.new.length > 0;
  const hasDuplicates = results.duplicates.length > 0;
  const hasFlagged = results.flagged.length > 0;
  const hasFailed = results.failed.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.new_count}</div>
            <div className="text-sm text-muted-foreground">New</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{summary.duplicate_count}</div>
            <div className="text-sm text-muted-foreground">Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.flagged_count}</div>
            <div className="text-sm text-muted-foreground">Flagged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.failed_count}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => selectAll("new")}>
            Select All New
          </Button>
          <Button variant="outline" size="sm" onClick={() => selectAll("non-duplicates")}>
            Select All Non-Duplicates
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Clear Selection
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedIds.size} selected
        </div>
      </div>

      {/* Results Lists */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto border rounded-lg">
        {hasNew && (
          <div>
            <div className="px-4 py-2 bg-green-50 border-b border-green-200 font-medium text-green-800">
              New Receipts ({results.new.length})
            </div>
            {results.new.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={result.temp_file_path ? selectedIds.has(result.temp_file_path) : false}
                onToggle={() => result.temp_file_path && toggleSelection(result.temp_file_path)}
              />
            ))}
          </div>
        )}

        {hasDuplicates && (
          <div>
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 font-medium text-amber-800">
              Potential Duplicates ({results.duplicates.length})
            </div>
            {results.duplicates.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={false}
                onToggle={() => {}}
              />
            ))}
          </div>
        )}

        {hasFlagged && (
          <div>
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 font-medium text-yellow-800">
              Flagged for Review ({results.flagged.length})
            </div>
            {results.flagged.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={result.temp_file_path ? selectedIds.has(result.temp_file_path) : false}
                onToggle={() => result.temp_file_path && toggleSelection(result.temp_file_path)}
              />
            ))}
          </div>
        )}

        {hasFailed && (
          <div>
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 font-medium text-red-800">
              Failed ({results.failed.length})
            </div>
            {results.failed.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={false}
                onToggle={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("upload")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep("confirm")}
          disabled={selectedIds.size === 0}
        >
          Continue ({selectedIds.size} selected)
        </Button>
      </div>
    </div>
  );
}

// Step 4: Confirm
function ConfirmStep() {
  const {
    selectedIds,
    summary,
    setStep,
    setImportResults,
    setError,
    options,
  } = useBulkImportStore();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    const tempPaths = Array.from(selectedIds);
    
    setIsImporting(true);
    setError(null);

    try {
      const response = await bulkImportConfirm(tempPaths, options.statusOverride || undefined);
      
      setImportResults({
        importedCount: response.imported_count,
        failedCount: response.failed_count,
        totalAmount: response.total_amount,
        message: response.message,
      });
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Ready to Import</h3>
        <p className="text-muted-foreground">
          You&apos;re about to import {selectedIds.size} receipt{selectedIds.size !== 1 ? "s" : ""}
        </p>
      </div>

      {summary && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Selected receipts:</span>
            <span className="font-medium">{selectedIds.size}</span>
          </div>
          <div className="flex justify-between">
            <span>Total amount:</span>
            <span className="font-medium">${summary.total_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Skipped duplicates:</span>
            <span className="font-medium">{summary.duplicate_count}</span>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Before you import:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Receipts will be uploaded to Google Drive</li>
              <li>Expense data will be added to your ledger</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("review")} disabled={isImporting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Import to Drive & Ledger
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Step 5: Results
function ResultsStep() {
  const { importResults, reset } = useBulkImportStore();

  if (!importResults) return null;

  return (
    <div className="text-center py-8 space-y-6">
      {importResults.failedCount === 0 ? (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold">Import Successful!</h3>
        </>
      ) : (
        <>
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h3 className="text-xl font-semibold">Import Completed with Issues</h3>
        </>
      )}

      <p className="text-muted-foreground">{importResults.message}</p>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {importResults.importedCount}
          </div>
          <div className="text-sm text-muted-foreground">Imported</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {importResults.failedCount}
          </div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            ${importResults.totalAmount.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
      </div>

      <div className="flex gap-3 justify-center pt-4">
        <Button variant="outline" onClick={reset}>
          Import More
        </Button>
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

// Main Page Component
export default function BulkImportPage() {
  const { step, error } = useBulkImportStore();

  const getStepNumber = () => {
    switch (step) {
      case "upload":
        return 1;
      case "scanning":
        return 2;
      case "review":
        return 3;
      case "confirm":
        return 4;
      case "results":
        return 5;
      default:
        return 1;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <FileText className="w-6 h-6 text-foreground" />
            <h1 className="text-xl font-semibold">Bulk Import Receipts</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Step {getStepNumber()} of 5: {" "}
              {step === "upload" && "Select Directory"}
              {step === "scanning" && "Scanning"}
              {step === "review" && "Review Results"}
              {step === "confirm" && "Confirm Import"}
              {step === "results" && "Import Complete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {step === "upload" && <UploadStep />}
            {step === "scanning" && <ScanningStep />}
            {step === "review" && <ReviewStep />}
            {step === "confirm" && <ConfirmStep />}
            {step === "results" && <ResultsStep />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
