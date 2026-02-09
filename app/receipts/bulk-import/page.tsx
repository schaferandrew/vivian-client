import { redirect } from "next/navigation";

export default function BulkImportRedirectPage() {
  redirect("/receipts");
}
