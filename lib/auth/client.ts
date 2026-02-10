import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const encodedName = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));
  if (!cookie) {
    return null;
  }
  return decodeURIComponent(cookie.slice(encodedName.length));
}

async function refreshAccessToken(): Promise<boolean> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  return response.ok;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const accessToken = getCookie(ACCESS_TOKEN_COOKIE);

  const doFetch = async (token: string | null) => {
    const headers = new Headers(init?.headers ?? {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  };

  let response = await doFetch(accessToken);
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  const nextToken = getCookie(ACCESS_TOKEN_COOKIE);
  response = await doFetch(nextToken);
  return response;
}
