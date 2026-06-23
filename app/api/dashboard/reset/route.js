import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ total: 0, items: [] });
}
