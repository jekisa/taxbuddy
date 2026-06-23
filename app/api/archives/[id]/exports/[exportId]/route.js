import { fileResponse, getArchiveForUser } from "../../../../../../lib/archive";
import { requireActiveAccount } from "../../../../../../lib/auth-access";

export const runtime = "nodejs";

export async function GET(_request, context) {
  const access = await requireActiveAccount("Arsip dokumen hanya tersedia untuk akun berlangganan aktif.");
  if (!access.ok) return access.response;
  const params = await context.params;
  const archive = await getArchiveForUser(access.userId, params.id);
  const item = (archive?.exports || []).find((entry) => String(entry.id) === String(params.exportId));
  if (!item) return Response.json({ error: "File export tidak ditemukan." }, { status: 404 });
  return fileResponse(item);
}
