import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/constants";
import { AGENT_API_URL, type TokenPair } from "@/lib/auth/server";

function extractCookie(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));
  if (!raw) {
    return null;
  }
  return decodeURIComponent(raw.split("=").slice(1).join("="));
}

type ProxyResult = {
  backendResponse: Response;
  refreshedTokens: TokenPair | null;
};

function createProxyErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to reach backend";
  return new Response(JSON.stringify({ error: message }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

export async function proxyBackendWithAuth(
  request: Request,
  backendPath: string,
  init: RequestInit = {}
): Promise<ProxyResult> {
  const cookieHeader = request.headers.get("cookie");
  const accessToken = extractCookie(cookieHeader, ACCESS_TOKEN_COOKIE);
  const refreshToken = extractCookie(cookieHeader, REFRESH_TOKEN_COOKIE);

  const callBackend = async (token: string | null) => {
    const { headers: initHeaders, ...restInit } = init;
    const headers = new Headers(initHeaders ?? {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${AGENT_API_URL}${backendPath}`, {
      ...restInit,
      headers,
      cache: init.cache ?? "no-store",
      redirect: init.redirect ?? "follow",
    });
  };

  let backendResponse: Response;
  try {
    backendResponse = await callBackend(accessToken);
  } catch (error) {
    return { backendResponse: createProxyErrorResponse(error), refreshedTokens: null };
  }
  if (backendResponse.status !== 401 || !refreshToken) {
    return { backendResponse, refreshedTokens: null };
  }

  let refreshResponse: Response;
  try {
    refreshResponse = await fetch(`${AGENT_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
  } catch (error) {
    return { backendResponse: createProxyErrorResponse(error), refreshedTokens: null };
  }

  if (!refreshResponse.ok) {
    return { backendResponse, refreshedTokens: null };
  }

  const refreshedTokens = (await refreshResponse.json()) as TokenPair;
  try {
    backendResponse = await callBackend(refreshedTokens.access_token);
  } catch (error) {
    return { backendResponse: createProxyErrorResponse(error), refreshedTokens: null };
  }
  return { backendResponse, refreshedTokens };
}
