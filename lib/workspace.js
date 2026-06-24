import * as XLSX from "xlsx";
import { ObjectId } from "mongodb";
import { emptyState } from "./bootstrap-data";
import { isProduction } from "./env";
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

const DLM_REQUIRED_FIELDS = ["No. Faktur", "Tgl Faktur", "Nama Pemasok", "Nilai Faktur"];

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

function parsePercent(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value || "").replace("%", "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePartyName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function applyTaxCalculation(row, discountPct = 0) {
  const pct = Math.max(parsePercent(discountPct), 0);
  const hargaJual = Number(row.harga_jual) || ((Number(row.qty) || 0) * (Number(row.harga) || 0));
  const diskon = hargaJual * (pct / 100);
  const dpp = hargaJual - diskon;
  row.harga_jual = hargaJual;
  row.diskon_rate = pct;
  row.diskon = diskon;
  row.dpp = dpp;
  row.dpp_nl = dpp;
  row.tarif_ppn = 12;
  row.ppn = dpp * 0.12;
  row.tarif_ppnbm = Number(row.tarif_ppnbm) || 0;
  row.ppnbm = Number(row.ppnbm) || 0;
}

function calcTotals(processed) {
  return (processed || []).reduce(
    (acc, row) => ({
      qty: acc.qty + (Number(row.qty) || 0),
      harga_jual: acc.harga_jual + (Number(row.harga_jual) || 0),
      diskon: acc.diskon + (Number(row.diskon) || 0),
      dpp: acc.dpp + (Number(row.dpp) || 0),
      dpp_nl: acc.dpp_nl + (Number(row.dpp_nl) || 0),
      ppn: acc.ppn + (Number(row.ppn) || 0),
    }),
    { qty: 0, harga_jual: 0, diskon: 0, dpp: 0, dpp_nl: 0, ppn: 0 },
  );
}

export function applyBuyerDiscountsToActiveData(state, dbPembeli, buyerName = "") {
  const processed = state?.processed || [];
  const fakturRows = state?.faktur_rows || [];
  const detailRows = state?.detail_rows || [];
  if (!processed.length) return 0;

  const requestedBuyer = normalizePartyName(buyerName);
  const targets = Object.entries(dbPembeli || {})
    .filter(([name]) => !requestedBuyer || normalizePartyName(name) === requestedBuyer)
    .map(([name, data]) => {
      const names = new Set([
        normalizePartyName(name),
        normalizePartyName(data?.nama),
      ].filter(Boolean));
      return {
        names,
        pct: parsePercent(data?.diskon_pct),
        npwp: String(data?.npwp || "").replace(/\D/g, ""),
        noDok: String(data?.no_dok || "").replace(/\D/g, ""),
      };
    })
    .filter((target) => target.names.size);

  if (!targets.length) return 0;

  const fakturToBuyer = new Map();
  const fakturToIds = new Map();
  for (const row of fakturRows) {
    const buyer = normalizePartyName(row.nama_pembeli);
    const ref = row.referensi || row.faktur;
    if (buyer && ref) fakturToBuyer.set(ref, buyer);
    const npwp = String(row.npwp_pembeli || "").replace(/\D/g, "");
    const noDok = String(row.no_dok_pembeli || row.id_tku_pembeli || "").replace(/\D/g, "");
    if (ref && (npwp || noDok)) fakturToIds.set(ref, { npwp, noDok });
  }

  let changed = 0;
  const changedOriginalIdx = new Set();
  const changedRefs = new Map();

  for (const row of processed) {
    const sourceName = normalizePartyName(row.nama);
    const buyerForRef = fakturToBuyer.get(row.faktur) || "";
    const ids = fakturToIds.get(row.faktur) || {};
    const target = targets.find((item) => (
      item.names.has(sourceName) ||
      item.names.has(buyerForRef) ||
      (item.npwp && ids.npwp === item.npwp) ||
      (item.noDok && ids.noDok === item.noDok)
    ));
    if (!target) continue;
    applyTaxCalculation(row, target.pct);
    changed += 1;
    changedOriginalIdx.add(Number(row.original_idx));
    if (row.faktur) changedRefs.set(row.faktur, target.pct);
  }

  const uniqueActiveNames = new Set(processed.map((row) => normalizePartyName(row.nama)).filter(Boolean));
  if (!changed && targets.length === 1 && uniqueActiveNames.size === 1) {
    for (const row of processed) {
      applyTaxCalculation(row, targets[0].pct);
      changed += 1;
      changedOriginalIdx.add(Number(row.original_idx));
      if (row.faktur) changedRefs.set(row.faktur, targets[0].pct);
    }
  }

  for (const row of fakturRows) {
    const ref = row.referensi || row.faktur;
    let buyer = normalizePartyName(row.nama_pembeli);
    if (!buyer && ref) {
      const source = processed.find((item) => item.faktur === ref);
      buyer = normalizePartyName(source?.nama);
    }
    const ids = {
      npwp: String(row.npwp_pembeli || "").replace(/\D/g, ""),
      noDok: String(row.no_dok_pembeli || row.id_tku_pembeli || "").replace(/\D/g, ""),
    };
    const target = targets.find((item) => (
      item.names.has(buyer) ||
      (item.npwp && ids.npwp === item.npwp) ||
      (item.noDok && ids.noDok === item.noDok) ||
      (changed && targets.length === 1 && uniqueActiveNames.size === 1)
    ));
    if (target) row.diskon_rate = target.pct;
    else if (ref && changedRefs.has(ref)) row.diskon_rate = changedRefs.get(ref);
  }

  const processedByOriginalIdx = new Map(processed.map((row, index) => [Number(row.original_idx ?? index), row]));
  detailRows.forEach((detail, index) => {
    const originalIdx = Number(detail.original_idx ?? index);
    const source = processedByOriginalIdx.get(originalIdx) || processed[index];
    if (!source || (!changedOriginalIdx.has(originalIdx) && !changedRefs.has(source.faktur))) return;
    detail.diskon = source.diskon;
    detail.dpp = source.dpp;
    detail.dpp_nl = source.dpp_nl;
    detail.tarif_ppn = source.tarif_ppn;
    detail.ppn = source.ppn;
    detail.tarif_ppnbm = source.tarif_ppnbm;
    detail.ppnbm = source.ppnbm;
  });

  if (changed) state.totals = calcTotals(processed);
  state.processed = processed;
  state.faktur_rows = fakturRows;
  state.detail_rows = detailRows;
  return changed;
}

export function recalculateDiscountForInvoiceRefs(state, refs, discountPct = 0) {
  const refSet = new Set((refs || []).filter(Boolean));
  if (!refSet.size) return 0;
  const processed = state?.processed || [];
  const detailRows = state?.detail_rows || [];
  let changed = 0;
  const changedOriginalIdx = new Set();

  for (const row of processed) {
    if (!refSet.has(row.faktur)) continue;
    applyTaxCalculation(row, discountPct);
    changed += 1;
    changedOriginalIdx.add(Number(row.original_idx));
  }

  const processedByOriginalIdx = new Map(processed.map((row, index) => [Number(row.original_idx ?? index), row]));
  detailRows.forEach((detail, index) => {
    const originalIdx = Number(detail.original_idx ?? index);
    const source = processedByOriginalIdx.get(originalIdx) || processed[index];
    if (!source || !changedOriginalIdx.has(originalIdx)) return;
    detail.diskon = source.diskon;
    detail.dpp = source.dpp;
    detail.dpp_nl = source.dpp_nl;
    detail.tarif_ppn = source.tarif_ppn;
    detail.ppn = source.ppn;
    detail.tarif_ppnbm = source.tarif_ppnbm;
    detail.ppnbm = source.ppnbm;
  });

  if (changed) state.totals = calcTotals(processed);
  state.processed = processed;
  state.detail_rows = detailRows;
  return changed;
}

function rowValue(row, mapping, field) {
  const idx = Number(mapping?.[field]);
  if (!Number.isInteger(idx)) return "";
  return cleanCell(row[idx]);
}

function removeEmptyColumns(headerRow, dataRows) {
  const width = Math.max(
    headerRow.length,
    ...dataRows.map((row) => row.length),
  );
  const keep = [];
  for (let idx = 0; idx < width; idx += 1) {
    const header = cleanCell(headerRow[idx]);
    const hasData = dataRows.some((row) => cleanCell(row[idx]));
    if (header || hasData) keep.push(idx);
  }
  return {
    headers: keep.map((idx) => cleanCell(headerRow[idx]) || `Kolom ${idx + 1}`),
    rawRows: dataRows
      .map((row) => keep.map((idx) => cleanCell(row[idx])))
      .filter((row) => row.some(Boolean)),
    removedColumns: width - keep.length,
  };
}

function parseExcelSheet(buffer) {
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
  const headerRow = rows[headerIndex] || [];
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some(Boolean));
  const { headers, rawRows } = removeEmptyColumns(headerRow, dataRows);

  if (!headers.length || !rawRows.length) {
    throw new Error("File Excel harus memiliki header dan minimal 1 baris data.");
  }

  return { headers, rawRows };
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
  const { headers, rawRows } = parseExcelSheet(buffer);

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

export function readDlmExcelWorkbook(buffer, filename = "", currentState = emptyState()) {
  const { headers, rawRows } = parseExcelSheet(buffer);
  return {
    ...emptyState(),
    ...currentState,
    dlm: {
      ...(currentState.dlm || emptyState().dlm),
      raw_headers: headers,
      raw_preview: rawRows.slice(0, 60),
      raw_rows: rawRows,
      raw_row_count: rawRows.length,
      mapping: {},
      src_filename: filename,
      processed: [],
      totals: {},
    },
    subscription: currentState.subscription || trialSubscription(),
  };
}

export function processDlmWorkspaceState(state) {
  const dlm = state.dlm || {};
  const mapping = dlm.mapping || {};
  const missing = DLM_REQUIRED_FIELDS.filter((field) => mapping[field] === undefined);
  if (missing.length) {
    throw new Error(`Mapping belum lengkap: ${missing.join(", ")}.`);
  }

  const processed = (dlm.raw_rows || []).map((row, idx) => {
    const docNo = rowValue(row, mapping, "No. Faktur") || `DLM-${idx + 1}`;
    const docDate = rowValue(row, mapping, "Tgl Faktur");
    const sellerName = rowValue(row, mapping, "Nama Pemasok");
    const taxBase = safeNumber(rowValue(row, mapping, "Nilai Faktur"));
    const vat = taxBase * 0.12;
    const date = new Date(docDate);
    const validDate = Number.isNaN(date.getTime()) ? null : date;

    return {
      no: idx + 1,
      doc_no: docNo,
      doc_date: docDate,
      trx_type: "04",
      trx_code: "01",
      trx_document: "8",
      tax_period_month: validDate ? validDate.getMonth() + 1 : "",
      tax_period_year: validDate ? validDate.getFullYear() : "",
      tax_base: taxBase,
      vat,
      stlg: 0,
      seller_tin: "",
      seller_name: sellerName,
    };
  });

  const totals = processed.reduce(
    (acc, row) => ({
      tax_base: acc.tax_base + row.tax_base,
      vat: acc.vat + row.vat,
      stlg: acc.stlg + row.stlg,
    }),
    { tax_base: 0, vat: 0, stlg: 0 },
  );

  return {
    ...state,
    dlm: {
      ...dlm,
      mapping,
      processed,
      totals,
    },
  };
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
        baris: fakturGroups.size + 1,
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
    baris: fakturGroups.get(row.faktur)?.baris || row.no,
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
  if (merged.dlm) delete merged.dlm.raw_rows;
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
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}
