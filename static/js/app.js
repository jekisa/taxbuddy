/* ============================================================
   Pajak Keluaran Otomatis - Web Edition
   Frontend SPA logic.
   ============================================================ */

const APP = {
  bootstrap: null,
  state: null,
  theme: "Dark Executive",
  view: "dashboard",
  subView: "upload_mapping",
  pendingField: null,
  selFaktur: new Set(),
  selDetail: new Set(),
  activeTab: "faktur",
  dlmSubView: "upload_mapping",
  pendingDlmField: null,
  selDlm: new Set(),
  selSdl: new Set(),
  tableStates: {},
  tableCore: null,
  queryCore: null,
  queryClient: null,
  auth: null,
};

class ApiError extends Error {
  constructor(msg, data) { super(msg); this.data = data; }
}

/* ==================== API HELPERS ==================== */
function handleApiError(res, data) {
  if (data && data.upgrade_required) showUpgradeModal(data);
  throw new ApiError((data && data.error) || "Terjadi kesalahan.", data);
}
async function apiGet(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) handleApiError(res, data);
  return data;
}
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : "{}",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) handleApiError(res, data);
  return data;
}
async function apiDelete(url) {
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) handleApiError(res, data);
  return data;
}
async function loadAuthSession() {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    APP.auth = data;
    return data;
  } catch (err) {
    return null;
  }
}
async function loadTanStack() {
  try {
    const [tableCore, queryCore] = await Promise.all([
      import("/static/vendor/tanstack-table/index.esm.js"),
      import("/static/vendor/tanstack-query/index.js"),
    ]);
    APP.tableCore = tableCore;
    APP.queryCore = queryCore;
    APP.queryClient = new queryCore.QueryClient({
      defaultOptions: { queries: { staleTime: 15000, gcTime: 5 * 60 * 1000 } },
    });
  } catch (err) {
    console.warn("TanStack core failed to load, using local table/query fallback.", err);
    APP.queryClient = null;
  }
}
async function queryGet(queryKey, url) {
  if (!APP.queryClient) return apiGet(url);
  return APP.queryClient.fetchQuery({ queryKey, queryFn: () => apiGet(url) });
}
function invalidateQueries(queryKey) {
  if (APP.queryClient) APP.queryClient.invalidateQueries({ queryKey });
}

/* ==================== FORMAT HELPERS ==================== */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function fmt(val, dec = 2) {
  if (val === "" || val === null || val === undefined) return "";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtIdr(val) {
  if (val === "" || val === null || val === undefined || Number(val) === 0) return "-";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtQty(val) {
  const n = Number(val);
  if (isNaN(n)) return String(val ?? "");
  let s = n.toFixed(2);
  if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  const parts = s.split(".");
  parts[0] = Number(parts[0]).toLocaleString("en-US");
  return parts.join(".");
}
function fmtPct(val) {
  if (val === "" || val === null || val === undefined) return "";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  let s = n.toFixed(2);
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

/* ==================== ICONS ==================== */
const ICONS = {
  activity: '<path d="M22 12h-4l-3 7-6-14-3 7H2"/>',
  archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  bookOpen: '<path d="M12 7v14"/><path d="M3 5a7 7 0 0 1 9 2 7 7 0 0 1 9-2v16a7 7 0 0 0-9 2 7 7 0 0 0-9-2z"/>',
  boxes: '<path d="m7.5 4.3 4.5 2.6 4.5-2.6"/><path d="M12 6.9v5.2"/><path d="m3 8 4.5 2.6L12 8l4.5 2.6L21 8"/><path d="M3 8v8l4.5 2.6L12 16l4.5 2.6L21 16V8"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  chevronsLeft: '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronsRight: '<path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  fileDown: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>',
  fileSpreadsheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9v10"/><path d="M14 9v10"/>',
  folderOpen: '<path d="M6 14 4.6 20A2 2 0 0 0 6.5 22h11a2 2 0 0 0 1.9-1.5L21 12H7.5A2 2 0 0 0 6 14z"/><path d="M3 18V6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v3"/>',
  hash: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>',
  layoutDashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  package: '<path d="m16.5 9.4-9-5.2"/><path d="m21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  panelLeft: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2l-4 2-3-2-3 2-3-2z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.3 5.6L21 8"/><path d="M21 3v5h-5"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  tag: '<path d="M12.6 2.6H21v8.4L10.4 21.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8z"/><circle cx="17" cy="7" r="1"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8 12 3 7 8"/><path d="M12 3v12"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
};
function icon(name, cls = "") {
  const body = ICONS[name] || ICONS.activity;
  return `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* ==================== THEME ==================== */
const THEME_VAR_MAP = {
  bg: "--bg", surface: "--surface", surface2: "--surface2", surface3: "--surface3",
  border: "--border", border2: "--border2",
  accent: "--accent", accent2: "--accent2", accent_dim: "--accent-dim",
  gold: "--gold", green: "--green", red: "--red", purple: "--purple",
  text: "--text", text2: "--text2", text3: "--text3",
  row_a: "--row-a", row_b: "--row-b", row_sel: "--row-sel", row_hdr: "--row-hdr",
  sidebar_w: "--sidebar-w",
};
function applyTheme(name) {
  const theme = APP.bootstrap.themes[name];
  if (!theme) return;
  const root = document.documentElement.style;
  for (const [k, cssVar] of Object.entries(THEME_VAR_MAP)) {
    let val = theme[k];
    if (val === undefined) continue;
    if (k === "sidebar_w") val = `${val}px`;
    root.setProperty(cssVar, val);
  }
  APP.theme = name;
}
function buildThemeSelect() {
  const sel = document.getElementById("themeSelect");
  sel.innerHTML = "";
  APP.bootstrap.theme_names.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    if (name === APP.theme) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", async () => {
    const name = sel.value;
    applyTheme(name);
    try { await apiPost("/api/settings/theme", { theme: name }); } catch (e) { /* non-fatal */ }
  });
}

/* ==================== TOAST ==================== */
function toast(msg, kind = "info") {
  const colors = { success: "var(--green)", warn: "var(--gold)", error: "var(--red)", info: "var(--accent)" };
  const el = document.createElement("div");
  el.className = "toast";
  el.style.borderLeft = `4px solid ${colors[kind] || colors.info}`;
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 260);
  }, 2400);
}

/* ==================== NAV / TOPBAR ==================== */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layoutDashboard" },
  { id: "pajak_keluaran", label: "Pajak Keluaran", icon: "receipt" },
  { id: "doc_lain_masukan", label: "Doc Lain Masukan", icon: "fileDown" },
  { id: "spt_dokumen_lain", label: "SPT Dokumen Lain", icon: "bookOpen" },
  { divider: true },
  { id: "database", label: "Database", icon: "database" },
];
const PK_SUBTABS = [
  { id: "upload_mapping", label: "Upload & Mapping" },
  { id: "tpk", label: "Tabel Data Awal" },
  { id: "faktur", label: "Faktur & Detail" },
];
const DLM_SUBTABS = [
  { id: "upload_mapping", label: "Upload & Mapping" },
  { id: "tabel", label: "Tabel Data" },
];
const NAV_ICON_MAP = {
  dashboard: "layoutDashboard",
  pajak_keluaran: "receipt",
  doc_lain_masukan: "fileDown",
  spt_dokumen_lain: "bookOpen",
  database: "database",
};
function authSubscriptionAccess() {
  return (((APP.auth || {}).subscription || {}).access) || null;
}
function mergedSubscription(base) {
  const access = authSubscriptionAccess();
  if (!access) return base;
  return {
    ...(base || {}),
    ...access,
    plan: access.plan || (((APP.auth || {}).subscription || {}).plan) || (base || {}).plan,
  };
}
function isSubscriptionExpired() {
  const sub = (APP.state && APP.state.subscription) || {};
  return sub.status === "expired";
}
function buildNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  const locked = new Set(((APP.state && APP.state.subscription) || {}).locked_features || []);
  NAV_ITEMS.forEach((item) => {
    if (item.divider) {
      const d = document.createElement("div");
      d.className = "nav-divider";
      nav.appendChild(d);
      return;
    }
    const el = document.createElement("div");
    const isLocked = locked.has(item.id);
    el.className = "nav-item" + (APP.view === item.id ? " active" : "") + (isLocked ? " locked" : "");
    el.title = isLocked ? `${item.label} terkunci untuk package Anda saat ini` : item.label;
    el.innerHTML = `<span class="nav-icon">${icon(NAV_ICON_MAP[item.id] || item.icon)}</span><span class="nav-text">${item.label}</span>${isLocked ? `<span class="nav-lock">${icon("lock")}</span>` : ""}`;
    el.addEventListener("click", () => onNavClick(item.id));
    nav.appendChild(el);
  });
}
function onNavClick(id) {
  const locked = new Set(((APP.state && APP.state.subscription) || {}).locked_features || []);
  if (locked.has(id)) {
    const sub = (APP.state && APP.state.subscription) || {};
    showUpgradeModal({
      error: sub.status === "expired"
        ? "Masa berlangganan sudah habis. Perpanjang package untuk membuka kembali seluruh menu."
        : id === "doc_lain_masukan"
          ? "Doc Lain Masukan terkunci untuk paket Trial. Login dan pilih package berbayar untuk membuka fitur ini."
          : "SPT Dokumen Lain terkunci untuk paket Trial. Login dan pilih package berbayar untuk membuka fitur ini.",
      upgrade_required: true,
      feature_locked: sub.status !== "expired",
      subscription_expired: sub.status === "expired",
      limit: sub.limit || 10,
      pricing_url: sub.status === "expired" ? "/#pricing" : "/auth?plan=professional",
    });
    return;
  }
  if (id === "database") { openDatabaseModal(); return; }
  APP.view = id;
  render();
}
function statPill(label, value) {
  return `<div class="stat-pill"><div class="stat-value">${value}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
}
function trialStatPill(used) {
  const sub = (APP.state && APP.state.subscription) || { limit: 10 };
  if (sub.status === "active") {
    const limit = sub.limit ? `${used}/${sub.limit}` : "Unlimited";
    return `<button class="stat-pill trial-pill" id="trialUpgradePill" title="Kelola package"><div class="stat-value">${limit}</div><div class="stat-label">${escapeHtml(sub.plan || "Active")}</div></button>`;
  }
  if (sub.status === "expired") {
    return `<button class="stat-pill trial-pill expired" id="trialUpgradePill" title="Perpanjang package"><div class="stat-value">Expired</div><div class="stat-label">Subscription</div></button>`;
  }
  const limit = sub.limit || 10;
  return `<button class="stat-pill trial-pill" id="trialUpgradePill" title="Lihat pricing package"><div class="stat-value">${used}/${limit}</div><div class="stat-label">Trial Invoice</div></button>`;
}
function wireTrialPill() {
  const pill = document.getElementById("trialUpgradePill");
  if (pill) pill.addEventListener("click", () => { window.location.href = "/#pricing"; });
}
function refreshTopbar() {
  const st = APP.state;
  if (APP.view === "dashboard") {
    const sub = (st && st.subscription) || {};
    const status = sub.status === "active"
      ? `${icon("check", "status-icon")} Dashboard langganan aktif`
      : sub.status === "expired"
        ? `${icon("lock", "status-icon")} Masa berlangganan sudah habis`
        : `${icon("layoutDashboard", "status-icon")} Dashboard trial`;
    const used = sub.used || Math.max(
      (st.faktur_rows || []).length,
      ((st.dlm || {}).processed || []).length,
      ((st.sdl || {}).processed || []).length,
    );
    document.getElementById("statsFrame").innerHTML =
      statPill("Package", sub.plan || "Trial") +
      statPill("Status", sub.status || "trial") +
      trialStatPill(used);
    wireTrialPill();
    document.getElementById("statusLabel").innerHTML = status;
    return;
  }
  if (APP.view === "spt_dokumen_lain") {
    const sdl = st.sdl;
    const totalDoc = sdl.processed.length;
    document.getElementById("statsFrame").innerHTML =
      statPill("Total Dokumen", totalDoc) +
      statPill("Total DPP", fmtIdr((sdl.totals || {}).tax_base || 0)) +
      statPill("Total PPN", fmtIdr((sdl.totals || {}).vat || 0)) +
      trialStatPill(totalDoc);
    wireTrialPill();

    let status;
    if (!totalDoc) {
      status = `${icon("activity", "status-icon")} Siap &mdash; isi nominal PPN (VAT) untuk menambah dokumen`;
    } else {
      status = `${icon("check", "status-icon")} ${totalDoc} dokumen siap export`;
      if (sdl.tax_period_month) status += ` &mdash; Masa ${String(sdl.tax_period_month).padStart(2, "0")}/${sdl.tax_period_year}`;
    }
    document.getElementById("statusLabel").innerHTML = status;
    return;
  }
  if (APP.view === "doc_lain_masukan") {
    const dlm = st.dlm;
    const totalDoc = dlm.processed.length;
    document.getElementById("statsFrame").innerHTML =
      statPill("Total Dokumen", totalDoc) +
      statPill("Total DPP", fmtIdr((dlm.totals || {}).tax_base || 0)) +
      statPill("Total PPN", fmtIdr((dlm.totals || {}).vat || 0)) +
      trialStatPill(totalDoc);
    wireTrialPill();

    let status;
    if (!dlm.raw_headers.length) {
      status = `${icon("upload", "status-icon")} Siap &mdash; upload file Doc Lain Masukan untuk memulai`;
    } else if (!dlm.processed.length) {
      status = `${icon("settings", "status-icon")} File dimuat: ${dlm.raw_row_count} baris &mdash; lengkapi mapping lalu proses`;
    } else {
      status = `${icon("check", "status-icon")} Diproses: ${totalDoc} dokumen`;
    }
    document.getElementById("statusLabel").innerHTML = status;
    return;
  }

  const totalBaris = st.processed.length;
  const fakturUnik = st.faktur_rows.length;
  const duplikat = Object.keys(st.dup_map || {}).length;
  document.getElementById("statsFrame").innerHTML =
    statPill("Total Baris", totalBaris) +
    statPill("Faktur Unik", fakturUnik) +
    statPill("Duplikat", duplikat) +
    trialStatPill(fakturUnik);
  wireTrialPill();

  let status;
  if (!st.raw_headers.length) {
    status = "";
  } else if (!st.processed.length) {
    status = `${icon("settings", "status-icon")} File dimuat: ${st.raw_row_count} baris &mdash; lengkapi mapping lalu proses`;
  } else {
    status = `${icon("check", "status-icon")} Diproses: ${totalBaris} baris, ${fakturUnik} faktur unik`;
    if (duplikat) status += `, ${duplikat} faktur duplikat`;
  }
  document.getElementById("statusLabel").innerHTML = status;
}
function refreshFileLabel() {
  const st = APP.state;
  if (APP.view === "dashboard") {
    document.getElementById("fileLabel").textContent = "Dashboard: subscription & aktivitas";
    return;
  }
  if (APP.view === "spt_dokumen_lain") {
    document.getElementById("fileLabel").textContent = "Input manual (tanpa file)";
    return;
  }
  const fname = APP.view === "doc_lain_masukan" ? st.dlm.src_filename : st.src_filename;
  document.getElementById("fileLabel").textContent = fname ? `File: ${fname}` : "File: belum ada";
}
function refreshExportSection() {
  const el = document.getElementById("exportSection");
  if (APP.view === "dashboard") {
    el.innerHTML = "";
    return;
  }
  if (APP.view === "spt_dokumen_lain") {
    el.innerHTML = `
      <label class="side-label">${icon("fileDown")} EXPORT SPT LAIN</label>
      <button class="pill pill-teal pill-block" id="btnExportSdlXml">${icon("fileDown")} XML Coretax</button>
    `;
    el.querySelector("#btnExportSdlXml").addEventListener("click", exportSdlXml);
    return;
  }
  if (APP.view === "doc_lain_masukan") {
    el.innerHTML = `
      <label class="side-label">${icon("fileDown")} EXPORT DOC LAIN</label>
      <button class="pill pill-success pill-block" id="btnExportDlmXlsx">${icon("fileSpreadsheet")} XLSX</button>
      <button class="pill pill-teal pill-block" id="btnExportDlmXml">${icon("fileDown")} XML Coretax</button>
    `;
    el.querySelector("#btnExportDlmXlsx").addEventListener("click", exportDlmXlsx);
    el.querySelector("#btnExportDlmXml").addEventListener("click", exportDlmXml);
  } else {
    el.innerHTML = `
      <label class="side-label">${icon("fileDown")} EXPORT PAJAK</label>
      <button class="pill pill-success pill-block" id="btnExportXlsx">${icon("fileSpreadsheet")} XLSX</button>
      <button class="pill pill-teal pill-block" id="btnExportXml">${icon("fileDown")} XML Coretax</button>
    `;
    el.querySelector("#btnExportXlsx").addEventListener("click", exportXlsx);
    el.querySelector("#btnExportXml").addEventListener("click", exportXml);
  }
}

/* ==================== MODAL ==================== */
function openModal({ title, subtitle, bodyHtml, footerHtml, width, onMount, closeOnOverlay = true }) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "activeModalOverlay";
  const modal = document.createElement("div");
  modal.className = "modal";
  if (width) modal.style.width = width;
  modal.innerHTML = `
    <div class="modal-header">
      <div><div class="title">${title}</div>${subtitle ? `<div class="sub">${subtitle}</div>` : ""}</div>
      <button class="pill pill-ghost pill-sm icon-btn" id="modalCloseBtn" aria-label="Tutup">${icon("close")}</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
  `;
  overlay.appendChild(modal);
  document.getElementById("modal-root").appendChild(overlay);
  modal.querySelector("#modalCloseBtn").addEventListener("click", closeModal);
  if (closeOnOverlay) {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  }
  if (onMount) onMount(modal);
  return modal;
}
function closeModal() {
  const overlay = document.getElementById("activeModalOverlay");
  if (overlay) overlay.remove();
}
function showUpgradeModal(data = {}) {
  const limit = data.limit || 10;
  const attempted = data.attempted || limit + 1;
  const pricingUrl = data.pricing_url || "/#pricing";
  const bodyHtml = `
    <div class="upgrade-modal">
      <div class="upgrade-badge">Trial limit reached</div>
      <h3>Paket Trial hanya untuk ${limit} invoice.</h3>
      <p>${escapeHtml(data.error || `Anda mencoba memproses ${attempted} invoice. Upgrade package untuk melanjutkan proses data tanpa batas trial.`)}</p>
      <div class="upgrade-package-row">
        <div><b>Starter</b><span>Untuk volume kecil dan export rutin.</span></div>
        <div><b>Professional</b><span>Untuk tim pajak dengan database dan riwayat.</span></div>
        <div><b>Enterprise</b><span>Untuk volume tinggi dan kebutuhan khusus.</span></div>
      </div>
    </div>
  `;
  const footerHtml = `
    <button class="pill pill-ghost" id="upgradeLaterBtn">Nanti</button>
    <button class="pill pill-primary" id="upgradeNowBtn">${icon("arrowRight")} Lihat Pricing</button>
  `;
  openModal({
    title: "Upgrade Package",
    subtitle: "Trial package sudah mencapai batas proses invoice.",
    bodyHtml, footerHtml, width: "680px",
    onMount: (modal) => {
      modal.querySelector("#upgradeLaterBtn").addEventListener("click", closeModal);
      modal.querySelector("#upgradeNowBtn").addEventListener("click", () => {
        window.location.href = pricingUrl;
      });
    },
  });
}

/* ==================== CONTEXT MENU ==================== */
function showContextMenu(x, y, title, items) {
  closeContextMenu();
  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.id = "activeCtxMenu";
  let html = "";
  if (title) html += `<div class="ctx-title">${escapeHtml(title)}</div>`;
  items.forEach((it) => {
    if (it.sep) { html += `<div class="ctx-sep"></div>`; return; }
    html += `<div class="ctx-item${it.active ? " active" : ""}${it.danger ? " danger" : ""}">${it.active ? icon("check") : ""}${escapeHtml(it.label)}</div>`;
  });
  menu.innerHTML = html;
  document.getElementById("ctx-menu-root").appendChild(menu);
  menu.style.left = x + "px";
  menu.style.top = y + "px";
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = Math.max(4, window.innerWidth - rect.width - 8) + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = Math.max(4, window.innerHeight - rect.height - 8) + "px";
  const realItems = items.filter((it) => !it.sep);
  menu.querySelectorAll(".ctx-item").forEach((el, i) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      closeContextMenu();
      if (realItems[i].onClick) realItems[i].onClick();
    });
  });
}
function closeContextMenu() {
  const menu = document.getElementById("activeCtxMenu");
  if (menu) menu.remove();
}
document.addEventListener("click", (e) => {
  const menu = document.getElementById("activeCtxMenu");
  if (menu && !menu.contains(e.target)) closeContextMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeContextMenu(); closeModal(); }
});

/* ==================== TABLE HELPERS ==================== */
function thAlignClass(align) { return align === "left" ? "col-left" : align === "right" ? "col-right" : ""; }
function tdAlignClass(align) { return align === "left" ? "col-left" : align === "right" ? "col-right" : "col-center"; }
function colgroupHtml(cols) {
  return "<colgroup>" + cols.map((c) => `<col style="width:${c[1]}px">`).join("") + "</colgroup>";
}
function emptyHint(msg) {
  return `<div class="empty-hint">${escapeHtml(msg)}</div>`;
}
function getTableState(id, pageSize = 25) {
  if (!APP.tableStates[id]) {
    APP.tableStates[id] = {
      sorting: [],
      globalFilter: "",
      pagination: { pageIndex: 0, pageSize },
    };
  }
  return APP.tableStates[id];
}
function setTablePage(id, pageIndex) {
  const st = getTableState(id);
  st.pagination.pageIndex = Math.max(0, pageIndex);
}
function tableCellValue(row, col) {
  if (typeof col.cell === "function") return col.cell(row);
  if (typeof col.accessor === "function") return col.accessor(row);
  return row[col.accessor || col.id];
}
function tanColumn(col) {
  return {
    id: col.id,
    header: col.header,
    accessorFn: (row) => {
      if (typeof col.sortAccessor === "function") return col.sortAccessor(row);
      return tableCellValue(row, col);
    },
    enableSorting: col.sortable !== false,
    meta: col,
  };
}
function normalizePageState(state, totalPages) {
  const maxPage = Math.max(0, totalPages - 1);
  if (state.pagination.pageIndex > maxPage) state.pagination.pageIndex = maxPage;
}
function renderCellContent(value, html) {
  if (html) return String(value ?? "");
  return escapeHtml(value ?? "");
}
function renderDataTable(target, options) {
  const {
    id, columns, rows, empty = "Belum ada data.", pageSize = 25,
    searchPlaceholder = "Cari data...", getRowClass, onRowClick, onRowDblClick,
  } = options;
  const state = getTableState(id, pageSize);
  const data = rows || [];
  const core = APP.tableCore;
  const tanColumns = columns.map(tanColumn);
  let table = null;
  let pageRows = [];
  let totalRows = data.length;
  let filteredRows = data;

  if (core) {
    table = core.createTable({
      data,
      columns: tanColumns,
      state,
      globalFilterFn: "includesString",
      onSortingChange: (updater) => { state.sorting = core.functionalUpdate(updater, state.sorting); },
      onGlobalFilterChange: (updater) => { state.globalFilter = core.functionalUpdate(updater, state.globalFilter); state.pagination.pageIndex = 0; },
      onPaginationChange: (updater) => { state.pagination = core.functionalUpdate(updater, state.pagination); },
      getCoreRowModel: core.getCoreRowModel(),
      getFilteredRowModel: core.getFilteredRowModel(),
      getSortedRowModel: core.getSortedRowModel(),
      getPaginationRowModel: core.getPaginationRowModel(),
    });
    totalRows = table.getFilteredRowModel().rows.length;
    normalizePageState(state, table.getPageCount());
    pageRows = table.getPaginationRowModel().rows;
  } else {
    const q = state.globalFilter.trim().toLowerCase();
    filteredRows = q ? data.filter((row) => columns.some((col) => String(tableCellValue(row, col) ?? "").toLowerCase().includes(q))) : data.slice();
    const sort = state.sorting[0];
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      filteredRows.sort((a, b) => String(tableCellValue(a, col) ?? "").localeCompare(String(tableCellValue(b, col) ?? ""), undefined, { numeric: true, sensitivity: "base" }));
      if (sort.desc) filteredRows.reverse();
    }
    totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / state.pagination.pageSize));
    normalizePageState(state, totalPages);
    pageRows = filteredRows.slice(
      state.pagination.pageIndex * state.pagination.pageSize,
      (state.pagination.pageIndex + 1) * state.pagination.pageSize,
    ).map((original, index) => ({ original, index, getVisibleCells: () => columns.map((col) => ({ column: { columnDef: { meta: col } }, getValue: () => tableCellValue(original, col) })) }));
  }

  const pageCount = table ? table.getPageCount() : Math.max(1, Math.ceil(totalRows / state.pagination.pageSize));
  const start = totalRows ? state.pagination.pageIndex * state.pagination.pageSize + 1 : 0;
  const end = Math.min(totalRows, (state.pagination.pageIndex + 1) * state.pagination.pageSize);
  const headerHtml = columns.map((col) => {
    const sort = state.sorting[0];
    const active = sort && sort.id === col.id;
    const marker = active ? (sort.desc ? " v" : " ^") : "";
    return `<th class="${thAlignClass(col.align)}${col.sortable === false ? "" : " sortable"}" data-col="${escapeHtml(col.id)}" title="${escapeHtml(col.header)}">${escapeHtml(col.header)}${marker}</th>`;
  }).join("");
  const colgroup = "<colgroup>" + columns.map((col) => `<col style="width:${col.width || 140}px">`).join("") + "</colgroup>";
  const bodyHtml = pageRows.map((row, i) => {
    const original = row.original;
    const rowClass = getRowClass ? getRowClass(original, original.__idx ?? row.index, i) : (i % 2 === 0 ? "row-a" : "row-b");
    const cells = row.getVisibleCells().map((cell) => {
      const col = cell.column.columnDef.meta;
      return `<td class="${tdAlignClass(col.align)}">${renderCellContent(tableCellValue(original, col), col.html)}</td>`;
    }).join("");
    return `<tr class="${rowClass}" data-idx="${escapeHtml(original.__idx ?? row.index)}">${cells}</tr>`;
  }).join("");

  target.innerHTML = `
    <div class="table-shell">
      <div class="table-toolbar">
        <div class="table-search"><span>${icon("search")}</span><input class="x-input table-filter" value="${escapeHtml(state.globalFilter)}" placeholder="${escapeHtml(searchPlaceholder)}"></div>
        <div class="table-meta">${start}-${end} dari ${totalRows}</div>
      </div>
      <div class="table-scroll">
        ${totalRows ? `<table class="dtable">${colgroup}<thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>` : emptyHint(empty)}
      </div>
      <div class="table-pager">
        <button class="pill pill-ghost pill-sm icon-btn" data-page="first" aria-label="Halaman pertama">${icon("chevronsLeft")}</button>
        <button class="pill pill-ghost pill-sm icon-btn" data-page="prev" aria-label="Halaman sebelumnya">${icon("chevronLeft")}</button>
        <span>Halaman ${Math.min(state.pagination.pageIndex + 1, pageCount || 1)} / ${pageCount || 1}</span>
        <button class="pill pill-ghost pill-sm icon-btn" data-page="next" aria-label="Halaman berikutnya">${icon("chevronRight")}</button>
        <button class="pill pill-ghost pill-sm icon-btn" data-page="last" aria-label="Halaman terakhir">${icon("chevronsRight")}</button>
        <select class="x-select table-page-size">
          ${[10, 25, 50, 100].map((n) => `<option value="${n}"${state.pagination.pageSize === n ? " selected" : ""}>${n} / halaman</option>`).join("")}
        </select>
      </div>
    </div>
  `;
  const filter = target.querySelector(".table-filter");
  filter.addEventListener("input", () => {
    state.globalFilter = filter.value;
    state.pagination.pageIndex = 0;
    renderDataTable(target, options);
  });
  target.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const colId = th.dataset.col;
      const current = state.sorting[0];
      state.sorting = current && current.id === colId ? [{ id: colId, desc: !current.desc }] : [{ id: colId, desc: false }];
      renderDataTable(target, options);
    });
  });
  target.querySelector(".table-page-size").addEventListener("change", (e) => {
    state.pagination.pageSize = Number(e.target.value);
    state.pagination.pageIndex = 0;
    renderDataTable(target, options);
  });
  target.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.page;
      if (action === "first") setTablePage(id, 0);
      if (action === "prev") setTablePage(id, state.pagination.pageIndex - 1);
      if (action === "next") setTablePage(id, state.pagination.pageIndex + 1);
      if (action === "last") setTablePage(id, pageCount - 1);
      renderDataTable(target, options);
    });
  });
  target.querySelectorAll("tbody tr").forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    const original = data.find((r) => Number(r.__idx) === idx) || data[idx];
    if (onRowClick) tr.addEventListener("click", (e) => onRowClick(original, idx, e));
    if (onRowDblClick) tr.addEventListener("dblclick", (e) => onRowDblClick(original, idx, e));
  });
}

/* ==================== CENTRAL STATE / RENDER ==================== */
function applyState(newState) {
  if (newState) newState.subscription = mergedSubscription(newState.subscription);
  APP.state = newState;
  render();
}
function renderSubscriptionExpired(body) {
  body.innerHTML = `
    <section class="subscription-lock">
      <div class="upgrade-badge">Subscription expired</div>
      <h1>Masa berlangganan sudah habis</h1>
      <p>Semua menu aplikasi dikunci sementara. Perpanjang package untuk membuka kembali akses workspace dan melanjutkan proses dokumen.</p>
      <div class="subscription-lock-actions">
        <a class="btn primary" href="/#pricing">Perpanjang package</a>
        <a class="btn secondary" href="/auth?plan=professional">Login ulang</a>
      </div>
    </section>
  `;
}
function render() {
  buildNav();
  refreshTopbar();
  refreshFileLabel();
  refreshExportSection();
  const body = document.getElementById("body");
  body.innerHTML = "";
  if (isSubscriptionExpired()) {
    renderSubscriptionExpired(body);
    return;
  }
  if (APP.view === "dashboard") {
    renderDashboardView(body);
  } else if (APP.view === "pajak_keluaran") {
    renderPajakKeluaranView(body);
  } else if (APP.view === "doc_lain_masukan") {
    renderDocLainMasukanView(body);
  } else if (APP.view === "spt_dokumen_lain") {
    renderSptDokumenLainView(body);
  }
}

/* ==================== MODULE: PAJAK KELUARAN ==================== */
function renderPajakKeluaranView(body) {
  const wrap = document.createElement("div");
  wrap.className = "view-pajak-keluaran";
  const sub = APP.subView || "upload_mapping";
  wrap.innerHTML = `
    <div class="tab-bar pk-tab-bar">
      ${PK_SUBTABS.map((t) => `<button class="tab-btn${sub === t.id ? " active" : ""}" data-sub="${t.id}">${escapeHtml(t.label)}</button>`).join("")}
    </div>
    <div class="pk-content" id="pkContent"></div>
  `;
  body.appendChild(wrap);
  wrap.querySelectorAll(".pk-tab-bar .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      APP.subView = btn.dataset.sub;
      render();
    });
  });
  const content = wrap.querySelector("#pkContent");
  if (sub === "tpk") {
    renderTpkView(content);
  } else if (sub === "faktur") {
    renderFakturView(content);
  } else if (!APP.state.raw_headers.length) {
    renderUploadView(content);
  } else {
    renderMappingView(content);
  }
}

/* ==================== MODULE: DOC LAIN MASUKAN ==================== */
function renderDocLainMasukanView(body) {
  const wrap = document.createElement("div");
  wrap.className = "view-doc-lain-masukan";
  const sub = APP.dlmSubView || "upload_mapping";
  wrap.innerHTML = `
    <div class="tab-bar dlm-tab-bar">
      ${DLM_SUBTABS.map((t) => `<button class="tab-btn${sub === t.id ? " active" : ""}" data-sub="${t.id}">${escapeHtml(t.label)}</button>`).join("")}
    </div>
    <div class="dlm-content" id="dlmContent"></div>
  `;
  body.appendChild(wrap);
  wrap.querySelectorAll(".dlm-tab-bar .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      APP.dlmSubView = btn.dataset.sub;
      render();
    });
  });
  const content = wrap.querySelector("#dlmContent");
  if (sub === "tabel") {
    renderDlmTableView(content);
  } else if (!APP.state.dlm.raw_headers.length) {
    renderDlmUploadView(content);
  } else {
    renderDlmMappingView(content);
  }
}

/* ==================== VIEW: DASHBOARD ==================== */
function monthKeyFromDateText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  let match = text.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (match) return `${match[1]}-${match[2]}`;
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, "0")}`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
  return "";
}
function daysUntil(value) {
  if (!value) return null;
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}
function formatDateId(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function dashboardMetric(iconName, label, value, note = "") {
  return `
    <div class="dash-card">
      <div class="dash-card-head">${icon(iconName)}<span>${escapeHtml(label)}</span></div>
      <div class="dash-card-value">${escapeHtml(value)}</div>
      ${note ? `<div class="dash-card-label">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}
function dashboardInsights(data) {
  const st = APP.state || {};
  const sub = st.subscription || {};
  const authSub = ((APP.auth || {}).subscription || {});
  const items = data.items || [];
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const invoicesThisMonth = items.filter((it) => monthKeyFromDateText(it.tgl_faktur || it.exported_at) === currentMonth).length;
  const remainingDays = daysUntil(sub.expiresAt || authSub.expiresAt);
  const planName = sub.plan || authSub.plan || "Trial";
  const status = sub.status || authSub.status || "trial";
  const processedInvoices = (st.faktur_rows || []).length;
  const dlmDocs = ((st.dlm || {}).processed || []).length;
  const sdlDocs = ((st.sdl || {}).processed || []).length;
  const limit = sub.limit || 10;
  const quotaLabel = status === "active" && !limit ? "Unlimited" : `${processedInvoices}/${limit}`;
  return {
    planName,
    status,
    invoicesThisMonth,
    processedInvoices,
    dlmDocs,
    sdlDocs,
    quotaLabel,
    remainingDays,
    expiresAt: sub.expiresAt || authSub.expiresAt,
    exportedTotal: data.total || 0,
  };
}
function renderDashboardData(wrap, data) {
  const items = data.items || [];
  const insights = dashboardInsights(data);
  const remainingLabel = insights.status === "active"
    ? `${insights.remainingDays ?? "-"} hari`
    : insights.status === "expired" ? "Expired" : "Trial";
  const expiryNote = insights.status === "active"
    ? `Aktif sampai ${formatDateId(insights.expiresAt)}`
    : insights.status === "expired" ? "Perpanjang package untuk membuka akses" : "Upgrade untuk membuka semua menu";
  wrap.querySelector("#dashCards").innerHTML = `
    ${dashboardMetric("package", "Paket Langganan", insights.planName, insights.status)}
    ${dashboardMetric("calendar", "Sisa Waktu", remainingLabel, expiryNote)}
    ${dashboardMetric("receipt", "Invoice Bulan Ini", String(insights.invoicesThisMonth), "Berdasarkan tanggal faktur/export")}
    ${dashboardMetric("fileSpreadsheet", "Invoice Diproses", insights.quotaLabel, "Data aktif di workspace")}
    ${dashboardMetric("fileDown", "Doc Lain Masukan", String(insights.dlmDocs), "Dokumen yang sudah diproses")}
    ${dashboardMetric("bookOpen", "SPT Dokumen Lain", String(insights.sdlDocs), "Dokumen manual tersimpan di sesi")}
    ${dashboardMetric("archive", "Total Export XML", String(insights.exportedTotal), "Riwayat No. Faktur Coretax")}
  `;
  const tableEl = wrap.querySelector("#dashTableScroll");
  if (!items.length) {
    tableEl.innerHTML = emptyHint("Belum ada faktur yang di-export ke XML Coretax.");
    return;
  }
  renderDataTable(tableEl, {
    id: "dashboard",
    rows: items.map((it, i) => ({ ...it, no: i + 1, __idx: i })),
    pageSize: 25,
    searchPlaceholder: "Cari faktur, pembeli, atau file...",
    columns: [
      { id: "no", header: "No", accessor: "no", width: 54, align: "center" },
      { id: "no_faktur", header: "No. Faktur", accessor: "no_faktur", width: 170, align: "left" },
      { id: "tgl_faktur", header: "Tgl Faktur", accessor: "tgl_faktur", width: 120, align: "center" },
      { id: "nama_pembeli", header: "Nama Pembeli", accessor: "nama_pembeli", width: 240, align: "left" },
      { id: "source_file", header: "File Sumber", accessor: "source_file", width: 240, align: "left" },
      { id: "exported_at", header: "Waktu Export", accessor: "exported_at", width: 170, align: "center" },
    ],
  });
}
async function loadDashboardData(wrap) {
  wrap.querySelector("#dashCards").innerHTML = emptyHint("Memuat...");
  wrap.querySelector("#dashTableScroll").innerHTML = "";
  try {
    const data = await queryGet(["dashboard"], "/api/dashboard");
    renderDashboardData(wrap, data);
  } catch (err) {
    wrap.querySelector("#dashCards").innerHTML = "";
    wrap.querySelector("#dashTableScroll").innerHTML = emptyHint(err.message);
  }
}
function renderDashboardView(body) {
  const wrap = document.createElement("div");
  wrap.className = "view-dashboard";
  wrap.innerHTML = `
    <div class="subhdr">
      <span class="tt">Dashboard</span>
      <span class="spacer"></span>
      <div class="btn-row">
        <button class="pill pill-ghost pill-sm" id="btnRefreshDashboard">${icon("refresh")} Refresh</button>
        <button class="pill pill-danger pill-sm" id="btnClearHistory">${icon("trash")} Hapus Riwayat</button>
      </div>
    </div>
    <div class="dash-cards" id="dashCards"></div>
    <div class="dash-table-wrap"><div class="table-scroll" id="dashTableScroll"></div></div>
  `;
  body.appendChild(wrap);
  loadDashboardData(wrap);
  wrap.querySelector("#btnRefreshDashboard").addEventListener("click", () => loadDashboardData(wrap));
  wrap.querySelector("#btnClearHistory").addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/dashboard/reset");
      invalidateQueries(["dashboard"]);
      renderDashboardData(wrap, data);
      toast("Riwayat export dihapus.", "info");
    } catch (err) { toast(err.message, "error"); }
  });
}

/* ==================== VIEW: UPLOAD ==================== */
function pillStat(label, value) {
  return `<div class="pill-stat"><div class="v">${value}</div><div class="l">${escapeHtml(label)}</div></div>`;
}
function renderUploadView(body) {
  const wrap = document.createElement("div");
  wrap.className = "view-upload";
  wrap.innerHTML = `
    <div class="upload-card">
      <div class="upload-icon">${icon("upload")}</div>
      <h1>Pajak Keluaran Otomatis</h1>
      <p>Upload file Excel (.xls / .xlsx) hasil ekspor data penjualan untuk memulai.</p>
      <div class="hr"></div>
      <div class="btn-row">
        <button class="pill pill-primary" id="btnPickFile">${icon("upload")} Pilih File Excel</button>
        <button class="pill pill-ghost" id="btnPickTemplate">${icon("folderOpen")} Load Template</button>
      </div>
      <div class="hr"></div>
      <div class="upload-info">
        ${pillStat("Template", Object.keys(APP.bootstrap.templates || {}).length)}
        ${pillStat("Penjual", Object.keys(APP.bootstrap.db_penjual || {}).length)}
        ${pillStat("Pembeli", Object.keys(APP.bootstrap.db_pembeli || {}).length)}
      </div>
    </div>`;
  body.appendChild(wrap);
  wrap.querySelector("#btnPickFile").addEventListener("click", () => document.getElementById("fileInput").click());
  wrap.querySelector("#btnPickTemplate").addEventListener("click", () => openDatabaseModal("templates"));
}

/* ==================== DLM VIEW: UPLOAD ==================== */
function renderDlmUploadView(body) {
  const wrap = document.createElement("div");
  wrap.className = "view-upload";
  wrap.innerHTML = `
    <div class="upload-card">
      <div class="upload-icon">${icon("fileDown")}</div>
      <h1>Doc Lain Masukan</h1>
      <p>Upload file Excel (.xls / .xlsx) daftar faktur pembelian (mis. dari TikTok PTE LTD selaku Pemungut PPN PMSE) untuk memulai.</p>
      <div class="hr"></div>
      <div class="btn-row">
        <button class="pill pill-primary" id="btnDlmPickFile">${icon("upload")} Pilih File Excel</button>
      </div>
    </div>`;
  body.appendChild(wrap);
  wrap.querySelector("#btnDlmPickFile").addEventListener("click", () => document.getElementById("fileInputDlm").click());
}

/* ==================== MODULE: SPT DOKUMEN LAIN (input manual) ==================== */
function renderSptDokumenLainView(body) {
  renderSdlEntryView(body);
}
function parseNumLoose(val) {
  let s = String(val ?? "").replace(/[^\d,.\-]/g, "");
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    const parts = s.split(",");
    s = parts[parts.length - 1].length <= 2 ? parts.slice(0, -1).join("") + "." + parts[parts.length - 1] : s.replace(/,/g, "");
  } else if (s.includes(".")) {
    const parts = s.split(".");
    if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) s = parts.join("");
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
function sdlComputeFromVat(vat) {
  const other = Math.round(vat * 100 / 12 * 100) / 100;
  const taxBase = Math.round(other / 11 * 12 * 100) / 100;
  return { other, taxBase };
}

/* ==================== SDL VIEW: TABEL DATA ==================== */
function sdlRowClass(r, i, selected) {
  let cls = i % 2 === 0 ? "row-a" : "row-b";
  if (r.buyer_id_number && r.buyer_id_number.trim()) cls = "faktur-filled";
  if (selected) cls += " selected";
  return cls;
}
function renderSdlSummary() {
  const st = APP.state.sdl;
  const t = st.totals || {};
  const el = document.getElementById("sdlSummaryGrid");
  el.innerHTML =
    summaryPill("Dokumen", st.processed.length) +
    summaryPill("DPP", fmtIdr(t.tax_base || 0)) +
    summaryPill("DPP Lain", fmtIdr(t.other_tax_base || 0)) +
    summaryPill("PPN", fmtIdr(t.vat || 0));
}
function renderSdlTable() {
  const st = APP.state.sdl;
  if (!st.processed.length) {
    document.getElementById("sdlTableScroll").innerHTML =
      emptyHint('Belum ada data. Isi nominal PPN (VAT) di panel atas lalu klik "+ Tambah".');
    return;
  }
  const cols = APP.bootstrap.sdl_out_cols;
  const keys = ["no", "trx_code", "buyer_name", "buyer_id_opt", "buyer_id_number", "good_service_opt", "serial_no", "doc_date", "tax_base", "other_tax_base", "vat", "stlg", "info"];
  renderDataTable(document.getElementById("sdlTableScroll"), {
    id: "sdl",
    rows: st.processed.map((r, i) => ({ ...r, __idx: i })),
    pageSize: 25,
    searchPlaceholder: "Cari pembeli, no seri, atau tanggal...",
    getRowClass: (r, idx) => sdlRowClass(r, idx, APP.selSdl.has(idx)),
    onRowClick: (r, idx, e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selSdl.has(idx)) APP.selSdl.delete(idx); else APP.selSdl.add(idx);
      } else {
        APP.selSdl = new Set([idx]);
      }
      renderSdlTable();
    },
    onRowDblClick: (r, idx) => openSdlRowDialog(idx),
    columns: cols.map((c, i) => ({
      id: keys[i],
      header: c[0],
      width: c[1],
      align: c[2],
      accessor: (r) => {
        const v = r[keys[i]];
        if (["tax_base", "other_tax_base", "vat", "stlg"].includes(keys[i])) return fmtIdr(v);
        return v;
      },
      sortAccessor: (r) => r[keys[i]],
    })),
  });
}
function wireSdlEntryPanel() {
  const dbPembeli = APP.bootstrap.db_pembeli || {};
  const vatInput = document.getElementById("sdlAddVat");
  const preview = document.getElementById("sdlAddPreview");
  function refreshPreview() {
    const vat = parseNumLoose(vatInput.value);
    if (!vat) {
      preview.innerHTML = "DPP &amp; DPP Nilai Lain dihitung otomatis dari nominal PPN";
      return;
    }
    const { other, taxBase } = sdlComputeFromVat(vat);
    preview.innerHTML = `Nilai Jual (DPP): <b>${fmtIdr(taxBase)}</b> &middot; DPP Lain (11/12): <b>${fmtIdr(other)}</b>`;
  }
  vatInput.addEventListener("input", refreshPreview);
  refreshPreview();
  const addRow = async () => {
    const vat = vatInput.value.trim();
    const pembeliName = document.getElementById("sdlAddPembeli").value;
    const serialNo = document.getElementById("sdlAddSerial").value.trim();
    const docDate = document.getElementById("sdlAddDate").value;
    const missing = [];
    if (!vat) missing.push("PPN (VAT)");
    if (!pembeliName) missing.push("Pembeli");
    if (!serialNo) missing.push("No. Seri");
    if (!docDate) missing.push("Tgl");
    if (missing.length) { toast(`Wajib diisi dulu: ${missing.join(", ")}.`, "warn"); return; }
    const d = dbPembeli[pembeliName];
    const body = {
      vat,
      serial_no: serialNo,
      doc_date: docDate,
      buyer_name: d ? (d.nama || pembeliName) : pembeliName,
      buyer_id_number: d ? (d.npwp || "") : "",
    };
    try {
      const data = await apiPost("/api/sdl/rows", body);
      APP.selSdl = new Set();
      applyState(data.state);
      toast("Dokumen ditambahkan.", "success");
    } catch (err) { toast(err.message, "error"); }
  };
  document.getElementById("btnSdlAddRow").addEventListener("click", addRow);
  vatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addRow(); });
  document.getElementById("btnApplySdlDefaults").addEventListener("click", async () => {
    const scope = document.getElementById("applySdlDefaultsScope").value;
    if (scope === "sel" && APP.selSdl.size === 0) { toast("Pilih baris dulu (klik / Ctrl+klik).", "warn"); return; }
    const body = {
      scope,
      indices: Array.from(APP.selSdl),
      trx_code: document.getElementById("applySdlTrxCode").value,
      buyer_id_opt: document.getElementById("applySdlBuyerIdOpt").value,
      good_service_opt: document.getElementById("applySdlGoodService").value,
    };
    try {
      const data = await apiPost("/api/sdl/defaults", body);
      applyState(data.state);
      toast(`Kode diterapkan ke ${data.label}.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnSaveSdlCompany").addEventListener("click", async () => {
    const body = {
      npwp: document.getElementById("sdlCompanyNpwp").value.trim(),
      month: document.getElementById("sdlPeriodMonth").value,
      year: document.getElementById("sdlPeriodYear").value.trim(),
    };
    try {
      const data = await apiPost("/api/sdl/company", body);
      applyState(data.state);
      toast("Data SPT disimpan.", "success");
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderSdlEntryView(body) {
  const st = APP.state.sdl;
  const wrap = document.createElement("div");
  wrap.className = "view-faktur";
  const dbPembeli = APP.bootstrap.db_pembeli || {};
  const trxCodes = APP.bootstrap.sdl_trx_code_choices || [];
  const buyerIds = APP.bootstrap.sdl_buyer_id_choices || [];
  const goodServices = APP.bootstrap.sdl_good_service_choices || [];
  const firstRow = st.processed[0] || {};
  const today = new Date().toISOString().slice(0, 10);
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return `<option value="${m}"${Number(st.tax_period_month) === m ? " selected" : ""}>${String(m).padStart(2, "0")}</option>`;
  }).join("");
  wrap.innerHTML = `
    <div class="apply-panel">
      <div class="apply-top">
        <div class="apply-ctrl">
          <div class="hdr">TAMBAH DOKUMEN</div>
          <div class="apply-row">
            <span class="lbl">PPN (VAT)</span>
            <input class="x-input" id="sdlAddVat" placeholder="contoh: 146345149" style="width:160px;">
            <button class="pill pill-primary pill-sm" id="btnSdlAddRow">+ Tambah</button>
          </div>
          <div class="apply-row">
            <span class="lbl">Pembeli</span>
            <select id="sdlAddPembeli" class="x-select">
              <option value="">-- pilih pembeli (wajib) --</option>
              ${Object.keys(dbPembeli).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">No. Seri</span>
            <input class="x-input" id="sdlAddSerial" placeholder="PORT-001" style="width:110px;">
            <span class="lbl" style="width:auto;">Tgl</span>
            <input class="x-input" id="sdlAddDate" type="date" value="${today}" style="width:135px;">
          </div>
          <div class="apply-hint" id="sdlAddPreview"></div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-ctrl">
          <div class="hdr">KODE TRANSAKSI</div>
          <div class="apply-row">
            <span class="lbl">TrxCode</span>
            <select id="applySdlTrxCode" class="x-select">
              ${choiceOptions(trxCodes, firstRow.trx_code || "Normal")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">Buyer ID</span>
            <select id="applySdlBuyerIdOpt" class="x-select">
              ${choiceOptions(buyerIds, firstRow.buyer_id_opt || "NPWP")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">Brg/Jasa</span>
            <select id="applySdlGoodService" class="x-select">
              ${choiceOptions(goodServices, firstRow.good_service_opt || "A")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">Lingkup</span>
            <select id="applySdlDefaultsScope" class="x-select" style="width:140px;">
              <option value="all">Semua baris</option>
              <option value="sel">Baris terpilih</option>
            </select>
            <button class="pill pill-primary pill-sm" id="btnApplySdlDefaults">Terapkan</button>
          </div>
          <div class="apply-hint">Klik / Ctrl+klik baris untuk memilih. Dobel klik baris untuk edit / hapus.</div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-ctrl">
          <div class="hdr">SPT MASA</div>
          <div class="apply-row">
            <span class="lbl">NPWP (TIN)</span>
            <input class="x-input" id="sdlCompanyNpwp" maxlength="16" placeholder="16 digit" style="width:160px;" value="${escapeHtml(st.company_npwp || "")}">
          </div>
          <div class="apply-row">
            <span class="lbl">Masa</span>
            <select id="sdlPeriodMonth" class="x-select" style="width:70px;">${monthOptions}</select>
            <span class="lbl" style="width:auto;">Tahun</span>
            <input class="x-input" id="sdlPeriodYear" maxlength="4" style="width:70px;" value="${st.tax_period_year || ""}">
            <button class="pill pill-primary pill-sm" id="btnSaveSdlCompany">Simpan</button>
          </div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-summary">
          <div class="hdr">RINGKASAN TOTAL</div>
          <div class="summary-grid summary-grid-4" id="sdlSummaryGrid"></div>
        </div>
      </div>
    </div>
    <div class="dlm-table-wrap"><div class="table-scroll" id="sdlTableScroll"></div></div>
  `;
  body.appendChild(wrap);
  renderSdlSummary();
  renderSdlTable();
  wireSdlEntryPanel();
}

/* ==================== SDL DIALOG: ROW EDIT ==================== */
function openSdlRowDialog(idx) {
  const r = APP.state.sdl.processed[idx];
  const dbPembeli = APP.bootstrap.db_pembeli || {};
  const trxCodes = APP.bootstrap.sdl_trx_code_choices || [];
  const buyerIds = APP.bootstrap.sdl_buyer_id_choices || [];
  const goodServices = APP.bootstrap.sdl_good_service_choices || [];
  const bodyHtml = `
    <div class="modal-section">
      <div class="sec-title">Nilai (rumus PPN)</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Nominal PPN (VAT)</span>
          <input class="x-input" id="sdlFillVat" value="${escapeHtml(fmt(r.vat || 0))}">
        </div>
        <div class="form-row">
          <span class="flbl">&nbsp;</span>
          <span class="apply-hint" id="sdlFillPreview"></span>
        </div>
        <div class="form-row">
          <span class="flbl">PPnBM (STLG)</span>
          <input class="x-input" id="sdlFillStlg" value="${escapeHtml(fmt(r.stlg || 0))}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="sec-title">Pembeli</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Pilih dari Database</span>
          <select id="sdlFillPembeliSelect" class="x-select">
            <option value="">-- pilih --</option>
            ${Object.keys(dbPembeli).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">Nama Pembeli</span>
          <input class="x-input" id="sdlFillBuyerName" value="${escapeHtml(r.buyer_name || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">Jenis ID (BuyerIdOpt)</span>
          <select id="sdlFillBuyerIdOpt" class="x-select">
            ${choiceOptions(buyerIds, r.buyer_id_opt || "NPWP")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">NPWP/NIK Pembeli (16 digit)</span>
          <input class="x-input" id="sdlFillBuyerIdNumber" maxlength="16" value="${escapeHtml(r.buyer_id_number || "")}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="sec-title">Dokumen</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">No. Seri (SerialNo)</span>
          <input class="x-input" id="sdlFillSerial" value="${escapeHtml(r.serial_no || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">Tgl Transaksi</span>
          <input class="x-input" id="sdlFillDate" type="date" value="${escapeHtml(r.doc_date || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">Kode Transaksi (TrxCode)</span>
          <select id="sdlFillTrxCode" class="x-select">
            ${choiceOptions(trxCodes, r.trx_code || "Normal")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">Barang/Jasa (GoodServiceOpt)</span>
          <select id="sdlFillGoodService" class="x-select">
            ${choiceOptions(goodServices, r.good_service_opt || "A")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">Info</span>
          <input class="x-input" id="sdlFillInfo" value="${escapeHtml(r.info || "0")}">
        </div>
      </div>
    </div>
  `;
  const footerHtml = `
    <button class="pill pill-danger" id="sdlFillDeleteBtn">Hapus Baris</button>
    <button class="pill pill-ghost" id="sdlFillCancelBtn">Batal</button>
    <button class="pill pill-primary" id="sdlFillSaveBtn">Simpan</button>
  `;
  openModal({
    title: `Edit Dokumen — ${escapeHtml(r.serial_no || `Baris ${r.no}`)}`,
    subtitle: `Baris ${r.no}`,
    bodyHtml, footerHtml, width: "520px",
    onMount: (modal) => {
      const vatInput = modal.querySelector("#sdlFillVat");
      const preview = modal.querySelector("#sdlFillPreview");
      function refreshPreview() {
        const { other, taxBase } = sdlComputeFromVat(parseNumLoose(vatInput.value));
        preview.innerHTML = `Nilai Jual (DPP): <b>${fmtIdr(taxBase)}</b> &middot; DPP Lain (11/12): <b>${fmtIdr(other)}</b>`;
      }
      vatInput.addEventListener("input", refreshPreview);
      refreshPreview();
      modal.querySelector("#sdlFillCancelBtn").addEventListener("click", closeModal);
      modal.querySelector("#sdlFillPembeliSelect").addEventListener("change", (e) => {
        const d = dbPembeli[e.target.value];
        if (d) {
          modal.querySelector("#sdlFillBuyerName").value = d.nama || e.target.value;
          modal.querySelector("#sdlFillBuyerIdNumber").value = d.npwp || "";
        }
      });
      modal.querySelector("#sdlFillSaveBtn").addEventListener("click", () => submitSdlRow(idx));
      modal.querySelector("#sdlFillDeleteBtn").addEventListener("click", () => deleteSdlRow(idx));
    },
  });
}
async function submitSdlRow(idx) {
  const body = {
    vat: document.getElementById("sdlFillVat").value.trim(),
    stlg: document.getElementById("sdlFillStlg").value.trim(),
    buyer_name: document.getElementById("sdlFillBuyerName").value.trim(),
    buyer_id_opt: document.getElementById("sdlFillBuyerIdOpt").value.trim(),
    buyer_id_number: document.getElementById("sdlFillBuyerIdNumber").value.trim(),
    serial_no: document.getElementById("sdlFillSerial").value.trim(),
    doc_date: document.getElementById("sdlFillDate").value.trim(),
    trx_code: document.getElementById("sdlFillTrxCode").value.trim(),
    good_service_opt: document.getElementById("sdlFillGoodService").value.trim(),
    info: document.getElementById("sdlFillInfo").value.trim(),
  };
  try {
    const data = await apiPost(`/api/sdl/row/${idx}`, body);
    applyState(data.state);
    closeModal();
    toast("Dokumen diperbarui.", "success");
  } catch (err) { toast(err.message, "error"); }
}
async function deleteSdlRow(idx) {
  try {
    const data = await apiDelete(`/api/sdl/row/${idx}`);
    APP.selSdl = new Set();
    applyState(data.state);
    closeModal();
    toast("Baris dihapus.", "info");
  } catch (err) { toast(err.message, "error"); }
}

/* ==================== VIEW: MAPPING ==================== */
const FIELD_ICON_MAP = { person: "user", box: "package", hash: "hash", calendar: "calendar", tag: "tag" };
function fieldIcon(field) {
  const key = APP.bootstrap.field_icons[field];
  return FIELD_ICON_MAP[key] || "•";
}
function fieldRowHtml(field) {
  const assigned = APP.state.mapping[field] !== undefined;
  const pending = APP.pendingField === field;
  return `<div class="field-row${assigned ? " assigned" : ""}${pending ? " pending" : ""}" data-field="${escapeHtml(field)}">
    <span class="dot">${assigned ? icon("check") : fieldIcon(field)}</span>
    <span class="lbl">${escapeHtml(field)}</span>
  </div>`;
}
function renderMappingProgress() {
  const el = document.getElementById("mappingProgress");
  const fields = APP.bootstrap.tpk_fields;
  const done = fields.filter((f) => APP.state.mapping[f] !== undefined).length;
  const cls = done === fields.length ? "done" : (done > 0 ? "partial" : "");
  el.innerHTML = `<div class="pt"><span class="count ${cls}">${done}</span><span class="lbl2">/ ${fields.length} field terisi</span></div>`;
}
function renderMappingTable() {
  const st = APP.state;
  const headers = st.raw_headers;
  const rows = st.raw_preview;
  const reverseMap = {};
  for (const [field, idx] of Object.entries(st.mapping)) reverseMap[idx] = field;

  const visibleIdx = headers
    .map((h, idx) => idx)
    .filter((idx) => headers[idx].trim() !== "" || reverseMap[idx] !== undefined);

  let html = '<table class="dtable">';
  html += colgroupHtml(visibleIdx.map(() => ["", 150]));
  html += "<thead><tr>";
  visibleIdx.forEach((idx) => {
    const h = headers[idx];
    const assignedField = reverseMap[idx];
    html += `<th class="assignable${assignedField ? " assigned-col" : ""}" data-col="${idx}" title="${escapeHtml(h)}">
      ${escapeHtml(h || "(kosong)")}${assignedField ? `<br><span style="font-size:9px;">&rarr; ${escapeHtml(assignedField)}</span>` : ""}
    </th>`;
  });
  html += "</tr></thead><tbody>";
  rows.forEach((row, ri) => {
    html += `<tr class="${ri % 2 === 0 ? "row-a" : "row-b"}">`;
    visibleIdx.forEach((ci) => {
      html += `<td class="col-left">${escapeHtml(row[ci] ?? "")}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";

  const scroll = document.getElementById("mappingTableScroll");
  scroll.innerHTML = `<div class="table-scroll">${html}</div>`;

  scroll.querySelectorAll("th.assignable").forEach((th) => {
    const idx = parseInt(th.dataset.col, 10);
    th.addEventListener("click", (e) => onColumnHeaderClick(e, idx));
    th.addEventListener("contextmenu", (e) => { e.preventDefault(); onColumnHeaderClick(e, idx, true); });
  });
}
function onColumnHeaderClick(e, colIdx, forceMenu) {
  if (APP.pendingField && !forceMenu) {
    setMapping(APP.pendingField, colIdx);
    return;
  }
  const items = APP.bootstrap.tpk_fields.map((f) => ({
    label: f,
    active: APP.state.mapping[f] === colIdx,
    onClick: () => setMapping(f, colIdx),
  }));
  const assignedField = Object.keys(APP.state.mapping).find((f) => APP.state.mapping[f] === colIdx);
  if (assignedField) {
    items.push({ sep: true });
    items.push({ label: "Hapus assignment", danger: true, onClick: () => removeMapping(assignedField) });
  }
  showContextMenu(e.clientX, e.clientY, "Assign ke field:", items);
}
async function setMapping(field, colIdx) {
  const newMapping = { ...APP.state.mapping };
  for (const f of Object.keys(newMapping)) {
    if (newMapping[f] === colIdx && f !== field) delete newMapping[f];
  }
  newMapping[field] = colIdx;
  APP.pendingField = null;
  try {
    const data = await apiPost("/api/mapping", { mapping: newMapping });
    APP.state.mapping = data.mapping;
    render();
  } catch (err) { toast(err.message, "error"); }
}
async function removeMapping(field) {
  const newMapping = { ...APP.state.mapping };
  delete newMapping[field];
  APP.pendingField = null;
  try {
    const data = await apiPost("/api/mapping", { mapping: newMapping });
    APP.state.mapping = data.mapping;
    render();
  } catch (err) { toast(err.message, "error"); }
}
function wireMappingFieldRows() {
  document.querySelectorAll(".field-row").forEach((row) => {
    row.addEventListener("click", () => {
      const field = row.dataset.field;
      APP.pendingField = APP.pendingField === field ? null : field;
      render();
    });
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const field = row.dataset.field;
      if (APP.state.mapping[field] !== undefined) removeMapping(field);
    });
  });
}
function wireMappingButtons() {
  const fields = APP.bootstrap.tpk_fields;
  const allAssigned = fields.every((f) => APP.state.mapping[f] !== undefined);
  const btnProcess = document.getElementById("btnProcessData");
  btnProcess.disabled = !allAssigned;
  btnProcess.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/process");
      applyState(data.state);
      APP.subView = "tpk";
      render();
      toast("Data berhasil diproses.", "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnResetMapping").addEventListener("click", async () => {
    APP.pendingField = null;
    try {
      const data = await apiPost("/api/mapping", { mapping: {} });
      APP.state.mapping = data.mapping;
      render();
      toast("Mapping direset.", "info");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnLoadTemplate").addEventListener("click", () => openDatabaseModal("templates"));
  document.getElementById("btnSaveTemplate").addEventListener("click", openSaveTemplateModal);
  document.getElementById("btnGantiFile").addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/reset");
      APP.pendingField = null;
      applyState(data.state);
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderMappingView(body) {
  const st = APP.state;
  const wrap = document.createElement("div");
  wrap.className = "view-mapping";

  const left = document.createElement("div");
  left.className = "mapping-left";
  left.innerHTML = `
    <div class="lhdr"><span class="ic">${icon("settings")}</span><span class="tt">Mapping Kolom</span></div>
    <div class="mapping-fields">
      <div class="hint">Klik salah satu field di bawah, lalu klik kolom yang sesuai pada tabel kanan. Atau klik langsung kolom untuk memilih dari daftar.</div>
      ${APP.bootstrap.tpk_fields.map((f) => fieldRowHtml(f)).join("")}
    </div>
    <div class="hr"></div>
    <div class="mapping-progress" id="mappingProgress"></div>
    <div class="hr"></div>
    <div style="padding:12px 16px; display:flex; flex-direction:column; gap:6px;">
      <button class="pill pill-primary pill-block" id="btnProcessData">${icon("play")} Proses Data</button>
      <button class="pill pill-ghost pill-block" id="btnResetMapping">${icon("refresh")} Reset Mapping</button>
      <button class="pill pill-ghost pill-block" id="btnLoadTemplate">${icon("folderOpen")} Load Template</button>
      <button class="pill pill-ghost pill-block" id="btnSaveTemplate">${icon("save")} Save Template</button>
    </div>
  `;

  const right = document.createElement("div");
  right.className = "mapping-right";
  right.innerHTML = `
    <div class="rhdr">
      <span class="tt">Pratinjau Data Mentah</span>
      <span>&middot; ${st.raw_row_count} baris &middot; ${escapeHtml(st.src_filename)}</span>
      <span class="spacer" style="flex:1;"></span>
      <button class="pill pill-ghost pill-sm" id="btnGantiFile">${icon("refresh")} Ganti File</button>
    </div>
    <div class="mapping-table-wrap" id="mappingTableScroll"></div>
  `;

  wrap.appendChild(left);
  wrap.appendChild(right);
  body.appendChild(wrap);

  renderMappingProgress();
  renderMappingTable();
  wireMappingFieldRows();
  wireMappingButtons();
}

/* ==================== DLM VIEW: MAPPING ==================== */
function dlmFieldIcon(field) {
  const key = APP.bootstrap.dlm_field_icons[field];
  return FIELD_ICON_MAP[key] || "•";
}
fieldIcon = function modernFieldIcon(field) {
  const key = APP.bootstrap.field_icons[field];
  const modern = { person: "user", box: "package", hash: "hash", calendar: "calendar", tag: "tag" };
  return icon(modern[key] || "tag");
};
dlmFieldIcon = function modernDlmFieldIcon(field) {
  const key = APP.bootstrap.dlm_field_icons[field];
  const modern = { person: "user", box: "package", hash: "hash", calendar: "calendar", tag: "tag" };
  return icon(modern[key] || "tag");
};
function dlmFieldRowHtml(field) {
  const assigned = APP.state.dlm.mapping[field] !== undefined;
  const pending = APP.pendingDlmField === field;
  return `<div class="field-row${assigned ? " assigned" : ""}${pending ? " pending" : ""}" data-field="${escapeHtml(field)}">
    <span class="dot">${assigned ? icon("check") : dlmFieldIcon(field)}</span>
    <span class="lbl">${escapeHtml(field)}</span>
  </div>`;
}
function renderDlmMappingProgress() {
  const el = document.getElementById("dlmMappingProgress");
  const fields = APP.bootstrap.dlm_fields;
  const done = fields.filter((f) => APP.state.dlm.mapping[f] !== undefined).length;
  const cls = done === fields.length ? "done" : (done > 0 ? "partial" : "");
  el.innerHTML = `<div class="pt"><span class="count ${cls}">${done}</span><span class="lbl2">/ ${fields.length} field terisi</span></div>`;
}
function renderDlmMappingTable() {
  const st = APP.state.dlm;
  const headers = st.raw_headers;
  const rows = st.raw_preview;
  const reverseMap = {};
  for (const [field, idx] of Object.entries(st.mapping)) reverseMap[idx] = field;

  const visibleIdx = headers
    .map((h, idx) => idx)
    .filter((idx) => headers[idx].trim() !== "" || reverseMap[idx] !== undefined);

  let html = '<table class="dtable">';
  html += colgroupHtml(visibleIdx.map(() => ["", 150]));
  html += "<thead><tr>";
  visibleIdx.forEach((idx) => {
    const h = headers[idx];
    const assignedField = reverseMap[idx];
    html += `<th class="assignable${assignedField ? " assigned-col" : ""}" data-col="${idx}" title="${escapeHtml(h)}">
      ${escapeHtml(h || "(kosong)")}${assignedField ? `<br><span style="font-size:9px;">&rarr; ${escapeHtml(assignedField)}</span>` : ""}
    </th>`;
  });
  html += "</tr></thead><tbody>";
  rows.forEach((row, ri) => {
    html += `<tr class="${ri % 2 === 0 ? "row-a" : "row-b"}">`;
    visibleIdx.forEach((ci) => {
      html += `<td class="col-left">${escapeHtml(row[ci] ?? "")}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";

  const scroll = document.getElementById("dlmMappingTableScroll");
  scroll.innerHTML = `<div class="table-scroll">${html}</div>`;

  scroll.querySelectorAll("th.assignable").forEach((th) => {
    const idx = parseInt(th.dataset.col, 10);
    th.addEventListener("click", (e) => onDlmColumnHeaderClick(e, idx));
    th.addEventListener("contextmenu", (e) => { e.preventDefault(); onDlmColumnHeaderClick(e, idx, true); });
  });
}
function onDlmColumnHeaderClick(e, colIdx, forceMenu) {
  if (APP.pendingDlmField && !forceMenu) {
    setDlmMapping(APP.pendingDlmField, colIdx);
    return;
  }
  const items = APP.bootstrap.dlm_fields.map((f) => ({
    label: f,
    active: APP.state.dlm.mapping[f] === colIdx,
    onClick: () => setDlmMapping(f, colIdx),
  }));
  const assignedField = Object.keys(APP.state.dlm.mapping).find((f) => APP.state.dlm.mapping[f] === colIdx);
  if (assignedField) {
    items.push({ sep: true });
    items.push({ label: "Hapus assignment", danger: true, onClick: () => removeDlmMapping(assignedField) });
  }
  showContextMenu(e.clientX, e.clientY, "Assign ke field:", items);
}
async function setDlmMapping(field, colIdx) {
  const newMapping = { ...APP.state.dlm.mapping };
  for (const f of Object.keys(newMapping)) {
    if (newMapping[f] === colIdx && f !== field) delete newMapping[f];
  }
  newMapping[field] = colIdx;
  APP.pendingDlmField = null;
  try {
    const data = await apiPost("/api/dlm/mapping", { mapping: newMapping });
    APP.state.dlm.mapping = data.mapping;
    render();
  } catch (err) { toast(err.message, "error"); }
}
async function removeDlmMapping(field) {
  const newMapping = { ...APP.state.dlm.mapping };
  delete newMapping[field];
  APP.pendingDlmField = null;
  try {
    const data = await apiPost("/api/dlm/mapping", { mapping: newMapping });
    APP.state.dlm.mapping = data.mapping;
    render();
  } catch (err) { toast(err.message, "error"); }
}
function wireDlmMappingFieldRows() {
  document.querySelectorAll("#dlmContent .field-row").forEach((row) => {
    row.addEventListener("click", () => {
      const field = row.dataset.field;
      APP.pendingDlmField = APP.pendingDlmField === field ? null : field;
      render();
    });
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const field = row.dataset.field;
      if (APP.state.dlm.mapping[field] !== undefined) removeDlmMapping(field);
    });
  });
}
function wireDlmMappingButtons() {
  const fields = APP.bootstrap.dlm_fields;
  const allAssigned = fields.every((f) => APP.state.dlm.mapping[f] !== undefined);
  const btnProcess = document.getElementById("btnDlmProcessData");
  btnProcess.disabled = !allAssigned;
  btnProcess.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/dlm/process");
      applyState(data.state);
      APP.dlmSubView = "tabel";
      render();
      toast("Data berhasil diproses.", "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnDlmResetMapping").addEventListener("click", async () => {
    APP.pendingDlmField = null;
    try {
      const data = await apiPost("/api/dlm/mapping", { mapping: {} });
      APP.state.dlm.mapping = data.mapping;
      render();
      toast("Mapping direset.", "info");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnDlmLoadTemplate").addEventListener("click", () => openDatabaseModal("dlm_templates"));
  document.getElementById("btnDlmSaveTemplate").addEventListener("click", openSaveDlmTemplateModal);
  document.getElementById("btnDlmGantiFile").addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/dlm/reset");
      APP.pendingDlmField = null;
      applyState(data.state);
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderDlmMappingView(body) {
  const st = APP.state.dlm;
  const wrap = document.createElement("div");
  wrap.className = "view-mapping";

  const left = document.createElement("div");
  left.className = "mapping-left";
  left.innerHTML = `
    <div class="lhdr"><span class="ic">${icon("settings")}</span><span class="tt">Mapping Kolom</span></div>
    <div class="mapping-fields">
      <div class="hint">Klik salah satu field di bawah, lalu klik kolom yang sesuai pada tabel kanan. Atau klik langsung kolom untuk memilih dari daftar.</div>
      ${APP.bootstrap.dlm_fields.map((f) => dlmFieldRowHtml(f)).join("")}
    </div>
    <div class="hr"></div>
    <div class="mapping-progress" id="dlmMappingProgress"></div>
    <div class="hr"></div>
    <div style="padding:12px 16px; display:flex; flex-direction:column; gap:6px;">
      <button class="pill pill-primary pill-block" id="btnDlmProcessData">${icon("play")} Proses Data</button>
      <button class="pill pill-ghost pill-block" id="btnDlmResetMapping">${icon("refresh")} Reset Mapping</button>
      <button class="pill pill-ghost pill-block" id="btnDlmLoadTemplate">${icon("folderOpen")} Load Template</button>
      <button class="pill pill-ghost pill-block" id="btnDlmSaveTemplate">${icon("save")} Save Template</button>
    </div>
  `;

  const right = document.createElement("div");
  right.className = "mapping-right";
  right.innerHTML = `
    <div class="rhdr">
      <span class="tt">Pratinjau Data Mentah</span>
      <span>&middot; ${st.raw_row_count} baris &middot; ${escapeHtml(st.src_filename)}</span>
      <span class="spacer" style="flex:1;"></span>
      <button class="pill pill-ghost pill-sm" id="btnDlmGantiFile">${icon("refresh")} Ganti File</button>
    </div>
    <div class="mapping-table-wrap" id="dlmMappingTableScroll"></div>
  `;

  wrap.appendChild(left);
  wrap.appendChild(right);
  body.appendChild(wrap);

  renderDlmMappingProgress();
  renderDlmMappingTable();
  wireDlmMappingFieldRows();
  wireDlmMappingButtons();
}

/* ==================== DLM VIEW: TABEL DATA ==================== */
function isoToDdMmYyyy(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function dlmRowClass(r, i, selected) {
  let cls = i % 2 === 0 ? "row-a" : "row-b";
  if (r.seller_tin && r.seller_tin.trim()) cls = "faktur-filled";
  if (selected) cls += " selected";
  return cls;
}
function renderDlmSummary() {
  const st = APP.state.dlm;
  const t = st.totals || {};
  const el = document.getElementById("dlmSummaryGrid");
  el.innerHTML =
    summaryPill("Dokumen", st.processed.length) +
    summaryPill("DPP", fmtIdr(t.tax_base || 0)) +
    summaryPill("PPN", fmtIdr(t.vat || 0)) +
    summaryPill("PPnBM", fmtIdr(t.stlg || 0));
}
function renderDlmTable() {
  const st = APP.state.dlm;
  const cols = APP.bootstrap.dlm_out_cols;
  const keys = ["no", "doc_no", "doc_date", "trx_type", "trx_code", "trx_document", "tax_period_month", "tax_period_year", "tax_base", "vat", "stlg", "seller_tin", "seller_name"];
  renderDataTable(document.getElementById("dlmTableScroll"), {
    id: "dlm",
    rows: st.processed.map((r, i) => ({ ...r, __idx: i })),
    pageSize: 25,
    searchPlaceholder: "Cari dokumen, pemasok, atau NPWP...",
    getRowClass: (r, idx) => dlmRowClass(r, idx, APP.selDlm.has(idx)),
    onRowClick: (r, idx, e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selDlm.has(idx)) APP.selDlm.delete(idx); else APP.selDlm.add(idx);
      } else {
        APP.selDlm = new Set([idx]);
      }
      renderDlmTable();
    },
    onRowDblClick: (r, idx) => openDlmRowDialog(idx),
    columns: cols.map((c, i) => ({
      id: keys[i],
      header: c[0],
      width: c[1],
      align: c[2],
      accessor: (r) => {
        const key = keys[i];
        if (key === "doc_date") return isoToDdMmYyyy(r.doc_date);
        if (["tax_base", "vat", "stlg"].includes(key)) return fmtIdr(r[key]);
        return r[key];
      },
      sortAccessor: (r) => r[keys[i]],
    })),
  });
}
function choiceCode(value) {
  return String(value || "").split(" - ", 1)[0];
}
function choiceOptions(choices, selected) {
  const sel = String(selected || "");
  return (choices || []).map((choice) => {
    const code = choiceCode(choice);
    return `<option value="${escapeHtml(code)}"${code === sel ? " selected" : ""}>${escapeHtml(choice)}</option>`;
  }).join("");
}
function wireDlmApplyPanel() {
  const dbPemasok = APP.bootstrap.db_pemasok || {};
  const pemasokSel = document.getElementById("applyPemasokSelect");
  const npwpView = document.getElementById("applyPemasokNpwp");
  function refreshPemasokNpwp() {
    const d = dbPemasok[pemasokSel.value] || {};
    const npwp = (d.npwp || "").trim();
    npwpView.textContent = npwp || "—";
    npwpView.classList.toggle("is-empty", !npwp);
  }
  pemasokSel.addEventListener("change", refreshPemasokNpwp);
  refreshPemasokNpwp();
  document.getElementById("btnApplyPemasok").addEventListener("click", async () => {
    const name = document.getElementById("applyPemasokSelect").value;
    const scope = document.getElementById("applyPemasokScope").value;
    if (!name) { toast("Pilih nama pemasok dari dropdown.", "warn"); return; }
    if (scope === "sel" && APP.selDlm.size === 0) { toast("Pilih baris dulu (klik / Ctrl+klik).", "warn"); return; }
    try {
      const data = await apiPost("/api/dlm/bulk_apply", { scope, indices: Array.from(APP.selDlm), name });
      applyState(data.state);
      toast(`Pemasok "${data.name}" diterapkan ke ${data.label}.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnApplyDlmTrx").addEventListener("click", async () => {
    const scope = document.getElementById("applyDlmTrxScope").value;
    if (scope === "sel" && APP.selDlm.size === 0) { toast("Pilih baris dulu (klik / Ctrl+klik).", "warn"); return; }
    const body = {
      scope,
      indices: Array.from(APP.selDlm),
      trx_type: document.getElementById("applyDlmTrxType").value,
      trx_code: document.getElementById("applyDlmTrxCode").value,
      trx_document: document.getElementById("applyDlmTrxDocument").value,
    };
    try {
      const data = await apiPost("/api/dlm/trx_defaults", body);
      applyState(data.state);
      toast(`Kode transaksi diterapkan ke ${data.label}.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnSaveDlmCompany").addEventListener("click", async () => {
    const npwp = document.getElementById("dlmCompanyNpwp").value.trim();
    try {
      const data = await apiPost("/api/dlm/company", { npwp });
      applyState(data.state);
      toast("NPWP perusahaan disimpan.", "success");
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderDlmTableView(body) {
  const st = APP.state.dlm;
  const wrap = document.createElement("div");
  wrap.className = "view-faktur";
  if (!st.processed.length) {
    wrap.innerHTML = emptyHint('Belum ada data. Upload file dan proses data terlebih dahulu di tab "Upload & Mapping".');
    body.appendChild(wrap);
    return;
  }
  const dbPemasok = APP.bootstrap.db_pemasok || {};
  const trxTypes = APP.bootstrap.dlm_trx_type_choices || [];
  const trxDetails = APP.bootstrap.dlm_trx_detail_choices || [];
  const trxDocs = APP.bootstrap.dlm_trx_doc_choices || [];
  const firstRow = st.processed[0] || {};
  wrap.innerHTML = `
    <div class="apply-panel">
      <div class="apply-top">
        <div class="apply-ctrl">
          <div class="hdr">TERAPKAN DARI DATABASE</div>
          <div class="apply-row">
            <span class="lbl">Pemasok</span>
            <select id="applyPemasokSelect" class="x-select">
              <option value="">-- pilih pemasok --</option>
              ${Object.keys(dbPemasok).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">NPWP</span>
            <span id="applyPemasokNpwp" class="apply-npwp">&mdash;</span>
          </div>
          <div class="apply-row">
            <span class="lbl">Lingkup</span>
            <select id="applyPemasokScope" class="x-select" style="width:140px;">
              <option value="all">Semua baris</option>
              <option value="sel">Baris terpilih</option>
            </select>
            <button class="pill pill-primary pill-sm" id="btnApplyPemasok">Terapkan</button>
          </div>
          <div class="apply-hint">Klik / Ctrl+klik baris pada tabel untuk memilih "Baris terpilih". Dobel klik baris untuk edit detail.</div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-ctrl">
          <div class="hdr">KODE TRANSAKSI</div>
          <div class="apply-row">
            <span class="lbl">TrxType</span>
            <select id="applyDlmTrxType" class="x-select">
              ${choiceOptions(trxTypes, firstRow.trx_type || "04")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">TrxCode</span>
            <select id="applyDlmTrxCode" class="x-select">
              ${choiceOptions(trxDetails, firstRow.trx_code || "01")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">TrxDoc</span>
            <select id="applyDlmTrxDocument" class="x-select">
              ${choiceOptions(trxDocs, firstRow.trx_document || "8")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">Lingkup</span>
            <select id="applyDlmTrxScope" class="x-select" style="width:140px;">
              <option value="all">Semua baris</option>
              <option value="sel">Baris terpilih</option>
            </select>
            <button class="pill pill-primary pill-sm" id="btnApplyDlmTrx">Terapkan</button>
          </div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-ctrl">
          <div class="hdr">NPWP PERUSAHAAN (TIN)</div>
          <div class="apply-row">
            <input class="x-input" id="dlmCompanyNpwp" maxlength="16" placeholder="16 digit" style="width:160px;" value="${escapeHtml(st.company_npwp || "")}">
            <button class="pill pill-primary pill-sm" id="btnSaveDlmCompany">Simpan</button>
          </div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-summary">
          <div class="hdr">RINGKASAN TOTAL</div>
          <div class="summary-grid summary-grid-4" id="dlmSummaryGrid"></div>
        </div>
      </div>
    </div>
    <div class="dlm-table-wrap"><div class="table-scroll" id="dlmTableScroll"></div></div>
  `;
  body.appendChild(wrap);
  renderDlmSummary();
  renderDlmTable();
  wireDlmApplyPanel();
}

/* ==================== DLM DIALOG: ROW EDIT ==================== */
function openDlmRowDialog(idx) {
  const r = APP.state.dlm.processed[idx];
  const dbPemasok = APP.bootstrap.db_pemasok || {};
  const trxTypes = APP.bootstrap.dlm_trx_type_choices || [];
  const trxDetails = APP.bootstrap.dlm_trx_detail_choices || [];
  const trxDocs = APP.bootstrap.dlm_trx_doc_choices || [];
  const bodyHtml = `
    <div class="modal-section">
      <div class="sec-title">Pemasok</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Pilih dari Database</span>
          <select id="dlmFillPemasokSelect" class="x-select">
            <option value="">-- pilih --</option>
            ${Object.keys(dbPemasok).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">Nama Pemasok</span>
          <input class="x-input" id="dlmFillSellerName" value="${escapeHtml(r.seller_name || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">NPWP Pemasok (16 digit)</span>
          <input class="x-input" id="dlmFillSellerTin" maxlength="16" value="${escapeHtml(r.seller_tin || "")}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="sec-title">Dokumen</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Jenis Transaksi (TrxType)</span>
          <select id="dlmFillTrxType" class="x-select">
            ${choiceOptions(trxTypes, r.trx_type || "04")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">Kode Transaksi (TrxCode)</span>
          <select id="dlmFillTrxCode" class="x-select">
            ${choiceOptions(trxDetails, r.trx_code || "01")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">Jenis Dokumen (TrxDocument)</span>
          <select id="dlmFillTrxDocument" class="x-select">
            ${choiceOptions(trxDocs, r.trx_document || "8")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">PPnBM (STLG)</span>
          <input class="x-input" id="dlmFillStlg" value="${escapeHtml(fmt(r.stlg || 0))}">
        </div>
      </div>
    </div>
  `;
  const footerHtml = `
    <button class="pill pill-ghost" id="dlmFillCancelBtn">Batal</button>
    <button class="pill pill-primary" id="dlmFillSaveBtn">Simpan</button>
  `;
  openModal({
    title: `Edit Dokumen — ${escapeHtml(r.doc_no)}`,
    subtitle: `Baris ${r.no}`,
    bodyHtml, footerHtml, width: "520px",
    onMount: (modal) => {
      modal.querySelector("#dlmFillCancelBtn").addEventListener("click", closeModal);
      modal.querySelector("#dlmFillPemasokSelect").addEventListener("change", (e) => {
        const d = dbPemasok[e.target.value];
        if (d) {
          modal.querySelector("#dlmFillSellerName").value = d.nama || e.target.value;
          modal.querySelector("#dlmFillSellerTin").value = d.npwp || "";
        }
      });
      modal.querySelector("#dlmFillSaveBtn").addEventListener("click", () => submitDlmRow(idx));
    },
  });
}
async function submitDlmRow(idx) {
  const body = {
    seller_name: document.getElementById("dlmFillSellerName").value.trim(),
    seller_tin: document.getElementById("dlmFillSellerTin").value.trim(),
    trx_type: document.getElementById("dlmFillTrxType").value.trim(),
    trx_code: document.getElementById("dlmFillTrxCode").value.trim(),
    trx_document: document.getElementById("dlmFillTrxDocument").value.trim(),
    stlg: document.getElementById("dlmFillStlg").value.trim(),
  };
  try {
    const data = await apiPost(`/api/dlm/row/${idx}`, body);
    applyState(data.state);
    closeModal();
    toast("Dokumen diperbarui.", "success");
  } catch (err) { toast(err.message, "error"); }
}

/* ==================== VIEW: TPK TABLE ==================== */
function tdCell(val, align) {
  return `<td class="${tdAlignClass(align)}">${escapeHtml(val ?? "")}</td>`;
}
function renderTpkTable() {
  const st = APP.state;
  const cols = APP.bootstrap.out_cols;
  const keys = ["no", "nama", "keterangan", "faktur", "tgl", "qty", "harga", "unit", "harga_jual", "diskon", "dpp", "dpp_nl", "tarif_ppn", "ppn", "tarif_ppnbm", "ppnbm"];
  renderDataTable(document.getElementById("tpkTableScroll"), {
    id: "tpk",
    rows: st.processed.map((r, i) => ({ ...r, __idx: i })),
    pageSize: 25,
    searchPlaceholder: "Cari pelanggan, faktur, atau barang...",
    columns: cols.map((c, i) => ({
      id: keys[i],
      header: c[0],
      width: c[1],
      align: c[2],
      html: keys[i] === "faktur",
      accessor: (r) => {
        const key = keys[i];
        if (key === "faktur" && st.dup_map[r.faktur] !== undefined) {
          const [fg, bg] = APP.bootstrap.dup_colors[st.dup_map[r.faktur]];
          return `<span class="dup-badge" style="color:${fg};background:${bg};">${escapeHtml(r.faktur)}</span>`;
        }
        if (["qty", "harga"].includes(key)) return fmtQty(r[key]);
        if (["harga_jual", "diskon", "dpp", "dpp_nl", "ppn", "ppnbm"].includes(key)) return fmtIdr(r[key]);
        if (["tarif_ppn", "tarif_ppnbm"].includes(key)) return `${r[key]}%`;
        return r[key];
      },
      sortAccessor: (r) => r[keys[i]],
    })),
  });
}
function renderTpkView(body) {
  const st = APP.state;
  const wrap = document.createElement("div");
  wrap.className = "view-tpk";
  if (!st.processed.length) {
    wrap.innerHTML = emptyHint('Belum ada data. Upload file dan proses data terlebih dahulu di tab "Upload & Mapping".');
    body.appendChild(wrap);
    return;
  }
  const dupCount = Object.keys(st.dup_map || {}).length;
  wrap.innerHTML = `
    <div class="subhdr">
      <span class="tt">Tabel Data Awal</span>
      <span class="sep">&middot;</span>
      <span class="sep">${st.processed.length} baris</span>
      ${dupCount ? `<span class="sep">&middot;</span><span class="sep">${dupCount} faktur duplikat</span>` : ""}
      <span class="spacer"></span>
      <div class="btn-row">
        <button class="pill pill-primary" id="btnGotoFaktur">Lanjut ke Faktur &rarr;</button>
      </div>
    </div>
    <div class="tpk-table-wrap"><div class="table-scroll" id="tpkTableScroll"></div></div>
  `;
  body.appendChild(wrap);
  renderTpkTable();
  wrap.querySelector("#btnGotoFaktur").addEventListener("click", () => { APP.subView = "faktur"; render(); });
}

/* ==================== VIEW: FAKTUR & DETAIL ==================== */
function summaryPill(label, value) {
  return `<div class="summary-pill"><div class="l">${escapeHtml(label)}</div><span class="v">${value}</span></div>`;
}
function renderSummary() {
  const t = APP.state.totals || {};
  const el = document.getElementById("applySummaryGrid");
  el.innerHTML =
    summaryPill("Qty", fmtQty(t.qty || 0)) +
    summaryPill("Diskon", fmtIdr(t.diskon || 0)) +
    summaryPill("DPP", fmtIdr(t.dpp || 0)) +
    summaryPill("DPP Nilai Lain", fmtIdr(t.dpp_nl || 0)) +
    summaryPill("PPN", fmtIdr(t.ppn || 0));
}
function fakturDateProblemSet() {
  const diag = APP.state.date_diagnostics || {};
  return new Set(diag.problem_indices || []);
}
function fakturDateDefaultValue() {
  const rows = APP.state.faktur_rows || [];
  const dates = Array.from(new Set(rows.map((r) => r.tgl_faktur).filter(Boolean)));
  return dates.length === 1 ? dates[0] : "";
}
function fakturRowClass(r, i, selected) {
  const hasPenjual = !!(r.id_tku_penjual && r.id_tku_penjual.trim());
  const hasPembeli = !!((r.nama_pembeli && r.nama_pembeli.trim()) || (r.npwp_pembeli && r.npwp_pembeli.trim()));
  const dateProblems = fakturDateProblemSet();
  let cls = i % 2 === 0 ? "row-a" : "row-b";
  if (hasPenjual && hasPembeli) cls = "faktur-filled";
  else if (hasPenjual) cls = "faktur-filled-p";
  else if (hasPembeli) cls = "faktur-filled-b";
  if (dateProblems.has(i)) cls += " date-problem";
  if (selected) cls += " selected";
  return cls;
}
function renderDateAlertHtml() {
  const diag = APP.state.date_diagnostics || {};
  const items = [...(diag.blockers || []), ...(diag.warnings || [])];
  if (!items.length) return "";
  return `
    <div class="date-alert">
      <div class="date-alert-title">Tanggal Faktur perlu dicek</div>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}
function renderFakturTable() {
  const st = APP.state;
  const cols = APP.bootstrap.faktur_cols;
  const keys = ["baris", "tgl_faktur", "jenis_faktur", "kode_transaksi", "ket_tambahan", "dok_pendukung", "referensi", "cap_fasilitas", "id_tku_penjual", "npwp_pembeli", "jenis_id", "negara", "no_dok_pembeli", "nama_pembeli", "alamat_pembeli", "email_pembeli", "id_tku_pembeli"];
  renderDataTable(document.getElementById("fakturTableScroll"), {
    id: "faktur",
    rows: st.faktur_rows.map((r, i) => ({ ...r, __idx: i })),
    pageSize: 25,
    searchPlaceholder: "Cari faktur, pembeli, NPWP, atau referensi...",
    getRowClass: (r, idx) => fakturRowClass(r, idx, APP.selFaktur.has(idx)),
    onRowClick: (r, idx, e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selFaktur.has(idx)) APP.selFaktur.delete(idx); else APP.selFaktur.add(idx);
      } else {
        APP.selFaktur = new Set([idx]);
      }
      renderFakturTable();
    },
    onRowDblClick: (r, idx) => openFakturFillDialog(idx),
    columns: cols.map((c, i) => ({
      id: keys[i],
      header: c[0],
      width: c[1],
      align: c[2],
      accessor: keys[i],
    })),
  });
}
function renderDetailTable() {
  const st = APP.state;
  const cols = APP.bootstrap.det_cols;
  const keys = ["baris", "detail_opt_label", "detail_code", "keterangan", "detail_unit_label", "harga", "qty", "diskon", "dpp", "dpp_nl", "tarif_ppn", "ppn", "tarif_ppnbm", "ppnbm"];
  renderDataTable(document.getElementById("detailTableScroll"), {
    id: "detail",
    rows: st.detail_rows.map((r, i) => ({ ...r, tarif_ppn: "12%", tarif_ppnbm: "0%", ppnbm: 0, __idx: r.original_idx, __row: i })),
    pageSize: 25,
    searchPlaceholder: "Cari detail barang, kode, atau baris...",
    getRowClass: (r, idx, pageIdx) => `${pageIdx % 2 === 0 ? "row-a" : "row-b"}${APP.selDetail.has(idx) ? " selected" : ""}`,
    onRowClick: (r, idx, e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selDetail.has(idx)) APP.selDetail.delete(idx); else APP.selDetail.add(idx);
      } else {
        APP.selDetail = new Set([idx]);
      }
      renderDetailTable();
    },
    columns: cols.map((c, i) => ({
      id: keys[i],
      header: c[0],
      width: c[1],
      align: c[2],
      accessor: (r) => {
        const key = keys[i];
        if (["harga", "qty"].includes(key)) return fmtQty(r[key]);
        if (["diskon", "dpp", "dpp_nl", "ppn", "ppnbm"].includes(key)) return fmtIdr(r[key]);
        return r[key];
      },
      sortAccessor: (r) => r[keys[i]],
    })),
  });
}
function wireTabs(container) {
  container.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      APP.activeTab = btn.dataset.tab;
      container.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      container.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === btn.dataset.tab));
    });
  });
}
function wireApplyPanel() {
  document.getElementById("btnApplyPenjual").addEventListener("click", async () => {
    const name = document.getElementById("applyPenjualSelect").value;
    const scope = document.getElementById("applyPenjualScope").value;
    if (!name) { toast("Pilih nama penjual dari dropdown.", "warn"); return; }
    if (scope === "sel" && APP.selFaktur.size === 0) { toast("Pilih baris faktur dulu (klik / Ctrl+klik).", "warn"); return; }
    try {
      const data = await apiPost("/api/faktur/bulk_apply", { mode: "penjual", scope, indices: Array.from(APP.selFaktur), name });
      applyState(data.state);
      toast(`Penjual "${data.name}" diterapkan ke ${data.label}.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnApplyPembeli").addEventListener("click", async () => {
    const name = document.getElementById("applyPembeliSelect").value;
    const scope = document.getElementById("applyPembeliScope").value;
    if (!name) { toast("Pilih nama pembeli dari dropdown.", "warn"); return; }
    if (scope === "sel" && APP.selFaktur.size === 0) { toast("Pilih baris faktur dulu (klik / Ctrl+klik).", "warn"); return; }
    try {
      const data = await apiPost("/api/faktur/bulk_apply", { mode: "pembeli", scope, indices: Array.from(APP.selFaktur), name });
      applyState(data.state);
      toast(`Pembeli "${data.name}" diterapkan ke ${data.label}.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnApplyDate").addEventListener("click", async () => {
    const tgl = document.getElementById("applyDateInput").value.trim();
    const scope = document.getElementById("applyDateScope").value;
    if (!tgl) { toast("Isi tanggal faktur dulu.", "warn"); return; }
    if (scope === "sel" && APP.selFaktur.size === 0) { toast("Pilih baris faktur dulu (klik / Ctrl+klik).", "warn"); return; }
    try {
      const data = await apiPost("/api/faktur/date_bulk_apply", { tgl_faktur: tgl, scope, indices: Array.from(APP.selFaktur) });
      applyState(data.state);
      toast(`Tanggal ${data.tgl_faktur} diterapkan ke ${data.label}.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
  document.getElementById("btnApplyDefaults").addEventListener("click", async () => {
    const opt = document.getElementById("defOptSelect").value;
    const unit = document.getElementById("defUnitSelect").value;
    const code = document.getElementById("defCodeInput").value;
    const scope = document.getElementById("defScopeSelect").value;
    if (scope === "sel" && APP.selDetail.size === 0) { toast("Pilih baris detail dulu (klik / Ctrl+klik).", "warn"); return; }
    try {
      const data = await apiPost("/api/detail/apply_defaults", { opt, unit, code, scope, indices: Array.from(APP.selDetail) });
      applyState(data.state);
      toast(`Default diterapkan ke ${data.label} (${data.opt_label}, ${data.unit}).`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderFakturView(body) {
  const st = APP.state;
  const wrap = document.createElement("div");
  wrap.className = "view-faktur";
  if (!st.processed.length) {
    wrap.innerHTML = emptyHint('Belum ada data. Upload file dan proses data terlebih dahulu di tab "Upload & Mapping".');
    body.appendChild(wrap);
    return;
  }
  const dbPenjual = APP.bootstrap.db_penjual || {};
  const dbPembeli = APP.bootstrap.db_pembeli || {};
  const optChoices = APP.bootstrap.detail_opt_choices;
  const unitChoices = APP.bootstrap.detail_unit_choices;
  const dateDefault = fakturDateDefaultValue();

  wrap.innerHTML = `
    ${renderDateAlertHtml()}
    <div class="apply-panel">
      <div class="apply-top">
        <div class="apply-ctrl">
          <div class="hdr">TERAPKAN DARI DATABASE</div>
          <div class="apply-row">
            <span class="lbl">Penjual</span>
            <select id="applyPenjualSelect" class="x-select">
              <option value="">-- pilih penjual --</option>
              ${Object.keys(dbPenjual).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">Lingkup</span>
            <select id="applyPenjualScope" class="x-select" style="width:140px;">
              <option value="all">Semua baris</option>
              <option value="sel">Baris terpilih</option>
            </select>
            <button class="pill pill-primary pill-sm" id="btnApplyPenjual">Terapkan</button>
          </div>
          <div class="apply-row">
            <span class="lbl">Pembeli</span>
            <select id="applyPembeliSelect" class="x-select">
              <option value="">-- pilih pembeli --</option>
              ${Object.keys(dbPembeli).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
            </select>
          </div>
          <div class="apply-row">
            <span class="lbl">Lingkup</span>
            <select id="applyPembeliScope" class="x-select" style="width:140px;">
              <option value="all">Semua baris</option>
              <option value="sel">Baris terpilih</option>
            </select>
            <button class="pill pill-primary pill-sm" id="btnApplyPembeli">Terapkan</button>
          </div>
          <div class="apply-hint">Klik / Ctrl+klik baris pada tabel Faktur untuk memilih "Baris terpilih".</div>
        </div>
        <div class="apply-divider"></div>
        <div class="apply-summary">
          <div class="hdr">RINGKASAN TOTAL</div>
          <div class="summary-grid" id="applySummaryGrid"></div>
        </div>
      </div>
      <div class="date-apply-row">
        <span class="lbl">TGL FAKTUR</span>
        <input class="x-input" id="applyDateInput" placeholder="DD/MM/YYYY" value="${escapeHtml(dateDefault)}">
        <select id="applyDateScope" class="x-select" style="width:170px;">
          <option value="problem">Tanggal bermasalah</option>
          <option value="all">Semua faktur</option>
          <option value="sel">Baris terpilih</option>
        </select>
        <button class="pill pill-primary pill-sm" id="btnApplyDate">Terapkan</button>
      </div>
      <div class="detail-defaults-row">
        <span class="lbl">DEFAULT DETAIL FAKTUR</span>
        <select id="defOptSelect" class="x-select">
          ${optChoices.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
        </select>
        <input class="x-input" id="defCodeInput" placeholder="Kode (000000)">
        <select id="defUnitSelect" class="x-select">
          ${unitChoices.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
        </select>
        <select id="defScopeSelect" class="x-select" style="width:140px;">
          <option value="all">Semua baris</option>
          <option value="sel">Baris terpilih</option>
        </select>
        <button class="pill pill-primary pill-sm" id="btnApplyDefaults">Terapkan</button>
      </div>
    </div>
    <div class="tabs">
      <div class="tab-bar">
        <button class="tab-btn${APP.activeTab === "faktur" ? " active" : ""}" data-tab="faktur">Faktur</button>
        <button class="tab-btn${APP.activeTab === "detail" ? " active" : ""}" data-tab="detail">Detail Faktur</button>
      </div>
      <div class="tab-panels">
        <div class="tab-panel${APP.activeTab === "faktur" ? " active" : ""}" data-tab="faktur">
          <div class="table-scroll" id="fakturTableScroll"></div>
        </div>
        <div class="tab-panel${APP.activeTab === "detail" ? " active" : ""}" data-tab="detail">
          <div class="table-scroll" id="detailTableScroll"></div>
        </div>
      </div>
    </div>
  `;
  body.appendChild(wrap);
  renderSummary();
  renderFakturTable();
  renderDetailTable();
  wireTabs(wrap);
  wireApplyPanel();
}

/* ==================== DIALOG: WARNING CONFIRM ==================== */
function showWarningConfirm(message, warnings, confirmLabel, onConfirm) {
  const bodyHtml = `
    <p style="margin:0 0 8px; font-size:12px; color:var(--text2);">${escapeHtml(message)}</p>
    <ul class="dialog-warn-list">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
  `;
  const footerHtml = `
    <button class="pill pill-ghost" id="warnCancelBtn">Batal</button>
    <button class="pill pill-gold" id="warnConfirmBtn">${escapeHtml(confirmLabel)}</button>
  `;
  openModal({
    title: "Periksa Sebelum Lanjut",
    bodyHtml, footerHtml, width: "480px",
    onMount: (modal) => {
      modal.querySelector("#warnCancelBtn").addEventListener("click", closeModal);
      modal.querySelector("#warnConfirmBtn").addEventListener("click", () => { closeModal(); onConfirm(); });
    },
  });
}

function showExportBlocked(message, blockers) {
  const bodyHtml = `
    <p style="margin:0 0 8px; font-size:12px; color:var(--text2);">${escapeHtml(message)}</p>
    <ul class="dialog-warn-list">${blockers.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
  `;
  const footerHtml = `<button class="pill pill-primary" id="blockedCloseBtn">Tutup</button>`;
  openModal({
    title: "Export Belum Bisa",
    bodyHtml, footerHtml, width: "480px",
    onMount: (modal) => {
      modal.querySelector("#blockedCloseBtn").addEventListener("click", closeModal);
    },
  });
}

/* ==================== DIALOG: FAKTUR FILL ==================== */
function openFakturFillDialog(idx) {
  const r = APP.state.faktur_rows[idx];
  const dbPenjual = APP.bootstrap.db_penjual || {};
  const dbPembeli = APP.bootstrap.db_pembeli || {};
  const bodyHtml = `
    <div class="modal-section">
      <div class="sec-title">Faktur</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Tgl Faktur</span>
          <input class="x-input" id="fillTglFaktur" placeholder="DD/MM/YYYY" value="${escapeHtml(r.tgl_faktur || "")}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="sec-title">Penjual</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Pilih dari Database</span>
          <select id="fillPenjualSelect" class="x-select">
            <option value="">-- pilih --</option>
            ${Object.keys(dbPenjual).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">ID TKU Penjual (22 digit)</span>
          <input class="x-input" id="fillIdTkuPenjual" maxlength="22" value="${escapeHtml(r.id_tku_penjual || "")}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="sec-title">Pembeli</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Pilih dari Database</span>
          <select id="fillPembeliSelect" class="x-select">
            <option value="">-- pilih --</option>
            ${Object.keys(dbPembeli).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <span class="flbl">NPWP/NIK Pembeli (16 digit)</span>
          <input class="x-input" id="fillNpwpPembeli" maxlength="16" value="${escapeHtml(r.npwp_pembeli || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">No. Dok Pembeli (22 digit)</span>
          <input class="x-input" id="fillNoDokPembeli" maxlength="22" value="${escapeHtml(r.no_dok_pembeli || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">Nama Pembeli</span>
          <input class="x-input" id="fillNamaPembeli" value="${escapeHtml(r.nama_pembeli || "")}">
        </div>
        <div class="form-row">
          <span class="flbl">Alamat Pembeli</span>
          <input class="x-input" id="fillAlamatPembeli" value="${escapeHtml(r.alamat_pembeli || "")}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="sec-title">Diskon</div>
      <div class="sec-body">
        <div class="form-row">
          <span class="flbl">Diskon (%)</span>
          <input class="x-input" id="fillDiskonRate" value="${escapeHtml(fmtPct(r.diskon_rate || 0))}">
        </div>
      </div>
    </div>
  `;
  const footerHtml = `
    <button class="pill pill-ghost" id="fillCancelBtn">Batal</button>
    <button class="pill pill-primary" id="fillSaveBtn">Simpan</button>
  `;
  openModal({
    title: `Edit Faktur — Baris ${escapeHtml(r.baris)}`,
    subtitle: `Referensi: ${escapeHtml(r.referensi)}`,
    bodyHtml, footerHtml, width: "560px",
    onMount: (modal) => {
      modal.querySelector("#fillCancelBtn").addEventListener("click", closeModal);
      modal.querySelector("#fillPenjualSelect").addEventListener("change", (e) => {
        const d = dbPenjual[e.target.value];
        if (d) modal.querySelector("#fillIdTkuPenjual").value = d.id_tku || "";
      });
      modal.querySelector("#fillPembeliSelect").addEventListener("change", (e) => {
        const d = dbPembeli[e.target.value];
        if (d) {
          modal.querySelector("#fillNpwpPembeli").value = d.npwp || "";
          modal.querySelector("#fillNoDokPembeli").value = d.no_dok || "";
          modal.querySelector("#fillNamaPembeli").value = d.nama || e.target.value;
          modal.querySelector("#fillAlamatPembeli").value = d.alamat || "";
          modal.querySelector("#fillDiskonRate").value = d.diskon_pct || "";
        }
      });
      modal.querySelector("#fillSaveBtn").addEventListener("click", () => submitFakturFill(idx));
    },
  });
}
async function submitFakturFill(idx, force) {
  const body = {
    tgl_faktur: document.getElementById("fillTglFaktur").value.trim(),
    id_tku_penjual: document.getElementById("fillIdTkuPenjual").value.trim(),
    npwp_pembeli: document.getElementById("fillNpwpPembeli").value.trim(),
    no_dok_pembeli: document.getElementById("fillNoDokPembeli").value.trim(),
    nama_pembeli: document.getElementById("fillNamaPembeli").value.trim(),
    alamat_pembeli: document.getElementById("fillAlamatPembeli").value.trim(),
    diskon_rate: document.getElementById("fillDiskonRate").value.trim(),
  };
  if (force) body.force = true;
  try {
    const data = await apiPost(`/api/faktur/${idx}`, body);
    if (data.warnings) {
      showWarningConfirm(
        "Periksa data berikut sebelum disimpan:",
        data.warnings,
        "Tetap Simpan",
        () => submitFakturFill(idx, true)
      );
      return;
    }
    applyState(data.state);
    closeModal();
    toast("Faktur diperbarui.", "success");
  } catch (err) { toast(err.message, "error"); }
}

/* ==================== DIALOG: DATABASE MANAGER ==================== */
function renderDbPenjualPanel(modal) {
  const panel = modal.querySelector("#dbPanelPenjual");
  const db = APP.bootstrap.db_penjual || {};
  const names = Object.keys(db);
  let rows = "";
  if (!names.length) {
    rows = `<tr><td colspan="4" class="col-center">Belum ada data penjual.</td></tr>`;
  } else {
    names.forEach((n, i) => {
      const d = db[n];
      rows += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}" data-name="${escapeHtml(n)}">
        <td class="col-left">${escapeHtml(n)}</td>
        <td class="col-center">${escapeHtml(d.id_tku || "")}</td>
        <td class="col-center">${escapeHtml(d.npwp || "")}</td>
        <td class="col-center"><button class="pill pill-danger pill-sm" data-del="${escapeHtml(n)}">Hapus</button></td>
      </tr>`;
    });
  }
  panel.innerHTML = `
    <div class="db-table-wrap">
      <table class="dtable">
        <colgroup><col><col style="width:200px"><col style="width:150px"><col style="width:80px"></colgroup>
        <thead><tr><th class="col-left">Nama Penjual</th><th>ID TKU</th><th>NPWP</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="db-form">
      <div class="form-title">TAMBAH / EDIT PENJUAL</div>
      <div class="form-row"><span class="flbl">Nama Penjual</span><input class="x-input" id="dbPenjualNama"></div>
      <div class="form-row"><span class="flbl">ID TKU (22 digit)</span><input class="x-input" id="dbPenjualIdTku" maxlength="22"></div>
      <div class="form-row"><span class="flbl">NPWP (16 digit)</span><input class="x-input" id="dbPenjualNpwp" maxlength="16"></div>
      <div class="btn-row"><button class="pill pill-primary" id="btnSavePenjual">Simpan</button></div>
    </div>
  `;
  panel.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const data = await apiDelete(`/api/db/penjual/${encodeURIComponent(btn.dataset.del)}`);
        APP.bootstrap.db_penjual = data.db_penjual;
        renderDbPenjualPanel(modal);
        toast("Penjual dihapus.", "info");
      } catch (err) { toast(err.message, "error"); }
    });
  });
  panel.querySelectorAll("tbody tr[data-name]").forEach((tr) => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest("[data-del]")) return;
      const d = db[tr.dataset.name];
      panel.querySelector("#dbPenjualNama").value = tr.dataset.name;
      panel.querySelector("#dbPenjualIdTku").value = d.id_tku || "";
      panel.querySelector("#dbPenjualNpwp").value = d.npwp || "";
    });
  });
  panel.querySelector("#btnSavePenjual").addEventListener("click", async () => {
    const nama = panel.querySelector("#dbPenjualNama").value.trim();
    const id_tku = panel.querySelector("#dbPenjualIdTku").value.trim();
    const npwp = panel.querySelector("#dbPenjualNpwp").value.trim();
    try {
      const data = await apiPost("/api/db/penjual", { nama, id_tku, npwp });
      APP.bootstrap.db_penjual = data.db_penjual;
      renderDbPenjualPanel(modal);
      toast(`Penjual "${nama}" disimpan.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderDbPemasokPanel(modal) {
  const panel = modal.querySelector("#dbPanelPemasok");
  const db = APP.bootstrap.db_pemasok || {};
  const names = Object.keys(db);
  let rows = "";
  if (!names.length) {
    rows = `<tr><td colspan="3" class="col-center">Belum ada data pemasok.</td></tr>`;
  } else {
    names.forEach((n, i) => {
      const d = db[n];
      rows += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}" data-name="${escapeHtml(n)}">
        <td class="col-left">${escapeHtml(n)}</td>
        <td class="col-center">${escapeHtml(d.npwp || "")}</td>
        <td class="col-center"><button class="pill pill-danger pill-sm" data-del="${escapeHtml(n)}">Hapus</button></td>
      </tr>`;
    });
  }
  panel.innerHTML = `
    <div class="db-table-wrap">
      <table class="dtable">
        <colgroup><col><col style="width:150px"><col style="width:80px"></colgroup>
        <thead><tr><th class="col-left">Nama Pemasok</th><th>NPWP</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="db-form">
      <div class="form-title">TAMBAH / EDIT PEMASOK</div>
      <div class="form-row"><span class="flbl">Nama Pemasok</span><input class="x-input" id="dbPemasokNama"></div>
      <div class="form-row"><span class="flbl">NPWP (16 digit)</span><input class="x-input" id="dbPemasokNpwp" maxlength="16"></div>
      <div class="btn-row"><button class="pill pill-primary" id="btnSavePemasok">Simpan</button></div>
    </div>
  `;
  panel.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const data = await apiDelete(`/api/db/pemasok/${encodeURIComponent(btn.dataset.del)}`);
        APP.bootstrap.db_pemasok = data.db_pemasok;
        renderDbPemasokPanel(modal);
        toast("Pemasok dihapus.", "info");
      } catch (err) { toast(err.message, "error"); }
    });
  });
  panel.querySelectorAll("tbody tr[data-name]").forEach((tr) => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest("[data-del]")) return;
      const d = db[tr.dataset.name];
      panel.querySelector("#dbPemasokNama").value = tr.dataset.name;
      panel.querySelector("#dbPemasokNpwp").value = d.npwp || "";
    });
  });
  panel.querySelector("#btnSavePemasok").addEventListener("click", async () => {
    const nama = panel.querySelector("#dbPemasokNama").value.trim();
    const npwp = panel.querySelector("#dbPemasokNpwp").value.trim();
    try {
      const data = await apiPost("/api/db/pemasok", { nama, npwp });
      APP.bootstrap.db_pemasok = data.db_pemasok;
      renderDbPemasokPanel(modal);
      toast(`Pemasok "${nama}" disimpan.`, "success");
    } catch (err) { toast(err.message, "error"); }
  });
}
function renderDbPembeliPanel(modal) {
  const panel = modal.querySelector("#dbPanelPembeli");
  const db = APP.bootstrap.db_pembeli || {};
  const names = Object.keys(db);
  let rows = "";
  if (!names.length) {
    rows = `<tr><td colspan="6" class="col-center">Belum ada data pembeli.</td></tr>`;
  } else {
    names.forEach((n, i) => {
      const d = db[n];
      rows += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}" data-name="${escapeHtml(n)}">
        <td class="col-left">${escapeHtml(n)}</td>
        <td class="col-center">${escapeHtml(d.npwp || "")}</td>
        <td class="col-center">${escapeHtml(d.no_dok || "")}</td>
        <td class="col-right">${escapeHtml(d.diskon_pct || "")}</td>
        <td class="col-left">${escapeHtml(d.alamat || "")}</td>
        <td class="col-center"><button class="pill pill-danger pill-sm" data-del="${escapeHtml(n)}">Hapus</button></td>
      </tr>`;
    });
  }
  panel.innerHTML = `
    <div class="db-table-wrap">
      <table class="dtable">
        <colgroup><col><col style="width:130px"><col style="width:160px"><col style="width:70px"><col style="width:200px"><col style="width:70px"></colgroup>
        <thead><tr><th class="col-left">Nama Pembeli</th><th>NPWP</th><th>No. Dok</th><th class="col-right">Diskon%</th><th class="col-left">Alamat</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="db-form">
      <div class="form-title">TAMBAH / EDIT PEMBELI</div>
      <div class="form-row"><span class="flbl">Nama Pembeli</span><input class="x-input" id="dbPembeliNama"></div>
      <div class="form-row"><span class="flbl">NPWP (16 digit)</span><input class="x-input" id="dbPembeliNpwp" maxlength="16"></div>
      <div class="form-row"><span class="flbl">No. Dok (22 digit)</span><input class="x-input" id="dbPembeliNoDok" maxlength="22"></div>
      <div class="form-row"><span class="flbl">Diskon (%)</span><input class="x-input" id="dbPembeliDiskon" placeholder="contoh: 5 atau 4,25"></div>
      <div class="form-row"><span class="flbl">Alamat</span><input class="x-input" id="dbPembeliAlamat"></div>
      <div class="btn-row">
        <button class="pill pill-primary" id="btnSavePembeli">Simpan</button>
        <button class="pill pill-gold" id="btnApplyAllDiscounts">Update Diskon ke Data Aktif</button>
      </div>
      <div class="db-hint">Diskon disimpan per pembeli. "Update Diskon ke Data Aktif" menerapkan ulang seluruh diskon dari database ke data faktur yang sedang dibuka.</div>
    </div>
  `;
  panel.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const data = await apiDelete(`/api/db/pembeli/${encodeURIComponent(btn.dataset.del)}`);
        APP.bootstrap.db_pembeli = data.db_pembeli;
        renderDbPembeliPanel(modal);
        toast("Pembeli dihapus.", "info");
      } catch (err) { toast(err.message, "error"); }
    });
  });
  panel.querySelectorAll("tbody tr[data-name]").forEach((tr) => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest("[data-del]")) return;
      const d = db[tr.dataset.name];
      panel.querySelector("#dbPembeliNama").value = tr.dataset.name;
      panel.querySelector("#dbPembeliNpwp").value = d.npwp || "";
      panel.querySelector("#dbPembeliNoDok").value = d.no_dok || "";
      panel.querySelector("#dbPembeliDiskon").value = d.diskon_pct || "";
      panel.querySelector("#dbPembeliAlamat").value = d.alamat || "";
    });
  });
  panel.querySelector("#btnSavePembeli").addEventListener("click", async () => {
    const nama = panel.querySelector("#dbPembeliNama").value.trim();
    const npwp = panel.querySelector("#dbPembeliNpwp").value.trim();
    const no_dok = panel.querySelector("#dbPembeliNoDok").value.trim();
    const diskon_pct = panel.querySelector("#dbPembeliDiskon").value.trim();
    const alamat = panel.querySelector("#dbPembeliAlamat").value.trim();
    try {
      const data = await apiPost("/api/db/pembeli", { nama, npwp, no_dok, diskon_pct, alamat });
      APP.bootstrap.db_pembeli = data.db_pembeli;
      renderDbPembeliPanel(modal);
      if (data.changed) {
        applyState(data.state);
        toast(`Pembeli "${nama}" disimpan. ${data.changed} baris diperbarui.`, "success");
      } else {
        toast(`Pembeli "${nama}" disimpan.`, "success");
      }
    } catch (err) { toast(err.message, "error"); }
  });
  panel.querySelector("#btnApplyAllDiscounts").addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/db/apply_discounts");
      applyState(data.state);
      toast(`Diskon diterapkan ke ${data.changed} baris.`, data.changed ? "success" : "info");
    } catch (err) { toast(err.message, "error"); }
  });
}
function openDatabaseModal(initialTab = "penjual") {
  if (initialTab === "dlm_templates") initialTab = "templates";
  const bodyHtml = `
    <div class="tab-bar" id="dbTabBar">
      <button class="tab-btn${initialTab === "penjual" ? " active" : ""}" data-tab="penjual">Penjual</button>
      <button class="tab-btn${initialTab === "pembeli" ? " active" : ""}" data-tab="pembeli">Pembeli</button>
      <button class="tab-btn${initialTab === "pemasok" ? " active" : ""}" data-tab="pemasok">Pemasok</button>
      <button class="tab-btn${initialTab === "templates" ? " active" : ""}" data-tab="templates">Template</button>
    </div>
    <div id="dbPanelPenjual" class="${initialTab === "penjual" ? "" : "hidden"}"></div>
    <div id="dbPanelPembeli" class="${initialTab === "pembeli" ? "" : "hidden"}"></div>
    <div id="dbPanelPemasok" class="${initialTab === "pemasok" ? "" : "hidden"}"></div>
    <div id="dbPanelTemplates" class="${initialTab === "templates" ? "" : "hidden"}"></div>
    <div id="dbPanelDlmTemplates" class="${initialTab === "templates" ? "" : "hidden"}"></div>
  `;
  openModal({
    title: "Database",
    subtitle: "Kelola data penjual, pembeli, pemasok, dan template mapping kolom.",
    bodyHtml, width: "720px",
    onMount: (modal) => {
      modal.querySelectorAll("#dbTabBar .tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          modal.querySelectorAll("#dbTabBar .tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
          modal.querySelector("#dbPanelPenjual").classList.toggle("hidden", btn.dataset.tab !== "penjual");
          modal.querySelector("#dbPanelPembeli").classList.toggle("hidden", btn.dataset.tab !== "pembeli");
          modal.querySelector("#dbPanelPemasok").classList.toggle("hidden", btn.dataset.tab !== "pemasok");
          modal.querySelector("#dbPanelTemplates").classList.toggle("hidden", btn.dataset.tab !== "templates");
          modal.querySelector("#dbPanelDlmTemplates").classList.toggle("hidden", btn.dataset.tab !== "templates");
        });
      });
      renderDbPenjualPanel(modal);
      renderDbPembeliPanel(modal);
      renderDbPemasokPanel(modal);
      renderDbTemplatesPanel(modal);
      renderDbDlmTemplatesPanel(modal);
    },
  });
}

/* ==================== DIALOG: TEMPLATE PICKER ==================== */
async function applyTemplate(name) {
  try {
    const data = await apiPost(`/api/templates/${encodeURIComponent(name)}/apply`, {});
    APP.state.mapping = data.mapping;
    closeModal();
    if (data.can_auto_process) {
      const procData = await apiPost("/api/process");
      applyState(procData.state);
      APP.view = "pajak_keluaran";
      APP.subView = "tpk";
      render();
      toast(`Template "${name}" diterapkan dan data diproses.`, "success");
    } else {
      applyState(data.state);
      APP.view = "pajak_keluaran";
      APP.subView = "upload_mapping";
      render();
      toast(`Template "${name}" diterapkan. Lengkapi mapping yang tersisa.`, "info");
    }
  } catch (err) { toast(err.message, "error"); }
}
function renderDbTemplatesPanel(modal) {
  const panel = modal.querySelector("#dbPanelTemplates");
  const templates = APP.bootstrap.templates || {};
  const names = Object.keys(templates);
  let rows = "";
  if (!names.length) {
    rows = `<tr><td colspan="3" class="col-center">Belum ada template tersimpan.</td></tr>`;
  } else {
    names.forEach((n, i) => {
      const d = templates[n] || {};
      rows += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}" data-name="${escapeHtml(n)}">
        <td class="col-left">${escapeHtml(n)}</td>
        <td class="col-center">${(d.headers || []).length}</td>
        <td class="col-center">
          <button class="pill pill-primary pill-sm" data-apply="${escapeHtml(n)}">Terapkan</button>
          <button class="pill pill-danger pill-sm" data-del="${escapeHtml(n)}">Hapus</button>
        </td>
      </tr>`;
    });
  }
  panel.innerHTML = `
    <div class="db-section-title">Template Pajak Keluaran</div>
    <div class="db-table-wrap">
      <table class="dtable">
        <colgroup><col><col style="width:120px"><col style="width:170px"></colgroup>
        <thead><tr><th class="col-left">Nama Template</th><th>Jumlah Kolom</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="db-hint">Template menyimpan pemetaan kolom Excel agar dapat diterapkan otomatis pada file dengan format yang sama. Simpan template baru lewat tombol "Save Template" di tab Upload &amp; Mapping pada menu Pajak Keluaran.</div>
  `;
  panel.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const data = await apiDelete(`/api/templates/${encodeURIComponent(btn.dataset.del)}`);
        APP.bootstrap.templates = data.templates;
        renderDbTemplatesPanel(modal);
        toast("Template dihapus.", "info");
      } catch (err) { toast(err.message, "error"); }
    });
  });
  panel.querySelectorAll("[data-apply]").forEach((btn) => {
    btn.addEventListener("click", () => applyTemplate(btn.dataset.apply));
  });
}
function openSaveTemplateModal() {
  const bodyHtml = `
    <div class="form-row"><span class="flbl">Nama Template</span><input class="x-input" id="templateNameInput" placeholder="contoh: Format Toko A"></div>
  `;
  const footerHtml = `
    <button class="pill pill-ghost" id="tplCancelBtn">Batal</button>
    <button class="pill pill-primary" id="tplSaveBtn">Simpan</button>
  `;
  openModal({
    title: "Simpan Template Mapping",
    bodyHtml, footerHtml, width: "400px",
    onMount: (modal) => {
      const input = modal.querySelector("#templateNameInput");
      input.focus();
      modal.querySelector("#tplCancelBtn").addEventListener("click", closeModal);
      const save = async () => {
        const name = input.value.trim();
        if (!name) { toast("Isi nama template.", "warn"); return; }
        try {
          const data = await apiPost("/api/templates", { name });
          APP.bootstrap.templates = data.templates;
          closeModal();
          toast(`Template "${name}" disimpan.`, "success");
        } catch (err) { toast(err.message, "error"); }
      };
      modal.querySelector("#tplSaveBtn").addEventListener("click", save);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    },
  });
}

/* ==================== DIALOG: TEMPLATE PICKER (DLM) ==================== */
async function applyDlmTemplate(name) {
  try {
    const data = await apiPost(`/api/dlm/templates/${encodeURIComponent(name)}/apply`, {});
    APP.state.dlm.mapping = data.mapping;
    closeModal();
    APP.view = "doc_lain_masukan";
    if (data.can_auto_process) {
      const procData = await apiPost("/api/dlm/process");
      applyState(procData.state);
      APP.dlmSubView = "tabel";
      render();
      toast(`Template "${name}" diterapkan dan data diproses.`, "success");
    } else {
      applyState(data.state);
      APP.dlmSubView = "upload_mapping";
      render();
      toast(`Template "${name}" diterapkan. Lengkapi mapping yang tersisa.`, "info");
    }
  } catch (err) { toast(err.message, "error"); }
}
function renderDbDlmTemplatesPanel(modal) {
  const panel = modal.querySelector("#dbPanelDlmTemplates");
  const templates = APP.bootstrap.dlm_templates || {};
  const names = Object.keys(templates);
  let rows = "";
  if (!names.length) {
    rows = `<tr><td colspan="3" class="col-center">Belum ada template tersimpan.</td></tr>`;
  } else {
    names.forEach((n, i) => {
      const d = templates[n] || {};
      rows += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}" data-name="${escapeHtml(n)}">
        <td class="col-left">${escapeHtml(n)}</td>
        <td class="col-center">${(d.headers || []).length}</td>
        <td class="col-center">
          <button class="pill pill-primary pill-sm" data-apply="${escapeHtml(n)}">Terapkan</button>
          <button class="pill pill-danger pill-sm" data-del="${escapeHtml(n)}">Hapus</button>
        </td>
      </tr>`;
    });
  }
  panel.innerHTML = `
    <div class="db-section-title">Template Doc Lain Masukan</div>
    <div class="db-table-wrap">
      <table class="dtable">
        <colgroup><col><col style="width:120px"><col style="width:170px"></colgroup>
        <thead><tr><th class="col-left">Nama Template</th><th>Jumlah Kolom</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="db-hint">Template Doc Lain Masukan menyimpan pemetaan kolom Excel agar dapat diterapkan otomatis pada file pemasok dengan format yang sama. Simpan template baru lewat tombol "Save Template" di tab Upload &amp; Mapping pada menu Doc Lain Masukan.</div>
  `;
  panel.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const data = await apiDelete(`/api/dlm/templates/${encodeURIComponent(btn.dataset.del)}`);
        APP.bootstrap.dlm_templates = data.templates;
        renderDbDlmTemplatesPanel(modal);
        toast("Template dihapus.", "info");
      } catch (err) { toast(err.message, "error"); }
    });
  });
  panel.querySelectorAll("[data-apply]").forEach((btn) => {
    btn.addEventListener("click", () => applyDlmTemplate(btn.dataset.apply));
  });
}
function openSaveDlmTemplateModal() {
  const bodyHtml = `
    <div class="form-row"><span class="flbl">Nama Template</span><input class="x-input" id="dlmTemplateNameInput" placeholder="contoh: Format TikTok"></div>
  `;
  const footerHtml = `
    <button class="pill pill-ghost" id="dlmTplCancelBtn">Batal</button>
    <button class="pill pill-primary" id="dlmTplSaveBtn">Simpan</button>
  `;
  openModal({
    title: "Simpan Template Mapping (Doc Lain Masukan)",
    bodyHtml, footerHtml, width: "400px",
    onMount: (modal) => {
      const input = modal.querySelector("#dlmTemplateNameInput");
      input.focus();
      modal.querySelector("#dlmTplCancelBtn").addEventListener("click", closeModal);
      const save = async () => {
        const name = input.value.trim();
        if (!name) { toast("Isi nama template.", "warn"); return; }
        try {
          const data = await apiPost("/api/dlm/templates", { name });
          APP.bootstrap.dlm_templates = data.templates;
          closeModal();
          toast(`Template "${name}" disimpan.`, "success");
        } catch (err) { toast(err.message, "error"); }
      };
      modal.querySelector("#dlmTplSaveBtn").addEventListener("click", save);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    },
  });
}

/* ==================== EXPORT ==================== */
async function downloadFile(url, fallbackName) {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Export gagal.");
  }
  const blob = await res.blob();
  let filename = fallbackName;
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename="?([^";]+)"?/i.exec(cd);
  if (m) filename = m[1];
  const dlUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = dlUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
  return filename;
}
let exportInProgress = false;
async function withExportLock(btn, fn) {
  if (exportInProgress) return;
  exportInProgress = true;
  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Menyiapkan...";
  try {
    await fn();
  } finally {
    exportInProgress = false;
    btn.disabled = false;
    btn.textContent = prevText;
  }
}
async function doExportXlsx() {
  try {
    const filename = await downloadFile("/api/export/xlsx", "export_cortex.xlsx");
    toast(`File "${filename}" diunduh.`, "success");
  } catch (err) { toast(err.message, "error"); }
}
async function doExportXml() {
  try {
    const nInv = new Set(APP.state.processed.map((r) => r.faktur)).size;
    const nGoods = APP.state.processed.length;
    const filename = await downloadFile("/api/export/xml", "export_coretax.xml");
    toast(`File "${filename}" diunduh (${nInv} faktur, ${nGoods} barang/jasa).`, "success");
  } catch (err) { toast(err.message, "error"); }
}
async function exportXlsx() {
  if (!APP.state.processed.length) { toast("Proses data dulu sebelum export.", "warn"); return; }
  await withExportLock(document.getElementById("btnExportXlsx"), async () => {
    const data = await apiGet("/api/export/warnings");
    if (data.blockers && data.blockers.length) {
      showExportBlocked("Lengkapi data penjual dan pembeli sebelum export Excel.", data.blockers);
      return;
    }
    if (data.warnings && data.warnings.length) {
      showWarningConfirm("Beberapa data berikut belum lengkap / sesuai format Coretax:", data.warnings, "Tetap Export", doExportXlsx);
    } else {
      await doExportXlsx();
    }
  });
}
async function exportXml() {
  if (!APP.state.processed.length) { toast("Proses data dulu sebelum export.", "warn"); return; }
  await withExportLock(document.getElementById("btnExportXml"), async () => {
    const data = await apiGet("/api/export/warnings");
    if (data.blockers && data.blockers.length) {
      showExportBlocked("Lengkapi data penjual dan pembeli sebelum export XML.", data.blockers);
      return;
    }
    if (data.warnings && data.warnings.length) {
      showWarningConfirm("Beberapa data berikut belum lengkap / sesuai format Coretax:", data.warnings, "Tetap Export", doExportXml);
    } else {
      await doExportXml();
    }
  });
}
async function doExportDlmXlsx() {
  try {
    const filename = await downloadFile("/api/dlm/export/xlsx", "doc_lain.xlsx");
    toast(`File "${filename}" diunduh.`, "success");
  } catch (err) { toast(err.message, "error"); }
}
async function doExportDlmXml() {
  try {
    const n = APP.state.dlm.processed.length;
    const filename = await downloadFile("/api/dlm/export/xml", "doc_lain_coretax.xml");
    toast(`File "${filename}" diunduh (${n} dokumen).`, "success");
  } catch (err) { toast(err.message, "error"); }
}
async function exportDlmXlsx() {
  if (!APP.state.dlm.processed.length) { toast("Proses data dulu sebelum export.", "warn"); return; }
  await withExportLock(document.getElementById("btnExportDlmXlsx"), async () => {
    const data = await apiGet("/api/dlm/export/warnings");
    if (data.warnings && data.warnings.length) {
      showWarningConfirm("Beberapa data berikut belum lengkap / sesuai format Coretax:", data.warnings, "Tetap Export", doExportDlmXlsx);
    } else {
      await doExportDlmXlsx();
    }
  });
}
async function exportDlmXml() {
  if (!APP.state.dlm.processed.length) { toast("Proses data dulu sebelum export.", "warn"); return; }
  await withExportLock(document.getElementById("btnExportDlmXml"), async () => {
    const data = await apiGet("/api/dlm/export/warnings");
    if (data.warnings && data.warnings.length) {
      showWarningConfirm("Beberapa data berikut belum lengkap / sesuai format Coretax:", data.warnings, "Tetap Export", doExportDlmXml);
    } else {
      await doExportDlmXml();
    }
  });
}

async function doExportSdlXml() {
  try {
    const n = APP.state.sdl.processed.length;
    const filename = await downloadFile("/api/sdl/export/xml", "spt_lain_coretax.xml");
    toast(`File "${filename}" diunduh (${n} dokumen).`, "success");
  } catch (err) { toast(err.message, "error"); }
}
async function exportSdlXml() {
  if (!APP.state.sdl.processed.length) { toast("Isi data dulu sebelum export.", "warn"); return; }
  await withExportLock(document.getElementById("btnExportSdlXml"), async () => {
    const data = await apiGet("/api/sdl/export/warnings");
    if (data.warnings && data.warnings.length) {
      showWarningConfirm("Beberapa data berikut belum lengkap / sesuai format Coretax:", data.warnings, "Tetap Export", doExportSdlXml);
    } else {
      await doExportSdlXml();
    }
  });
}

/* ==================== SIDEBAR COLLAPSE ==================== */
function setSidebarCollapsed(collapsed) {
  document.getElementById("app").classList.toggle("sidebar-collapsed", collapsed);
  document.getElementById("sidebarToggle").title = collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar";
  localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
}

/* ==================== INIT ==================== */
function wireGlobalEvents() {
  document.getElementById("sidebarToggle").addEventListener("click", () => {
    setSidebarCollapsed(!document.getElementById("app").classList.contains("sidebar-collapsed"));
  });
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal.");
      APP.pendingField = null;
      APP.selFaktur = new Set();
      APP.selDetail = new Set();
      APP.activeTab = "faktur";
      APP.view = "pajak_keluaran";
      APP.subView = "upload_mapping";
      applyState(data.state);
      toast(`File "${file.name}" dimuat — ${data.state.raw_row_count} baris.`, "success");
    } catch (err) { toast(err.message, "error"); }
    finally { e.target.value = ""; }
  });
  document.getElementById("fileInputDlm").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/dlm/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal.");
      APP.pendingDlmField = null;
      APP.selDlm = new Set();
      APP.view = "doc_lain_masukan";
      APP.dlmSubView = "upload_mapping";
      applyState(data.state);
      toast(`File "${file.name}" dimuat — ${data.state.dlm.raw_row_count} baris.`, "success");
    } catch (err) { toast(err.message, "error"); }
    finally { e.target.value = ""; }
  });
}
async function init() {
  await loadTanStack();
  const data = await apiGet("/api/bootstrap");
  await loadAuthSession();
  APP.bootstrap = data;
  APP.state = data.state;
  APP.state.subscription = mergedSubscription(APP.state.subscription);
  applyTheme(data.theme);
  buildThemeSelect();
  setSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "1");
  if (APP.state.raw_headers.length) {
    APP.subView = APP.state.processed.length ? "tpk" : "upload_mapping";
  }
  if (APP.state.dlm.raw_headers.length) {
    APP.dlmSubView = APP.state.dlm.processed.length ? "tabel" : "upload_mapping";
  }
  wireGlobalEvents();
  render();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
