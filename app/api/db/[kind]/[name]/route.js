import { NextResponse } from "next/server";
import { deleteDbEntry } from "../../../../../lib/app-data";

export const runtime = "nodejs";

const ALLOWED = new Set(["penjual", "pembeli", "pemasok"]);

export async function DELETE(_request, { params }) {
  try {
    const { kind, name } = await params;
    if (!ALLOWED.has(kind)) {
      return NextResponse.json({ error: "Jenis database tidak valid." }, { status: 404 });
    }

    const appData = await deleteDbEntry(kind, decodeURIComponent(name));
    return NextResponse.json({ [`db_${kind}`]: appData[`db_${kind}`] });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Data gagal dihapus." }, { status: 500 });
  }
}
