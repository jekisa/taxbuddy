import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppData } from "../../../../lib/app-data";
import {
  applyBuyerDiscountsToActiveData,
  loadWorkspace,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../lib/workspace";

export const runtime = "nodejs";

export async function POST() {
  try {
    const appData = await getAppData();
    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const dbPembeli = appData.db_pembeli || {};
    const state = workspace.state;
    const changed = applyBuyerDiscountsToActiveData(state, dbPembeli);
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state), changed });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Diskon gagal diterapkan." }, { status: 500 });
  }
}
