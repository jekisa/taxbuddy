import * as XLSX from "xlsx";
import { ObjectId } from "mongodb";
import { emptyState } from "./bootstrap-data";
import { ensureIndexes, getDb, toObjectId } from "./mongodb";

export const WORKSPACE_COOKIE = "taxbuddy_workspace";

const REQUIRED_FIELDS = [
  "Nama Pelanggan",
  "Keterangan Barang",
  "No. Faktur",
  "Tgl Faktur",
  "Kuantitas",
  "Harga Satuan",
  "Unit 1 Barang",
];

function cleanCell(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function safeNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || "")
    .replace(/\s/g, "")
    .replace(/Rp/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowValue(row, mapping, field) {
  const idx = Number(mapping?.[field]);
  if (!Number.isInteger(idx)) return "";
  return cleanCell(row[idx]);
}

function normalizeMapping(mapping) {
  const out = {};
  for (const field of REQUIRED_FIELDS) {
    const idx = Number(mapping?.[field]);
    if (Number.isInteger(idx) && idx >= 0) out[field] = idx;
  }
  return out;
}

function trialSubscription() {
  return emptyState().subscription;
}

export function readExcelWorkbook(buffer, filename = "") {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("File Excel tidak memiliki sheet yang bisa dibaca.");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils
    .sheet_to_json(sheet, { header: 1, raw: false, defval: "" })
    .map((row) => row.map(cleanCell))
    .filter((row) => row.some(Boolean));

  if (!rows.length) throw new Error("File Excel kosong atau formatnya tidak terbaca.");

  const headerIndex = rows.findIndex((row) => row.filter(Boolean).length >= 2);
  const headers = (rows[headerIndex] || []).map((header, idx) => header || `Kolom ${idx + 1}`);
  const rawRows = rows.slice(headerIndex + 1).filter((row) => row.some(Boolean));

  if (!headers.length || !rawRows.length) {
    throw new Error("File Excel harus memiliki header dan minimal 1 baris data.");
  }

  const state = {
    ...emptyState(),
    raw_headers: headers,
    raw_preview: rawRows.slice(0, 60),
    raw_rows: rawRows,
    raw_row_count: rawRows.length,
    mapping: {},
    src_filename: filename,
    processed: [],
    dup_map: {},
    faktur_rows: [],
    detail_rows: [],
    totals: {},
    subscription: trialSubscription(),
  };

  return state;
}

export function processWorkspaceState(state) {
  const mapping = normalizeMapping(state.mapping);
  const missing = REQUIRED_FIELDS.filter((field) => mapping[field] === undefined);
  if (missing.length) {
    throw new Error(`Mapping belum lengkap: ${missing.join(", ")}.`);
  }

  const processed = (state.raw_rows || []).map((row, idx) => {
    const nama = rowValue(row, mapping, "Nama Pelanggan");
    const keterangan = rowValue(row, mapping, "Keterangan Barang");
    const faktur = rowValue(row, mapping, "No. Faktur") || `INV-${idx + 1}`;
    const tgl = rowValue(row, mapping, "Tgl Faktur");
    const qty = safeNumber(rowValue(row, mapping, "Kuantitas")) || 1;
    const harga = safeNumber(rowValue(row, mapping, "Harga Satuan"));
    const unit = rowValue(row, mapping, "Unit 1 Barang") || "Unit";
    const hargaJual = qty * harga;
    const diskon = 0;
    const dpp = hargaJual - diskon;
    const dppNl = dpp;
    const ppn = dppNl * 0.12;

    return {
      no: idx + 1,
      original_idx: idx,
      baris: idx + 2,
      nama,
      keterangan,
      faktur,
      tgl,
      qty,
      harga,
      unit,
      harga_jual: hargaJual,
      diskon,
      dpp,
      dpp_nl: dppNl,
      tarif_ppn: 12,
      ppn,
      tarif_ppnbm: 0,
      ppnbm: 0,
    };
  });

  const fakturGroups = new Map();
  for (const row of processed) {
    if (!fakturGroups.has(row.faktur)) {
      fakturGroups.set(row.faktur, {
        baris: row.baris,
        tgl_faktur: row.tgl,
        jenis_faktur: "Normal",
        kode_transaksi: "04",
        ket_tambahan: "",
        dok_pendukung: "",
        referensi: row.faktur,
        cap_fasilitas: "",
        id_tku_penjual: "",
        npwp_pembeli: "",
        jenis_id: "NPWP",
        negara: "IDN",
        no_dok_pembeli: "",
        nama_pembeli: row.nama,
        alamat_pembeli: "",
        email_pembeli: "",
        id_tku_pembeli: "",
      });
    }
  }

  const counts = processed.reduce((acc, row) => {
    acc[row.faktur] = (acc[row.faktur] || 0) + 1;
    return acc;
  }, {});
  const dup_map = {};
  Object.entries(counts)
    .filter(([, count]) => count > 1)
    .forEach(([faktur], idx) => {
      dup_map[faktur] = idx % 3;
    });

  const detailRows = processed.map((row) => ({
    original_idx: row.original_idx,
    baris: row.baris,
    detail_opt: "A",
    detail_opt_label: "Barang",
    detail_code: "",
    keterangan: row.keterangan,
    detail_unit: "UM.0018",
    detail_unit_label: row.unit,
    harga: row.harga,
    qty: row.qty,
    diskon: row.diskon,
    dpp: row.dpp,
    dpp_nl: row.dpp_nl,
    tarif_ppn: row.tarif_ppn,
    ppn: row.ppn,
    tarif_ppnbm: row.tarif_ppnbm,
    ppnbm: row.ppnbm,
  }));

  const totals = processed.reduce(
    (acc, row) => ({
      qty: acc.qty + row.qty,
      harga_jual: acc.harga_jual + row.harga_jual,
      diskon: acc.diskon + row.diskon,
      dpp: acc.dpp + row.dpp,
      dpp_nl: acc.dpp_nl + row.dpp_nl,
      ppn: acc.ppn + row.ppn,
    }),
    { qty: 0, harga_jual: 0, diskon: 0, dpp: 0, dpp_nl: 0, ppn: 0 },
  );

  const nextState = {
    ...emptyState(),
    ...state,
    mapping,
    processed,
    dup_map,
    faktur_rows: Array.from(fakturGroups.values()),
    detail_rows: detailRows,
    totals,
    date_diagnostics: {
      majority_month: "",
      invalid_indices: [],
      outlier_indices: [],
      problem_indices: [],
      warnings: [],
      blockers: [],
    },
    subscription: state.subscription || trialSubscription(),
  };

  const uniqueInvoices = new Set(processed.map((row) => row.faktur)).size;
  const access = nextState.subscription?.access;
  const limit = Number(access?.invoiceLimit || nextState.subscription?.limit || 10);
  const isTrial = nextState.subscription?.status !== "active";
  if (isTrial && uniqueInvoices > limit) {
    const err = new Error(`Paket Trial hanya bisa memproses maksimal ${limit} invoice. Silakan pilih paket berbayar untuk lanjut.`);
    err.upgradeRequired = true;
    err.limit = limit;
    err.used = uniqueInvoices;
    throw err;
  }

  return nextState;
}

export function publicWorkspaceState(state) {
  const base = emptyState();
  const merged = { ...base, ...(state || {}) };
  delete merged.raw_rows;
  merged.raw_preview = (state?.raw_preview || state?.raw_rows || []).slice(0, 60);
  merged.raw_row_count = state?.raw_row_count || state?.raw_rows?.length || 0;
  merged.subscription = state?.subscription || trialSubscription();
  return merged;
}

export async function loadWorkspace(cookieStore) {
  const db = await getDb();
  await ensureIndexes(db);
  const existingId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const objectId = toObjectId(existingId);
  if (!objectId) return { id: new ObjectId(), state: emptyState(), isNew: true };

  const doc = await db.collection("workspaces").findOne({ _id: objectId });
  return {
    id: objectId,
    state: doc?.state || emptyState(),
    isNew: !doc,
  };
}

export async function saveWorkspace(id, state) {
  const db = await getDb();
  await ensureIndexes(db);
  await db.collection("workspaces").updateOne(
    { _id: id },
    {
      $set: {
        state,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export function setWorkspaceCookie(res, id) {
  res.cookies.set(WORKSPACE_COOKIE, String(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}
