"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useBulkImportStore } from "@/lib/stores/bulk-import";
import { uploadReceipt, bulkImportScanTemp, bulkImportConfirm } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import type { BulkImportFileResult, DuplicateInfo, ReimbursementStatus } from "@/types";

function UploadStep() {
  const { setStep, setError, setIsScanning, setScanningProgress, setResults, setSummary } =
    useBulkImportStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mergeSelectedFiles = (incoming: File[]) => {
    const pdfs = incoming.filter((f) => f.type.includes("pdf") || f.name.toLowerCase().endsWith(".pdf"));
    setSelectedFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...pdfs].forEach((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        map.set(key, file);
      });
      return Array.from(map.values());
    });
  };

  const handleScan = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one PDF receipt");
      return;
    }

    setError(null);
    setStep("scanning");
    setIsScanning(true);
    setScanningProgress({ current: 0, total: selectedFiles.length });

    try {
      const tempFilePaths: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setScanningProgress({
          current: i + 1,
          total: selectedFiles.length,
          currentFile: file.name,
        });
        const upload = await uploadReceipt(file);
        tempFilePaths.push(upload.temp_file_path);
      }

      const response = await bulkImportScanTemp(tempFilePaths, {
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
      setScanningProgress(null);
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          mergeSelectedFiles(Array.from(e.dataTransfer.files || []));
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center space-y-4 transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Drag and drop multiple PDF receipts, or use file picker</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={(e) => mergeSelectedFiles(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()}>
            Choose Files
          </Button>
          <Button onClick={handleScan} disabled={selectedFiles.length === 0}>
            Scan Selected Files
          </Button>
        </div>
        {selectedFiles.length > 0 && (
          <p className="text-sm text-muted-foreground">{selectedFiles.length} file(s) selected</p>
        )}
      </div>
    </div>
  );
}

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
              <p className="text-sm text-muted-foreground">{scanningProgress.currentFile}</p>
            )}
          </>
        )}
      </div>
      <Progress value={percent} className="w-full max-w-md mx-auto" />
    </div>
  );
}

function DuplicateDetailPanel({ duplicates }: { duplicates: DuplicateInfo[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-amber-800 w-full"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <AlertTriangle className="w-4 h-4" />
        {duplicates.length} potential duplicate{duplicates.length > 1 ? "s" : ""} found
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {duplicates.map((dup, idx) => (
            <div key={idx} className="p-2 bg-white rounded border border-amber-200 text-sm">
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
              {dup.days_difference !== undefined && dup.days_difference !== null && (
                <div className="mt-1 text-amber-700">
                  {dup.days_difference} day{dup.days_difference !== 1 ? "s" : ""} difference
                </div>
              )}
              {dup.message && (
                <div className="mt-1 text-amber-700">{dup.message}</div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">Entry ID: {dup.entry_id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptRow({
  result,
  isSelected,
  allowDuplicateSelection,
  statusOverride,
  defaultStatusLabel,
  onToggle,
  onStatusOverrideChange,
}: {
  result: BulkImportFileResult;
  isSelected: boolean;
  allowDuplicateSelection: boolean;
  statusOverride?: ReimbursementStatus | "default";
  defaultStatusLabel: string;
  onToggle: () => void;
  onStatusOverrideChange?: (next: ReimbursementStatus | "default") => void;
}) {
  const canSelect =
    result.status === "new" ||
    result.status === "flagged" ||
    (allowDuplicateSelection &&
      (result.status === "duplicate_exact" || result.status === "duplicate_fuzzy"));

  const badge = {
    new: <Badge className="bg-green-100 text-green-800">New</Badge>,
    duplicate_exact: <Badge className="bg-amber-100 text-amber-800">Duplicate (Exact)</Badge>,
    duplicate_fuzzy: <Badge className="bg-orange-100 text-orange-800">Duplicate (Fuzzy)</Badge>,
    flagged: <Badge className="bg-yellow-100 text-yellow-800">Flagged</Badge>,
    failed: <Badge className="bg-red-100 text-red-800">Failed</Badge>,
    skipped: <Badge className="bg-gray-100 text-gray-800">Skipped</Badge>,
  }[result.status];

  return (
    <div className="p-4 border-b border-border last:border-0">
      <div className="flex items-start gap-4">
        {canSelect && <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {badge}
            <span className="font-medium truncate">{result.filename}</span>
          </div>

          {result.expense && (
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span> {result.expense.provider}
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span> {result.expense.service_date || "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> ${result.expense.amount.toFixed(2)}
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

          {canSelect && isSelected && onStatusOverrideChange && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Status for this receipt:
              </p>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={statusOverride || "default"}
                onChange={(e) => onStatusOverrideChange(e.target.value as ReimbursementStatus | "default")}
              >
                <option value="default">Use Default ({defaultStatusLabel})</option>
                <option value="unreimbursed">Save for Future</option>
                <option value="reimbursed">Already Reimbursed</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep() {
  const { results, summary, selectedIds, options, setOptions, toggleSelection, selectAll, deselectAll, setStep } =
    useBulkImportStore();
  const globalStatusLabel = options.statusOverride === "reimbursed" ? "Already Reimbursed" : "Save for Future";

  const handleToggle = (tempPath: string) => {
    const isCurrentlySelected = selectedIds.has(tempPath);
    toggleSelection(tempPath);

    if (isCurrentlySelected && options.itemStatusOverrides[tempPath]) {
      const nextOverrides = { ...options.itemStatusOverrides };
      delete nextOverrides[tempPath];
      setOptions({ itemStatusOverrides: nextOverrides });
    }
  };

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => selectAll("new")}>Select New Only</Button>
          <Button variant="outline" size="sm" onClick={() => selectAll("non-duplicates")}>Select New + Under Review</Button>
          {options.forceImportDuplicates && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                results.duplicates.forEach((r) => {
                  if (r.temp_file_path && !selectedIds.has(r.temp_file_path)) {
                    toggleSelection(r.temp_file_path);
                  }
                });
              }}
            >
              Select Duplicates
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={deselectAll}>Clear Selection</Button>
        </div>
        <div className="text-sm text-muted-foreground">{selectedIds.size} selected</div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--warning-700)] bg-[var(--warning-50)] border border-[var(--warning-200)] rounded-md px-3 py-2">
        <Checkbox
          checked={options.forceImportDuplicates}
          onCheckedChange={(checked) => {
            const enabled = Boolean(checked);
            setOptions({ forceImportDuplicates: enabled });
            if (!enabled) {
              results.duplicates.forEach((r) => {
                if (r.temp_file_path && selectedIds.has(r.temp_file_path)) {
                  toggleSelection(r.temp_file_path);
                }
              });
            }
          }}
        />
        <span>Allow selecting potential duplicates (override during import)</span>
      </label>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Default reimbursement status for selected receipts:</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary">
            <input
              type="radio"
              name="bulk-status"
              value="reimbursed"
              checked={options.statusOverride === "reimbursed"}
              onChange={(e) => setOptions({ statusOverride: e.target.value as ReimbursementStatus })}
            />
            <div>
              <p className="font-medium">Already Reimbursed</p>
              <p className="text-sm text-muted-foreground">I&apos;ve already been paid back from my HSA</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary">
            <input
              type="radio"
              name="bulk-status"
              value="unreimbursed"
              checked={options.statusOverride === "unreimbursed"}
              onChange={(e) => setOptions({ statusOverride: e.target.value as ReimbursementStatus })}
            />
            <div>
              <p className="font-medium">Save for Future</p>
              <p className="text-sm text-muted-foreground">Track these expenses for future reimbursement</p>
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto border rounded-lg">
        {results.new.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-green-50 border-b border-green-200 font-medium text-green-800">
              New Receipts ({results.new.length})
            </div>
            {results.new.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={result.temp_file_path ? selectedIds.has(result.temp_file_path) : false}
                allowDuplicateSelection={false}
                statusOverride={
                  result.temp_file_path
                    ? options.itemStatusOverrides[result.temp_file_path] || "default"
                    : "default"
                }
                defaultStatusLabel={globalStatusLabel}
                onToggle={() => result.temp_file_path && handleToggle(result.temp_file_path)}
                onStatusOverrideChange={(next) => {
                  if (!result.temp_file_path) return;
                  setOptions({
                    itemStatusOverrides: {
                      ...options.itemStatusOverrides,
                      [result.temp_file_path]: next,
                    },
                  });
                }}
              />
            ))}
          </div>
        )}

        {results.duplicates.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 font-medium text-amber-800">
              Potential Duplicates ({results.duplicates.length})
            </div>
            {results.duplicates.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={result.temp_file_path ? selectedIds.has(result.temp_file_path) : false}
                allowDuplicateSelection={options.forceImportDuplicates}
                statusOverride={
                  result.temp_file_path
                    ? options.itemStatusOverrides[result.temp_file_path] || "default"
                    : "default"
                }
                defaultStatusLabel={globalStatusLabel}
                onToggle={() => result.temp_file_path && handleToggle(result.temp_file_path)}
                onStatusOverrideChange={(next) => {
                  if (!result.temp_file_path) return;
                  setOptions({
                    itemStatusOverrides: {
                      ...options.itemStatusOverrides,
                      [result.temp_file_path]: next,
                    },
                  });
                }}
              />
            ))}
          </div>
        )}

        {results.flagged.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 font-medium text-yellow-800">
              Flagged for Review ({results.flagged.length})
            </div>
            {results.flagged.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={result.temp_file_path ? selectedIds.has(result.temp_file_path) : false}
                allowDuplicateSelection={false}
                statusOverride={
                  result.temp_file_path
                    ? options.itemStatusOverrides[result.temp_file_path] || "default"
                    : "default"
                }
                defaultStatusLabel={globalStatusLabel}
                onToggle={() => result.temp_file_path && handleToggle(result.temp_file_path)}
                onStatusOverrideChange={(next) => {
                  if (!result.temp_file_path) return;
                  setOptions({
                    itemStatusOverrides: {
                      ...options.itemStatusOverrides,
                      [result.temp_file_path]: next,
                    },
                  });
                }}
              />
            ))}
          </div>
        )}

        {results.failed.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 font-medium text-red-800">
              Failed ({results.failed.length})
            </div>
            {results.failed.map((result, idx) => (
              <ReceiptRow
                key={idx}
                result={result}
                isSelected={false}
                allowDuplicateSelection={false}
                defaultStatusLabel={globalStatusLabel}
                onToggle={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("upload")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => setStep("confirm")} disabled={selectedIds.size === 0}>
          Continue ({selectedIds.size} selected)
        </Button>
      </div>
    </div>
  );
}

function ConfirmStep() {
  const { selectedIds, summary, results, setStep, setImportResults, setError, options } = useBulkImportStore();
  const [isImporting, setIsImporting] = useState(false);
  const [forceImport, setForceImport] = useState(false);

  const duplicatePathSet = new Set(
    results.duplicates.map((r) => r.temp_file_path).filter((path): path is string => Boolean(path))
  );
  const selectedDuplicateCount = Array.from(selectedIds).filter((path) => duplicatePathSet.has(path)).length;
  const selectedRows = [...results.new, ...results.flagged, ...results.duplicates].filter(
    (r) => r.temp_file_path && r.expense && selectedIds.has(r.temp_file_path)
  );
  const selectedTotalAmount = selectedRows.reduce((sum, row) => sum + (row.expense?.amount || 0), 0);

  const handleImport = async () => {
    const selectedItems = selectedRows.map((r) => {
      const tempPath = r.temp_file_path as string;
      const perItemStatus = options.itemStatusOverrides[tempPath];
      return {
        temp_file_path: tempPath,
        expense_data: r.expense!,
        status: perItemStatus && perItemStatus !== "default" ? perItemStatus : undefined,
      };
    });

    if (selectedItems.length === 0) {
      setError("No valid selected receipts to import");
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      const response = await bulkImportConfirm(
        selectedItems,
        options.statusOverride || undefined,
        forceImport
      );
      setImportResults({
        importedCount: response.imported_count,
        failedCount: response.failed_count,
        totalAmount: response.total_amount,
        message: response.message,
        failures: response.results
          .filter((r) => ["failed", "duplicate_exact", "duplicate_fuzzy"].includes(r.status))
          .map((r) => ({
            filename: r.filename,
            error:
              r.error ||
              (r.status === "duplicate_exact"
                ? "Duplicate detected (exact match)"
                : r.status === "duplicate_fuzzy"
                ? "Duplicate detected (near-date/provider/amount match)"
                : "Unknown error"),
          })),
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

      {selectedDuplicateCount > 0 && (
        <div className="rounded-lg border border-[var(--warning-200)] bg-[var(--warning-50)] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[var(--warning-800)] font-medium">
            <AlertTriangle className="w-5 h-5" />
            <span>{selectedDuplicateCount} selected duplicate{selectedDuplicateCount !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-sm text-[var(--warning-700)]">
            These items were flagged as potential duplicates. You can skip them by going back, or override duplicate checks for this import.
          </p>
          <label className="flex items-center gap-2 text-sm text-[var(--warning-800)]">
            <Checkbox checked={forceImport} onCheckedChange={(checked) => setForceImport(Boolean(checked))} />
            <span>Import selected duplicates anyway</span>
          </label>
        </div>
      )}

      {summary && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Selected receipts:</span>
            <span className="font-medium">{selectedIds.size}</span>
          </div>
          <div className="flex justify-between">
            <span>Total amount:</span>
            <span className="font-medium">${selectedTotalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Selected duplicates:</span>
            <span className="font-medium">{selectedDuplicateCount}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep("review")} disabled={isImporting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleImport} disabled={isImporting || (selectedDuplicateCount > 0 && !forceImport)}>
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
      {importResults.failures.length > 0 && (
        <div className="max-w-2xl mx-auto text-left p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-800 mb-2">Failed files</p>
          <div className="space-y-1 text-sm text-red-700">
            {importResults.failures.map((f, idx) => (
              <div key={`${f.filename}-${idx}`}>
                <span className="font-medium">{f.filename}:</span> {f.error}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3 justify-center pt-4">
        <Button variant="outline" onClick={reset}>Import More</Button>
        <Link href="/"><Button>Back to Dashboard</Button></Link>
      </div>
    </div>
  );
}

export function BulkImportFlow() {
  const { step } = useBulkImportStore();
  if (step === "upload") return <UploadStep />;
  if (step === "scanning") return <ScanningStep />;
  if (step === "review") return <ReviewStep />;
  if (step === "confirm") return <ConfirmStep />;
  return <ResultsStep />;
}
