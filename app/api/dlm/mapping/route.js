import { NextResponse } from "next/server";
import { requireActiveSubscription } from "../_helpers";
import {
  loadWorkspace,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../lib/workspace";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const mapping = body.mapping && typeof body.mapping === "object" ? body.mapping : {};
    const workspace = await loadWorkspace(access.cookieStore);
    const state = {
      ...workspace.state,
      subscription: access.subscriptionAccess,
      dlm: {
        ...(workspace.state.dlm || {}),
        mapping,
        processed: [],
        totals: {},
      },
    };

    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ mapping, state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Mapping gagal disimpan." }, { status: 500 });
  }
}
