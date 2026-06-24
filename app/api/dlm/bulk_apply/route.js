import { NextResponse } from "next/server";
import { getAppData } from "../../../../lib/app-data";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../lib/workspace";
import { requireActiveSubscription } from "../_helpers";

export const runtime = "nodejs";

function validIndices(indices, total) {
  return (indices || []).filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < total);
}

export async function POST(request) {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Pilih nama pemasok dari dropdown." }, { status: 400 });
    }

    const workspace = await loadWorkspace(access.cookieStore);
    const state = workspace.state;
    const dlm = state.dlm || {};
    const rows = dlm.processed || [];
    const indices = body.scope === "all" ? rows.map((_, idx) => idx) : validIndices(body.indices, rows.length);
    if (!indices.length) {
      return NextResponse.json({ error: "Pilih baris dulu (klik / Ctrl+klik)." }, { status: 400 });
    }

    const appData = await getAppData();
    const source = appData.db_pemasok || {};
    const data = source[name] || {};
    for (const idx of indices) {
      rows[idx].seller_name = data.nama || name;
      rows[idx].seller_tin = data.npwp || "";
    }

    state.dlm = { ...dlm, processed: rows };
    await saveWorkspace(workspace.id, state);
    const label = body.scope === "all" ? "semua baris" : `${indices.length} baris`;
    const res = NextResponse.json({ state: publicWorkspaceState(state), label, name });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Data pemasok gagal diterapkan." }, { status: 500 });
  }
}
