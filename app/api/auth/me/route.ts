import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/auth/me",
    init: { method: "GET", cache: "no-store" },
    fallbackError: "Unable to load profile.",
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: "/auth/me",
    init: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fallbackError: "Unable to update profile.",
  });
}
