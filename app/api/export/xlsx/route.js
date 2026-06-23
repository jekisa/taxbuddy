import { cookies } from "next/headers";
import { appendArchiveExport } from "../../../../lib/archive";
import { currentAccountAccess } from "../../../../lib/auth-access";
import { downloadResponse, makePajakXlsx } from "../../../../lib/export-files";
import { loadWorkspace } from "../../../../lib/workspace";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const workspace = await loadWorkspace(cookieStore);
  if (!workspace.state.processed?.length) {
    return Response.json({ error: "Proses data dulu sebelum export." }, { status: 400 });
  }
  const buffer = makePajakXlsx(workspace.state);
  const filename = "pajak_keluaran_taxbuddy.xlsx";
  const account = await currentAccountAccess(cookieStore);
  if (account.active) {
    try {
      await appendArchiveExport({
        userId: account.userId,
        archiveId: workspace.state.archive_ids?.pajak_keluaran,
        module: "pajak_keluaran",
        kind: "xlsx",
        filename,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer,
      });
    } catch (err) {
      console.warn("Archive save failed for Pajak Keluaran XLSX export:", err);
    }
  }
  return downloadResponse(buffer, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
