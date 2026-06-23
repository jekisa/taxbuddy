import { NextResponse } from "next/server";
import { requireActiveAccount } from "../../../../../lib/auth-access";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireActiveAccount("SPT Dokumen Lain hanya tersedia untuk akun berlangganan aktif.");
  if (!access.ok) return access.response;
  return NextResponse.json({ warnings: [] });
}
