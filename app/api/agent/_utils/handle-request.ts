import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { proxyBackendWithAuth } from "@/app/api/agent/_utils/auth-proxy";
import { setAuthCookies } from "@/lib/auth/server";

type RevalidateTags =
  | string[]
  | ((payload: unknown) => string[]);

type HandleRequestOptions = {
  request: Request;
  backendPath: string;
  init?: RequestInit;
  revalidateTags?: RevalidateTags;
  fallbackError?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text.trim() ? { message: text } : null;
}

function normalizeErrorPayload(
  payload: unknown,
  status: number,
  statusText: string
): Record<string, unknown> {
  if (isRecord(payload)) {
    const message =
      (typeof payload.error === "string" && payload.error) ||
      (typeof payload.message === "string" && payload.message) ||
      (typeof payload.detail === "string" && payload.detail) ||
      statusText ||
      `Request failed with status ${status}`;

    return {
      error: message,
      ...(payload.detail !== undefined ? { detail: payload.detail } : {}),
      ...(payload.message !== undefined ? { message: payload.message } : {}),
      ...(payload.details !== undefined ? { details: payload.details } : {}),
    };
  }

  if (typeof payload === "string" && payload.trim()) {
    return { error: payload.trim() };
  }

  return { error: statusText || `Request failed with status ${status}` };
}

function applyRevalidation(
  payload: unknown,
  revalidateTags: RevalidateTags | undefined
) {
  if (!revalidateTags) {
    return;
  }

  const tags = typeof revalidateTags === "function"
    ? revalidateTags(payload)
    : revalidateTags;

  for (const tag of tags) {
    if (tag) {
      revalidateTag(tag);
    }
  }
}

export async function handleRequest({
  request,
  backendPath,
  init,
  revalidateTags,
  fallbackError = "Request failed.",
}: HandleRequestOptions): Promise<NextResponse> {
  try {
    const { backendResponse, refreshedTokens } = await proxyBackendWithAuth(
      request,
      backendPath,
      init
    );

    const payload = await parseResponsePayload(backendResponse);

    if (!backendResponse.ok) {
      const response = NextResponse.json(
        normalizeErrorPayload(payload, backendResponse.status, backendResponse.statusText),
        { status: backendResponse.status }
      );
      if (refreshedTokens) {
        setAuthCookies(response, refreshedTokens);
      }
      return response;
    }

    applyRevalidation(payload, revalidateTags);

    const response =
      backendResponse.status === 204 || payload === null
        ? new NextResponse(null, { status: backendResponse.status })
        : NextResponse.json(payload, { status: backendResponse.status });

    if (refreshedTokens) {
      setAuthCookies(response, refreshedTokens);
    }
    return response;
  } catch (error) {
    console.error(`Proxy request failed for ${backendPath}:`, error);
    return NextResponse.json({ error: fallbackError }, { status: 502 });
  }
}

