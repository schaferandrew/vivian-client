import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/constants";
import { AGENT_API_URL, clearAuthCookies } from "@/lib/auth/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);

  try {
    const refreshToken = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REFRESH_TOKEN_COOKIE}=`))
      ?.split("=")
      .slice(1)
      .join("=");

    if (refreshToken) {
      await fetch(`${AGENT_API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: decodeURIComponent(refreshToken) }),
      });
    }
  } catch (error) {
    console.error("Auth logout route failed:", error);
  }

  return response;
}
