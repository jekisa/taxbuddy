import { fileResponse, getArchiveForUser } from "../../../../../lib/archive";
import { requireActiveAccount } from "../../../../../lib/auth-access";

export const runtime = "nodejs";

export async function GET(_request, context) {
  const access = await requireActiveAccount("Arsip dokumen hanya tersedia untuk akun berlangganan aktif.");
  if (!access.ok) return access.response;
  const params = await context.params;
  const archive = await getArchiveForUser(access.userId, params.id);
  if (!archive?.source?.base64) return Response.json({ error: "File sumber tidak ditemukan di arsip ini." }, { status: 404 });
  return fileResponse(archive.source);
}
