import { cookies } from "next/headers";
import { appendArchiveExport } from "../../../../lib/archive";
import { currentAccountAccess } from "../../../../lib/auth-access";
import { downloadResponse, makePajakXml } from "../../../../lib/export-files";
import { loadWorkspace } from "../../../../lib/workspace";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const workspace = await loadWorkspace(cookieStore);
  if (!workspace.state.processed?.length) {
    return Response.json({ error: "Proses data dulu sebelum export." }, { status: 400 });
  }
  const buffer = makePajakXml(workspace.state);
  const filename = "pajak_keluaran_coretax.xml";
  const account = await currentAccountAccess(cookieStore);
  if (account.active) {
    try {
      await appendArchiveExport({
        userId: account.userId,
        archiveId: workspace.state.archive_ids?.pajak_keluaran,
        module: "pajak_keluaran",
        kind: "xml",
        filename,
        mime: "application/xml",
        buffer,
      });
    } catch (err) {
      console.warn("Archive save failed for Pajak Keluaran XML export:", err);
    }
  }
  return downloadResponse(buffer, filename, "application/xml");
}
