import { NextResponse } from "next/server";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000/api/v1";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_API_URL}/chat/models`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        data?.detail ?? { error: "Failed to fetch models" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Models proxy error:", err);
    return NextResponse.json(
      { error: "Could not reach the chat server. Is the backend running?" },
      { status: 502 }
    );
  }
}
