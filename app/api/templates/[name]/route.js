import { NextResponse } from "next/server";
import { getAppData, saveAppData } from "../../../../lib/app-data";

export const runtime = "nodejs";

export async function DELETE(_request, context) {
  try {
    const params = await context.params;
    const name = decodeURIComponent(params.name || "");
    const appData = await getAppData();
    const templates = { ...(appData.templates || {}) };
    delete templates[name];
    const saved = await saveAppData({ ...appData, templates });
    return NextResponse.json({ templates: saved.templates || {} });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Template gagal dihapus." }, { status: 500 });
  }
}
