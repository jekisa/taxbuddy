import { NextResponse } from "next/server";
import { requireActiveSubscription } from "../_helpers";
import { archiveUploadedWorkbook } from "../../../../lib/archive";
import {
  loadWorkspace,
  publicWorkspaceState,
  readDlmExcelWorkbook,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../lib/workspace";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "File Excel belum dipilih." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workspace = await loadWorkspace(access.cookieStore);
    const state = readDlmExcelWorkbook(buffer, file.name || "doc-lain-masukan.xlsx", workspace.state);
    const archiveId = await archiveUploadedWorkbook({
      userId: access.userId,
      module: "doc_lain_masukan",
      filename: file.name || "doc-lain-masukan.xlsx",
      mime: file.type,
      buffer,
      state,
    });
    state.dlm.archive_id = String(archiveId);
    state.subscription = access.subscriptionAccess;

    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Upload gagal." }, { status: 500 });
  }
}
