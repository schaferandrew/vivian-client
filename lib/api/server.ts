"use server";

import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import type { UnreimbursedBalanceResponse, CharitableSummaryResponse } from "@/types";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000/api/v1";

type ApiError = Error & {
  status: number;
  originalMessage: string;
  data?: unknown;
};

function getMessageFromPayload(payload: unknown, status: number, statusText: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const candidate = [record.error, record.message, record.detail].find(
      (value) => typeof value === "string" && value
    );
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return `API Error: ${status} ${statusText}`;
}

function attachApiErrorMetadata(
  error: Error,
  status: number,
  originalMessage: string,
  data?: unknown
): ApiError {
  return Object.assign(error, { status, originalMessage, data });
}

function createApiError(
  status: number,
  statusText: string,
  payload: unknown
): ApiError {
  const message = getMessageFromPayload(payload, status, statusText);
  
  // Provide user-friendly messages for common error scenarios
  let userMessage = message;
  if (status === 500) {
    userMessage = "Server error. Please try again in a moment.";
  } else if (status === 502 || status === 503 || status === 504) {
    userMessage = "Service unavailable. The backend may be down or restarting.";
  } else if (status === 0 || !status) {
    userMessage = "Cannot connect to server. Please check your connection or try again.";
  }

  return attachApiErrorMetadata(new Error(userMessage), status, message, payload);
}

async function fetchWithErrorHandling(
  url: string,
  options: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (networkError) {
    // Fetch failed entirely (network issue, server down, etc.)
    const originalMessage =
      networkError instanceof Error ? networkError.message : "Network error";
    throw attachApiErrorMetadata(
      new Error("Cannot connect to server. Please check your connection or try again."),
      0,
      originalMessage
    );
  }
}

export async function getUnreimbursedBalanceServer(): Promise<UnreimbursedBalanceResponse | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetchWithErrorHandling(
    `${AGENT_API_URL}/ledger/balance/unreimbursed`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw createApiError(response.status, response.statusText, payload);
  }

  // If API returns is_configured: false or null payload, return null
  if (!payload || payload.is_configured === false) {
    return null;
  }

  return payload as UnreimbursedBalanceResponse;
}

export async function getCharitableSummaryServer(taxYear?: string): Promise<CharitableSummaryResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const url = taxYear
    ? `${AGENT_API_URL}/ledger/charitable/summary?year=${taxYear}`
    : `${AGENT_API_URL}/ledger/charitable/summary`;

  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  
  if (!response.ok) {
    throw createApiError(response.status, response.statusText, payload);
  }

  return payload as CharitableSummaryResponse;
}
