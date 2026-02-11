import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import type { UnreimbursedBalanceResponse, CharitableSummaryResponse } from "@/types";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000/api/v1";

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

export async function getUnreimbursedBalanceServer(): Promise<UnreimbursedBalanceResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${AGENT_API_URL}/ledger/balance/unreimbursed`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getMessageFromPayload(payload, response.status, response.statusText));
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

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getMessageFromPayload(payload, response.status, response.statusText));
  }

  return payload as CharitableSummaryResponse;
}

