"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLAN_COPY = {
  starter: {
    name: "Starter plan",
    price: "Rp799k/bulan",
    note: "Untuk perusahaan dengan kebutuhan pajak rutin.",
  },
  professional: {
    name: "Professional plan",
    price: "Rp1.499k/bulan",
    note: "Popular Plan untuk tim pajak yang butuh database dan template tersimpan.",
  },
  enterprise: {
    name: "Enterprise plan",
    price: "Rp2.999k/bulan",
    note: "Untuk tim dengan volume invoice tinggi, audit trail, dan multi perusahaan.",
  },
};

function AuthContent() {
  const params = useSearchParams();
  const selectedPlan = params.get("plan");
  const planKey = (selectedPlan || "starter").toLowerCase();
  const plan = PLAN_COPY[planKey] || PLAN_COPY.starter;
  const hasSelectedPlan = Boolean(selectedPlan);
  const initialMode = params.get("mode") === "login" || !hasSelectedPlan ? "login" : "register";
  const [mode, setMode] = useState(initialMode);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const title = useMemo(() => {
    if (mode === "login") return hasSelectedPlan ? "Login untuk melanjutkan pembayaran" : "Login ke akun TaxBuddy";
    return hasSelectedPlan ? "Buat akun untuk membeli package" : "Buat akun TaxBuddy";
  }, [mode, hasSelectedPlan]);
  const helpText = hasSelectedPlan
    ? `Masuk atau buat akun dulu untuk membeli paket ${plan.name}.`
    : "Masuk ke akun yang sudah terdaftar untuk membuka dashboard dan akses langganan Anda.";
  const passwordIcon = showPassword ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 4.3A9.8 9.8 0 0 1 12 4c5.5 0 9 5 9 8a10.7 10.7 0 0 1-2.1 3.5" />
      <path d="M6.6 6.6C4.3 8.1 3 10.2 3 12c0 3 3.5 8 9 8a9.6 9.6 0 0 0 4-.9" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  useEffect(() => {
    let active = true;
    async function checkExistingSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        if (!active || !response.ok) return;
        if (data.user && data.subscription?.status === "active") {
          window.location.href = "/app";
        }
      } catch {
        // Guest login page remains usable.
      }
    }
    checkExistingSession();
    return () => {
      active = false;
    };
  }, []);

  async function submitAuth(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      ...(hasSelectedPlan ? { plan: planKey } : {}),
      email: form.get("email"),
      password: form.get("password"),
      name: form.get("name"),
      company: form.get("company"),
      phone: form.get("phone"),
    };

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Proses akun gagal.");
      }

      const nextUrl = hasSelectedPlan ? `/checkout?plan=${encodeURIComponent(planKey)}` : "/app";
      setMessage(hasSelectedPlan
        ? `${mode === "login" ? "Login" : "Akun"} berhasil. Mengarahkan ke pembayaran paket ${plan.name}...`
        : `${mode === "login" ? "Login" : "Akun"} berhasil. Mengarahkan ke aplikasi...`);
      window.location.href = nextUrl;
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <a className="auth-brand" href="/">
        <img src="/static/img/logo.svg" alt="TaxBuddy" />
        <span>TaxBuddy</span>
      </a>

      <section className={`auth-shell${hasSelectedPlan ? "" : " auth-shell-single"}`}>
        {hasSelectedPlan ? (
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
        ) : null}

        <section className="auth-card">
          <div className="auth-tabs">
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          </div>

          <h2>{title}</h2>
          <p className="auth-help">{helpText}</p>

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
                <label>
                  No. handphone
                  <input required name="phone" type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" />
                </label>
              </>
            ) : null}
            <label>
              Email
              <input required type="email" name="email" placeholder="nama@perusahaan.com" />
            </label>
            <label>
              Password
              <span className="password-field">
                <input required type={showPassword ? "text" : "password"} name="password" placeholder="Minimal 8 karakter" minLength={8} />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} title={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
                  {passwordIcon}
                </button>
              </span>
            </label>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Memproses..." : mode === "login" ? (hasSelectedPlan ? "Login & lanjut bayar" : "Login") : (hasSelectedPlan ? "Buat akun & lanjut bayar" : "Buat akun")}
            </button>
          </form>

          {message ? (
            <div className="auth-message">
              <span>{message}</span>
              {message.includes("berhasil") ? <a href={hasSelectedPlan ? `/checkout?plan=${encodeURIComponent(planKey)}` : "/app"}>{hasSelectedPlan ? "Lanjut bayar sekarang" : "Masuk ke aplikasi"}</a> : null}
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
