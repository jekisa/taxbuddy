import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { upsertDbEntry } from "../../../../lib/app-data";
import {
  applyBuyerDiscountsToActiveData,
  loadWorkspace,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../lib/workspace";

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
    let changed = 0;
    let state = null;

    if (kind === "pembeli") {
      const cookieStore = await cookies();
      const workspace = await loadWorkspace(cookieStore);
      state = workspace.state;
      changed = applyBuyerDiscountsToActiveData(state, appData.db_pembeli || {}, nama);
      if (changed) await saveWorkspace(workspace.id, state);
      const res = NextResponse.json({
        [`db_${kind}`]: appData[`db_${kind}`],
        changed,
        ...(changed ? { state: publicWorkspaceState(state) } : {}),
      });
      if (changed) setWorkspaceCookie(res, workspace.id);
      return res;
    }

    return NextResponse.json({
      [`db_${kind}`]: appData[`db_${kind}`],
      changed,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Data gagal disimpan." }, { status: 500 });
  }
}
