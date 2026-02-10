import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/integrations/google/status",
    init: { method: "GET", cache: "no-store" },
    fallbackError: "Could not reach backend integrations service.",
  });
}
