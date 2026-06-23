import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getArchiveForUser, listArchives } from "../../../lib/archive";
import { currentAccountAccess } from "../../../lib/auth-access";
import { loadWorkspace } from "../../../lib/workspace";

function rowDate(value) {
  return value || "";
}

function workspaceItems(state) {
  const fakturRows = state.faktur_rows || [];
  const processed = state.processed || [];
  const source = state.src_filename || "Workspace aktif";
  if (fakturRows.length) return fakturRows.map((row, idx) => ({
    no: idx + 1,
    no_faktur: row.referensi || row.no_faktur || "",
    tgl_faktur: rowDate(row.tgl_faktur),
    nama_pembeli: row.nama_pembeli || "",
    source_file: source,
    exported_at: "",
    status: "processed",
  }));
  const byFaktur = new Map();
  for (const row of processed) {
    if (!row.faktur || byFaktur.has(row.faktur)) continue;
    byFaktur.set(row.faktur, row);
  }
  return Array.from(byFaktur.values()).map((row, idx) => ({
    no: idx + 1,
    no_faktur: row.faktur || "",
    tgl_faktur: rowDate(row.tgl),
    nama_pembeli: row.nama || "",
    source_file: source,
    exported_at: "",
    status: "processed",
  }));
}

function processedInvoiceCount(state) {
  const fakturRows = state.faktur_rows || [];
  const uniqueProcessed = new Set((state.processed || []).map((row) => row.faktur).filter(Boolean)).size;
  return Math.max(fakturRows.length, uniqueProcessed);
}

function archiveItems(archives) {
  const rows = [];
  for (const archive of archives) {
    if (archive.module !== "pajak_keluaran") continue;
    const xmlExports = (archive.exports || []).filter((item) => item.kind === "xml");
    if (!xmlExports.length) continue;
    rows.push({
      no_faktur: archive.sourceName || archive.id,
      tgl_faktur: "",
      nama_pembeli: archive.moduleLabel || "Pajak Keluaran",
      source_file: archive.sourceName || "-",
      exported_at: xmlExports[0]?.createdAt || archive.updatedAt || "",
      status: "exported",
    });
  }
  return rows;
}

export async function GET() {
  const cookieStore = await cookies();
  const workspace = await loadWorkspace(cookieStore);
  const account = await currentAccountAccess(cookieStore);
  const archives = account.userId ? await listArchives(account.userId) : [];
  const items = [
    ...workspaceItems(workspace.state),
    ...archiveItems(archives),
  ].map((item, idx) => ({ ...item, no: idx + 1 }));
  return NextResponse.json({
    total: archives.reduce((sum, item) => sum + (item.exports || []).filter((file) => file.kind === "xml").length, 0),
    processedInvoices: processedInvoiceCount(workspace.state),
    items,
  });
}

export async function POST() {
  return NextResponse.json({ total: 0, items: [] });
}
