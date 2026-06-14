/* ============================================================
   Pajak Keluaran Otomatis - Web Edition
   Frontend SPA logic.
   ============================================================ */

const APP = {
  bootstrap: null,
  state: null,
  theme: "Dark Executive",
  view: "pajak_keluaran",
  subView: "upload_mapping",
  pendingField: null,
  selFaktur: new Set(),
  selDetail: new Set(),
  activeTab: "faktur",
  dlmSubView: "upload_mapping",
  pendingDlmField: null,
  selDlm: new Set(),
  selSdl: new Set(),
};

class ApiError extends Error {
  constructor(msg, data) { super(msg); this.data = data; }
}

/* ==================== API HELPERS ==================== */
async function apiGet(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Terjadi kesalahan.", data);
  return data;
}
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : "{}",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Terjadi kesalahan.", data);
  return data;
}
async function apiDelete(url) {
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Terjadi kesalahan.", data);
  return data;
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
  { id: "dashboard", label: "Dashboard", icon: "\u{1F4C8}" },
  { id: "pajak_keluaran", label: "Pajak Keluaran", icon: "\u{1F4B0}" },
  { id: "doc_lain_masukan", label: "Doc Lain Masukan", icon: "\u{1F4E5}" },
  { id: "spt_dokumen_lain", label: "SPT Dokumen Lain", icon: "\u{1F4D1}" },
  { divider: true },
  { id: "database", label: "Database", icon: "\u{1F5C4}️" },
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
function buildNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  NAV_ITEMS.forEach((item) => {
    if (item.divider) {
      const d = document.createElement("div");
      d.className = "nav-divider";
      nav.appendChild(d);
      return;
    }
    const el = document.createElement("div");
    el.className = "nav-item" + (APP.view === item.id ? " active" : "");
    el.title = item.label;
    el.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-text">${item.label}</span>`;
    el.addEventListener("click", () => onNavClick(item.id));
    nav.appendChild(el);
  });
}
function onNavClick(id) {
  if (id === "database") { openDatabaseModal(); return; }
  APP.view = id;
  render();
}
function statPill(label, value) {
  return `<div class="stat-pill"><div class="stat-value">${value}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
}
function refreshTopbar() {
  const st = APP.state;
  if (APP.view === "spt_dokumen_lain") {
    const sdl = st.sdl;
    const totalDoc = sdl.processed.length;
    document.getElementById("statsFrame").innerHTML =
      statPill("Total Dokumen", totalDoc) +
      statPill("Total DPP", fmtIdr((sdl.totals || {}).tax_base || 0)) +
      statPill("Total PPN", fmtIdr((sdl.totals || {}).vat || 0));

    let status;
    if (!totalDoc) {
      status = "%&nbsp; Siap &mdash; isi nominal PPN (VAT) untuk menambah dokumen";
    } else {
      status = `%&nbsp; ${totalDoc} dokumen siap export`;
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
      statPill("Total PPN", fmtIdr((dlm.totals || {}).vat || 0));

    let status;
    if (!dlm.raw_headers.length) {
      status = "%&nbsp; Siap &mdash; upload file Doc Lain Masukan untuk memulai";
    } else if (!dlm.processed.length) {
      status = `%&nbsp; File dimuat: ${dlm.raw_row_count} baris &mdash; lengkapi mapping lalu proses`;
    } else {
      status = `%&nbsp; Diproses: ${totalDoc} dokumen`;
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
    statPill("Duplikat", duplikat);

  let status;
  if (!st.raw_headers.length) {
    status = "";
  } else if (!st.processed.length) {
    status = `%&nbsp; File dimuat: ${st.raw_row_count} baris &mdash; lengkapi mapping lalu proses`;
  } else {
    status = `%&nbsp; Diproses: ${totalBaris} baris, ${fakturUnik} faktur unik`;
    if (duplikat) status += `, ${duplikat} faktur duplikat`;
  }
  document.getElementById("statusLabel").innerHTML = status;
}
function refreshFileLabel() {
  const st = APP.state;
  if (APP.view === "spt_dokumen_lain") {
    document.getElementById("fileLabel").textContent = "Input manual (tanpa file)";
    return;
  }
  const fname = APP.view === "doc_lain_masukan" ? st.dlm.src_filename : st.src_filename;
  document.getElementById("fileLabel").textContent = fname ? `File: ${fname}` : "File: belum ada";
}
function refreshExportSection() {
  const el = document.getElementById("exportSection");
  if (APP.view === "spt_dokumen_lain") {
    el.innerHTML = `
      <label class="side-label"><img class="logo-sm" src="/static/img/logo.svg" alt="">&nbsp; EXPORT SPT LAIN</label>
      <button class="pill pill-teal pill-block" id="btnExportSdlXml">%&nbsp; XML Coretax</button>
    `;
    el.querySelector("#btnExportSdlXml").addEventListener("click", exportSdlXml);
    return;
  }
  if (APP.view === "doc_lain_masukan") {
    el.innerHTML = `
      <label class="side-label"><img class="logo-sm" src="/static/img/logo.svg" alt="">&nbsp; EXPORT DOC LAIN</label>
      <button class="pill pill-success pill-block" id="btnExportDlmXlsx"><img class="logo-sm" src="/static/img/logo.svg" alt="">&nbsp; XLSX</button>
      <button class="pill pill-teal pill-block" id="btnExportDlmXml">%&nbsp; XML Coretax</button>
    `;
    el.querySelector("#btnExportDlmXlsx").addEventListener("click", exportDlmXlsx);
    el.querySelector("#btnExportDlmXml").addEventListener("click", exportDlmXml);
  } else {
    el.innerHTML = `
      <label class="side-label"><img class="logo-sm" src="/static/img/logo.svg" alt="">&nbsp; EXPORT PAJAK</label>
      <button class="pill pill-success pill-block" id="btnExportXlsx"><img class="logo-sm" src="/static/img/logo.svg" alt="">&nbsp; XLSX</button>
      <button class="pill pill-teal pill-block" id="btnExportXml">%&nbsp; XML Coretax</button>
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
      <button class="pill pill-ghost pill-sm" id="modalCloseBtn">&#10005;</button>
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
    html += `<div class="ctx-item${it.active ? " active" : ""}${it.danger ? " danger" : ""}">${it.active ? "&#10003; " : ""}${escapeHtml(it.label)}</div>`;
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

/* ==================== CENTRAL STATE / RENDER ==================== */
function applyState(newState) {
  APP.state = newState;
  render();
}
function render() {
  buildNav();
  refreshTopbar();
  refreshFileLabel();
  refreshExportSection();
  const body = document.getElementById("body");
  body.innerHTML = "";
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
function renderDashboardData(wrap, data) {
  const items = data.items || [];
  wrap.querySelector("#dashCards").innerHTML = `
    <div class="dash-card">
      <div class="dash-card-value">${data.total || 0}</div>
      <div class="dash-card-label">No. Faktur sudah di-export ke XML Coretax</div>
    </div>
  `;
  const tableEl = wrap.querySelector("#dashTableScroll");
  if (!items.length) {
    tableEl.innerHTML = emptyHint("Belum ada faktur yang di-export ke XML Coretax.");
    return;
  }
  let html = '<table class="dtable">' + colgroupHtml([
    ["No", 50], ["No. Faktur", 160], ["Tgl Faktur", 100],
    ["Nama Pembeli", 220], ["File Sumber", 220], ["Waktu Export", 150],
  ]) + "<thead><tr>";
  html += '<th>No</th><th class="col-left">No. Faktur</th><th>Tgl Faktur</th>';
  html += '<th class="col-left">Nama Pembeli</th><th class="col-left">File Sumber</th><th>Waktu Export</th>';
  html += "</tr></thead><tbody>";
  items.forEach((it, i) => {
    html += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}">`;
    html += tdCell(i + 1, "center");
    html += tdCell(it.no_faktur, "left");
    html += tdCell(it.tgl_faktur, "center");
    html += tdCell(it.nama_pembeli, "left");
    html += tdCell(it.source_file, "left");
    html += tdCell(it.exported_at, "center");
    html += "</tr>";
  });
  html += "</tbody></table>";
  tableEl.innerHTML = html;
}
async function loadDashboardData(wrap) {
  wrap.querySelector("#dashCards").innerHTML = emptyHint("Memuat...");
  wrap.querySelector("#dashTableScroll").innerHTML = "";
  try {
    const data = await apiGet("/api/dashboard");
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
        <button class="pill pill-ghost pill-sm" id="btnRefreshDashboard">&#8635; Refresh</button>
        <button class="pill pill-danger pill-sm" id="btnClearHistory">Hapus Riwayat</button>
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
      <div class="upload-icon"><img src="/static/img/logo.svg" alt="Logo"></div>
      <h1>Pajak Keluaran Otomatis</h1>
      <p>Upload file Excel (.xls / .xlsx) hasil ekspor data penjualan untuk memulai.</p>
      <div class="hr"></div>
      <div class="btn-row">
        <button class="pill pill-primary" id="btnPickFile">&#128193; Pilih File Excel</button>
        <button class="pill pill-ghost" id="btnPickTemplate">&#128209; Load Template</button>
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
      <div class="upload-icon">\u{1F4E5}</div>
      <h1>Doc Lain Masukan</h1>
      <p>Upload file Excel (.xls / .xlsx) daftar faktur pembelian (mis. dari TikTok PTE LTD selaku Pemungut PPN PMSE) untuk memulai.</p>
      <div class="hr"></div>
      <div class="btn-row">
        <button class="pill pill-primary" id="btnDlmPickFile">&#128193; Pilih File Excel</button>
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
  let html = '<table class="dtable">' + colgroupHtml(cols) + "<thead><tr>";
  cols.forEach((c) => { html += `<th class="${thAlignClass(c[2])}">${escapeHtml(c[0])}</th>`; });
  html += "</tr></thead><tbody>";
  st.processed.forEach((r, i) => {
    const selected = APP.selSdl.has(i);
    html += `<tr class="${sdlRowClass(r, i, selected)}" data-idx="${i}">`;
    html += tdCell(r.no, "center");
    html += tdCell(r.trx_code, "center");
    html += tdCell(r.buyer_name, "left");
    html += tdCell(r.buyer_id_opt, "center");
    html += tdCell(r.buyer_id_number, "center");
    html += tdCell(r.good_service_opt, "center");
    html += tdCell(r.serial_no, "left");
    html += tdCell(r.doc_date, "center");
    html += tdCell(fmtIdr(r.tax_base), "right");
    html += tdCell(fmtIdr(r.other_tax_base), "right");
    html += tdCell(fmtIdr(r.vat), "right");
    html += tdCell(fmtIdr(r.stlg), "right");
    html += tdCell(r.info, "center");
    html += "</tr>";
  });
  html += "</tbody></table>";
  document.getElementById("sdlTableScroll").innerHTML = html;
  document.querySelectorAll("#sdlTableScroll tbody tr").forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    tr.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selSdl.has(idx)) APP.selSdl.delete(idx); else APP.selSdl.add(idx);
      } else {
        APP.selSdl = new Set([idx]);
      }
      renderSdlTable();
    });
    tr.addEventListener("dblclick", () => openSdlRowDialog(idx));
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
const FIELD_ICON_MAP = { person: "\u{1F464}", box: "\u{1F4E6}", hash: "#", calendar: "\u{1F4C5}", tag: "\u{1F3F7}️" };
function fieldIcon(field) {
  const key = APP.bootstrap.field_icons[field];
  return FIELD_ICON_MAP[key] || "•";
}
function fieldRowHtml(field) {
  const assigned = APP.state.mapping[field] !== undefined;
  const pending = APP.pendingField === field;
  return `<div class="field-row${assigned ? " assigned" : ""}${pending ? " pending" : ""}" data-field="${escapeHtml(field)}">
    <span class="dot">${assigned ? "&#10003;" : fieldIcon(field)}</span>
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
    <div class="lhdr"><span class="ic">&#9881;</span><span class="tt">Mapping Kolom</span></div>
    <div class="mapping-fields">
      <div class="hint">Klik salah satu field di bawah, lalu klik kolom yang sesuai pada tabel kanan. Atau klik langsung kolom untuk memilih dari daftar.</div>
      ${APP.bootstrap.tpk_fields.map((f) => fieldRowHtml(f)).join("")}
    </div>
    <div class="hr"></div>
    <div class="mapping-progress" id="mappingProgress"></div>
    <div class="hr"></div>
    <div style="padding:12px 16px; display:flex; flex-direction:column; gap:6px;">
      <button class="pill pill-primary pill-block" id="btnProcessData">&#9654; Proses Data</button>
      <button class="pill pill-ghost pill-block" id="btnResetMapping">&#8635; Reset Mapping</button>
      <button class="pill pill-ghost pill-block" id="btnLoadTemplate">&#128209; Load Template</button>
      <button class="pill pill-ghost pill-block" id="btnSaveTemplate">&#128190; Save Template</button>
    </div>
  `;

  const right = document.createElement("div");
  right.className = "mapping-right";
  right.innerHTML = `
    <div class="rhdr">
      <span class="tt">Pratinjau Data Mentah</span>
      <span>&middot; ${st.raw_row_count} baris &middot; ${escapeHtml(st.src_filename)}</span>
      <span class="spacer" style="flex:1;"></span>
      <button class="pill pill-ghost pill-sm" id="btnGantiFile">&#128260; Ganti File</button>
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
function dlmFieldRowHtml(field) {
  const assigned = APP.state.dlm.mapping[field] !== undefined;
  const pending = APP.pendingDlmField === field;
  return `<div class="field-row${assigned ? " assigned" : ""}${pending ? " pending" : ""}" data-field="${escapeHtml(field)}">
    <span class="dot">${assigned ? "&#10003;" : dlmFieldIcon(field)}</span>
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
    <div class="lhdr"><span class="ic">&#9881;</span><span class="tt">Mapping Kolom</span></div>
    <div class="mapping-fields">
      <div class="hint">Klik salah satu field di bawah, lalu klik kolom yang sesuai pada tabel kanan. Atau klik langsung kolom untuk memilih dari daftar.</div>
      ${APP.bootstrap.dlm_fields.map((f) => dlmFieldRowHtml(f)).join("")}
    </div>
    <div class="hr"></div>
    <div class="mapping-progress" id="dlmMappingProgress"></div>
    <div class="hr"></div>
    <div style="padding:12px 16px; display:flex; flex-direction:column; gap:6px;">
      <button class="pill pill-primary pill-block" id="btnDlmProcessData">&#9654; Proses Data</button>
      <button class="pill pill-ghost pill-block" id="btnDlmResetMapping">&#8635; Reset Mapping</button>
      <button class="pill pill-ghost pill-block" id="btnDlmLoadTemplate">&#128209; Load Template</button>
      <button class="pill pill-ghost pill-block" id="btnDlmSaveTemplate">&#128190; Save Template</button>
    </div>
  `;

  const right = document.createElement("div");
  right.className = "mapping-right";
  right.innerHTML = `
    <div class="rhdr">
      <span class="tt">Pratinjau Data Mentah</span>
      <span>&middot; ${st.raw_row_count} baris &middot; ${escapeHtml(st.src_filename)}</span>
      <span class="spacer" style="flex:1;"></span>
      <button class="pill pill-ghost pill-sm" id="btnDlmGantiFile">&#128260; Ganti File</button>
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
  let html = '<table class="dtable">' + colgroupHtml(cols) + "<thead><tr>";
  cols.forEach((c) => { html += `<th class="${thAlignClass(c[2])}">${escapeHtml(c[0])}</th>`; });
  html += "</tr></thead><tbody>";
  st.processed.forEach((r, i) => {
    const selected = APP.selDlm.has(i);
    html += `<tr class="${dlmRowClass(r, i, selected)}" data-idx="${i}">`;
    html += tdCell(r.no, "center");
    html += tdCell(r.doc_no, "left");
    html += tdCell(isoToDdMmYyyy(r.doc_date), "center");
    html += tdCell(r.trx_type, "center");
    html += tdCell(r.trx_code, "center");
    html += tdCell(r.trx_document, "center");
    html += tdCell(r.tax_period_month, "center");
    html += tdCell(r.tax_period_year, "center");
    html += tdCell(fmtIdr(r.tax_base), "right");
    html += tdCell(fmtIdr(r.vat), "right");
    html += tdCell(fmtIdr(r.stlg), "right");
    html += tdCell(r.seller_tin, "center");
    html += tdCell(r.seller_name, "left");
    html += "</tr>";
  });
  html += "</tbody></table>";
  document.getElementById("dlmTableScroll").innerHTML = html;
  document.querySelectorAll("#dlmTableScroll tbody tr").forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    tr.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selDlm.has(idx)) APP.selDlm.delete(idx); else APP.selDlm.add(idx);
      } else {
        APP.selDlm = new Set([idx]);
      }
      renderDlmTable();
    });
    tr.addEventListener("dblclick", () => openDlmRowDialog(idx));
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
  let html = '<table class="dtable">' + colgroupHtml(cols) + "<thead><tr>";
  cols.forEach((c) => {
    html += `<th class="${thAlignClass(c[2])}">${escapeHtml(c[0])}</th>`;
  });
  html += "</tr></thead><tbody>";
  st.processed.forEach((r, i) => {
    html += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}">`;
    html += tdCell(r.no, "center");
    html += tdCell(r.nama, "left");
    html += tdCell(r.keterangan, "left");
    if (st.dup_map[r.faktur] !== undefined) {
      const [fg, bg] = APP.bootstrap.dup_colors[st.dup_map[r.faktur]];
      html += `<td class="col-center"><span class="dup-badge" style="color:${fg};background:${bg};">${escapeHtml(r.faktur)}</span></td>`;
    } else {
      html += tdCell(r.faktur, "center");
    }
    html += tdCell(r.tgl, "center");
    html += tdCell(fmtQty(r.qty), "right");
    html += tdCell(fmtQty(r.harga), "right");
    html += tdCell(r.unit, "center");
    html += tdCell(fmtIdr(r.harga_jual), "right");
    html += tdCell(fmtIdr(r.diskon), "right");
    html += tdCell(fmtIdr(r.dpp), "right");
    html += tdCell(fmtIdr(r.dpp_nl), "right");
    html += tdCell(r.tarif_ppn + "%", "center");
    html += tdCell(fmtIdr(r.ppn), "right");
    html += tdCell(r.tarif_ppnbm + "%", "center");
    html += tdCell(fmtIdr(r.ppnbm), "right");
    html += "</tr>";
  });
  html += "</tbody></table>";
  document.getElementById("tpkTableScroll").innerHTML = html;
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
  let html = '<table class="dtable">' + colgroupHtml(cols) + "<thead><tr>";
  cols.forEach((c) => { html += `<th class="${thAlignClass(c[2])}">${escapeHtml(c[0])}</th>`; });
  html += "</tr></thead><tbody>";
  st.faktur_rows.forEach((r, i) => {
    const selected = APP.selFaktur.has(i);
    html += `<tr class="${fakturRowClass(r, i, selected)}" data-idx="${i}">`;
    html += tdCell(r.baris, "center");
    html += tdCell(r.tgl_faktur, "center");
    html += tdCell(r.jenis_faktur, "center");
    html += tdCell(r.kode_transaksi, "center");
    html += tdCell(r.ket_tambahan, "center");
    html += tdCell(r.dok_pendukung, "center");
    html += tdCell(r.referensi, "center");
    html += tdCell(r.cap_fasilitas, "center");
    html += tdCell(r.id_tku_penjual, "center");
    html += tdCell(r.npwp_pembeli, "center");
    html += tdCell(r.jenis_id, "center");
    html += tdCell(r.negara, "center");
    html += tdCell(r.no_dok_pembeli, "center");
    html += tdCell(r.nama_pembeli, "left");
    html += tdCell(r.alamat_pembeli, "left");
    html += tdCell(r.email_pembeli, "center");
    html += tdCell(r.id_tku_pembeli, "center");
    html += "</tr>";
  });
  html += "</tbody></table>";
  document.getElementById("fakturTableScroll").innerHTML = html;
  document.querySelectorAll("#fakturTableScroll tbody tr").forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    tr.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selFaktur.has(idx)) APP.selFaktur.delete(idx); else APP.selFaktur.add(idx);
      } else {
        APP.selFaktur = new Set([idx]);
      }
      renderFakturTable();
    });
    tr.addEventListener("dblclick", () => openFakturFillDialog(idx));
  });
}
function renderDetailTable() {
  const st = APP.state;
  const cols = APP.bootstrap.det_cols;
  let html = '<table class="dtable">' + colgroupHtml(cols) + "<thead><tr>";
  cols.forEach((c) => { html += `<th class="${thAlignClass(c[2])}">${escapeHtml(c[0])}</th>`; });
  html += "</tr></thead><tbody>";
  st.detail_rows.forEach((r, i) => {
    const selected = APP.selDetail.has(r.original_idx);
    html += `<tr class="${i % 2 === 0 ? "row-a" : "row-b"}${selected ? " selected" : ""}" data-idx="${r.original_idx}">`;
    html += tdCell(r.baris, "center");
    html += tdCell(r.detail_opt_label, "center");
    html += tdCell(r.detail_code, "center");
    html += tdCell(r.keterangan, "left");
    html += tdCell(r.detail_unit_label, "center");
    html += tdCell(fmtQty(r.harga), "right");
    html += tdCell(fmtQty(r.qty), "right");
    html += tdCell(fmtIdr(r.diskon), "right");
    html += tdCell(fmtIdr(r.dpp), "right");
    html += tdCell(fmtIdr(r.dpp_nl), "right");
    html += tdCell("12%", "center");
    html += tdCell(fmtIdr(r.ppn), "right");
    html += tdCell("0%", "center");
    html += tdCell(fmtIdr(0), "right");
    html += "</tr>";
  });
  html += "</tbody></table>";
  document.getElementById("detailTableScroll").innerHTML = html;
  document.querySelectorAll("#detailTableScroll tbody tr").forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    tr.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (APP.selDetail.has(idx)) APP.selDetail.delete(idx); else APP.selDetail.add(idx);
      } else {
        APP.selDetail = new Set([idx]);
      }
      renderDetailTable();
    });
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
  const data = await apiGet("/api/bootstrap");
  APP.bootstrap = data;
  APP.state = data.state;
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
document.addEventListener("DOMContentLoaded", init);
