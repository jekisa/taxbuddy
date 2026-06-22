"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLANS = {
  starter: {
    name: "Starter",
    price: "Rp299.000",
    period: "/bulan",
    items: ["1 workspace", "500 baris proses per bulan", "Template mapping dasar", "Export XLSX & XML"],
  },
  professional: {
    name: "Professional",
    price: "Rp799.000",
    period: "/bulan",
    items: ["5 user seat", "10.000 baris proses per bulan", "Database transaksi", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    period: "",
    items: ["Unlimited workspace", "Custom approval flow", "Dedicated onboarding", "SLA prioritas"],
  },
};

function CheckoutContent() {
  const params = useSearchParams();
  const planKey = (params.get("plan") || "professional").toLowerCase();
  const plan = PLANS[planKey] || PLANS.professional;
  const [paid, setPaid] = useState(false);
  const [message, setMessage] = useState("Memeriksa sesi akun...");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [orderId, setOrderId] = useState(params.get("order_id") || "");
  const tax = useMemo(() => plan.price.startsWith("Rp") ? "Termasuk PPN sesuai invoice" : "Tim sales akan menghubungi Anda", [plan.price]);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data.user) {
          window.location.href = `/auth?plan=${encodeURIComponent(planKey)}`;
          return;
        }
        setUser(data.user);
        setMessage("");
      } catch (error) {
        if (active) setMessage(error.message || "Gagal memeriksa sesi akun.");
      }
    }
    loadSession();
    return () => {
      active = false;
    };
  }, [planKey]);

  function loadSnap(scriptUrl, clientKey) {
    return new Promise((resolve, reject) => {
      if (window.snap) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.setAttribute("data-client-key", clientKey);
      script.onload = resolve;
      script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap."));
      document.body.appendChild(script);
    });
  }

  async function syncPayment(nextOrderId) {
    const response = await fetch("/api/payments/midtrans/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: nextOrderId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Status pembayaran belum bisa dicek.");
    if (data.paid) {
      setPaid(true);
      setMessage("");
    } else {
      setMessage("Pembayaran belum selesai. Selesaikan pembayaran di Midtrans untuk mengaktifkan package.");
    }
    return data;
  }

  async function activateSubscription() {
    setIsLoading(true);
    setMessage("");
    try {
      if (planKey !== "enterprise") {
        const response = await fetch("/api/payments/midtrans/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey }),
        });
        const data = await response.json();
        if (response.status === 401) {
          window.location.href = `/auth?plan=${encodeURIComponent(planKey)}`;
          return;
        }
        if (!response.ok) {
          throw new Error(data.error || "Gagal membuat pembayaran Midtrans.");
        }
        if (!data.clientKey) {
          throw new Error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum diset.");
        }

        setOrderId(data.orderId);
        await loadSnap(data.snapScript, data.clientKey);
        window.snap.pay(data.token, {
          onSuccess: () => syncPayment(data.orderId),
          onPending: () => syncPayment(data.orderId),
          onError: () => setMessage("Pembayaran gagal diproses oleh Midtrans."),
          onClose: () => setMessage("Popup pembayaran ditutup. Anda bisa klik tombol bayar lagi untuk melanjutkan."),
        });
        return;
      }

      const response = await fetch("/api/subscriptions/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/auth?plan=${encodeURIComponent(planKey)}`;
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Pembayaran belum bisa diproses.");
      }
      setPaid(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!orderId || !user) return;
    syncPayment(orderId).catch((error) => setMessage(error.message));
  }, [orderId, user]);

  return (
    <main className="checkout-page">
      <a className="auth-brand" href="/">
        <img src="/static/img/logo.svg" alt="TaxBuddy" />
        <span>TaxBuddy</span>
      </a>

      <section className="checkout-shell">
        <div className="checkout-card">
          <p className="landing-kicker">Checkout</p>
          <h1>Bayar package {plan.name}</h1>
          <p className="checkout-help">Selesaikan pembayaran untuk mengaktifkan akses package dan membuka fitur berbayar.</p>

          <div className="payment-methods">
            <label><input type="radio" name="method" defaultChecked /> Virtual Account</label>
            <label><input type="radio" name="method" /> Kartu Kredit</label>
            <label><input type="radio" name="method" /> Transfer Bank</label>
          </div>

          {user ? <p className="checkout-help">Akun: {user.email}</p> : null}

          <button className="checkout-pay-btn" onClick={activateSubscription} disabled={isLoading || !user}>
            {isLoading ? "Memproses..." : planKey === "enterprise" ? "Kirim permintaan sales" : "Bayar dan aktifkan package"}
          </button>

          {message ? <div className="auth-message"><span>{message}</span></div> : null}

          {paid ? (
            <div className="checkout-success">
              <b>{planKey === "enterprise" ? "Permintaan diterima." : "Pembayaran berhasil diproses."}</b>
              <span>{planKey === "enterprise" ? "Tim TaxBuddy akan menghubungi Anda." : "Package akan aktif di akun Anda."}</span>
              <a href="/app">Masuk ke aplikasi</a>
            </div>
          ) : null}
        </div>

        <aside className="checkout-summary">
          <h2>{plan.name}</h2>
          <div className="checkout-price">{plan.price}<span>{plan.period}</span></div>
          <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="checkout-total">
            <span>Total</span>
            <strong>{plan.price}{plan.period}</strong>
          </div>
          <p>{tax}</p>
          <a href="/#pricing">Ganti package</a>
        </aside>
      </section>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="checkout-page"><section className="checkout-card">Memuat checkout...</section></main>}>
      <CheckoutContent />
    </Suspense>
  );
}
