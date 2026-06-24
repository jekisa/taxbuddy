import { NextResponse } from "next/server";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../../lib/workspace";
import { requireActiveSubscription } from "../../_helpers";

export const runtime = "nodejs";

const DLM_TRX_TYPE_LABELS = { "04": "PURCHASE" };
const DLM_TRX_DETAIL_LABELS = { "01": "To other party than VAT Collector" };
const DLM_TRX_DOC_LABELS = { "8": "Special documents" };

function choiceCode(value, fallback) {
  const code = String(value || fallback || "").split(" - ", 1)[0].trim();
  return code || fallback;
}

function parseAmount(value) {
  let text = String(value || "").trim().replace(/[^\d,.-]/g, "");
  if (!text) return 0;
  if (text.includes(",") && text.includes(".")) {
    text = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    const parts = text.split(",");
    text = parts.at(-1).length <= 2 ? `${parts.slice(0, -1).join("")}.${parts.at(-1)}` : text.replace(/,/g, "");
  } else if (text.includes(".")) {
    const parts = text.split(".");
    if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) text = parts.join("");
  }
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(request, { params }) {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const { idx } = await params;
    const rowIndex = Number.parseInt(idx, 10);
    const workspace = await loadWorkspace(access.cookieStore);
    const state = workspace.state;
    const dlm = state.dlm || {};
    const rows = dlm.processed || [];
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= rows.length) {
      return NextResponse.json({ error: "Baris tidak ditemukan." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const sellerTin = String(body.seller_tin || "").trim();
    if (sellerTin && sellerTin.length !== 16) {
      return NextResponse.json({ error: `NPWP Pemasok harus 16 digit (${sellerTin.length} saat ini).` }, { status: 400 });
    }

    const row = rows[rowIndex];
    const trxType = choiceCode(body.trx_type, row.trx_type);
    const trxCode = choiceCode(body.trx_code, row.trx_code);
    const trxDocument = choiceCode(body.trx_document, row.trx_document);
    if (!DLM_TRX_TYPE_LABELS[trxType]) {
      return NextResponse.json({ error: "TrxType tidak dikenal." }, { status: 400 });
    }
    if (!DLM_TRX_DETAIL_LABELS[trxCode]) {
      return NextResponse.json({ error: "TrxCode tidak dikenal." }, { status: 400 });
    }
    if (!DLM_TRX_DOC_LABELS[trxDocument]) {
      return NextResponse.json({ error: "TrxDocument tidak dikenal." }, { status: 400 });
    }

    row.trx_type = trxType;
    row.trx_code = trxCode;
    row.trx_document = trxDocument;
    row.seller_tin = sellerTin;
    row.seller_name = String(body.seller_name || "").trim() || row.seller_name;
    row.stlg = body.stlg === undefined || String(body.stlg).trim() === "" ? 0 : parseAmount(body.stlg);

    state.dlm = { ...dlm, processed: rows };
    await saveWorkspace(workspace.id, state);
    const res = NextResponse.json({ state: publicWorkspaceState(state) });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Baris gagal disimpan." }, { status: 500 });
  }
}
