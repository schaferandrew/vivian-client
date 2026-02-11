"use client";

import { Input } from "@/components/ui/input";
import type { CharitableDonationSchema } from "@/types";

export function CharitableExpenseEditor({
  donation,
  onChange,
  needsReview,
}: {
  donation: CharitableDonationSchema;
  onChange: (next: CharitableDonationSchema) => void;
  needsReview?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-foreground">Organization Name</label>
        <Input
          value={donation.organization_name || ""}
          onChange={(e) => onChange({ ...donation, organization_name: e.target.value })}
          className={needsReview ? "border-[var(--brand-400)]" : ""}
          placeholder="e.g., American Red Cross"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Amount</label>
          <Input
            type="number"
            step="0.01"
            value={donation.amount}
            onChange={(e) => {
              const parsed = Number.parseFloat(e.target.value);
              onChange({ ...donation, amount: Number.isFinite(parsed) ? parsed : 0 });
            }}
            className={needsReview ? "border-[var(--brand-400)]" : ""}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Donation Date</label>
          <Input
            type="date"
            value={donation.donation_date || ""}
            onChange={(e) => onChange({ ...donation, donation_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={donation.tax_deductible === true}
            onChange={(e) => onChange({ ...donation, tax_deductible: e.target.checked })}
          />
          <span className="text-sm font-medium text-foreground">Tax Deductible</span>
        </label>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Check if this donation is tax-deductible (most 501(c)(3) organizations qualify)
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Description (Optional)</label>
        <textarea
          value={donation.description || ""}
          onChange={(e) => onChange({ ...donation, description: e.target.value })}
          className="w-full min-h-[80px] p-3 text-sm border border-input rounded-md bg-background"
          placeholder="Any additional notes about this donation..."
        />
      </div>
    </div>
  );
}
