import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { archiveUploadedWorkbook } from "../../../lib/archive";
import { currentAccountAccess } from "../../../lib/auth-access";
import {
  loadWorkspace,
  publicWorkspaceState,
  readExcelWorkbook,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../lib/workspace";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "File Excel belum dipilih." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const cookieStore = await cookies();
    const workspace = await loadWorkspace(cookieStore);
    const account = await currentAccountAccess(cookieStore);
    const state = readExcelWorkbook(buffer, file.name || "upload.xlsx");
    if (account.active) {
      const archiveId = await archiveUploadedWorkbook({
        userId: account.userId,
        module: "pajak_keluaran",
        filename: file.name || "upload.xlsx",
        mime: file.type,
        buffer,
        state,
      });
      state.archive_ids = { ...(state.archive_ids || {}), pajak_keluaran: String(archiveId) };
      state.subscription = account.access;
    }

    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Upload gagal." }, { status: 500 });
  }
}
