import { NextResponse } from "next/server";
import { upsertDbEntry } from "../../../../lib/app-data";

export const runtime = "nodejs";

const ALLOWED = new Set(["penjual", "pembeli", "pemasok"]);

function payloadFor(kind, body) {
  if (kind === "penjual") {
    return {
      id_tku: String(body.id_tku || "").trim(),
      npwp: String(body.npwp || "").trim(),
    };
  }
  if (kind === "pembeli") {
    return {
      npwp: String(body.npwp || "").trim(),
      no_dok: String(body.no_dok || "").trim(),
      diskon_pct: String(body.diskon_pct || "").trim(),
      alamat: String(body.alamat || "").trim(),
    };
  }
  return {
    npwp: String(body.npwp || "").trim(),
  };
}

export async function POST(request, { params }) {
  try {
    const { kind } = await params;
    if (!ALLOWED.has(kind)) {
      return NextResponse.json({ error: "Jenis database tidak valid." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const nama = String(body.nama || "").trim();
    if (!nama) {
      return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    }

    const appData = await upsertDbEntry(kind, nama, payloadFor(kind, body));
    return NextResponse.json({
      [`db_${kind}`]: appData[`db_${kind}`],
      changed: 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Data gagal disimpan." }, { status: 500 });
  }
}
