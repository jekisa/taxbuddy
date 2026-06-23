import crypto from "crypto";
import { getEnv } from "./env";

const SNAP_BASE = getEnv("MIDTRANS_IS_PRODUCTION") === "true"
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";
const API_BASE = getEnv("MIDTRANS_IS_PRODUCTION") === "true"
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

function serverKey() {
  const key = getEnv("MIDTRANS_SERVER_KEY");
  if (!key) {
    throw new Error("MIDTRANS_SERVER_KEY belum diset di .env.local.");
  }
  return key;
}

function authHeader() {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

export function snapScriptUrl() {
  return `${SNAP_BASE}/snap/snap.js`;
}

export function clientKey() {
  return getEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY") || getEnv("MIDTRANS_CLIENT_KEY");
}

export async function createSnapTransaction(payload) {
  const response = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_messages?.join(" ") || data.message || "Gagal membuat transaksi Midtrans.");
  }
  return data;
}

export async function getTransactionStatus(orderId) {
  const response = await fetch(`${API_BASE}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: authHeader(),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.status_message || data.message || "Gagal memeriksa status Midtrans.");
  }
  return data;
}

export function isValidMidtransSignature(payload) {
  const raw = `${payload.order_id || ""}${payload.status_code || ""}${payload.gross_amount || ""}${serverKey()}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === payload.signature_key;
}

export function isPaidTransaction(status) {
  return status.transaction_status === "settlement"
    || (status.transaction_status === "capture" && status.fraud_status !== "deny");
}
