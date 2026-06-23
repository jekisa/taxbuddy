import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  loadWorkspace,
  processWorkspaceState,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../lib/workspace";

export const runtime = "nodejs";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    if (!workspace.state.raw_rows?.length) {
      return NextResponse.json({ error: "Upload file Excel terlebih dahulu." }, { status: 400 });
    }

    const state = processWorkspaceState(workspace.state);
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    const status = err.upgradeRequired ? 402 : 500;
    return NextResponse.json({
      error: err.message || "Data gagal diproses.",
      upgrade_required: !!err.upgradeRequired,
      limit: err.limit,
      used: err.used,
    }, { status });
  }
}
