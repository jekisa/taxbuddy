import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../lib/workspace";

export const runtime = "nodejs";

function choiceCode(value, fallback) {
  return String(value || fallback).split(" - ")[0].trim() || fallback;
}

function labelOpt(code) {
  return code === "B" ? "Jasa" : "Barang";
}

function validIndices(indices, total) {
  return (indices || []).filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < total);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const opt = choiceCode(body.opt, "A");
    const unit = choiceCode(body.unit, "UM.0021");
    const code = String(body.code || "").trim() || "000000";

    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const state = workspace.state;
    const detailRows = state.detail_rows || [];
    const processed = state.processed || [];
    const indices = body.scope === "all" ? processed.map((_, idx) => idx) : validIndices(body.indices, processed.length);
    if (!indices.length) {
      return NextResponse.json({ error: "Pilih baris detail dulu (klik / Ctrl+klik)." }, { status: 400 });
    }

    for (const idx of indices) {
      if (processed[idx]) {
        processed[idx].detail_opt = opt;
        processed[idx].detail_code = code;
        processed[idx].detail_unit = unit;
      }
      const detail = detailRows.find((row) => row.original_idx === idx);
      if (detail) {
        detail.detail_opt = opt;
        detail.detail_opt_label = labelOpt(opt);
        detail.detail_code = code;
        detail.detail_unit = unit;
      }
    }

    state.processed = processed;
    state.detail_rows = detailRows;
    await saveWorkspace(workspace.id, state);

    const label = body.scope === "all" ? "semua detail" : `${indices.length} detail`;
    const res = NextResponse.json({ state: publicWorkspaceState(state), label, opt_label: labelOpt(opt), unit });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Default detail gagal diterapkan." }, { status: 500 });
  }
}
