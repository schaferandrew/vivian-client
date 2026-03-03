import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: `/link-settings/${key}`,
    init: {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fallbackError: `Could not update link setting: ${key}`,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  return handleRequest({
    request,
    backendPath: `/link-settings/${key}`,
    init: {
      method: "DELETE",
    },
    fallbackError: `Could not delete link setting: ${key}`,
  });
}
