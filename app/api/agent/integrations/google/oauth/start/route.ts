import { NextRequest, NextResponse } from "next/server";

import { proxyBackendWithAuth } from "@/app/api/agent/_utils/auth-proxy";
import { setAuthCookies } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const target = new URL("/integrations/google/oauth/start", "http://placeholder.local");
  const returnTo = request.nextUrl.searchParams.get("return_to");

  if (returnTo) {
    target.searchParams.set("return_to", returnTo);
  }

  const { backendResponse, refreshedTokens } = await proxyBackendWithAuth(
    request,
    `${target.pathname}${target.search}`,
    { redirect: "manual" }
  );
  const redirectTo = backendResponse.headers.get("location");
  if (!redirectTo) {
    const payload = await backendResponse.json().catch(() => ({}));
    const response = NextResponse.json(payload, { status: backendResponse.status });
    if (refreshedTokens) {
      setAuthCookies(response, refreshedTokens);
    }
    return response;
  }

  const response = NextResponse.redirect(redirectTo, { status: 307 });
  if (refreshedTokens) {
    setAuthCookies(response, refreshedTokens);
  }
  return response;
}
