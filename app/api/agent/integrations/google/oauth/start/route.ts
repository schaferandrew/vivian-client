import { NextRequest, NextResponse } from "next/server";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000/api/v1";

export async function GET(request: NextRequest) {
  const target = new URL(`${AGENT_API_URL}/integrations/google/oauth/start`);
  const returnTo = request.nextUrl.searchParams.get("return_to");

  if (returnTo) {
    target.searchParams.set("return_to", returnTo);
  }

  return NextResponse.redirect(target.toString(), { status: 307 });
}
