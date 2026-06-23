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

export function makePajakXlsx(state) {
  const rows = (state.processed || []).map((row) => ({
    "No. Faktur": row.faktur,
    "Tgl Faktur": row.tgl,
    "Nama Pembeli": row.nama,
    "Keterangan": row.keterangan,
    "Kuantitas": row.qty,
    "Harga Satuan": row.harga,
    "DPP": row.dpp,
    "PPN": row.ppn,
  }));
  return toSheetBuffer(rows, "Pajak Keluaran");
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
