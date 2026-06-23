import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppData } from "../../../../../lib/app-data";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../../lib/workspace";

export const runtime = "nodejs";

const REQUIRED_FIELDS = [
  "Nama Pelanggan",
  "Keterangan Barang",
  "No. Faktur",
  "Tgl Faktur",
  "Kuantitas",
  "Harga Satuan",
  "Unit 1 Barang",
];

export async function POST(_request, context) {
  try {
    const params = await context.params;
    const name = decodeURIComponent(params.name || "");
    const appData = await getAppData();
    const template = (appData.templates || {})[name];
    if (!template) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

    const mapping = {};
    for (const [key, value] of Object.entries(template.mapping || {})) {
      const idx = Number(value);
      if (Number.isInteger(idx) && idx >= 0) mapping[key] = idx;
    }

    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const state = {
      ...workspace.state,
      mapping,
      processed: [],
      dup_map: {},
      faktur_rows: [],
      detail_rows: [],
      totals: {},
    };
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({
      mapping,
      can_auto_process: REQUIRED_FIELDS.every((field) => mapping[field] !== undefined) && Boolean(state.raw_rows?.length),
      state: publicWorkspaceState(state),
    });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Template gagal diterapkan." }, { status: 500 });
  }
}
