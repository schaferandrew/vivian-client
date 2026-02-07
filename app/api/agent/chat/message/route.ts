import { NextResponse } from "next/server";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${AGENT_API_URL}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Chat proxy error:", err);
    return NextResponse.json(
      { error: "Could not reach the chat server. Is the backend running?" },
      { status: 502 }
    );
  }
}
