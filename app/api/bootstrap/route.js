import { NextResponse } from "next/server";
import { getAppData } from "../../../lib/app-data";
import { bootstrapData } from "../../../lib/bootstrap-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = bootstrapData();
    const appData = await getAppData();
    return NextResponse.json({ ...data, ...appData });
  } catch (err) {
    const data = bootstrapData();
    return NextResponse.json({
      ...data,
      bootstrap_warning: err.message || "Database belum tersedia.",
    });
  }
}
