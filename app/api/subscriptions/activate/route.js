import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Semua package berbayar wajib diproses melalui Midtrans." },
    { status: 400 },
  );
}
