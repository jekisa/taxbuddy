import { appendArchiveExport } from "../../../../../lib/archive";
import { requireActiveAccount } from "../../../../../lib/auth-access";
import { downloadResponse, makeSdlXml } from "../../../../../lib/export-files";
import { loadWorkspace } from "../../../../../lib/workspace";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireActiveAccount("SPT Dokumen Lain hanya tersedia untuk akun berlangganan aktif.");
  if (!access.ok) return access.response;
  const workspace = await loadWorkspace(access.cookieStore);
  if (!workspace.state.sdl?.processed?.length) {
    return Response.json({ error: "Isi data SPT Dokumen Lain dulu sebelum export." }, { status: 400 });
  }
  const buffer = makeSdlXml(workspace.state);
  const filename = "spt_dokumen_lain_coretax.xml";
  try {
    await appendArchiveExport({
      userId: access.userId,
      archiveId: workspace.state.sdl?.archive_id,
      module: "spt_dokumen_lain",
      kind: "xml",
      filename,
      mime: "application/xml",
      buffer,
    });
  } catch (err) {
    console.warn("Archive save failed for SPT Dokumen Lain XML export:", err);
  }
  return downloadResponse(buffer, filename, "application/xml");
}
