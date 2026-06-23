import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../lib/workspace";

export const runtime = "nodejs";

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function validIndices(indices, total) {
  return (indices || []).filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < total);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tgl = normalizeDate(body.tgl_faktur);
    if (!tgl) {
      return NextResponse.json({ error: "Tanggal Faktur tidak valid. Gunakan DD/MM/YYYY, YYYY-MM-DD, atau format seperti 10 Jun 2026." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const state = workspace.state;
    const rows = state.faktur_rows || [];
    let indices = body.scope === "all" ? rows.map((_, idx) => idx) : validIndices(body.indices, rows.length);
    if (!indices.length) {
      return NextResponse.json({ error: "Pilih baris faktur dulu (klik / Ctrl+klik)." }, { status: 400 });
    }

    const refs = new Set();
    for (const idx of indices) {
      rows[idx].tgl_faktur = tgl;
      refs.add(rows[idx].referensi);
    }
    state.faktur_rows = rows;
    state.processed = (state.processed || []).map((row) => refs.has(row.faktur) ? { ...row, tgl } : row);
    await saveWorkspace(workspace.id, state);

    const label = body.scope === "all" ? "semua faktur" : `${indices.length} faktur`;
    const res = NextResponse.json({ state: publicWorkspaceState(state), label, tgl_faktur: tgl });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Tanggal gagal diterapkan." }, { status: 500 });
  }
}
