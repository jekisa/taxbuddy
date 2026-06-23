import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppData } from "../../../../lib/app-data";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../lib/workspace";

export const runtime = "nodejs";

function validIndices(indices, total) {
  return (indices || []).filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < total);
}

function safeNumber(value) {
  const n = Number(String(value || "").replace(",", ".").replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode;
    const scope = body.scope;
    const name = String(body.name || "").trim();
    if (!["penjual", "pembeli"].includes(mode)) {
      return NextResponse.json({ error: "Mode tidak dikenal." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: `Pilih nama ${mode === "penjual" ? "penjual" : "pembeli"} dari dropdown.` }, { status: 400 });
    }

    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const state = workspace.state;
    const rows = state.faktur_rows || [];
    let indices = scope === "all" ? rows.map((_, idx) => idx) : validIndices(body.indices, rows.length);
    if (!indices.length) {
      return NextResponse.json({ error: "Pilih baris dulu (klik / Ctrl+klik)." }, { status: 400 });
    }

    const appData = await getAppData();
    const source = mode === "penjual" ? appData.db_penjual || {} : appData.db_pembeli || {};
    const data = source[name] || {};

    for (const idx of indices) {
      const row = rows[idx];
      if (mode === "penjual") {
        row.id_tku_penjual = data.id_tku || "";
      } else {
        row.npwp_pembeli = data.npwp || "";
        row.no_dok_pembeli = data.no_dok || "";
        row.nama_pembeli = data.nama || name;
        row.alamat_pembeli = data.alamat || "";
        row.id_tku_pembeli = data.no_dok || "";
        row.diskon_rate = safeNumber(data.diskon_pct);
      }
    }

    state.faktur_rows = rows;
    await saveWorkspace(workspace.id, state);
    const label = scope === "all" ? "semua baris" : `${indices.length} baris`;
    const res = NextResponse.json({ state: publicWorkspaceState(state), label, name });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Data faktur gagal diterapkan." }, { status: 500 });
  }
}
