import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppData, saveAppData } from "../../../lib/app-data";
import { loadWorkspace } from "../../../lib/workspace";

export const runtime = "nodejs";

export async function GET() {
  const appData = await getAppData();
  return NextResponse.json({ templates: appData.templates || {} });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nama template kosong." }, { status: 400 });

    const workspace = await loadWorkspace(await cookies());
    const mapping = workspace.state.mapping || {};
    if (!Object.keys(mapping).length) {
      return NextResponse.json({ error: "Assign field dulu sebelum menyimpan template." }, { status: 400 });
    }

    const appData = await getAppData();
    appData.templates = {
      ...(appData.templates || {}),
      [name]: {
        mapping: { ...mapping },
        headers: workspace.state.raw_headers || [],
      },
    };
    const saved = await saveAppData(appData);
    return NextResponse.json({ templates: saved.templates || {} });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Template gagal disimpan." }, { status: 500 });
  }
}
