import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const { membershipId } = await params;
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: `/auth/home-settings/members/${membershipId}`,
    init: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fallbackError: "Unable to update member role.",
  });
}
