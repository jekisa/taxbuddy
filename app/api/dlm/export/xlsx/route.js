import { appendArchiveExport } from "../../../../../lib/archive";
import { downloadResponse, makeDlmXlsx } from "../../../../../lib/export-files";
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
  const buffer = makeDlmXlsx(workspace.state);
  const filename = "doc_lain_masukan_taxbuddy.xlsx";
  try {
    await appendArchiveExport({
      userId: access.userId,
      archiveId: workspace.state.dlm?.archive_id,
      module: "doc_lain_masukan",
      kind: "xlsx",
      filename,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
  } catch (err) {
    console.warn("Archive save failed for Doc Lain Masukan XLSX export:", err);
  }
  return downloadResponse(buffer, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
