import { ObjectId } from "mongodb";
import { ensureIndexes, getDb, toObjectId } from "./mongodb";

export const MODULE_LABELS = {
  pajak_keluaran: "Pajak Keluaran",
  doc_lain_masukan: "Doc Lain Masukan",
  spt_dokumen_lain: "SPT Dokumen Lain",
};

function bufferMeta(buffer, filename, mime) {
  return {
    filename,
    mime: mime || "application/octet-stream",
    size: buffer.length,
    base64: buffer.toString("base64"),
  };
}

function publicExportMeta(item) {
  return {
    id: String(item.id),
    kind: item.kind,
    filename: item.filename,
    mime: item.mime,
    size: item.size || 0,
    createdAt: item.createdAt || null,
  };
}

export async function archiveUploadedWorkbook({ userId, module, filename, mime, buffer, state }) {
  if (!userId || !buffer?.length) return null;
  const db = await getDb();
  await ensureIndexes(db);
  const now = new Date();
  const doc = {
    userId,
    module,
    moduleLabel: MODULE_LABELS[module] || module,
    source: bufferMeta(buffer, filename, mime),
    rawHeaders: module === "doc_lain_masukan" ? state?.dlm?.raw_headers || [] : state?.raw_headers || [],
    rawRowCount: module === "doc_lain_masukan" ? state?.dlm?.raw_row_count || 0 : state?.raw_row_count || 0,
    processedCount: 0,
    invoiceCount: 0,
    exports: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection("document_archives").insertOne(doc);
  return result.insertedId;
}

export async function updateArchiveProcessing({ userId, archiveId, module, state }) {
  const db = await getDb();
  await ensureIndexes(db);
  const id = toObjectId(archiveId);
  let archive = id ? { _id: id } : await db.collection("document_archives").findOne(
    { userId, module },
    { sort: { updatedAt: -1 }, projection: { _id: 1 } },
  );
  if (!archive?._id) return;

  const processed = module === "doc_lain_masukan" ? state?.dlm?.processed || [] : state?.processed || [];
  const invoiceCount = module === "doc_lain_masukan"
    ? processed.length
    : new Set(processed.map((row) => row.faktur)).size;
  await db.collection("document_archives").updateOne(
    { _id: archive._id, userId },
    {
      $set: {
        processedCount: processed.length,
        invoiceCount,
        updatedAt: new Date(),
      },
    },
  );
}

export async function appendArchiveExport({ userId, archiveId, module, kind, filename, mime, buffer }) {
  if (!userId || !buffer?.length) return null;
  const db = await getDb();
  await ensureIndexes(db);
  const now = new Date();
  const exportItem = {
    id: new ObjectId(),
    kind,
    ...bufferMeta(buffer, filename, mime),
    createdAt: now,
  };
  const id = toObjectId(archiveId);
  let archive = id ? { _id: id } : await db.collection("document_archives").findOne(
    { userId, module },
    { sort: { updatedAt: -1 }, projection: { _id: 1 } },
  );

  if (archive?._id) {
    await db.collection("document_archives").updateOne(
      { _id: archive._id, userId },
      {
        $push: { exports: exportItem },
        $set: { updatedAt: now },
      },
    );
    return archive._id;
  }

  const result = await db.collection("document_archives").insertOne({
    userId,
    module,
    moduleLabel: MODULE_LABELS[module] || module,
    source: null,
    rawHeaders: [],
    rawRowCount: 0,
    processedCount: 0,
    invoiceCount: 0,
    exports: [exportItem],
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId;
}

export async function listArchives(userId) {
  const db = await getDb();
  await ensureIndexes(db);
  const docs = await db.collection("document_archives")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  return docs.map((doc) => ({
    id: String(doc._id),
    module: doc.module,
    moduleLabel: doc.moduleLabel || MODULE_LABELS[doc.module] || doc.module,
    sourceName: doc.source?.filename || "-",
    sourceSize: doc.source?.size || 0,
    canLoad: Boolean(doc.source?.base64),
    rawRowCount: doc.rawRowCount || 0,
    processedCount: doc.processedCount || 0,
    invoiceCount: doc.invoiceCount || 0,
    exports: (doc.exports || []).map(publicExportMeta),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  }));
}

export async function getArchiveForUser(userId, archiveId) {
  const db = await getDb();
  await ensureIndexes(db);
  const id = toObjectId(archiveId);
  if (!id) return null;
  return db.collection("document_archives").findOne({ _id: id, userId });
}

export function fileResponse(file) {
  const buffer = Buffer.from(file.base64 || "", "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename || "download")}"`,
    },
  });
}
