import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppData } from "../../../../lib/app-data";
import {
  loadWorkspace,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../lib/workspace";

export const runtime = "nodejs";

function parseDiscount(value) {
  const parsed = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST() {
  try {
    const appData = await getAppData();
    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const dbPembeli = appData.db_pembeli || {};
    let changed = 0;

    const processed = (workspace.state.processed || []).map((row) => {
      const buyer = dbPembeli[row.nama];
      const pct = parseDiscount(buyer?.diskon_pct);
      if (!pct) return row;
      const diskon = row.harga_jual * (pct / 100);
      const dpp = row.harga_jual - diskon;
      changed += 1;
      return {
        ...row,
        diskon,
        dpp,
        dpp_nl: dpp,
        ppn: dpp * 0.12,
      };
    });

    const detail_rows = (workspace.state.detail_rows || []).map((row, idx) => {
      const source = processed[idx];
      return source ? {
        ...row,
        diskon: source.diskon,
        dpp: source.dpp,
        dpp_nl: source.dpp_nl,
        ppn: source.ppn,
      } : row;
    });

    const totals = processed.reduce(
      (acc, row) => ({
        qty: acc.qty + (Number(row.qty) || 0),
        harga_jual: acc.harga_jual + (Number(row.harga_jual) || 0),
        diskon: acc.diskon + (Number(row.diskon) || 0),
        dpp: acc.dpp + (Number(row.dpp) || 0),
        dpp_nl: acc.dpp_nl + (Number(row.dpp_nl) || 0),
        ppn: acc.ppn + (Number(row.ppn) || 0),
      }),
      { qty: 0, harga_jual: 0, diskon: 0, dpp: 0, dpp_nl: 0, ppn: 0 },
    );

    const state = { ...workspace.state, processed, detail_rows, totals };
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state), changed });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Diskon gagal diterapkan." }, { status: 500 });
  }
}
