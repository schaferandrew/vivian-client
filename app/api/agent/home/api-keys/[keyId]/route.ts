import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;

  return handleRequest({
    request,
    backendPath: `/home/api-keys/${keyId}`,
    init: { method: "DELETE" },
    fallbackError: "Could not revoke API key.",
  });
}
