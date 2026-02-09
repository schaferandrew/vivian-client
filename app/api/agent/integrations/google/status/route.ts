import { NextResponse } from "next/server";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000/api/v1";

export async function GET() {
  try {
    const response = await fetch(`${AGENT_API_URL}/integrations/google/status`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Google status proxy error:", err);
    return NextResponse.json(
      { error: "Could not reach backend integrations service." },
      { status: 502 }
    );
  }
}
