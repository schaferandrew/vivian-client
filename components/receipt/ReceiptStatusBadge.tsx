"use client";

import { Badge } from "@/components/ui/badge";

interface ConfidenceBadgeProps {
  confidence: number;
  showHelperText?: boolean;
}

export function ConfidenceBadge({ confidence, showHelperText = false }: ConfidenceBadgeProps) {
  const needsReview = confidence < 85;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={needsReview ? "destructive" : "default"}>Confidence {confidence}%</Badge>
      {showHelperText && needsReview && (
        <span className="text-sm text-[var(--error-600)]">Review recommended</span>
      )}
    </div>
  );
}
