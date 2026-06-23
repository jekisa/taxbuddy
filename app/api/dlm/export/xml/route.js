import { appendArchiveExport } from "../../../../../lib/archive";
import { downloadResponse, makeDlmXml } from "../../../../../lib/export-files";
import { loadWorkspace } from "../../../../../lib/workspace";
import { requireActiveSubscription } from "../../_helpers";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireActiveSubscription();
  if (!access.ok) return access.response;
  const workspace = await loadWorkspace(access.cookieStore);
  if (!workspace.state.dlm?.processed?.length) {
    return Response.json({ error: "Proses data Doc Lain Masukan dulu sebelum export." }, { status: 400 });
  }
  const buffer = makeDlmXml(workspace.state);
  const filename = "doc_lain_masukan_coretax.xml";
  try {
    await appendArchiveExport({
      userId: access.userId,
      archiveId: workspace.state.dlm?.archive_id,
      module: "doc_lain_masukan",
      kind: "xml",
      filename,
      mime: "application/xml",
      buffer,
    });
  } catch (err) {
    console.warn("Archive save failed for Doc Lain Masukan XML export:", err);
  }
  return downloadResponse(buffer, filename, "application/xml");
}
