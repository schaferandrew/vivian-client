import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function POST(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/integrations/google/disconnect",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    fallbackError: "Could not reach backend integrations service.",
  });
}
