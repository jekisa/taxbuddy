"use client";

import { Suspense } from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLAN_COPY = {
  starter: {
    name: "Starter",
    price: "Rp299k/bulan",
    note: "Cocok untuk volume kecil dan export rutin.",
  },
  professional: {
    name: "Professional",
    price: "Rp799k/bulan",
    note: "Untuk tim pajak dengan database, riwayat, dan priority support.",
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    note: "Untuk volume tinggi, onboarding khusus, dan SLA.",
  },
};

function AuthContent() {
  const params = useSearchParams();
  const planKey = (params.get("plan") || "starter").toLowerCase();
  const plan = PLAN_COPY[planKey] || PLAN_COPY.starter;
  const [mode, setMode] = useState("register");
  const [message, setMessage] = useState("");
  const title = useMemo(() => mode === "login" ? "Login untuk melanjutkan" : "Buat akun untuk membeli package", [mode]);

  function submitAuth(event) {
    event.preventDefault();
    setMessage(`Akun berhasil diproses untuk paket ${plan.name}. Lanjutkan ke pembayaran.`);
  }

  return (
    <main className="auth-page">
      <a className="auth-brand" href="/">
        <img src="/static/img/logo.svg" alt="TaxBuddy" />
        <span>TaxBuddy</span>
      </a>

      <section className="auth-shell">
        <aside className="auth-summary">
          <p className="landing-kicker">Selected package</p>
          <h1>{plan.name}</h1>
          <strong>{plan.price}</strong>
          <p>{plan.note}</p>
          <ul>
            <li>Wajib login atau membuat akun.</li>
            <li>Akun dipakai untuk subscription, invoice, dan akses package.</li>
            <li>Setelah pembayaran, limit trial akan diganti sesuai package.</li>
          </ul>
          <a href="/#pricing">Ganti package</a>
        </aside>

        <section className="auth-card">
          <div className="auth-tabs">
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          </div>

          <h2>{title}</h2>
          <p className="auth-help">Masuk atau buat akun dulu untuk membeli paket {plan.name}.</p>

          <form onSubmit={submitAuth}>
            {mode === "register" ? (
              <>
                <label>
                  Nama perusahaan
                  <input required name="company" placeholder="PT Contoh Indonesia" />
                </label>
                <label>
                  Nama pengguna
                  <input required name="name" placeholder="Nama lengkap" />
                </label>
              </>
            ) : null}
            <label>
              Email
              <input required type="email" name="email" placeholder="nama@perusahaan.com" />
            </label>
            <label>
              Password
              <input required type="password" name="password" placeholder="Minimal 8 karakter" minLength={8} />
            </label>
            <button type="submit">{mode === "login" ? "Login & lanjut bayar" : "Buat akun & lanjut bayar"}</button>
          </form>

          {message ? (
            <div className="auth-message">
              <span>{message}</span>
              <a href="/app">Masuk ke app sementara</a>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="auth-page"><div className="auth-shell"><section className="auth-card">Memuat...</section></div></main>}>
      <AuthContent />
    </Suspense>
  );
}
