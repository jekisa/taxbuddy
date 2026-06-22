"use client";

import Script from "next/script";

export default function WorkspacePage() {
  return (
    <>
      <div id="app">
        <aside id="sidebar">
          <div className="brand">
            <button id="sidebarToggle" className="sidebar-toggle" title="Sembunyikan sidebar" aria-label="Toggle sidebar">
              <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
            <div className="brand-icon"><img src="/static/img/logo.svg" alt="Logo" /></div>
            <div className="brand-title">PAJAK KELUARAN</div>
            <div className="brand-sub">Otomatis&nbsp; v4.1</div>
          </div>
          <div className="hr" />
          <nav id="nav" />
          <div className="spacer" />
          <div className="hr" />
          <div className="theme-switcher">
            <label className="side-label">Tema</label>
            <select id="themeSelect" className="x-select" />
          </div>
          <div className="hr" />
          <div className="export-section" id="exportSection" />
          <div className="hr" />
          <div className="file-label" id="fileLabel">File: belum ada</div>
        </aside>

        <div className="main">
          <header id="topbar">
            <div className="status" id="statusLabel" />
            <div className="stats" id="statsFrame" />
          </header>
          <main id="body" />
        </div>
      </div>

      <div id="toast-container" />
      <div id="modal-root" />
      <div id="ctx-menu-root" />
      <input type="file" id="fileInput" accept=".xls,.xlsx" style={{ display: "none" }} />
      <input type="file" id="fileInputDlm" accept=".xls,.xlsx" style={{ display: "none" }} />
      <Script src="/static/js/app.js" strategy="afterInteractive" />
    </>
  );
}
