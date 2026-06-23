import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { emptyState } from "../../../lib/bootstrap-data";
import {
  loadWorkspace,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../lib/workspace";

export const runtime = "nodejs";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const state = emptyState();
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Reset gagal." }, { status: 500 });
  }
}
