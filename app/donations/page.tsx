import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Sparkles, Rainbow, ChartPie } from "lucide-react";
import { getCharitableSummaryServer } from "@/lib/api/server";

// Force dynamic rendering since we use cookies() in getCharitableSummaryServer
export const dynamic = "force-dynamic";

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default async function DonationsPage() {
  let summaryData = null;
  let fetchError = "";

  try {
    const response = await getCharitableSummaryServer();
    if (response.success && response.data) {
      summaryData = response.data;
    } else if (response.error) {
      fetchError = response.error;
    }
  } catch (error) {
    console.error("Failed to load charitable summary", error);
    fetchError = "Unable to load donation data at the moment.";
  }

  const data = summaryData ?? {
    tax_year: null,
    total: 0,
    tax_deductible_total: 0,
    by_year: {},
    by_organization: {},
  };

  const yearEntries = Object.entries(data.by_year || {}).sort((a, b) => Number(b[0]) - Number(a[0]));
  const orgEntries = Object.entries(data.by_organization || {}).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Heart className="w-6 h-6 text-[var(--accent-500)]" />
            <h1 className="text-xl font-semibold">Donations</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {(fetchError || (data.total === 0 && !summaryData)) && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Configure Charitable Ledger:</strong> Go to{" "}
                <Link href="/settings" className="underline hover:no-underline">
                  Settings
                </Link>{" "}
                to connect your Google Sheet and Drive folder to enable donation tracking.
              </p>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-[#FDE2FF] via-[#F0F4FF] to-[#E1F1FF]">
            <CardHeader>
              <CardDescription className="text-sm text-muted-foreground">Total donations</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(data.total)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{data.tax_year ? `Tax Year ${data.tax_year}` : "All time"}</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#FFEDE5] via-[#FFF8EA] to-[#F0FBEF]">
            <CardHeader>
              <CardDescription className="text-sm text-muted-foreground">Tax-deductible</CardDescription>
              <CardTitle className="text-3xl text-[var(--success-600)]">{formatCurrency(data.tax_deductible_total)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{yearEntries.length ? `${yearEntries.length} years tracked` : "Starting fresh"}</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#E6F7FF] via-[#EFE9FF] to-[#FFF1F5]">
            <CardHeader>
              <CardDescription className="text-sm text-muted-foreground">Next steps</CardDescription>
              <CardTitle className="text-3xl">{orgEntries.length ? `${orgEntries.length} orgs` : "Add more"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Track donors with receipts</Badge>
            </CardContent>
          </Card>
        </div>

        {fetchError && (
          <Card>
            <CardContent>
              <p className="text-sm text-[var(--warning-800)]">{fetchError}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Yearly breakdown</CardTitle>
            </div>
            <CardDescription>Review total donations by tax year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {yearEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dollar amounts yet. Upload a donation receipt to get started.</p>
            ) : (
              <div className="space-y-2">
                {yearEntries.map(([year, { total, count }]) => (
                  <div key={year} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{year}</p>
                      <p className="text-xs text-muted-foreground">{count} gift{count === 1 ? "" : "s"}</p>
                    </div>
                    <div className="text-lg font-semibold">{formatCurrency(total)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Rainbow className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Top organizations</CardTitle>
            </div>
            <CardDescription>See where your giving goes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add receipts tagged with charities to see an org breakdown.</p>
            ) : (
              <div className="space-y-2">
                {orgEntries.slice(0, 6).map(([org, { total, count }]) => (
                  <div key={org} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium truncate max-w-[220px]">{org}</p>
                      <p className="text-xs text-muted-foreground">{count} receipt{count === 1 ? "" : "s"}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ChartPie className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Ready to log another donation?</CardTitle>
            </div>
            <CardDescription>Upload a receipt and categorize it as a charitable gift.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/receipts">
              <Button className="w-full justify-center" size="sm">
                Upload Donation Receipt
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
