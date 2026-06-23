import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  loadWorkspace,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../lib/workspace";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mapping = body.mapping && typeof body.mapping === "object" ? body.mapping : {};
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
    const res = NextResponse.json({ mapping: state.mapping });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Mapping gagal disimpan." }, { status: 500 });
  }
}
