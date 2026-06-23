import { NextResponse } from "next/server";
import { requireActiveSubscription } from "../_helpers";
import { updateArchiveProcessing } from "../../../../lib/archive";
import {
  loadWorkspace,
  processDlmWorkspaceState,
  publicWorkspaceState,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../lib/workspace";

export const runtime = "nodejs";

export async function POST() {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const workspace = await loadWorkspace(access.cookieStore);
    if (!workspace.state.dlm?.raw_rows?.length) {
      return NextResponse.json({ error: "Upload file Excel Doc Lain Masukan terlebih dahulu." }, { status: 400 });
    }

    const state = processDlmWorkspaceState({
      ...workspace.state,
      subscription: access.subscriptionAccess,
    });
    await updateArchiveProcessing({
      userId: access.userId,
      archiveId: state.dlm?.archive_id,
      module: "doc_lain_masukan",
      state,
    });
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Data gagal diproses." }, { status: 500 });
  }
}
