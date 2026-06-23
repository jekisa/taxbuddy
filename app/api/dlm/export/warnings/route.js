import { NextResponse } from "next/server";
import { requireActiveSubscription } from "../../_helpers";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireActiveSubscription();
  if (!access.ok) return access.response;
  return NextResponse.json({ warnings: [] });
}
