import { NextResponse } from "next/server";
import { getArchiveForUser } from "../../../../../lib/archive";
import { requireActiveAccount } from "../../../../../lib/auth-access";
import {
  loadWorkspace,
  publicWorkspaceState,
  readDlmExcelWorkbook,
  readExcelWorkbook,
  saveWorkspace,
  setWorkspaceCookie,
} from "../../../../../lib/workspace";

export const runtime = "nodejs";

export async function POST(_request, context) {
  try {
    const access = await requireActiveAccount("Load file arsip hanya tersedia untuk akun berlangganan aktif.");
    if (!access.ok) return access.response;

    const params = await context.params;
    const archive = await getArchiveForUser(access.userId, params.id);
    if (!archive?.source?.base64) {
      return NextResponse.json({
        error: "Arsip ini belum menyimpan isi file Excel. Upload ulang file sekali lagi agar bisa dimuat ulang dari arsip.",
      }, { status: 400 });
    }

    const buffer = Buffer.from(archive.source.base64, "base64");
    const filename = archive.source.filename || "arsip.xlsx";
    const workspace = await loadWorkspace(access.cookieStore);
    let state;

    if (archive.module === "pajak_keluaran") {
      state = readExcelWorkbook(buffer, filename);
      state.archive_ids = { ...(state.archive_ids || {}), pajak_keluaran: String(archive._id) };
    } else if (archive.module === "doc_lain_masukan") {
      state = readDlmExcelWorkbook(buffer, filename, workspace.state);
      state.dlm.archive_id = String(archive._id);
    } else {
      return NextResponse.json({ error: "Arsip ini tidak memiliki file Excel yang bisa diproses ulang." }, { status: 400 });
    }

    state.subscription = access.access;
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ module: archive.module, state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "File arsip gagal dimuat." }, { status: 500 });
  }
}
