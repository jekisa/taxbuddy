import { NextResponse } from "next/server";
import { bootstrapData } from "../../../lib/bootstrap-data";

export async function GET() {
  return NextResponse.json(bootstrapData());
}
