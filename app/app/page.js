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
          <div className="hr" />
          <div className="account-section" id="accountSection" />
        </aside>

        <div className="main">
          <header id="topbar">
            <div className="status" id="statusLabel" />
            <div className="topbar-actions">
              <div className="stats" id="statsFrame" />
              <button className="topbar-icon-btn" id="notificationBtn" aria-label="Notifikasi">
                <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M10.3 21a2 2 0 0 0 3.4 0" />
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                </svg>
              </button>
              <div className="profile-menu">
                <button className="profile-trigger" id="profileTrigger" aria-label="Profil pengguna" aria-expanded="false">
                  <span className="profile-avatar" id="profileAvatar">TB</span>
                  <span className="profile-copy">
                    <strong id="profileName">TaxBuddy</strong>
                    <small id="profilePlan">Workspace</small>
                  </span>
                  <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div className="profile-dropdown" id="profileDropdown">
                  <div className="profile-dropdown-head">
                    <strong id="profileDropdownName">TaxBuddy</strong>
                    <span id="profileDropdownEmail">Workspace</span>
                  </div>
                  <button type="button" id="profileLogoutBtn">Logout</button>
                </div>
              </div>
            </div>
          </header>
          <main id="body" />
        </div>
      </div>

      <div id="toast-container" />
      <div id="modal-root" />
      <div id="ctx-menu-root" />
      <input type="file" id="fileInput" accept=".xls,.xlsx" style={{ display: "none" }} />
      <input type="file" id="fileInputDlm" accept=".xls,.xlsx" style={{ display: "none" }} />
      <script
        dangerouslySetInnerHTML={{
          __html: "window.process=window.process||{env:{}};window.process.env=window.process.env||{};window.process.env.NODE_ENV=window.process.env.NODE_ENV||'production';",
        }}
      />
      <Script src="/static/js/app.js" strategy="afterInteractive" />
    </>
  );
}
