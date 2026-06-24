import * as XLSX from "xlsx";

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toSheetBuffer(rows, sheetName) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function round2(value) {
  const n = Number(value || 0);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseInvoiceDate(value) {
  const text = String(value || "").trim();
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed;
}

function orderedDetails(processed, fakturRows) {
  const refToBaris = new Map((fakturRows || []).map((row, idx) => [row.referensi, String(row.baris || idx + 1)]));
  const refOrder = new Map((fakturRows || []).map((row, idx) => [row.referensi, idx]));
  return (processed || [])
    .map((row, idx) => ({ row, idx, baris: refToBaris.get(row.faktur) || String(idx + 1) }))
    .sort((a, b) => {
      const ao = refOrder.has(a.row.faktur) ? refOrder.get(a.row.faktur) : refOrder.size + a.idx;
      const bo = refOrder.has(b.row.faktur) ? refOrder.get(b.row.faktur) : refOrder.size + b.idx;
      return ao - bo || a.idx - b.idx;
    });
}

function makeCoretaxWorkbookBuffer({ fakturRows, processed, npwpPenjual }) {
  const workbook = XLSX.utils.book_new();
  const fakturHeaders = [
    "Baris", "Tanggal Faktur", "Jenis Faktur", "Kode Transaksi", "Keterangan Tambahan",
    "Dokumen Pendukung", "Referensi", "Cap Fasilitas", "ID TKU Penjual", "NPWP/NIK Pembeli",
    "Jenis ID Pembeli", "Negara Pembeli", "Nomor Dokumen Pembeli", "Nama Pembeli",
    "Alamat Pembeli", "Email Pembeli", "ID TKU Pembeli",
  ];
  const fakturAoA = [
    ["NPWP Penjual", null, npwpPenjual || ""],
    [],
    fakturHeaders,
    ...(fakturRows || []).map((row, idx) => [
      String(idx + 1),
      parseInvoiceDate(row.tgl_faktur),
      row.jenis_faktur || "Normal",
      row.kode_transaksi || "04",
      row.ket_tambahan || null,
      row.dok_pendukung || null,
      row.referensi || "",
      row.cap_fasilitas || null,
      row.id_tku_penjual || "",
      row.npwp_pembeli || "",
      row.jenis_id || "TIN",
      row.negara || "IDN",
      row.no_dok_pembeli || "",
      row.nama_pembeli || "",
      row.alamat_pembeli || "",
      row.email_pembeli || null,
      row.id_tku_pembeli || "",
    ]),
    ["END"],
  ];
  const fakturSheet = XLSX.utils.aoa_to_sheet(fakturAoA, { cellDates: true });
  fakturSheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  fakturSheet["!cols"] = [5.3, 13.9, 17.3, 14.3, 21, 20.3, 21.1, 11.9, 23.4, 18.9, 15.7, 15.3, 24.4, 36.7, 80, 13.9, 23.4].map((wch) => ({ wch }));
  for (let row = 3; row < fakturAoA.length; row += 1) {
    const cell = fakturSheet[`B${row + 1}`];
    if (cell && cell.v instanceof Date) cell.z = "mm-dd-yy";
  }
  XLSX.utils.book_append_sheet(workbook, fakturSheet, "Faktur");

  const detailHeaders = [
    "Baris", "Barang/Jasa", "Kode Barang Jasa", "Nama Barang/Jasa", "Nama Satuan Ukur",
    "Harga Satuan", "Jumlah Barang Jasa", "Total Diskon", "DPP", "DPP Nilai Lain",
    "Tarif PPN", "PPN", "Tarif PPnBM", "PPnBM",
  ];
  const detailAoA = [
    detailHeaders,
    ...orderedDetails(processed, fakturRows).map(({ row, baris }) => [
      String(baris),
      row.detail_opt || "A",
      row.detail_code || "000000",
      row.keterangan || "",
      row.detail_unit || "UM.0021",
      round2(row.harga),
      round2(row.qty),
      round2(row.diskon),
      round2(row.dpp),
      round2(row.dpp_nl),
      12,
      round2(row.ppn),
      null,
      null,
    ]),
    ["END"],
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(detailAoA);
  detailSheet["!cols"] = [5.3, 11.4, 16.1, 47.7, 17.4, 12.4, 18, 11.9, 11.6, 13.3, 9.1, 11.6, 11.7, 7.3].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, detailSheet, "DetailFaktur");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellDates: true });
}

export function makePajakXlsx(state) {
  const fakturRows = state.faktur_rows || [];
  const npwpPenjual = fakturRows[0]?.id_tku_penjual ? String(fakturRows[0].id_tku_penjual).slice(0, 16) : "";
  return makeCoretaxWorkbookBuffer({
    fakturRows,
    processed: state.processed || [],
    npwpPenjual,
  });
}

export function makePajakXml(state) {
  const rows = (state.processed || []).map((row) => `    <Invoice>
      <Number>${xmlEscape(row.faktur)}</Number>
      <Date>${xmlEscape(row.tgl)}</Date>
      <Buyer>${xmlEscape(row.nama)}</Buyer>
      <Description>${xmlEscape(row.keterangan)}</Description>
      <Quantity>${xmlEscape(row.qty)}</Quantity>
      <UnitPrice>${xmlEscape(row.harga)}</UnitPrice>
      <TaxBase>${xmlEscape(row.dpp)}</TaxBase>
      <Vat>${xmlEscape(row.ppn)}</Vat>
    </Invoice>`).join("\n");
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<TaxBuddyExport module="pajak_keluaran">\n${rows}\n</TaxBuddyExport>\n`, "utf8");
}

export function makeDlmXlsx(state) {
  const rows = (state.dlm?.processed || []).map((row) => ({
    "No. Dokumen": row.doc_no,
    "Tgl Dokumen": row.doc_date,
    "Nama Pemasok": row.seller_name,
    "DPP": row.tax_base,
    "PPN": row.vat,
    "PPnBM": row.stlg,
  }));
  return toSheetBuffer(rows, "Doc Lain Masukan");
}

export function makeDlmXml(state) {
  const rows = (state.dlm?.processed || []).map((row) => `    <Document>
      <Number>${xmlEscape(row.doc_no)}</Number>
      <Date>${xmlEscape(row.doc_date)}</Date>
      <Seller>${xmlEscape(row.seller_name)}</Seller>
      <TaxBase>${xmlEscape(row.tax_base)}</TaxBase>
      <Vat>${xmlEscape(row.vat)}</Vat>
      <LuxuryTax>${xmlEscape(row.stlg)}</LuxuryTax>
    </Document>`).join("\n");
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<TaxBuddyExport module="doc_lain_masukan">\n${rows}\n</TaxBuddyExport>\n`, "utf8");
}

export function makeSdlXml(state) {
  const rows = (state.sdl?.processed || []).map((row) => `    <Document>
      <BuyerName>${xmlEscape(row.buyer_name)}</BuyerName>
      <BuyerIdType>${xmlEscape(row.buyer_id_opt)}</BuyerIdType>
      <BuyerIdNumber>${xmlEscape(row.buyer_id_number)}</BuyerIdNumber>
      <SerialNumber>${xmlEscape(row.serial_no)}</SerialNumber>
      <Date>${xmlEscape(row.doc_date)}</Date>
      <TaxBase>${xmlEscape(row.tax_base)}</TaxBase>
      <OtherTaxBase>${xmlEscape(row.other_tax_base)}</OtherTaxBase>
      <Vat>${xmlEscape(row.vat)}</Vat>
      <LuxuryTax>${xmlEscape(row.stlg)}</LuxuryTax>
      <Info>${xmlEscape(row.info)}</Info>
    </Document>`).join("\n");
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<TaxBuddyExport module="spt_dokumen_lain">\n${rows}\n</TaxBuddyExport>\n`, "utf8");
}

export function downloadResponse(buffer, filename, mime) {
  return new Response(buffer, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
