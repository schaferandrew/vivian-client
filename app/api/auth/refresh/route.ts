import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/constants";
import { AGENT_API_URL, setAuthCookies, type TokenPair } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const refreshToken = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REFRESH_TOKEN_COOKIE}=`))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token." }, { status: 401 });
    }

    const backendResponse = await fetch(`${AGENT_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: decodeURIComponent(refreshToken) }),
    });

    const payload = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    const response = NextResponse.json({ success: true });
    setAuthCookies(response, payload as TokenPair);
    return response;
  } catch (error) {
    console.error("Auth refresh route failed:", error);
    return NextResponse.json({ error: "Unable to refresh session." }, { status: 502 });
  }
}
