import { NextResponse } from "next/server";
import { loadWorkspace, publicWorkspaceState, saveWorkspace, setWorkspaceCookie } from "../../../../lib/workspace";
import { requireActiveSubscription } from "../_helpers";

export const runtime = "nodejs";

const DLM_TRX_TYPE_LABELS = { "04": "PURCHASE" };
const DLM_TRX_DETAIL_LABELS = { "01": "To other party than VAT Collector" };
const DLM_TRX_DOC_LABELS = { "8": "Special documents" };

function choiceCode(value, fallback) {
  const code = String(value || fallback || "").split(" - ", 1)[0].trim();
  return code || fallback;
}

function validIndices(indices, total) {
  return (indices || []).filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < total);
}

export async function POST(request) {
  try {
    const access = await requireActiveSubscription();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const trxType = choiceCode(body.trx_type, "04");
    const trxCode = choiceCode(body.trx_code, "01");
    const trxDocument = choiceCode(body.trx_document, "8");
    if (!DLM_TRX_TYPE_LABELS[trxType]) {
      return NextResponse.json({ error: "TrxType tidak dikenal." }, { status: 400 });
    }
    if (!DLM_TRX_DETAIL_LABELS[trxCode]) {
      return NextResponse.json({ error: "TrxCode tidak dikenal." }, { status: 400 });
    }
    if (!DLM_TRX_DOC_LABELS[trxDocument]) {
      return NextResponse.json({ error: "TrxDocument tidak dikenal." }, { status: 400 });
    }

    const workspace = await loadWorkspace(access.cookieStore);
    const state = workspace.state;
    const dlm = state.dlm || {};
    const rows = dlm.processed || [];
    const indices = body.scope === "all" ? rows.map((_, idx) => idx) : validIndices(body.indices, rows.length);
    if (!indices.length) {
      return NextResponse.json({ error: "Pilih baris dulu (klik / Ctrl+klik)." }, { status: 400 });
    }

    for (const idx of indices) {
      rows[idx].trx_type = trxType;
      rows[idx].trx_code = trxCode;
      rows[idx].trx_document = trxDocument;
    }

    state.dlm = { ...dlm, processed: rows };
    await saveWorkspace(workspace.id, state);
    const label = body.scope === "all" ? "semua baris" : `${indices.length} baris`;
    const res = NextResponse.json({
      state: publicWorkspaceState(state),
      label,
      trx_type: trxType,
      trx_code: trxCode,
      trx_document: trxDocument,
    });
    setWorkspaceCookie(res, workspace.id);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Kode transaksi gagal diterapkan." }, { status: 500 });
  }
}
