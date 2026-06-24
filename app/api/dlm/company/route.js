import { NextResponse } from "next/server";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../lib/workspace";
import { requireActiveSubscription } from "../_helpers";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const npwp = String(body.npwp || "").trim();
    if (npwp && npwp.length !== 16) {
      return NextResponse.json({ error: `NPWP perusahaan harus 16 digit (${npwp.length} saat ini).` }, { status: 400 });
    }

    const workspace = await loadWorkspace(access.cookieStore);
    const state = workspace.state;
    state.dlm = {
      ...(state.dlm || {}),
      company_npwp: npwp,
    };
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "NPWP perusahaan gagal disimpan." }, { status: 500 });
  }
}
