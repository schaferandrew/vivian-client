import { NextResponse } from "next/server";

import { AGENT_API_URL, setAuthCookies, type TokenPair } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendResponse = await fetch(`${AGENT_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    const response = NextResponse.json({ success: true });
    setAuthCookies(response, payload as TokenPair);
    return response;
  } catch (error) {
    console.error("Auth login route failed:", error);
    return NextResponse.json({ error: "Unable to login." }, { status: 502 });
  }
}
